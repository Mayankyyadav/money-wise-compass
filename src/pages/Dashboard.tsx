
import React, { useState } from 'react';
import { FinanceProvider } from '@/contexts/FinanceContext';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import CategoriesSummary from '@/components/dashboard/CategoriesSummary';
import CategoryDistribution from '@/components/dashboard/CategoryDistribution';
import TransactionsHistory from '@/components/dashboard/TransactionsHistory';
import ScheduledPayments from '@/components/dashboard/ScheduledPayments';
import AddIncomeForm from '@/components/forms/AddIncomeForm';
import WithdrawForm from '@/components/forms/WithdrawForm';
import PaymentForm from '@/components/forms/PaymentForm';
import CategoryForm from '@/components/forms/CategoryForm';
import CategoryPriorityForm from '@/components/forms/CategoryPriorityForm';
import { Category } from '@/types/finance';
import { useFinance } from '@/contexts/FinanceContext';

// This component needs to be nested inside FinanceProvider
const DashboardContent = () => {
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | undefined>(undefined);
  const { budget } = useFinance();

  const handleAddCategory = () => {
    setCategoryToEdit(undefined);
    setCategoryFormOpen(true);
  };

  const handleEditCategory = (categoryId: string) => {
    const category = budget.categories.find(c => c.id === categoryId);
    if (category) {
      setCategoryToEdit(category);
      setCategoryFormOpen(true);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader />
      
      <div className="flex flex-wrap justify-end gap-2 my-6">
        <AddIncomeForm />
        <WithdrawForm />
        <PaymentForm />
        <CategoryPriorityForm />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <CategoryDistribution 
            onAddCategory={handleAddCategory} 
            onEditCategory={handleEditCategory} 
          />
          <ScheduledPayments />
        </div>
        <div>
          <CategoriesSummary />
        </div>
      </div>
      
      <div>
        <TransactionsHistory />
      </div>
      
      <CategoryForm 
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        categoryToEdit={categoryToEdit}
      />
    </div>
  );
};

const Dashboard = () => {
  return (
    <FinanceProvider>
      <DashboardContent />
    </FinanceProvider>
  );
};

export default Dashboard;
