import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import User from '@/models/User';
import { getAuthenticatedUserId } from '@/lib/session';
import { serializeContactForUser } from '@/lib/ledger-access';
import { normalizePhone } from '@/lib/phone';
import { normalizeAvatarSeed } from '@/lib/avatar-presets';

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

    // One batched user lookup for owner names + linked avatar presets (tiny strings only)
    const ownerIds = [...new Set(peer.map((c) => c.userId.toString()))];
    const peerIds = [
      ...new Set(
        owned
          .map((c) => c.peerUserId?.toString())
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const lookupIds = [...new Set([...ownerIds, ...peerIds])];
    const users = lookupIds.length
      ? await User.find({ _id: { $in: lookupIds } }).select('name avatarSeed')
      : [];
    const userById = new Map(
      users.map((u) => [
        u._id.toString(),
        { name: u.name as string, avatarSeed: (u as any).avatarSeed as string | undefined },
      ])
    );

    const payload = [
      ...owned.map((c) => {
        const peerId = c.peerUserId?.toString();
        const linked = peerId ? userById.get(peerId) : undefined;
        return serializeContactForUser(c, 'owner', {
          linkedAvatarSeed: linked?.avatarSeed,
        });
      }),
      ...peer.map((c) => {
        const owner = userById.get(c.userId.toString());
        return serializeContactForUser(c, 'peer', {
          ownerName: owner?.name || 'Someone',
          linkedAvatarSeed: owner?.avatarSeed,
        });
      }),
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

    const { id, name, phone, email, transactions, createdAt, avatarSeed } = body;

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
      avatarSeed: normalizeAvatarSeed(avatarSeed),
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
