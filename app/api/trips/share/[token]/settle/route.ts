import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Trip from '@/models/Trip';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const body = await req.json();
    const { settlementId, isSettled = true, settledBy, paymentMethod = 'UPI', note } = body;

    if (!settlementId) {
      return NextResponse.json({ error: 'settlementId is required' }, { status: 400 });
    }

    await connectToDatabase();
    const trip = await Trip.findOne({ shareToken: token });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found or link expired' }, { status: 404 });
    }

    const existingSettlements = Array.isArray(trip.settlements) ? [...trip.settlements] : [];
    const index = existingSettlements.findIndex((s: any) => s.id === settlementId);

    if (index >= 0) {
      existingSettlements[index] = {
        ...existingSettlements[index],
        isSettled: Boolean(isSettled),
        settledAt: isSettled ? new Date().toISOString() : undefined,
        settledBy: isSettled ? settledBy || existingSettlements[index].settledBy || 'Friend' : undefined,
        paymentMethod: isSettled ? paymentMethod || existingSettlements[index].paymentMethod || 'UPI' : undefined,
        note: isSettled ? note || existingSettlements[index].note || '' : undefined,
      };
    } else {
      // Create new record for this settlementId
      existingSettlements.push({
        id: settlementId,
        fromId: body.fromId || '',
        fromName: body.fromName || '',
        toId: body.toId || '',
        toName: body.toName || '',
        amount: Number(body.amount) || 0,
        isSettled: Boolean(isSettled),
        settledAt: isSettled ? new Date().toISOString() : undefined,
        settledBy: isSettled ? settledBy || 'Friend' : undefined,
        paymentMethod: isSettled ? paymentMethod || 'UPI' : undefined,
        note: isSettled ? note || '' : undefined,
      });
    }

    trip.settlements = existingSettlements;
    await trip.save();

    return NextResponse.json({
      success: true,
      settlements: trip.settlements,
    });
  } catch (error: any) {
    console.error('Error updating shared settlement:', error);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
  }
}

