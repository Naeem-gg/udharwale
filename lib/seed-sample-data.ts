import Contact from '@/models/Contact';
import Trip from '@/models/Trip';
import { INITIAL_CONTACTS } from '@/app/components/mockData';
import { getDemoTrip } from '@/app/components/trip-types';
import { AVATAR_PRESETS } from '@/lib/avatar-presets';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function isoDaysAgo(n: number, hour = 12) {
  const d = daysAgo(n);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function ymdDaysAgo(n: number) {
  return daysAgo(n).toISOString().slice(0, 10);
}

function sampleRemark(remark: string) {
  const cleaned = remark.replace(/^🤝\s*/, '').trim();
  if (cleaned.toLowerCase().startsWith('sample')) return cleaned;
  return `Sample · ${cleaned}`;
}

/**
 * Seeds clearly-marked practice contacts + a sample trip for brand-new accounts.
 * Safe to call once after signup; skips if sample data already exists.
 */
export async function seedSampleDataForUser(userId: string, userName: string) {
  const existingSamples = await Contact.countDocuments({ userId, isSample: true });
  if (existingSamples > 0) {
    return { contacts: 0, trips: 0, skipped: true };
  }

  const stamp = String(userId).slice(-8);
  const contactIdByIndex: string[] = [];

  const contactsPayload = INITIAL_CONTACTS.slice(0, 3).map((contact, index) => {
    const contactId = `sample-${contact.id}-${stamp}`;
    contactIdByIndex[index] = contactId;

    const transactions = contact.transactions.map((tx, txIndex) => {
      const ago = 2 + index + txIndex;
      const createdAt = isoDaysAgo(ago, 10 + txIndex);
      return {
        ...tx,
        id: `sample-${tx.id}-${stamp}`,
        remark: sampleRemark(tx.remark),
        date: ymdDaysAgo(ago),
        createdAt,
        createdByUserId: userId,
        history: [
          {
            at: createdAt,
            byUserId: userId,
            action: 'create' as const,
            after: {
              amount: tx.amount,
              type: tx.type,
              remark: sampleRemark(tx.remark),
              mode: tx.mode,
            },
          },
        ],
      };
    });

    return {
      id: contactId,
      userId,
      name: contact.name,
      phone: `+91 00000 0000${index + 1}`,
      email: `sample.${contact.name.split(' ')[0].toLowerCase()}@example.invalid`,
      isSample: true,
      avatarSeed: AVATAR_PRESETS[index % AVATAR_PRESETS.length],
      createdAt: isoDaysAgo(10 + index, 9),
      transactions,
    };
  });

  await Contact.insertMany(contactsPayload);

  const sampleContactsForTrip = contactsPayload.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    createdAt: c.createdAt,
    transactions: [],
  }));

  const demo = getDemoTrip(userName || 'You', sampleContactsForTrip as any);
  const tripId = `sample-trip-goa-${stamp}`;

  const participants = demo.participants.map((p, idx) => {
    if (p.isCurrentUser) return p;
    const mapped = contactIdByIndex[idx - 1];
    return mapped ? { ...p, contactId: mapped } : p;
  });

  await Trip.create({
    id: tripId,
    userId,
    name: 'Sample Goa Getaway',
    description: 'Practice trip — explore splitting bills (not a real trip)',
    destination: 'Sample · North Goa',
    startDate: demo.startDate,
    currency: demo.currency || '₹',
    isSample: true,
    status: 'active',
    participants,
    expenses: demo.expenses.map((e, i) => ({
      ...e,
      id: `sample-${e.id}-${stamp}`,
      createdAt: isoDaysAgo(1, 14 - i),
      date: ymdDaysAgo(1),
      notes: e.notes ? sampleRemark(e.notes) : 'Sample expense',
    })),
    settlements: (demo.settlements || []).map((s) => ({
      ...s,
      id: `sample-${s.id}-${stamp}`,
      note: s.note ? sampleRemark(s.note) : 'Sample settlement',
      payments: (s.payments || []).map((p) => ({
        ...p,
        id: `sample-${p.id}-${stamp}`,
        note: p.note ? sampleRemark(p.note) : 'Sample settlement',
      })),
    })),
  });

  return { contacts: contactsPayload.length, trips: 1, skipped: false };
}

export async function clearSampleDataForUser(userId: string) {
  const [contacts, trips] = await Promise.all([
    Contact.deleteMany({ userId, isSample: true }),
    Trip.deleteMany({ userId, isSample: true }),
  ]);
  return {
    contactsDeleted: contacts.deletedCount || 0,
    tripsDeleted: trips.deletedCount || 0,
  };
}
