import { Contact } from './types';

export type ExpenseCategory =
  | 'food'
  | 'stay'
  | 'transport'
  | 'activities'
  | 'shopping'
  | 'drinks'
  | 'general';

export interface TripParticipant {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  contactId?: string; // Optional link to an existing Udharwale contact
  phone?: string;
  avatarColor?: string;
}

export interface ExpensePayer {
  participantId: string;
  amount: number;
}

export interface ExpenseSplit {
  participantId: string;
  amount: number; // Exact amount owed by this participant for this item
}

export interface TripExpense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  paidBy: ExpensePayer[]; // Supports single or multiple/partial payers
  splitType: 'equal' | 'custom';
  splitAmong: ExpenseSplit[]; // Participants who split the bill and their share
  notes?: string;
  createdAt: string;
}

export interface SettlementDebt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  fromContactId?: string;
  toContactId?: string;
  settled?: boolean;
}

export interface ParticipantSummary {
  participant: TripParticipant;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // totalPaid - totalShare (> 0: gets back, < 0: owes)
}

export interface TripSummary {
  totalSpend: number;
  perHeadAverage: number;
  categoryTotals: Record<ExpenseCategory, number>;
  participantSummaries: ParticipantSummary[];
  settlements: SettlementDebt[];
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  currency: string;
  participants: TripParticipant[];
  expenses: TripExpense[];
  shareToken?: string;
  status: 'active' | 'settled' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: string; tone: string; bg: string }
