import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/session';
import { claimMatchingContacts } from '@/lib/ledger-access';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const result = await claimMatchingContacts(userId);

    return NextResponse.json({
      linked: result.linked,
      contactIds: result.contactIds,
      message:
        result.linked > 0
          ? `${result.linked} shared chat${result.linked === 1 ? '' : 's'} linked to your account`
          : 'No new matching chats found',
    });
  } catch (error) {
    console.error('claim-matches error:', error);
    return NextResponse.json({ error: 'Failed to claim matching chats' }, { status: 500 });
  }
}
