import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import Trip from '@/models/Trip';
import User from '@/models/User';
import { getAuthenticatedUserId } from '@/lib/session';
import { clearSampleDataForUser, seedSampleDataForUser } from '@/lib/seed-sample-data';

export const dynamic = 'force-dynamic';

/** Re-seeds practice sample friends + trip (marked isSample). Does not wipe real data. */
export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    await clearSampleDataForUser(userId);

    // Remove any leftover non-sample demo ids from older reset flows that used INITIAL_CONTACTS
    // only when the user has zero real contacts — otherwise leave their ledger alone.
    const realCount = await Contact.countDocuments({ userId, isSample: { $ne: true } });
    if (realCount === 0) {
      await Contact.deleteMany({ userId });
      await Trip.deleteMany({ userId, isSample: true });
    }

    const user = await User.findById(userId).select('name');
    const seeded = await seedSampleDataForUser(userId, user?.name || 'You');

    return NextResponse.json({
      success: true,
      message: 'Sample examples ready',
      ...seeded,
    });
  } catch (error: any) {
    console.error('Error resetting sample data:', error);
    return NextResponse.json(
      { error: 'Failed to reset sample data' },
      { status: 500 }
    );
  }
}
