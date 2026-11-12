import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/session';
import {
  appendHistory,
  findAccessibleContact,
  serializeTx,
  snapshotTx,
  toOwnerType,
} from '@/lib/ledger-access';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const { amount, type, remark, date, mode, category, id: txId, createdAt } = body;

    if (!amount || !type || !remark || !date || !mode || !txId) {
      return NextResponse.json(
        { error: 'Missing required parameters for transaction creation' },
        { status: 400 }
      );
    }

    const allowedCategories = ['food', 'travel', 'rent', 'business', 'personal', 'other'];
    const safeCategory = allowedCategories.includes(category) ? category : 'other';

    const access = await findAccessibleContact(id, userId);
    if (!access) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const { contact, role } = access;
    const ownerType = toOwnerType(type, role);
    const now = new Date().toISOString();

    const newTx: any = {
      id: txId,
      amount: Number(amount),
      type: ownerType,
      remark,
      date,
      createdAt: typeof createdAt === 'string' && createdAt ? createdAt : now,
      mode,
      category: safeCategory,
      createdByUserId: userId,
      updatedByUserId: userId,
      updatedAt: now,
      deletedAt: null,
      history: [],
    };

    appendHistory(newTx, {
      byUserId: userId,
      action: 'create',
      after: snapshotTx(newTx),
    });

    contact.transactions.push(newTx);
    await contact.save();

    const saved = contact.transactions.find((t: any) => t.id === txId);
    return NextResponse.json(serializeTx(saved, role), { status: 201 });
  } catch (error: any) {
    console.error('Error adding transaction:', error);
    return NextResponse.json(
      { error: 'Failed to add transaction to contact ledger' },
      { status: 500 }
    );
  }
}
