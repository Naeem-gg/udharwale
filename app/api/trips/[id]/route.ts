import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Trip from '@/models/Trip';
import { getAuthenticatedUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(
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

    return NextResponse.json({
      id: trip.id,
      name: trip.name,
      description: trip.description,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      currency: trip.currency,
      participants: trip.participants,
      expenses: trip.expenses,
      shareToken: trip.shareToken,
      status: trip.status,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    });
  } catch (error: any) {
    console.error('Error fetching trip:', error);
    return NextResponse.json({ error: 'Failed to retrieve trip' }, { status: 500 });
  }
}

export async function PUT(
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
    const body = await req.json();

    const trip = await Trip.findOne({ id, userId });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (body.name !== undefined) trip.name = body.name;
    if (body.description !== undefined) trip.description = body.description;
    if (body.destination !== undefined) trip.destination = body.destination;
    if (body.startDate !== undefined) trip.startDate = body.startDate;
    if (body.endDate !== undefined) trip.endDate = body.endDate;
    if (body.currency !== undefined) trip.currency = body.currency;
    if (body.participants !== undefined) trip.participants = body.participants;
    if (body.expenses !== undefined) trip.expenses = body.expenses;
    if (body.status !== undefined) trip.status = body.status;

    await trip.save();

    return NextResponse.json({
      id: trip.id,
      name: trip.name,
      description: trip.description,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      currency: trip.currency,
      participants: trip.participants,
      expenses: trip.expenses,
      shareToken: trip.shareToken,
      status: trip.status,
      updatedAt: trip.updatedAt,
    });
  } catch (error: any) {
    console.error('Error updating trip:', error);
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
  }
}

export async function DELETE(
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

    const result = await Trip.findOneAndDelete({ id, userId });
    if (!result) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Trip deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting trip:', error);
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 });
  }
}

