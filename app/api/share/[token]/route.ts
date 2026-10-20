import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectToDatabase();
    const { token } = await params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
    }

    const contact = await Contact.findOne({ shareToken: token }).lean();
    if (!contact) {
      return NextResponse.json({ error: 'This shared chat was not found or was removed.' }, { status: 404 });
    }

    const owner = await User.findById(contact.userId).select('name').lean();
    const transactions = [...(contact.transactions || [])].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let balance = 0;
    for (const tx of transactions) {
      balance += tx.type === 'gave' ? tx.amount : -tx.amount;
    }

    return NextResponse.json({
      ownerName: owner?.name || 'Someone',
      contactName: contact.name,
      balance,
      transactions: transactions.map((tx: any) => ({
        id: tx.id,
        amount: tx.amount,
        type: tx.type,
        remark: tx.remark,
        date: tx.date,
        createdAt: tx.createdAt,
        mode: tx.mode,
      })),
    });
  } catch (error) {
    console.error('Error loading shared chat:', error);
    return NextResponse.json({ error: 'Failed to load shared chat' }, { status: 500 });
  }
}
