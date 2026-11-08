import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Trip from '@/models/Trip';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await connectToDatabase();
    const trip = await Trip.findOne({ shareToken: token });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found or link expired' }, { status: 404 });
    }

    const owner = await User.findById(trip.userId).select('name');

    return NextResponse.json({
      id: trip.id,
      name: trip.name,
      description: trip.description || '',
      destination: trip.destination || '',
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      currency: trip.currency || '₹',
      participants: trip.participants || [],
      expenses: trip.expenses || [],
      ownerName: owner?.name || 'Someone',
      status: trip.status || 'active',
      createdAt: trip.createdAt,
    });
  } catch (error: any) {
    console.error('Error fetching shared trip:', error);
    return NextResponse.json({ error: 'Failed to load shared trip' }, { status: 500 });
  }
}

