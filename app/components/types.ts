export type CategoryType = 'Food' | 'Shopping' | 'Travel' | 'Rent' | 'Cash' | 'Business' | 'Other';

export interface Transaction {
  id: string;
  amount: number;
  type: 'gave' | 'got'; // 'gave' = you lent (they owe you, green), 'got' = you borrowed (you owe them, red)
  description: string;
  date: string;         // YYYY-MM-DD format
  category: CategoryType;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  transactions: Transaction[];
  createdAt: string;
}

export type ActiveTab = 'ledgers' | 'insights' | 'settings';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];
