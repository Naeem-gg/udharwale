import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Trip from '@/models/Trip';

export const dynamic = 'force-dynamic';

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

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
    const {
      settlementId,
      isSettled,
      settledBy,
      paymentMethod = 'UPI',
      note,
      paymentAmount,
      paidAmount: absolutePaidAmount,
      reopen = false,
    } = body;

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
    const existing = index >= 0 ? existingSettlements[index] : null;

    const totalAmount = roundMoney(
      Number(body.amount ?? existing?.amount) || 0
    );
    const previousPaid = roundMoney(
      typeof existing?.paidAmount === 'number'
        ? existing.paidAmount
        : existing?.isSettled
          ? totalAmount
          : 0
    );
    const previousPayments = Array.isArray(existing?.payments) ? [...existing.payments] : [];

    let nextPaid = previousPaid;
    let nextPayments = previousPayments;
    let nextSettledBy = existing?.settledBy;
    let nextMethod = existing?.paymentMethod;
    let nextNote = existing?.note;
    let nextSettledAt = existing?.settledAt;

    if (reopen || isSettled === false) {
      nextPaid = 0;
      nextPayments = [];
      nextSettledBy = undefined;
      nextMethod = undefined;
      nextNote = undefined;
      nextSettledAt = undefined;
    } else if (typeof absolutePaidAmount === 'number' && !Number.isNaN(absolutePaidAmount)) {
      nextPaid = roundMoney(Math.min(totalAmount, Math.max(0, absolutePaidAmount)));
      const delta = roundMoney(nextPaid - previousPaid);
      if (delta > 0.009) {
        nextPayments = [
          ...previousPayments,
          {
            id: `pay_${Date.now()}`,
            amount: delta,
            paidAt: new Date().toISOString(),
            paidBy: settledBy || existing?.settledBy || 'Friend',
            paymentMethod: paymentMethod || 'UPI',
            note: note || '',
          },
        ];
      }
      nextSettledBy = settledBy || existing?.settledBy || 'Friend';
      nextMethod = paymentMethod || existing?.paymentMethod || 'UPI';
      nextNote = note !== undefined ? note : existing?.note || '';
      nextSettledAt = new Date().toISOString();
    } else {
      // Incremental payment — default to remaining (full settle) when amount omitted
      const remaining = Math.max(0, roundMoney(totalAmount - previousPaid));
      const pay = roundMoney(
        typeof paymentAmount === 'number' && !Number.isNaN(paymentAmount)
          ? Math.min(remaining, Math.max(0, paymentAmount))
          : remaining
      );

      nextPaid = roundMoney(Math.min(totalAmount, previousPaid + pay));
      if (pay > 0.009) {
        nextPayments = [
          ...previousPayments,
          {
            id: `pay_${Date.now()}`,
            amount: pay,
            paidAt: new Date().toISOString(),
            paidBy: settledBy || existing?.settledBy || 'Friend',
            paymentMethod: paymentMethod || 'UPI',
            note: note || '',
          },
        ];
      }
      nextSettledBy = settledBy || existing?.settledBy || 'Friend';
      nextMethod = paymentMethod || existing?.paymentMethod || 'UPI';
      nextNote = note !== undefined ? note : existing?.note || '';
      nextSettledAt = new Date().toISOString();
    }

    const remainingAmount = Math.max(0, roundMoney(totalAmount - nextPaid));
    const fullySettled = remainingAmount <= 0.01;
    const isPartial = nextPaid > 0.01 && remainingAmount > 0.01;

    const record = {
      id: settlementId,
      fromId: body.fromId || existing?.fromId || '',
      fromName: body.fromName || existing?.fromName || '',
      toId: body.toId || existing?.toId || '',
      toName: body.toName || existing?.toName || '',
      amount: totalAmount,
      fromContactId: body.fromContactId || existing?.fromContactId,
      toContactId: body.toContactId || existing?.toContactId,
      paidAmount: fullySettled ? totalAmount : nextPaid,
      remainingAmount: fullySettled ? 0 : remainingAmount,
      isSettled: fullySettled,
      isPartial,
      payments: nextPayments,
      settledAt: fullySettled || isPartial ? nextSettledAt : undefined,
      settledBy: fullySettled || isPartial ? nextSettledBy : undefined,
      paymentMethod: fullySettled || isPartial ? nextMethod : undefined,
      note: fullySettled || isPartial ? nextNote : undefined,
    };

    if (index >= 0) {
      existingSettlements[index] = record;
    } else {
      existingSettlements.push(record);
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
