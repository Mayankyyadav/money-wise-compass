
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category, Transaction, UserBudget } from '@/types/finance';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface FinanceContextType {
  budget: UserBudget;
  addIncome: (amount: number, description: string) => void;
  withdrawFromCategory: (categoryId: string, amount: number, description: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'amount'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  getDailyBalance: () => number;
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'Savings',
    percentage: 20,
    amount: 200,
    color: '#3B82F6', // blue
    icon: 'piggy-bank',
  },
  {
    id: '2',
    name: 'Bills',
    percentage: 30,
    amount: 300,
    color: '#EF4444', // red
    icon: 'receipt',
  },
  {
    id: '3',
    name: 'Entertainment',
    percentage: 10,
    amount: 100,
    color: '#F59E0B', // amber
    icon: 'tv',
  },
  {
    id: '4',
    name: 'Groceries',
    percentage: 15,
    amount: 150,
    color: '#10B981', // green
    icon: 'shopping-cart',
  },
  {
    id: '5',
    name: 'Investments',
    percentage: 15,
    amount: 150,
    color: '#8B5CF6', // purple
    icon: 'trending-up',
  },
  {
    id: '6',
    name: 'Daily Use',
    percentage: 10,
    amount: 100,
    color: '#0D9488', // teal
    icon: 'coffee',
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
};

// Local storage keys
const STORAGE_KEY = 'finance_wise_budget';

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [budget, setBudget] = useState<UserBudget>(DEFAULT_BUDGET);
  const { toast } = useToast();

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

  // Calculate how much to allocate to each category
  const distributeIncome = (amount: number) => {
    const { categories } = budget;
    const newCategories = [...categories];
    
    let remainingPercentage = 100;
    let remainingAmount = amount;
    
    // First, handle the Daily Use category
    const dailyUseIndex = newCategories.findIndex(c => c.name === 'Daily Use');
    if (dailyUseIndex !== -1) {
      const dailyUseCategory = newCategories[dailyUseIndex];
      const dailyAllocation = amount * (dailyUseCategory.percentage / 100);
      newCategories[dailyUseIndex] = {
        ...dailyUseCategory,
        amount: dailyUseCategory.amount + dailyAllocation,
      };
      remainingPercentage -= dailyUseCategory.percentage;
      remainingAmount -= dailyAllocation;
    }
    
    // Then distribute the rest proportionally
    newCategories.forEach((category, index) => {
      if (index !== dailyUseIndex) {
        const adjustedPercentage = category.percentage / remainingPercentage;
        const categoryAmount = remainingAmount * adjustedPercentage;
        newCategories[index] = {
          ...category,
          amount: category.amount + categoryAmount,
        };
      }
    });
    
    return newCategories;
  };

  const addIncome = (amount: number, description: string) => {
    if (amount <= 0) {
      toast({
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

    toast({
      title: "Income added",
      description: `$${amount.toFixed(2)} has been distributed to your categories`,
    });
  };

  const withdrawFromCategory = (categoryId: string, amount: number, description: string) => {
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      });
      return;
    }

    const categoryIndex = budget.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) {
      toast({
        title: "Category not found",
        description: "The selected category doesn't exist",
        variant: "destructive",
      });
      return;
    }

    const category = budget.categories[categoryIndex];
    if (category.amount < amount) {
      toast({
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

    toast({
      title: "Withdrawal successful",
      description: `$${amount.toFixed(2)} withdrawn from ${category.name}`,
    });
  };

  const addCategory = (categoryData: Omit<Category, 'id' | 'amount'>) => {
    const totalPercentage = budget.categories.reduce((sum, cat) => sum + cat.percentage, 0);
    
    if (totalPercentage + categoryData.percentage > 100) {
      toast({
        title: "Invalid percentage",
        description: "Total allocation cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    const newCategory: Category = {
      id: uuidv4(),
      amount: 0, // New categories start with $0
      ...categoryData,
    };

    setBudget(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));

    toast({
      title: "Category added",
      description: `${categoryData.name} has been added to your budget`,
    });
  };

  const updateCategory = (updatedCategory: Category) => {
    const categories = [...budget.categories];
    const index = categories.findIndex(c => c.id === updatedCategory.id);
    
    if (index === -1) {
      toast({
        title: "Category not found",
        description: "The category you're trying to update doesn't exist",
        variant: "destructive",
      });
      return;
    }

    // Calculate total percentage without this category
    const otherCategoriesPercentage = categories
      .filter(c => c.id !== updatedCategory.id)
      .reduce((sum, cat) => sum + cat.percentage, 0);

    if (otherCategoriesPercentage + updatedCategory.percentage > 100) {
      toast({
        title: "Invalid percentage",
        description: "Total allocation cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    categories[index] = updatedCategory;

    setBudget(prev => ({
      ...prev,
      categories,
    }));

    toast({
      title: "Category updated",
      description: `${updatedCategory.name} has been updated`,
    });
  };

  const deleteCategory = (categoryId: string) => {
    const categoryIndex = budget.categories.findIndex(c => c.id === categoryId);
    
    if (categoryIndex === -1) {
      toast({
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
      // Distribute proportionally based on percentage
      const totalPercentage = updatedCategories.reduce((sum, cat) => sum + cat.percentage, 0);
      
      updatedCategories.forEach((category, index) => {
        const proportion = category.percentage / totalPercentage;
        updatedCategories[index] = {
          ...category,
          amount: category.amount + (remainingAmount * proportion),
        };
      });
    }

    setBudget(prev => ({
      ...prev,
      categories: updatedCategories,
    }));

    toast({
      title: "Category deleted",
      description: `${categoryToDelete.name} has been deleted and funds redistributed`,
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
