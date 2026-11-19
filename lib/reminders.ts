import { BalanceReminder, Contact, ReminderUrgency } from '@/app/components/types';

function todayYmd(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(fromYmd: string, toYmd: string) {
  const from = new Date(`${fromYmd}T00:00:00`);
  const to = new Date(`${toYmd}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function urgencyFor(daysUntil: number): ReminderUrgency {
  if (daysUntil < 0) return 'overdue';
  if (daysUntil === 0) return 'today';
  return 'upcoming';
}

function contactBalance(contact: Contact) {
  return contact.transactions.reduce((sum, tx) => {
    return sum + (tx.type === 'gave' ? tx.amount : -tx.amount);
  }, 0);
}

/**
 * Build in-app due reminders from contact-level and transaction-level due dates.
 * Only open balances / unsettled-direction entries are included.
 */
export function buildBalanceReminders(
  contacts: Contact[],
  options?: { upcomingDays?: number; now?: Date }
): BalanceReminder[] {
  const upcomingDays = options?.upcomingDays ?? 14;
  const today = todayYmd(options?.now);
  const reminders: BalanceReminder[] = [];

  for (const contact of contacts) {
    const balance = Math.round(contactBalance(contact) * 100) / 100;
    if (Math.abs(balance) <= 0.01) continue;

    const direction: 'receive' | 'pay' = balance > 0 ? 'receive' : 'pay';
    const amount = Math.abs(balance);

    if (contact.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(contact.dueDate)) {
      const daysUntil = daysBetween(today, contact.dueDate);
      if (daysUntil <= upcomingDays) {
        reminders.push({
          id: `contact_${contact.id}`,
          contactId: contact.id,
          contactName: contact.name,
          dueDate: contact.dueDate,
          amount,
          direction,
          source: 'contact',
          remark: 'Open balance due',
          urgency: urgencyFor(daysUntil),
          daysUntil,
        });
      }
    }

    for (const tx of contact.transactions) {
      if (!tx.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(tx.dueDate)) continue;

      // Only remind for entries that still align with the open balance direction
      const txDirection: 'receive' | 'pay' = tx.type === 'gave' ? 'receive' : 'pay';
      if (txDirection !== direction) continue;

      const daysUntil = daysBetween(today, tx.dueDate);
      if (daysUntil > upcomingDays) continue;

      reminders.push({
        id: `tx_${contact.id}_${tx.id}`,
        contactId: contact.id,
        contactName: contact.name,
        dueDate: tx.dueDate,
        amount: tx.amount,
        direction: txDirection,
        source: 'transaction',
        remark: tx.remark,
        urgency: urgencyFor(daysUntil),
        daysUntil,
      });
    }
  }

  const urgencyRank: Record<ReminderUrgency, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
  };

  return reminders.sort((a, b) => {
    if (urgencyRank[a.urgency] !== urgencyRank[b.urgency]) {
      return urgencyRank[a.urgency] - urgencyRank[b.urgency];
    }
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return b.amount - a.amount;
  });
}

export function formatReminderLabel(reminder: BalanceReminder) {
  if (reminder.urgency === 'overdue') {
    const days = Math.abs(reminder.daysUntil);
    return days === 1 ? '1 day overdue' : `${days} days overdue`;
  }
  if (reminder.urgency === 'today') return 'Due today';
  if (reminder.daysUntil === 1) return 'Due tomorrow';
  return `Due in ${reminder.daysUntil} days`;
}
