
import { v4 as uuidv4 } from 'uuid';
import { Transaction, UserBudget } from '@/types/finance';
import { Toast } from '@/hooks/use-toast';

export const usePayments = (
  budget: UserBudget,
  setBudget: React.Dispatch<React.SetStateAction<UserBudget>>,
  uiToast: Toast
) => {
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

  return {
    makePayment,
    processPayment
  };
};
