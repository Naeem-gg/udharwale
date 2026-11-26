import type { Contact } from '@/app/components/types';
import type { Trip, TripSettlement } from '@/app/components/trip-types';

/** Normalize person labels for fuzzy contact matching. */
export function normalizePersonName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\(you\)/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCurrentUserName(name: string, userName: string): boolean {
  const n = normalizePersonName(name);
  if (!n) return false;
  if (n === 'you' || n === 'me') return true;
  const me = normalizePersonName(userName);
  if (!me) return false;
  return n === me;
}

export function settlementInvolvesMe(
  settlement: TripSettlement,
  trip: Trip,
  userName: string
): boolean {
  const fromPart = trip.participants.find((p) => p.id === settlement.fromId);
  const toPart = trip.participants.find((p) => p.id === settlement.toId);
  if (fromPart?.isCurrentUser || toPart?.isCurrentUser) return true;
  return (
    isCurrentUserName(settlement.fromName, userName) ||
    isCurrentUserName(settlement.toName, userName)
  );
}

export type LedgerTarget = {
  contactId?: string;
  otherName: string;
  otherPhone?: string;
  /** Ledger direction from your POV */
  type: 'gave' | 'got';
  /** True when you are owed (they pay you) */
  youReceive: boolean;
};

/**
 * Resolve which friend should receive the trip settlement on your personal ledger.
 * Prefer participant contactIds, then name match.
 */
export function resolveLedgerTarget(
  settlement: TripSettlement,
  trip: Trip,
  contacts: Contact[],
  userName: string
): LedgerTarget | null {
  if (!settlementInvolvesMe(settlement, trip, userName)) return null;

  const fromPart = trip.participants.find((p) => p.id === settlement.fromId);
  const toPart = trip.participants.find((p) => p.id === settlement.toId);

  const fromIsMe =
    Boolean(fromPart?.isCurrentUser) || isCurrentUserName(settlement.fromName, userName);
  const toIsMe =
    Boolean(toPart?.isCurrentUser) || isCurrentUserName(settlement.toName, userName);

  // Settlement: from pays to. If you're "to", they owe you → gave. If you're "from", you owe → got.
  if (toIsMe && !fromIsMe) {
    return {
      contactId: settlement.fromContactId || fromPart?.contactId || findContactId(contacts, settlement.fromName),
      otherName: settlement.fromName,
      otherPhone: fromPart?.phone,
      type: 'gave',
      youReceive: true,
    };
  }

  if (fromIsMe && !toIsMe) {
    return {
      contactId: settlement.toContactId || toPart?.contactId || findContactId(contacts, settlement.toName),
      otherName: settlement.toName,
      otherPhone: toPart?.phone,
      type: 'got',
      youReceive: false,
    };
  }

  return null;
}

function findContactId(contacts: Contact[], name: string): string | undefined {
  const target = normalizePersonName(name);
  if (!target) return undefined;

  const exact = contacts.find((c) => normalizePersonName(c.name) === target);
  if (exact) return exact.id;

  const starts = contacts.find((c) => {
    const n = normalizePersonName(c.name);
    return n.startsWith(target) || target.startsWith(n);
  });
  return starts?.id;
}

export function ledgerAmountFor(settlement: TripSettlement): number {
  if (settlement.remainingAmount > 0.01) return settlement.remainingAmount;
  return Math.max(0, Math.round((settlement.amount - (settlement.paidAmount || 0)) * 100) / 100) ||
    settlement.amount;
}

export function buildTripLedgerRemark(tripName: string, settlementId: string): string {
  return `Trip: ${tripName} settlement · ${settlementId}`;
}

export function settlementAlreadyInLedger(
  contacts: Contact[],
  contactId: string | undefined,
  settlement: TripSettlement
): boolean {
  if (settlement.ledgerTxId) return true;
  if (!contactId) return false;
  const contact = contacts.find((c) => c.id === contactId);
  if (!contact) return false;
  const marker = settlement.id;
  return contact.transactions.some(
    (tx) =>
      tx.id === settlement.ledgerTxId ||
      (typeof tx.remark === 'string' && tx.remark.includes(marker))
  );
}
