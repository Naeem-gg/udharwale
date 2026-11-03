import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { getAuthenticatedUserId } from '@/lib/session';
import { normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(userId).select('name email phone');

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
      }
    });
  } catch (error: any) {
    console.error('Session verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const phoneRaw = typeof body.phone === 'string' ? body.phone : undefined;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Enter a valid name' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.name = name;

    if (phoneRaw !== undefined) {
      const phone = normalizePhone(phoneRaw);
      if (phone.length < 8) {
        return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
      }
      if (phone !== user.phone) {
        const taken = await User.findOne({ phone, _id: { $ne: userId } });
        if (taken) {
          return NextResponse.json({ error: 'Phone number is already registered' }, { status: 409 });
        }
        user.phone = phone;
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'Phone number is already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
