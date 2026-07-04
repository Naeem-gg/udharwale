import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import Contact, { ITransactionSub } from '@/models/Contact';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

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

    const contact = await Contact.findOne({ id, userId });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const tx = contact.transactions.find((t: ITransactionSub) => t.id === txId);

    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (amount !== undefined) tx.amount = Number(amount);
    if (mode !== undefined) tx.mode = mode;
    if (remark !== undefined) tx.remark = remark;
    if (date !== undefined) tx.date = date;
    if (type !== undefined) tx.type = type;

    await contact.save();
    return NextResponse.json(tx);
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

    const contact = await Contact.findOne({ id, userId });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const initialLength = contact.transactions.length;
    contact.transactions = contact.transactions.filter((t: ITransactionSub) => t.id !== txId) as any;

    if (contact.transactions.length === initialLength) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await contact.save();
    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
