export type ModeType = 'Cash' | 'Online Transfer';

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
