
export interface Category {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'withdrawal';
  category?: string;
  date: Date;
  description: string;
}

export interface UserBudget {
  totalBalance: number;
  dailyAmount: number;
  categories: Category[];
  transactions: Transaction[];
}
