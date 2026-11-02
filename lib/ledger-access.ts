import mongoose from 'mongoose';
import Contact, { IContactDoc, ITransactionSub } from '@/models/Contact';
import User from '@/models/User';
import { normalizePhone, phonesMatch } from '@/lib/phone';

export type LedgerRole = 'owner' | 'peer';

export function contactMatchesIdentity(
  contact: { phone?: string; email?: string },
  viewer: { phone?: string; email?: string }
): boolean {
  const phoneOk = Boolean(viewer.phone && contact.phone && phonesMatch(contact.phone, viewer.phone));
  const emailOk = Boolean(
    viewer.email &&
    contact.email &&
    contact.email.toLowerCase().trim() === viewer.email.toLowerCase().trim()
  );
  return phoneOk || emailOk;
}

export async function findAccessibleContact(contactId: string, userId: string) {
  const contact = await Contact.findOne({
    id: contactId,
    $or: [{ userId }, { peerUserId: userId }],
  });
  if (!contact) return null;

  const role: LedgerRole =
    contact.userId.toString() === userId ? 'owner' : 'peer';

  return { contact, role };
}

/** Flip gave/got when storing or reading from peer perspective. */
export function flipTxType(type: 'gave' | 'got'): 'gave' | 'got' {
  return type === 'gave' ? 'got' : 'gave';
}

export function toOwnerType(type: 'gave' | 'got', role: LedgerRole): 'gave' | 'got' {
  return role === 'peer' ? flipTxType(type) : type;
}

export function snapshotTx(tx: ITransactionSub | Record<string, unknown>) {
  const t = tx as any;
  return {
    id: t.id,
    amount: t.amount,
    type: t.type,
    remark: t.remark,
    date: t.date,
    mode: t.mode,
    createdAt: t.createdAt,
    deletedAt: t.deletedAt ?? null,
  };
}

export function appendHistory(
  tx: ITransactionSub,
  entry: {
    byUserId: string;
    action: 'create' | 'update' | 'delete' | 'restore';
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }
) {
  if (!tx.history) (tx as any).history = [];
  tx.history.push({
    at: new Date().toISOString(),
    byUserId: new mongoose.Types.ObjectId(entry.byUserId),
    action: entry.action,
    before: entry.before,
    after: entry.after,
  } as any);
}

export function serializeContactForUser(contact: IContactDoc, role: LedgerRole, ownerName?: string) {
  const activeTx = (contact.transactions || []).filter((t: any) => !t.deletedAt);
  const allTx = contact.transactions || [];

  return {
    id: contact.id,
    name: role === 'peer' ? (ownerName || 'Shared contact') : contact.name,
    phone: contact.phone,
    email: contact.email,
    shareToken: contact.shareToken,
    createdAt: contact.createdAt,
    role,
    peerLinked: Boolean(contact.peerUserId),
    peerUserId: contact.peerUserId?.toString(),
    ownerName: role === 'peer' ? ownerName : undefined,
    ownerUserId: contact.userId.toString(),
    transactions: activeTx.map((tx: any) => serializeTx(tx, role)),
    // Include soft-deleted + history for audit UI (client may hide deleted)
    allTransactions: allTx.map((tx: any) => serializeTx(tx, role, true)),
  };
}

export function serializeTx(tx: any, role: LedgerRole, includeDeleted = false) {
  const type = role === 'peer' ? flipTxType(tx.type) : tx.type;
  return {
    id: tx.id,
    amount: tx.amount,
    type,
    remark: tx.remark,
    date: tx.date,
    createdAt: tx.createdAt,
    mode: tx.mode,
    updatedAt: tx.updatedAt,
    deletedAt: tx.deletedAt ?? null,
    createdByUserId: tx.createdByUserId?.toString?.() || tx.createdByUserId,
    updatedByUserId: tx.updatedByUserId?.toString?.() || tx.updatedByUserId,
    deletedByUserId: tx.deletedByUserId?.toString?.() || tx.deletedByUserId,
    history: (tx.history || []).map((h: any) => ({
      at: h.at,
      byUserId: h.byUserId?.toString?.() || h.byUserId,
      action: h.action,
      before: h.before
        ? { ...h.before, type: role === 'peer' && h.before.type ? flipTxType(h.before.type) : h.before.type }
        : undefined,
      after: h.after
        ? { ...h.after, type: role === 'peer' && h.after.type ? flipTxType(h.after.type) : h.after.type }
        : undefined,
    })),
    ...(includeDeleted ? {} : {}),
  };
}

export async function claimMatchingContacts(userId: string) {
  const user = await User.findById(userId).select('phone email name');
  if (!user) return { linked: 0, contactIds: [] as string[] };

  const phone = normalizePhone(user.phone || '');
  const email = (user.email || '').toLowerCase().trim();

  const candidates = await Contact.find({
    userId: { $ne: userId },
    $or: [
      { peerUserId: { $exists: false } },
      { peerUserId: null },
    ],
  });

  const linkedIds: string[] = [];
  const now = new Date();

  for (const contact of candidates) {
    if (!contactMatchesIdentity(contact, { phone, email })) continue;
    // Only link if no peer yet
    if (contact.peerUserId) continue;
    contact.peerUserId = user._id as any;
    contact.peerLinkedAt = now;
    await contact.save();
    linkedIds.push(contact.id);
  }

  return { linked: linkedIds.length, contactIds: linkedIds };
}

export async function claimShareToken(token: string, userId: string) {
  const user = await User.findById(userId).select('phone email');
  if (!user) return { ok: false as const, error: 'User not found', status: 404 };

  const contact = await Contact.findOne({ shareToken: token });
  if (!contact) return { ok: false as const, error: 'This shared chat was not found or was removed.', status: 404 };

  if (contact.userId.toString() === userId) {
    return { ok: true as const, contactId: contact.id, alreadyOwner: true };
  }

  if (contact.peerUserId && contact.peerUserId.toString() === userId) {
    return { ok: true as const, contactId: contact.id, alreadyLinked: true };
  }

  if (contact.peerUserId && contact.peerUserId.toString() !== userId) {
    return {
      ok: false as const,
      error: 'This chat is already linked to another Udharwale account.',
      status: 409,
    };
  }

  if (!contactMatchesIdentity(contact, { phone: user.phone, email: user.email })) {
    return {
      ok: false as const,
      error: 'Your phone/email does not match this shared contact. Use the same details the owner saved for you.',
      status: 403,
    };
  }

  contact.peerUserId = user._id as any;
  contact.peerLinkedAt = new Date();
  await contact.save();

  return { ok: true as const, contactId: contact.id, newlyLinked: true };
}
