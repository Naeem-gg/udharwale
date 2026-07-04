import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

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

    const { amount, type, remark, date, mode, id: txId } = body;

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
