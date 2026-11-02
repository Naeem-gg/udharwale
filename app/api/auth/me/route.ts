import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { getAuthenticatedUserId } from '@/lib/session';

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
