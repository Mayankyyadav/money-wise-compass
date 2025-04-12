
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category, Transaction, UserBudget, ScheduledPayment } from '@/types/finance';
import { useToast } from '@/components/ui/use-toast';
import { toast } from '@/components/ui/sonner';
import { v4 as uuidv4 } from 'uuid';

interface FinanceContextType {
  budget: UserBudget;
  addIncome: (amount: number, description: string) => void;
  withdrawFromCategory: (categoryId: string, amount: number, description: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'amount'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  getDailyBalance: () => number;
  makePayment: (amount: number, description: string, preferredCategoryId?: string, fallbackCategoryId?: string) => 
    { success: boolean; insufficientFunds?: boolean; remainingAmount?: number };
  schedulePayment: (options: {
    amount: number;
    description: string;
    date: Date;
    recurring?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    preferredCategory?: string;
  }) => void;
  toggleScheduledPayment: (paymentId: string, active: boolean) => void;
  cancelScheduledPayment: (paymentId: string) => void;
  updateCategoryPriorities: (categories: Array<{ id: string; priority: number; maxAmount: number | undefined }>) => void;
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'Savings',
    percentage: 20,
    amount: 200,
    color: '#3B82F6', // blue
    icon: 'piggy-bank',
    priority: 1,
  },
  {
    id: '2',
    name: 'Bills',
    percentage: 30,
    amount: 300,
    color: '#EF4444', // red
    icon: 'receipt',
    priority: 2,
    maxAmount: 500,
  },
  {
    id: '3',
    name: 'Entertainment',
    percentage: 10,
    amount: 100,
    color: '#F59E0B', // amber
    icon: 'tv',
    priority: 5,
    maxAmount: 200,
  },
  {
    id: '4',
    name: 'Groceries',
    percentage: 15,
    amount: 150,
    color: '#10B981', // green
    icon: 'shopping-cart',
    priority: 3,
    maxAmount: 300,
  },
  {
    id: '5',
    name: 'Investments',
    percentage: 15,
    amount: 150,
    color: '#8B5CF6', // purple
    icon: 'trending-up',
    priority: 4,
    maxAmount: 1000,
  },
  {
    id: '6',
    name: 'Daily Use',
    percentage: 10,
    amount: 100,
    color: '#0D9488', // teal
    icon: 'coffee',
    priority: 6,
  },
];

