import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Trip from '@/models/Trip';
import { getAuthenticatedUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const trips = await Trip.find({ userId }).sort({ updatedAt: -1 });

    const payload = trips.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      destination: t.destination || '',
      startDate: t.startDate || '',
      endDate: t.endDate || '',
      currency: t.currency || '₹',
      participants: t.participants || [],
      expenses: t.expenses || [],
      shareToken: t.shareToken || undefined,
      status: t.status || 'active',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve trips from backend' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const {
      id,
      name,
      description = '',
      destination = '',
      startDate = '',
      endDate = '',
      currency = '₹',
      participants = [],
      expenses = [],
      status = 'active',
    } = body;

    if (!id || !name || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: 'Trip requires id, name, and at least one participant.' },
        { status: 400 }
      );
    }

    const newTrip = new Trip({
      id,
      userId,
      name,
      description,
      destination,
      startDate,
      endDate,
      currency,
      participants,
      expenses,
      status,
    });

    await newTrip.save();

    return NextResponse.json(
      {
        id: newTrip.id,
        name: newTrip.name,
        description: newTrip.description,
        destination: newTrip.destination,
        startDate: newTrip.startDate,
        endDate: newTrip.endDate,
        currency: newTrip.currency,
        participants: newTrip.participants,
        expenses: newTrip.expenses,
        status: newTrip.status,
        createdAt: newTrip.createdAt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating trip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create trip' },
      { status: 500 }
    );
  }
}

