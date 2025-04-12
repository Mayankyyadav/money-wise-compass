
import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const TransactionsHistory = () => {
  const { budget } = useFinance();
  const { transactions, categories } = budget;

  const getCategoryNameById = (categoryId?: string) => {
    if (!categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  return (
    <div className="finance-card">
      <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No transactions yet</p>
        ) : (
          transactions.map(transaction => (
            <div 
              key={transaction.id}
              className="p-3 rounded-lg border flex items-center justify-between"
            >
              <div className="flex items-center">
                {transaction.type === 'income' ? (
                  <ArrowDownCircle className="h-8 w-8 text-green-500 mr-3" />
                ) : (
                  <ArrowUpCircle className="h-8 w-8 text-red-500 mr-3" />
                )}
                <div>
                  <div className="font-medium">
                    {transaction.type === 'income' ? 'Income' : `Withdrawal from ${getCategoryNameById(transaction.category)}`}
                  </div>
                  <div className="text-sm text-muted-foreground">{transaction.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                  {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(transaction.date, 'MMM d, yyyy - h:mm a')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionsHistory;
