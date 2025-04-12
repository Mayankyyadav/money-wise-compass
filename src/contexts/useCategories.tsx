
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Category, UserBudget } from '@/types/finance';
import { toast as uiToastType } from '@/hooks/use-toast';

export const DEFAULT_CATEGORIES: Category[] = [
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

export const useCategories = (
  budget: UserBudget, 
  setBudget: React.Dispatch<React.SetStateAction<UserBudget>>,
  uiToast: typeof uiToastType
) => {
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

  return {
    addCategory,
    updateCategory,
    deleteCategory,
    updateCategoryPriorities,
    distributeIncome
  };
};
