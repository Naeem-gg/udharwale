import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { INITIAL_CONTACTS } from '@/app/components/mockData';
import { getAuthenticatedUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Delete existing documents belonging to this user only
    await Contact.deleteMany({ userId });

    // Unique contact/tx ids per user so multi-user demos never collide
    const stamp = String(userId).slice(-8);
    const contactsWithUser = INITIAL_CONTACTS.map((contact) => ({
      ...contact,
      id: `${contact.id}-${stamp}`,
      userId,
      transactions: contact.transactions.map((tx) => ({
        ...tx,
        id: `${tx.id}-${stamp}`,
      })),
    }));

    await Contact.insertMany(contactsWithUser);
    
    return NextResponse.json({ success: true, message: 'Database reset to mock dataset successfully' });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { error: 'Failed to reset database' },
      { status: 500 }
    );
  }
}
