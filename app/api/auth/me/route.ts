import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        name: payload.name,
        email: payload.email
      }
    });
  } catch (error: any) {
    console.error('Session verify error:', error);
    return NextResponse.json({ error: 'Outfitnal server error' }, { status: 500 });
  }
}
