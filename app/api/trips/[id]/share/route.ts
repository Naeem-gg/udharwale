import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db';
import Trip from '@/models/Trip';
import { getAuthenticatedUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

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

    if (!trip.shareToken) {
      trip.shareToken = 'trip_' + crypto.randomBytes(12).toString('hex');
      await trip.save();
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const shareUrl = `${proto}://${host}/share/trip/${trip.shareToken}`;

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

