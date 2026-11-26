import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { getAuthenticatedUserId } from '@/lib/session';
import { buildShareToken, chatSharePath, isLegacyShareToken } from '@/lib/share-slug';

export const dynamic = 'force-dynamic';

function appOrigin(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return req.nextUrl.origin;
}

async function allocateChatShareToken(name: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = buildShareToken(name);
    const taken = await Contact.findOne({ shareToken: candidate }).select('_id').lean();
    if (!taken) return candidate;
  }
  // Extremely unlikely fallback
  return buildShareToken(name) + shortFallback();
}

function shortFallback() {
  return Math.random().toString(36).slice(2, 5);
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

    // New shares (and one-time upgrade from old hex tokens) get a short name link.
    if (!contact.shareToken || isLegacyShareToken(contact.shareToken)) {
      contact.shareToken = await allocateChatShareToken(contact.name);
      await contact.save();
    }

    const shareUrl = `${appOrigin(req)}${chatSharePath(contact.shareToken)}`;

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
