import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ITransactionSub } from '@/models/Contact';
import { getAuthenticatedUserId } from '@/lib/session';
import {
  appendHistory,
  findAccessibleContact,
  serializeTx,
  snapshotTx,
} from '@/lib/ledger-access';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id, txId } = await params;

    const access = await findAccessibleContact(id, userId);
    if (!access) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const { contact, role } = access;
    const tx = contact.transactions.find((t: ITransactionSub) => t.id === txId);

    if (!tx || !(tx as any).deletedAt) {
      return NextResponse.json({ error: 'Deleted transaction not found' }, { status: 404 });
    }

    const before = snapshotTx(tx);
    const now = new Date().toISOString();
    (tx as any).deletedAt = null;
    (tx as any).deletedByUserId = undefined;
    (tx as any).updatedByUserId = userId;
    (tx as any).updatedAt = now;

    appendHistory(tx, {
      byUserId: userId,
      action: 'restore',
      before,
      after: snapshotTx(tx),
    });

    await contact.save();
    return NextResponse.json(serializeTx(tx, role));
  } catch (error) {
    console.error('Error restoring transaction:', error);
    return NextResponse.json({ error: 'Failed to restore transaction' }, { status: 500 });
  }
}
