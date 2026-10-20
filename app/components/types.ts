export type ModeType = 'Cash' | 'Online Transfer';

export interface Transaction {
  id: string;
  amount: number;
  type: 'gave' | 'got'; // 'gave' = you lent (they owe you, green), 'got' = you borrowed (you owe them, red)
  remark: string;
  date: string;         // User-selected event date (YYYY-MM-DD) — when the money moved
  createdAt?: string;   // System logged timestamp (ISO) — when the record was created
  mode: ModeType;
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
