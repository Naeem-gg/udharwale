import type { Contact, Transaction } from '@/app/components/types';
import type { Trip } from '@/app/components/trip-types';

export type ActivityKind =
  | 'tx_create'
  | 'tx_update'
  | 'tx_delete'
  | 'tx_restore'
  | 'contact_created'
  | 'trip_created'
  | 'expense_added'
  | 'settlement_paid';

export type ActivityFilter = 'all' | 'money' | 'trips' | 'people';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string; // ISO timestamp for sorting
  title: string;
  subtitle: string;
  amount?: number;
  amountTone?: 'credit' | 'debit' | 'neutral';
  contactId?: string;
  tripId?: string;
  transactionId?: string;
  /** Practice example — not real ledger activity */
  isSample?: boolean;
};

const MONEY_KINDS: ActivityKind[] = ['tx_create', 'tx_update', 'tx_delete', 'tx_restore', 'settlement_paid'];
const TRIP_KINDS: ActivityKind[] = ['trip_created', 'expense_added', 'settlement_paid'];
const PEOPLE_KINDS: ActivityKind[] = ['contact_created', 'tx_create', 'tx_update', 'tx_delete', 'tx_restore'];

function txStamp(tx: Transaction, fallbackAction: 'create' | 'update' | 'delete' | 'restore') {
  const fromHistory = [...(tx.history || [])]
    .filter((h) => h.action === fallbackAction)
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))[0];
  if (fromHistory?.at) return fromHistory.at;
  if (fallbackAction === 'delete' && tx.deletedAt) return tx.deletedAt;
  if (fallbackAction === 'update' && tx.updatedAt) return tx.updatedAt;
  if (tx.createdAt) return tx.createdAt;
  return `${tx.date}T12:00:00`;
}

function formatMoney(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN')}`;
}

export function buildActivityFeed(contacts: Contact[], trips: Trip[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const contact of contacts) {
    const sample = Boolean(contact.isSample);
    items.push({
      id: `contact-create-${contact.id}`,
      kind: 'contact_created',
      at: contact.createdAt || new Date(0).toISOString(),
      title: sample ? 'Sample friend added' : 'Added a friend',
      subtitle: sample ? `Example · ${contact.name}` : contact.name,
      contactId: contact.id,
      isSample: sample,
    });

    const txs = contact.allTransactions || contact.transactions || [];
    for (const tx of txs) {
      const history = tx.history?.length
        ? tx.history
        : [
            {
              at: txStamp(tx, 'create'),
              byUserId: tx.createdByUserId || '',
              action: 'create' as const,
            },
          ];

      // Prefer history entries for a professional audit trail
      const seen = new Set<string>();
      for (const entry of history) {
        const key = `${entry.action}-${entry.at}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const kind: ActivityKind =
          entry.action === 'create'
            ? 'tx_create'
            : entry.action === 'update'
              ? 'tx_update'
              : entry.action === 'delete'
                ? 'tx_delete'
                : 'tx_restore';

        const verb =
          entry.action === 'create'
            ? tx.type === 'gave'
              ? sample
                ? 'Sample · money given'
                : 'Logged money given'
              : sample
                ? 'Sample · money received'
                : 'Logged money received'
            : entry.action === 'update'
              ? 'Updated a payment'
              : entry.action === 'delete'
                ? 'Removed a payment'
                : 'Restored a payment';

        const remark = tx.remark?.trim();
        const nameLabel = sample ? `Example · ${contact.name}` : contact.name;
        items.push({
          id: `tx-${tx.id}-${entry.action}-${entry.at}`,
          kind,
          at: entry.at || txStamp(tx, entry.action),
          title: verb,
          subtitle: remark ? `${nameLabel} · ${remark}` : nameLabel,
          amount: tx.amount,
          amountTone:
            entry.action === 'delete'
              ? 'neutral'
              : tx.type === 'gave'
                ? 'credit'
                : 'debit',
          contactId: contact.id,
          transactionId: tx.id,
          isSample: sample,
        });
      }
    }
  }

  for (const trip of trips) {
    const sample = Boolean(trip.isSample);
    if (trip.createdAt) {
      items.push({
        id: `trip-create-${trip.id}`,
        kind: 'trip_created',
        at: typeof trip.createdAt === 'string' ? trip.createdAt : new Date(trip.createdAt).toISOString(),
        title: sample ? 'Sample trip added' : 'Created a trip',
        subtitle: trip.destination ? `${trip.name} · ${trip.destination}` : trip.name,
        tripId: trip.id,
        isSample: sample,
      });
    }

    for (const expense of trip.expenses || []) {
      items.push({
        id: `expense-${trip.id}-${expense.id}`,
        kind: 'expense_added',
        at: expense.createdAt || `${expense.date}T12:00:00`,
        title: sample ? 'Sample trip expense' : 'Added a trip expense',
        subtitle: `${trip.name} · ${expense.title}`,
        amount: expense.amount,
        amountTone: 'neutral',
        tripId: trip.id,
        isSample: sample,
      });
    }

    for (const settlement of trip.settlements || []) {
      const payments = settlement.payments?.length
        ? settlement.payments
        : settlement.settledAt
          ? [
              {
                id: `legacy-${settlement.id}`,
                amount: settlement.paidAmount || settlement.amount,
                paidAt: settlement.settledAt,
              },
            ]
          : [];

      for (const payment of payments) {
        items.push({
          id: `settle-${trip.id}-${settlement.id}-${payment.id}`,
          kind: 'settlement_paid',
          at: payment.paidAt,
          title: sample
            ? 'Sample trip settlement'
            : settlement.isSettled
              ? 'Settled a trip balance'
              : 'Partial trip settlement',
          subtitle: `${trip.name} · ${settlement.fromName} → ${settlement.toName}`,
          amount: payment.amount,
          amountTone: 'neutral',
          tripId: trip.id,
          isSample: sample,
        });
      }
    }
  }

  return items
    .filter((item) => item.at && !Number.isNaN(+new Date(item.at)))
    .sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

export function filterActivityFeed(items: ActivityItem[], filter: ActivityFilter) {
  if (filter === 'all') return items;
  if (filter === 'money') return items.filter((i) => MONEY_KINDS.includes(i.kind));
  if (filter === 'trips') return items.filter((i) => TRIP_KINDS.includes(i.kind));
  return items.filter((i) => PEOPLE_KINDS.includes(i.kind));
}

export function groupActivityByDay(items: ActivityItem[]) {
  const groups: { label: string; items: ActivityItem[] }[] = [];
  const map = new Map<string, ActivityItem[]>();

  const today = new Date();
  const todayKey = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  for (const item of items) {
    const d = new Date(item.at);
    const key = d.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  for (const [key, list] of map) {
    let label = key;
    if (key === todayKey) label = 'Today';
    else if (key === yesterdayKey) label = 'Yesterday';
    else {
      label = new Date(key).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: new Date(key).getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
    groups.push({ label, items: list });
  }

  return groups;
}

export function formatActivityTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatActivityAmount(item: ActivityItem) {
  if (item.amount == null) return null;
  const sign =
    item.amountTone === 'credit' ? '+' : item.amountTone === 'debit' ? '−' : '';
  return `${sign}${formatMoney(item.amount)}`;
}