> = {
  food: { label: 'Food & Dining', icon: '🍽️', tone: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  stay: { label: 'Stay & Hotels', icon: '🏨', tone: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  transport: { label: 'Travel & Cabs', icon: '🚕', tone: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  activities: { label: 'Activities & Fun', icon: '🎟️', tone: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  drinks: { label: 'Drinks & Nightlife', icon: '🍹', tone: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  shopping: { label: 'Shopping & Groceries', icon: '🛍️', tone: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  general: { label: 'General / Misc', icon: '🧾', tone: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

/**
 * Calculate full summary for a trip including per-head calculations,
 * individual totals, and simplified minimal debt settlement.
 */
export function calculateTripSummary(trip: Trip): TripSummary {
  const totalSpend = Math.round(
    trip.expenses.reduce((acc, item) => acc + (Number(item.amount) || 0), 0) * 100
  ) / 100;

  const perHeadAverage =
    trip.participants.length > 0
      ? Math.round((totalSpend / trip.participants.length) * 100) / 100
      : 0;

  const categoryTotals: Record<ExpenseCategory, number> = {
    food: 0,
    stay: 0,
    transport: 0,
    activities: 0,
    drinks: 0,
    shopping: 0,
    general: 0,
  };

  trip.expenses.forEach((expense) => {
    const cat = expense.category || 'general';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(expense.amount) || 0);
  });

  // Calculate each participant's out-of-pocket paid and total consumption share
  const participantSummaries: ParticipantSummary[] = trip.participants.map((p) => {
    let totalPaid = 0;
    let totalShare = 0;

    trip.expenses.forEach((expense) => {
      // Amount paid by this participant for this item
      const payerEntry = expense.paidBy.find((payer) => payer.participantId === p.id);
      if (payerEntry) {
        totalPaid += Number(payerEntry.amount) || 0;
      }

      // Fair share of this participant for this item
      const splitEntry = expense.splitAmong.find((s) => s.participantId === p.id);
      if (splitEntry) {
        totalShare += Number(splitEntry.amount) || 0;
      }
    });

    totalPaid = Math.round(totalPaid * 100) / 100;
    totalShare = Math.round(totalShare * 100) / 100;
    const netBalance = Math.round((totalPaid - totalShare) * 100) / 100;

    return {
      participant: p,
      totalPaid,
      totalShare,
      netBalance,
    };
  });

  // Simplified Debt Settlement (Greedy Debt Minimization)
  const debtors: { id: string; name: string; contactId?: string; balance: number }[] = [];
  const creditors: { id: string; name: string; contactId?: string; balance: number }[] = [];

  participantSummaries.forEach((s) => {
    if (s.netBalance < -0.01) {
      debtors.push({
        id: s.participant.id,
        name: s.participant.name,
        contactId: s.participant.contactId,
        balance: Math.abs(s.netBalance),
      });
    } else if (s.netBalance > 0.01) {
      creditors.push({
        id: s.participant.id,
        name: s.participant.name,
        contactId: s.participant.contactId,
        balance: s.netBalance,
      });
    }
  });

  // Sort descending to settle largest amounts first
  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  const settlements: SettlementDebt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amount = Math.min(debtor.balance, creditor.balance);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount > 0) {
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        fromContactId: debtor.contactId,
        toContactId: creditor.contactId,
        amount: roundedAmount,
      });
    }

    debtor.balance = Math.round((debtor.balance - amount) * 100) / 100;
    creditor.balance = Math.round((creditor.balance - amount) * 100) / 100;

    if (debtor.balance <= 0.01) dIdx++;
    if (creditor.balance <= 0.01) cIdx++;
  }

  return {
    totalSpend,
    perHeadAverage,
    categoryTotals,
    participantSummaries,
    settlements,
  };
}

/**
 * Formats a clean, readable text message ready to paste in WhatsApp, Telegram, or SMS.
 */
export function formatWhatsAppSummary(trip: Trip, userName?: string): string {
  const summary = calculateTripSummary(trip);
  const currency = trip.currency || '₹';

  let text = `✈️ *${trip.name.toUpperCase()}* — Expense Breakdown\n`;
  if (trip.destination) text += `📍 Destination: ${trip.destination}\n`;
  text += `👥 Members: ${trip.participants.map((p) => p.name).join(', ')}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *Total Trip Spend:* ${currency}${summary.totalSpend.toLocaleString('en-IN')}\n`;
  text += `👤 *Average Per Head:* ${currency}${summary.perHeadAverage.toLocaleString('en-IN')}\n\n`;

  text += `📊 *Who Paid What (Out of Pocket):*\n`;
  summary.participantSummaries.forEach((s) => {
    const badge = s.netBalance > 0 ? `(+${currency}${s.netBalance.toLocaleString('en-IN')})` : s.netBalance < 0 ? `(-${currency}${Math.abs(s.netBalance).toLocaleString('en-IN')})` : '(Settled)';
    text += `• *${s.participant.name}*: Paid ${currency}${s.totalPaid.toLocaleString('en-IN')} | Share ${currency}${s.totalShare.toLocaleString('en-IN')} ${badge}\n`;
  });

  text += `\n⚖️ *Final Settlement (Who Pays Whom):*\n`;
  if (summary.settlements.length === 0) {
    text += `✨ Everyone is all settled up! No pending payments.\n`;
  } else {
    summary.settlements.forEach((st) => {
      text += `👉 *${st.fromName}* owes *${st.toName}*: ${currency}${st.amount.toLocaleString('en-IN')}\n`;
    });
  }

  text += `\n🧾 *All Expenses (${trip.expenses.length} items):*\n`;
  trip.expenses.forEach((item, i) => {
    const payerNames = item.paidBy
      .map((p) => {
        const name = trip.participants.find((pt) => pt.id === p.participantId)?.name || 'Someone';
        return `${name} (${currency}${p.amount.toLocaleString('en-IN')})`;
      })
      .join(' + ');

    const perHeadForItem = item.splitAmong.length > 0 ? Math.round((item.amount / item.splitAmong.length) * 100) / 100 : item.amount;

    text += `${i + 1}. *${item.title}*: ${currency}${item.amount.toLocaleString('en-IN')}\n`;
    text += `   💳 Paid by: ${payerNames}\n`;
    text += `   👥 ${currency}${perHeadForItem.toLocaleString('en-IN')}/head for ${item.splitAmong.length} friends\n`;
  });

  text += `\n✨ *Calculated transparently with Udharwale*`;
  return text;
}

/**
 * Creates an inspiring sample trip (e.g. Goa Trip) with partial payments for demo & testing
 */
export function getDemoTrip(currentUserName = 'You', contacts: Contact[] = []): Trip {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const p1: TripParticipant = {
    id: 'p_you',
    name: currentUserName || 'You',
    isCurrentUser: true,
    avatarColor: 'from-violet-500 to-indigo-600',
  };

  const friend1 = contacts[0]?.name || 'Rahul';
  const friend2 = contacts[1]?.name || 'Aman';
  const friend3 = contacts[2]?.name || 'Priya';

  const p2: TripParticipant = {
    id: 'p_rahul',
    name: friend1,
    contactId: contacts[0]?.id,
    avatarColor: 'from-emerald-500 to-teal-600',
  };
  const p3: TripParticipant = {
    id: 'p_aman',
    name: friend2,
    contactId: contacts[1]?.id,
    avatarColor: 'from-amber-500 to-orange-600',
  };
  const p4: TripParticipant = {
    id: 'p_priya',
    name: friend3,
    contactId: contacts[2]?.id,
    avatarColor: 'from-pink-500 to-rose-600',
  };

  const participants = [p1, p2, p3, p4];

  // Equal split helper across all 4
  const equalSplit4 = (amt: number): ExpenseSplit[] => {
    const each = Math.round((amt / 4) * 100) / 100;
    return participants.map((p) => ({ participantId: p.id, amount: each }));
  };

  const expenses: TripExpense[] = [
    {
      id: 'exp_1',
      title: 'Beachside Villa Stay (3 Nights)',
      category: 'stay',
      amount: 16000,
      date: dateStr,
      paidBy: [{ participantId: 'p_you', amount: 16000 }],
      splitType: 'equal',
      splitAmong: equalSplit4(16000),
      notes: 'Includes pool, AC & breakfast',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'exp_2',
      title: 'Grand Seafood Dinner at Shack',
      category: 'food',
      amount: 5000,
      date: dateStr,
      // PARTIAL PAYMENT SHOWCASE: User paid 2000, Rahul paid 3000!
      paidBy: [
        { participantId: 'p_you', amount: 2000 },
        { participantId: 'p_rahul', amount: 3000 },
      ],
      splitType: 'equal',
      splitAmong: equalSplit4(5000), // 1250 each
      notes: 'Split bill at checkout: You paid 2000 cash, Rahul card 3000',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'exp_3',
      title: 'Airport Cab & Tolls',
      category: 'transport',
      amount: 2400,
      date: dateStr,
      paidBy: [{ participantId: 'p_rahul', amount: 2400 }],
      splitType: 'equal',
      splitAmong: equalSplit4(2400), // 600 each
      notes: 'Innova ride from Dabolim to Anjuna',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: 'exp_4',
      title: 'Water Sports & Parasailing',
      category: 'activities',
      amount: 4500,
      date: dateStr,
      paidBy: [{ participantId: 'p_aman', amount: 4500 }],
      splitType: 'custom',
      // Priya skipped water sports: split among You, Rahul, Aman (1500 each)
      splitAmong: [
        { participantId: 'p_you', amount: 1500 },
        { participantId: 'p_rahul', amount: 1500 },
        { participantId: 'p_aman', amount: 1500 },
      ],
      notes: 'Baga beach combo (Priya opted out)',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  return {
    id: 'trip_demo_goa',
    name: 'Goa Getaway 🏖️',
    description: 'Weekend beach vacation with friends',
    destination: 'North Goa',
    startDate: dateStr,
    currency: '₹',
    participants,
    expenses,
    shareToken: 'demo_goa_share_' + Math.random().toString(36).substring(2, 9),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

