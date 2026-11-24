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
  food: { label: 'Food', icon: '', tone: '#b45309' },
  travel: { label: 'Travel', icon: '', tone: '#0e7490' },
  rent: { label: 'Rent', icon: '', tone: '#0f766e' },
  business: { label: 'Business', icon: '', tone: '#047857' },
  personal: { label: 'Personal', icon: '', tone: '#0e7490' },
  other: { label: 'Other', icon: '', tone: '#5f6f68' },
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
  /** Optional repayment deadline (YYYY-MM-DD) */
  dueDate?: string | null;
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
  /** Optional deadline for clearing the open balance (YYYY-MM-DD) */
  dueDate?: string | null;
  transactions: Transaction[];
  /** Soft-deleted + active with full history for audit UI */
  allTransactions?: Transaction[];
  createdAt: string;
  role?: 'owner' | 'peer';
  peerLinked?: boolean;
  peerUserId?: string;
  ownerName?: string;
  ownerUserId?: string;
  /** Practice example seeded for new accounts — not a real person */
  isSample?: boolean;
  /**
   * Display avatar preset. For linked peers this is their account avatar;
   * for unsigned-up friends it's a local pick (only on your ledger).
   */
  avatarSeed?: string;
  /** True when avatar comes from a linked Udharwale user (not editable locally) */
  avatarLocked?: boolean;
}

export type ReminderUrgency = 'overdue' | 'today' | 'upcoming';

export interface BalanceReminder {
  id: string;
  contactId: string;
  contactName: string;
  dueDate: string;
  amount: number;
  direction: 'receive' | 'pay';
  source: 'contact' | 'transaction';
  remark?: string;
  urgency: ReminderUrgency;
  daysUntil: number;
}

export type ActiveTab = 'ledgers' | 'trips' | 'activity' | 'insights' | 'settings';
