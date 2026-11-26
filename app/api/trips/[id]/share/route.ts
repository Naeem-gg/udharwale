import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Trip from '@/models/Trip';
import { getAuthenticatedUserId } from '@/lib/session';
import { buildShareToken, isLegacyShareToken, tripSharePath } from '@/lib/share-slug';

export const dynamic = 'force-dynamic';

function appOrigin(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

async function allocateTripShareToken(name: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = buildShareToken(name);
    const taken = await Trip.findOne({ shareToken: candidate }).select('_id').lean();
    if (!taken) return candidate;
  }
  return buildShareToken(name) + Math.random().toString(36).slice(2, 5);
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
    const trip = await Trip.findOne({ id, userId });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (!trip.shareToken || isLegacyShareToken(trip.shareToken)) {
      trip.shareToken = await allocateTripShareToken(trip.name);
      await trip.save();
    }

    const shareUrl = `${appOrigin(req)}${tripSharePath(trip.shareToken)}`;

    return NextResponse.json({
      shareToken: trip.shareToken,
      shareUrl,
    });
  } catch (error: any) {
    console.error('Error generating trip share token:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}
