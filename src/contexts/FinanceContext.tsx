import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category, Transaction, UserBudget, ScheduledPayment } from '@/types/finance';
import { useToast } from '@/components/ui/use-toast';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { useCategories, DEFAULT_CATEGORIES } from './useCategories';
import { useTransactions } from './useTransactions';
import { usePayments } from './usePayments';
import { useScheduledPayments } from './useScheduledPayments';

interface FinanceContextType {
  budget: UserBudget;
  addIncome: (amount: number, description: string) => void;
  withdrawFromCategory: (categoryId: string, amount: number, description: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'amount'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  getDailyBalance: () => number;
  makePayment: (amount: number, description: string, preferredCategoryId?: string, fallbackCategoryIds?: string[]) => 
    { success: boolean; insufficientFunds?: boolean; remainingAmount?: number };
  schedulePayment: (options: {
    amount: number;
    description: string;
    date: Date;
    recurring?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    preferredCategory?: string;
    fallbackCategories?: string[];
  }) => void;
  toggleScheduledPayment: (paymentId: string, active: boolean) => void;
  cancelScheduledPayment: (paymentId: string) => void;
  updateCategoryPriorities: (categories: Array<{ id: string; priority: number; maxAmount: number | undefined }>) => void;
}

// Export the context default budget, storage key, and helper functions to separate files
export const DEFAULT_BUDGET: UserBudget = {
  totalBalance: 1000,
  dailyAmount: 50,
  categories: DEFAULT_CATEGORIES,
  transactions: [
    {
      id: '1',
      amount: 1000,
      type: 'income',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      description: 'Initial deposit',
    },
  ],
  scheduledPayments: [],
};

// Local storage keys
export const STORAGE_KEY = 'finance_wise_budget';

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [budget, setBudget] = useState<UserBudget>(DEFAULT_BUDGET);
  const { toast: uiToast } = useToast();
  
  const { 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    updateCategoryPriorities,
    distributeIncome 
  } = useCategories(budget, setBudget, uiToast);
  
  const { 
    addIncome, 
    withdrawFromCategory 
  } = useTransactions(budget, setBudget, uiToast, distributeIncome);
  
  const { 
    makePayment, 
    processPayment 
  } = usePayments(budget, setBudget, uiToast);
  
  const {
    schedulePayment,
    toggleScheduledPayment,
    cancelScheduledPayment
  } = useScheduledPayments(budget, setBudget, uiToast, processPayment);

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedBudget = localStorage.getItem(STORAGE_KEY);
    if (savedBudget) {
      try {
        const parsed = JSON.parse(savedBudget);
        // Convert date strings back to Date objects
        parsed.transactions = parsed.transactions.map((t: any) => ({
          ...t,
          date: new Date(t.date),
        }));
        
        // Convert scheduled payment dates
        if (parsed.scheduledPayments) {
          parsed.scheduledPayments = parsed.scheduledPayments.map((p: any) => ({
            ...p,
            nextDate: new Date(p.nextDate),
          }));
        } else {
          parsed.scheduledPayments = [];
        }
        
        setBudget(parsed);
      } catch (error) {
        console.error('Failed to parse saved budget:', error);
        setBudget(DEFAULT_BUDGET);
      }
    }
  }, []);

  // Save to localStorage whenever budget changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
  }, [budget]);

  // Helper function to check if funds are sufficient for a payment
  const checkFundsSufficient = (payment: ScheduledPayment): boolean => {
    // Make a copy of the budget to simulate the payment
    const budgetCopy = { ...budget };
    
    // Try to process the payment without actually making changes
    const result = processPayment(
      budgetCopy,
      payment.amount,
      payment.description,
      payment.category,
      payment.fallbackCategories
    );
    
    return result.success;
  };

  // Process scheduled payments
  useEffect(() => {
    const checkScheduledPayments = () => {
      const now = new Date();
      let updatedBudget = { ...budget };
      let paymentsProcessed = false;
      
      // Check for upcoming payments in the next 3 minutes to notify about insufficient funds
      budget.scheduledPayments.forEach(payment => {
        if (!payment.active) return;
        
        const paymentDate = new Date(payment.nextDate);
        const threeMinutesFromNow = new Date(now.getTime() + 3 * 60 * 1000);
        
        // If payment is due within the next 3 minutes but not yet due
        if (paymentDate > now && paymentDate <= threeMinutesFromNow) {
          // Check if funds are sufficient
          if (!checkFundsSufficient(payment)) {
            toast.error(
              `Insufficient funds for upcoming payment: ${payment.description}`,
              {
                description: `Scheduled in ${Math.floor((paymentDate.getTime() - now.getTime()) / 60000)} minutes`,
                duration: 10000,
                action: {
                  label: "Check Budget",
                  onClick: () => {
                    // This would ideally scroll to or highlight budget categories
                    document.querySelector('.finance-card')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }
            );
          }
        }
      });
      
      const updatedPayments = budget.scheduledPayments.map(payment => {
        if (!payment.active) return payment;
        
        const paymentDate = new Date(payment.nextDate);
        if (paymentDate <= now) {
          // Process this payment
          const result = processPayment(
            updatedBudget,
            payment.amount,
            payment.description,
            payment.category,
            payment.fallbackCategories
          );
          
          if (result.success) {
            updatedBudget = result.updatedBudget;
            paymentsProcessed = true;
            
            // Update next date for recurring payments
            if (payment.recurring && payment.frequency) {
              const newDate = new Date(paymentDate);
              switch (payment.frequency) {
                case 'daily':
                  newDate.setDate(newDate.getDate() + 1);
                  break;
                case 'weekly':
                  newDate.setDate(newDate.getDate() + 7);
                  break;
                case 'monthly':
                  newDate.setMonth(newDate.getMonth() + 1);
                  break;
              }
              
              toast.success(`Scheduled payment processed: ${payment.description}`);
              return { ...payment, nextDate: newDate };
            } else {
              // One-time payment, mark as inactive
              toast.success(`One-time payment processed: ${payment.description}`);
              return { ...payment, active: false };
            }
          } else {
            // Failed to process payment due to insufficient funds
            toast.error(`Failed to process scheduled payment: ${payment.description} - Insufficient funds`);
            return { ...payment, active: false };
          }
        }
        
        return payment;
      });
      
      if (paymentsProcessed) {
        setBudget({
          ...updatedBudget,
          scheduledPayments: updatedPayments,
        });
      }
    };
    
    // Check immediately and then set interval
    checkScheduledPayments();
    const interval = setInterval(checkScheduledPayments, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [budget, processPayment]);

  const getDailyBalance = (): number => {
    const dailyCategory = budget.categories.find(c => c.name === 'Daily Use');
    return dailyCategory ? dailyCategory.amount : 0;
  };

  return (
    <FinanceContext.Provider
      value={{
        budget,
        addIncome,
        withdrawFromCategory,
        addCategory,
        updateCategory,
        deleteCategory,
        getDailyBalance,
        makePayment,
        schedulePayment,
        toggleScheduledPayment,
        cancelScheduledPayment,
        updateCategoryPriorities,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
