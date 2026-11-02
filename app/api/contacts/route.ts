import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import User from '@/models/User';
import { getAuthenticatedUserId } from '@/lib/session';
import { serializeContactForUser } from '@/lib/ledger-access';
import { normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const owned = await Contact.find({ userId }).sort({ updatedAt: -1 });
    const peer = await Contact.find({ peerUserId: userId }).sort({ updatedAt: -1 });

    const ownerIds = [...new Set(peer.map((c) => c.userId.toString()))];
    const owners = ownerIds.length
      ? await User.find({ _id: { $in: ownerIds } }).select('name')
      : [];
    const ownerNameById = new Map(owners.map((o) => [o._id.toString(), o.name as string]));

    const payload = [
      ...owned.map((c) => serializeContactForUser(c, 'owner')),
      ...peer.map((c) =>
        serializeContactForUser(c, 'peer', ownerNameById.get(c.userId.toString()) || 'Someone')
      ),
    ];

    // Stable-ish sort: most recently updated first (mongoose docs have updatedAt)
    payload.sort((a, b) => {
      const aContact = [...owned, ...peer].find((c) => c.id === a.id) as any;
      const bContact = [...owned, ...peer].find((c) => c.id === b.id) as any;
      const at = new Date(aContact?.updatedAt || a.createdAt).getTime();
      const bt = new Date(bContact?.updatedAt || b.createdAt).getTime();
      return bt - at;
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve contacts from backend' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const { id, name, phone, email, transactions, createdAt } = body;

    if (!id || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, name, phone' },
        { status: 400 }
      );
    }

    const loggedAt = new Date().toISOString();
    const normalizedTransactions = (transactions || []).map((tx: any) => ({
      ...tx,
      createdAt: tx?.createdAt || loggedAt,
      history: tx?.history || [],
      deletedAt: tx?.deletedAt ?? null,
    }));

    const newContact = new Contact({
      id,
      userId,
      name,
      phone: normalizePhone(phone) || phone,
      email: email ? String(email).toLowerCase().trim() : undefined,
      transactions: normalizedTransactions,
      createdAt: createdAt || loggedAt
    });

    await newContact.save();
    return NextResponse.json(serializeContactForUser(newContact, 'owner'), { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
