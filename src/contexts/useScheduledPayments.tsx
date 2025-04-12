
import { v4 as uuidv4 } from 'uuid';
import { ScheduledPayment, UserBudget } from '@/types/finance';
import { Toast } from '@/hooks/use-toast';

export const useScheduledPayments = (
  budget: UserBudget,
  setBudget: React.Dispatch<React.SetStateAction<UserBudget>>,
  uiToast: Toast,
  processPayment: (
    currentBudget: UserBudget,
    amount: number,
    description: string,
    preferredCategoryId?: string,
    fallbackCategoryId?: string
  ) => any
) => {
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

  return {
    schedulePayment,
    toggleScheduledPayment,
    cancelScheduledPayment
  };
};
