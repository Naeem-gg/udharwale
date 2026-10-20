import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { getAuthenticatedUserId } from '@/lib/session';

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

    const { amount, type, remark, date, mode, id: txId, createdAt } = body;

    if (!amount || !type || !remark || !date || !mode || !txId) {
      return NextResponse.json(
        { error: 'Missing required parameters for transaction creation' },
        { status: 400 }
      );
    }

    const contact = await Contact.findOne({ id, userId });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const newTx = {
      id: txId,
      amount: Number(amount),
      type,
      remark,
      date,
      // Prefer server clock for audit transparency; allow client value for restore/seed
      createdAt: typeof createdAt === 'string' && createdAt ? createdAt : new Date().toISOString(),
      mode
    };

    contact.transactions.push(newTx as any);
    await contact.save();

    return NextResponse.json(newTx, { status: 201 });
  } catch (error: any) {
    console.error('Error adding transaction:', error);
    return NextResponse.json(
      { error: 'Failed to add transaction to contact ledger' },
      { status: 500 }
    );
  }
}
