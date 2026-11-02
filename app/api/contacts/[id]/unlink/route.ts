import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { getAuthenticatedUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Owner-only: clear peer link so another account can claim later. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const contact = await Contact.findOne({ id, userId });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found or you are not the owner' }, { status: 404 });
    }

    contact.peerUserId = undefined;
    contact.peerLinkedAt = undefined;
    await contact.save();

    return NextResponse.json({ success: true, message: 'Peer unlinked' });
  } catch (error) {
    console.error('unlink error:', error);
    return NextResponse.json({ error: 'Failed to unlink peer' }, { status: 500 });
  }
}
