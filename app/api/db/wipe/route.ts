import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { getAuthenticatedUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Wipe only contacts belonging to this user
    await Contact.deleteMany({ userId });
    
    return NextResponse.json({ success: true, message: 'Database wiped clean successfully' });
  } catch (error: any) {
    console.error('Error wiping database:', error);
    return NextResponse.json(
      { error: 'Failed to wipe database' },
      { status: 500 }
    );
  }
}
