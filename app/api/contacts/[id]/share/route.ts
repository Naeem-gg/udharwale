import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { getAuthenticatedUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

function appOrigin(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return req.nextUrl.origin;
}

export async function POST(
  req: NextRequest,
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
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (!contact.shareToken) {
      contact.shareToken = crypto.randomBytes(16).toString('hex');
      await contact.save();
    }

    const shareUrl = `${appOrigin(req)}/share/${contact.shareToken}`;

    return NextResponse.json({
      shareToken: contact.shareToken,
      shareUrl,
      contactId: contact.id,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}
