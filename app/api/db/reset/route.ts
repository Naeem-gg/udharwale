import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { INITIAL_CONTACTS } from '@/app/components/mockData';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Delete existing documents belonging to this user only
    await Contact.deleteMany({ userId });
    
    // Map initial contacts to have this user's ID
    const contactsWithUser = INITIAL_CONTACTS.map(contact => ({
      ...contact,
      userId
    }));

    // Insert mock dataset
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
