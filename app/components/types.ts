export type ModeType = 'Cash' | 'Online Transfer';

export type LedgerCategory =
  | 'food'
  | 'travel'
  | 'rent'
  | 'business'
  | 'personal'
  | 'other';

export const LEDGER_CATEGORIES: LedgerCategory[] = [
  'food',
  'travel',
  'rent',
  'business',
  'personal',
  'other',
];

export const LEDGER_CATEGORY_CONFIG: Record<
  LedgerCategory,
  { label: string; icon: string; tone: string }
> = {
  food: { label: 'Food', icon: '🍽️', tone: '#f97316' },
  travel: { label: 'Travel', icon: '🚕', tone: '#06b6d4' },
  rent: { label: 'Rent', icon: '🏠', tone: '#8b5cf6' },
  business: { label: 'Business', icon: '💼', tone: '#10b981' },
  personal: { label: 'Personal', icon: '🤝', tone: '#ec4899' },
  other: { label: 'Other', icon: '🧾', tone: '#64748b' },
};

export interface TxHistoryEntry {
  at: string;
  byUserId: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'gave' | 'got'; // 'gave' = you lent (they owe you, green), 'got' = you borrowed (you owe them, red)
  remark: string;
  date: string;         // User-selected event date (YYYY-MM-DD) — when the money moved
  createdAt?: string;   // System logged timestamp (ISO) — when the record was created
  mode: ModeType;
  category?: LedgerCategory;
  updatedAt?: string;
  deletedAt?: string | null;
  createdByUserId?: string;
  updatedByUserId?: string;
  deletedByUserId?: string;
  history?: TxHistoryEntry[];
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  shareToken?: string;
  transactions: Transaction[];
  /** Soft-deleted + active with full history for audit UI */
  allTransactions?: Transaction[];
  createdAt: string;
  role?: 'owner' | 'peer';
  peerLinked?: boolean;
  peerUserId?: string;
  ownerName?: string;
  ownerUserId?: string;
}

export type ActiveTab = 'ledgers' | 'trips' | 'insights' | 'settings';
