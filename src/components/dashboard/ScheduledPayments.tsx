
import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { format } from 'date-fns';
import { CalendarClock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const ScheduledPayments = () => {
  const { budget, toggleScheduledPayment, cancelScheduledPayment } = useFinance();
  const { scheduledPayments, categories } = budget;

  const getCategoryNameById = (categoryId?: string) => {
    if (!categoryId) return 'Auto';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  if (scheduledPayments.length === 0) {
    return null;
  }

  return (
    <div className="finance-card mt-6">
      <h2 className="text-xl font-semibold flex items-center mb-4">
        <CalendarClock className="mr-2 h-5 w-5 text-primary" />
        Upcoming Payments
      </h2>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {scheduledPayments.map(payment => (
          <div 
            key={payment.id}
            className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium">{payment.description}</span>
                <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${payment.recurring ? 'bg-primary/10 text-primary' : 'bg-gray-100'}`}>
                  {payment.recurring ? `${payment.frequency}` : 'once'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 mt-1">
                <span>
                  {format(payment.nextDate, 'MMM d, yyyy')} at {payment.time || '12:00'}
                </span>
                <span>
                  Amount: <span className="font-semibold">${payment.amount.toFixed(2)}</span>
                </span>
                <span>
                  From: {getCategoryNameById(payment.category)}
                </span>
                {payment.fallbackCategories && payment.fallbackCategories.length > 0 && (
                  <span className="w-full mt-1">
                    Fallbacks: {payment.fallbackCategories.map(catId => getCategoryNameById(catId)).join(', ')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id={`active-${payment.id}`}
                  checked={payment.active}
                  onCheckedChange={(checked) => toggleScheduledPayment(payment.id, checked)}
                />
                <span className="text-sm">{payment.active ? 'Active' : 'Paused'}</span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="text-destructive"
                onClick={() => cancelScheduledPayment(payment.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduledPayments;
