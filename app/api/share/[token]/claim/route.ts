import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/session';
import { claimShareToken } from '@/lib/ledger-access';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { token } = await params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
    }

    const result = await claimShareToken(token, userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      contactId: result.contactId,
      alreadyOwner: 'alreadyOwner' in result ? result.alreadyOwner : false,
      alreadyLinked: 'alreadyLinked' in result ? result.alreadyLinked : false,
      newlyLinked: 'newlyLinked' in result ? result.newlyLinked : false,
    });
  } catch (error) {
    console.error('share claim error:', error);
    return NextResponse.json({ error: 'Failed to claim shared chat' }, { status: 500 });
  }
}
