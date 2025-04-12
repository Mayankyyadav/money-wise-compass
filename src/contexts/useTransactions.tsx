
import { v4 as uuidv4 } from 'uuid';
import { Transaction, UserBudget } from '@/types/finance';
import { Toast } from '@/hooks/use-toast';

export const useTransactions = (
  budget: UserBudget,
  setBudget: React.Dispatch<React.SetStateAction<UserBudget>>,
  uiToast: Toast,
  distributeIncome: (amount: number) => any[]
) => {
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

  return {
    addIncome,
    withdrawFromCategory
  };
};
