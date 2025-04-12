
import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { WalletCards, Wallet, DollarSign, CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';

const DashboardHeader = () => {
  const { budget, getDailyBalance } = useFinance();
  const dailyBalance = getDailyBalance();
  
  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
            <WalletCards className="mr-2 h-8 w-8 text-primary" />
            Smart Money Alchemist
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="finance-stat-card flex items-center">
          <Wallet className="h-10 w-10 text-primary mr-4" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
            <h3 className="text-2xl font-bold">${budget.totalBalance.toFixed(2)}</h3>
          </div>
        </div>
        
        <div className="finance-stat-card flex items-center">
          <DollarSign className="h-10 w-10 text-secondary mr-4" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Daily Available</p>
            <h3 className="text-2xl font-bold">${dailyBalance.toFixed(2)}</h3>
          </div>
        </div>
        
        <div className="finance-stat-card flex items-center">
          <Clock className="h-10 w-10 text-accent mr-4" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Last Transaction</p>
            <h3 className="text-lg font-medium">
              {budget.transactions.length > 0 
                ? format(budget.transactions[0].date, 'MMM d, h:mm a')
                : 'No transactions'}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
