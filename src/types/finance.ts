
export interface Category {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  color: string;
  icon: string;
  maxAmount?: number;
  priority?: number; // Lower number means higher priority
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'withdrawal' | 'payment';
  category?: string;
  date: Date;
  description: string;
}

export interface ScheduledPayment {
  id: string;
  amount: number;
  category: string;
  description: string;
  nextDate: Date;
  recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  time?: string; // Time in HH:MM format
  active: boolean;
}

export interface UserBudget {
  totalBalance: number;
  dailyAmount: number;
  categories: Category[];
  transactions: Transaction[];
  scheduledPayments: ScheduledPayment[];
}
