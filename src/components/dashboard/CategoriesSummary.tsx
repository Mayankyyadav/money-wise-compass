
import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Progress } from '@/components/ui/progress';
import { 
  PiggyBank, Home, ShoppingCart, Coffee, CreditCard, Tv, TrendingUp, CircleDollarSign
} from 'lucide-react';

const CategoriesSummary = () => {
  const { budget } = useFinance();
  const { categories, totalBalance } = budget;

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'piggy-bank': return <PiggyBank className="h-5 w-5" />;
      case 'home': return <Home className="h-5 w-5" />;
      case 'shopping-cart': return <ShoppingCart className="h-5 w-5" />;
      case 'coffee': return <Coffee className="h-5 w-5" />;
      case 'credit-card': return <CreditCard className="h-5 w-5" />;
      case 'tv': return <Tv className="h-5 w-5" />;
      case 'trending-up': return <TrendingUp className="h-5 w-5" />;
      case 'circle-dollar-sign': return <CircleDollarSign className="h-5 w-5" />;
      default: return <CircleDollarSign className="h-5 w-5" />;
    }
  };

  return (
    <div className="finance-card">
      <h2 className="text-xl font-semibold mb-4">Categories Overview</h2>
      
      <div className="space-y-5">
        {categories.map(category => {
          const percentage = totalBalance > 0 
            ? (category.amount / totalBalance) * 100 
            : 0;
            
          return (
            <div key={category.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div 
                    className="p-2 mr-3 rounded-full" 
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <div style={{ color: category.color }}>
                      {getIconComponent(category.icon)}
                    </div>
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <span className="font-bold">${category.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{category.percentage}% of Income</span>
                <span>{percentage.toFixed(1)}% of Total</span>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
                indicatorClassName="bg-gradient-to-r" 
                style={{ 
                  background: `${category.color}20`,
                  '--tw-gradient-from': `${category.color}80`,
                  '--tw-gradient-to': category.color,
                } as React.CSSProperties}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesSummary;
