import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ITransactionSub } from '@/models/Contact';
import { getAuthenticatedUserId } from '@/lib/session';
import {
  appendHistory,
  findAccessibleContact,
  serializeTx,
  snapshotTx,
  toOwnerType,
} from '@/lib/ledger-access';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id, txId } = await params;
    const body = await req.json();
    const { amount, mode, remark, date, type } = body;

    const access = await findAccessibleContact(id, userId);
    if (!access) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const { contact, role } = access;
    const tx = contact.transactions.find((t: ITransactionSub) => t.id === txId);

    if (!tx || (tx as any).deletedAt) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const before = snapshotTx(tx);

    if (amount !== undefined) tx.amount = Number(amount);
    if (mode !== undefined) tx.mode = mode;
    if (remark !== undefined) tx.remark = remark;
    if (date !== undefined) tx.date = date;
    if (type !== undefined) tx.type = toOwnerType(type, role);

    (tx as any).updatedByUserId = userId;
    (tx as any).updatedAt = new Date().toISOString();

    appendHistory(tx, {
      byUserId: userId,
      action: 'update',
      before,
      after: snapshotTx(tx),
    });

    await contact.save();
    return NextResponse.json(serializeTx(tx, role));
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (!tx || (tx as any).deletedAt) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const before = snapshotTx(tx);
    const now = new Date().toISOString();
    (tx as any).deletedAt = now;
    (tx as any).deletedByUserId = userId;
    (tx as any).updatedByUserId = userId;
    (tx as any).updatedAt = now;

    appendHistory(tx, {
      byUserId: userId,
      action: 'delete',
      before,
      after: snapshotTx(tx),
    });

    await contact.save();
    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
      transaction: serializeTx(tx, role, true),
    });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