const DEFAULT_BUDGET: UserBudget = {
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
const STORAGE_KEY = 'finance_wise_budget';

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [budget, setBudget] = useState<UserBudget>(DEFAULT_BUDGET);
  const { toast: uiToast } = useToast();

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

  // Process scheduled payments
  useEffect(() => {
    const checkScheduledPayments = () => {
      const now = new Date();
      let updatedBudget = { ...budget };
      let paymentsProcessed = false;
      
      const updatedPayments = budget.scheduledPayments.map(payment => {
        if (!payment.active) return payment;
        
        const paymentDate = new Date(payment.nextDate);
        if (paymentDate <= now) {
          // Process this payment
          const result = processPayment(
            updatedBudget,
            payment.amount,
            payment.description,
            payment.category
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
  }, [budget]);

  // Calculate how much to allocate to each category
  const distributeIncome = (amount: number) => {
    const { categories } = budget;
    const newCategories = [...categories];
    
    // Sort categories by priority (lower number = higher priority)
    newCategories.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    let remainingAmount = amount;
    
    // Distribute to categories based on priority and percentage
    for (let i = 0; i < newCategories.length; i++) {
      if (remainingAmount <= 0) break;
      
      const category = newCategories[i];
      const targetAmount = category.maxAmount;
      
      if (targetAmount !== undefined && category.name !== 'Daily Use') {
        // If there's a max amount, only allocate up to that max
        const spaceAvailable = Math.max(0, targetAmount - category.amount);
        const allocation = Math.min(
          spaceAvailable,
          remainingAmount * (category.percentage / 100)
        );
        
        newCategories[i] = {
          ...category,
          amount: category.amount + allocation,
        };
        
        remainingAmount -= allocation;
      } else {
        // No max amount, allocate based on percentage
        const allocation = remainingAmount * (category.percentage / 100);
        
        newCategories[i] = {
          ...category,
          amount: category.amount + allocation,
        };
        
        remainingAmount -= allocation;
      }
    }
    
    // If there's still money left, put it in savings
    if (remainingAmount > 0) {
      const savingsIndex = newCategories.findIndex(c => c.name === 'Savings');
      if (savingsIndex !== -1) {
        newCategories[savingsIndex] = {
          ...newCategories[savingsIndex],
          amount: newCategories[savingsIndex].amount + remainingAmount,
        };
      }
    }
    
    return newCategories;
  };

  const addIncome = (amount: number, description: string) => {
    if (amount <= 0) {
      uiToast({
        title: "Invalid amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }

    const newTransaction: Transaction = {
      id: uuidv4(),
      amount,
      type: 'income',
      date: new Date(),
      description,
    };

    const updatedCategories = distributeIncome(amount);

    setBudget(prev => ({
      ...prev,
      totalBalance: prev.totalBalance + amount,
      categories: updatedCategories,
      transactions: [newTransaction, ...prev.transactions],
    }));

    uiToast({
      title: "Income added",
      description: `$${amount.toFixed(2)} has been distributed to your categories`,
    });
  };

  const withdrawFromCategory = (categoryId: string, amount: number, description: string) => {
    if (amount <= 0) {
      uiToast({
        title: "Invalid amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }

    const categoryIndex = budget.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) {
      uiToast({
        title: "Category not found",
        description: "The selected category doesn't exist",
        variant: "destructive",
      });
      return;
    }

    const category = budget.categories[categoryIndex];
    if (category.amount < amount) {
      uiToast({
        title: "Insufficient funds",
        description: `Not enough money in ${category.name}`,
        variant: "destructive",
      });
      return;
    }

    const newTransaction: Transaction = {
      id: uuidv4(),
      amount,
      type: 'withdrawal',
      category: categoryId,
      date: new Date(),
      description,
    };

    const updatedCategories = [...budget.categories];
    updatedCategories[categoryIndex] = {
      ...category,
      amount: category.amount - amount,
    };

    setBudget(prev => ({
      ...prev,
      totalBalance: prev.totalBalance - amount,
      categories: updatedCategories,
      transactions: [newTransaction, ...prev.transactions],
    }));

    uiToast({
      title: "Withdrawal successful",
      description: `$${amount.toFixed(2)} withdrawn from ${category.name}`,
    });
  };

  // A helper function to process a payment from one or more categories
  const processPayment = (
    currentBudget: UserBudget,
    amount: number,
    description: string,
    preferredCategoryId?: string,
    fallbackCategoryId?: string
  ) => {
    let updatedCategories = [...currentBudget.categories];
    let remainingAmount = amount;
    let transactionCategories: string[] = [];
    let success = false;
    
    // Function to withdraw from a specific category
    const withdrawFromCat = (categoryId: string, amountToWithdraw: number) => {
      const index = updatedCategories.findIndex(c => c.id === categoryId);
      if (index === -1) return 0;
      
      const category = updatedCategories[index];
      const availableAmount = Math.min(category.amount, amountToWithdraw);
      
      if (availableAmount > 0) {
        updatedCategories[index] = {
          ...category,
          amount: category.amount - availableAmount,
        };
        
        transactionCategories.push(categoryId);
        return availableAmount;
      }
      
      return 0;
    };
    
    // If preferred category is specified, try that first
    if (preferredCategoryId) {
      const withdrawn = withdrawFromCat(preferredCategoryId, remainingAmount);
      remainingAmount -= withdrawn;
    }
    
    // If still need more money and no preferred category (or it wasn't enough)
    if (remainingAmount > 0 && !preferredCategoryId) {
      // Try daily use first
      const dailyUseCategory = updatedCategories.find(c => c.name === 'Daily Use');
      if (dailyUseCategory) {
        const withdrawn = withdrawFromCat(dailyUseCategory.id, remainingAmount);
        remainingAmount -= withdrawn;
      }
    }
    
    // If still need more money, try savings
    if (remainingAmount > 0 && !preferredCategoryId) {
      const savingsCategory = updatedCategories.find(c => c.name === 'Savings');
      if (savingsCategory) {
        const withdrawn = withdrawFromCat(savingsCategory.id, remainingAmount);
        remainingAmount -= withdrawn;
      }
    }
    
    // If fallback category is specified and we still need more
    if (remainingAmount > 0 && fallbackCategoryId) {
      const withdrawn = withdrawFromCat(fallbackCategoryId, remainingAmount);
      remainingAmount -= withdrawn;
    }
    
    // If we've managed to cover the amount
    if (remainingAmount <= 0.01) { // Allow for small floating-point errors
      const newTransaction: Transaction = {
        id: uuidv4(),
        amount,
        type: 'payment',
        category: transactionCategories.join(','),
        date: new Date(),
        description,
      };
      
      success = true;
      
      return {
        success: true,
        updatedBudget: {
          ...currentBudget,
          totalBalance: currentBudget.totalBalance - amount,
          categories: updatedCategories,
          transactions: [newTransaction, ...currentBudget.transactions],
        }
      };
    }
    
    return { 
      success: false,
      remainingAmount,
      updatedBudget: currentBudget
    };
  };

  // Make a payment
  const makePayment = (
    amount: number,
    description: string,
    preferredCategoryId?: string,
    fallbackCategoryId?: string
  ) => {
    if (amount <= 0) {
      uiToast({
        title: "Invalid amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return { success: false };
    }
    
    const result = processPayment(
      budget,
      amount,
      description,
      preferredCategoryId,
      fallbackCategoryId
    );
    
    if (result.success) {
      setBudget(result.updatedBudget);
      
      uiToast({
        title: "Payment successful",
        description: `$${amount.toFixed(2)} payment completed`,
      });
      
      return { success: true };
    } else {
      uiToast({
        title: "Insufficient funds",
        description: "You don't have enough funds to complete this payment",
        variant: "destructive",
      });
      
      return { 
        success: false,
        insufficientFunds: true,
        remainingAmount: result.remainingAmount
      };
    }
  };

  // Schedule a payment
  const schedulePayment = (options: {
    amount: number;
    description: string;
    date: Date;
    recurring?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    preferredCategory?: string;
  }) => {
    const { amount, description, date, recurring = false, frequency, preferredCategory } = options;
    
    if (amount <= 0) {
      uiToast({
        title: "Invalid amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }
    
    // Format time as HH:MM
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    const newPayment: ScheduledPayment = {
      id: uuidv4(),
      amount,
      category: preferredCategory || '', // Empty string means auto (Daily Use, then Savings)
      description,
      nextDate: date,
      recurring,
      frequency: recurring ? frequency : undefined,
      time: timeString,
      active: true,
    };
    
    setBudget(prev => ({
      ...prev,
      scheduledPayments: [newPayment, ...prev.scheduledPayments],
    }));
    
    uiToast({
      title: "Payment scheduled",
      description: `${recurring ? 'Recurring' : 'One-time'} payment scheduled for ${date.toLocaleDateString()}`,
    });
  };

  // Toggle a scheduled payment
  const toggleScheduledPayment = (paymentId: string, active: boolean) => {
    setBudget(prev => ({
      ...prev,
      scheduledPayments: prev.scheduledPayments.map(payment => 
        payment.id === paymentId ? { ...payment, active } : payment
      ),
    }));
    
    uiToast({
      title: active ? "Payment activated" : "Payment paused",
      description: active ? "Scheduled payment has been activated" : "Scheduled payment has been paused",
    });
  };

  // Cancel a scheduled payment
  const cancelScheduledPayment = (paymentId: string) => {
    setBudget(prev => ({
      ...prev,
      scheduledPayments: prev.scheduledPayments.filter(payment => payment.id !== paymentId),
    }));
    
    uiToast({
      title: "Payment canceled",
      description: "Scheduled payment has been canceled",
    });
  };

  const addCategory = (categoryData: Omit<Category, 'id' | 'amount'>) => {
    const newCategory: Category = {
      id: uuidv4(),
      amount: 0, // New categories start with $0
      ...categoryData,
    };

    setBudget(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));

    uiToast({
      title: "Category added",
      description: `${categoryData.name} has been added to your budget`,
    });
  };

  const updateCategory = (updatedCategory: Category) => {
    const categories = [...budget.categories];
    const index = categories.findIndex(c => c.id === updatedCategory.id);
    
    if (index === -1) {
      uiToast({
        title: "Category not found",
        description: "The category you're trying to update doesn't exist",
        variant: "destructive",
      });
      return;
    }

    categories[index] = updatedCategory;

    setBudget(prev => ({
      ...prev,
      categories,
    }));

    uiToast({
      title: "Category updated",
      description: `${updatedCategory.name} has been updated`,
    });
  };

  const deleteCategory = (categoryId: string) => {
    const categoryIndex = budget.categories.findIndex(c => c.id === categoryId);
    
    if (categoryIndex === -1) {
      uiToast({
        title: "Category not found",
        description: "The category you're trying to delete doesn't exist",
        variant: "destructive",
      });
      return;
    }

    const categoryToDelete = budget.categories[categoryIndex];
    const remainingAmount = categoryToDelete.amount;
    
    // Remove the category
    const updatedCategories = budget.categories.filter(c => c.id !== categoryId);
    
    // Redistribute the remaining amount in the deleted category
    if (remainingAmount > 0 && updatedCategories.length > 0) {
      // Find savings category to transfer funds
      const savingsIndex = updatedCategories.findIndex(c => c.name === 'Savings');
      if (savingsIndex !== -1) {
        updatedCategories[savingsIndex] = {
          ...updatedCategories[savingsIndex],
          amount: updatedCategories[savingsIndex].amount + remainingAmount
        };
      } else {
        // If no savings category, distribute proportionally
        const totalPercentage = updatedCategories.reduce((sum, cat) => sum + cat.percentage, 0);
        
        updatedCategories.forEach((category, index) => {
          const proportion = category.percentage / totalPercentage;
          updatedCategories[index] = {
            ...category,
            amount: category.amount + (remainingAmount * proportion),
          };
        });
      }
    }

    setBudget(prev => ({
      ...prev,
      categories: updatedCategories,
    }));

    uiToast({
      title: "Category deleted",
      description: `${categoryToDelete.name} has been deleted and funds redistributed`,
    });
  };

  const updateCategoryPriorities = (categories: Array<{ id: string; priority: number; maxAmount: number | undefined }>) => {
    const updatedCategories = budget.categories.map(category => {
      const updatedCategory = categories.find(c => c.id === category.id);
      if (updatedCategory) {
        return {
          ...category,
          priority: updatedCategory.priority,
          maxAmount: updatedCategory.maxAmount
        };
      }
      return category;
    });
    
    setBudget(prev => ({
      ...prev,
      categories: updatedCategories,
    }));
    
    uiToast({
      title: "Priorities updated",
      description: "Category priorities and limits have been updated",
    });
  };

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
