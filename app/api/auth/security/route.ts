import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getAuthenticatedUserId } from '@/lib/session';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, recoveryPin, securityAnswer } = await req.json();

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }

    if (!newPassword && !recoveryPin && !securityAnswer) {
      return NextResponse.json({ error: 'Choose at least one security detail to update' }, { status: 400 });
    }

    if (newPassword && String(newPassword).length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    if (recoveryPin && !/^\d{4}$/.test(String(recoveryPin))) {
      return NextResponse.json({ error: 'Recovery PIN must be exactly 4 digits' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findById(userId);

    if (!user || !verifyPassword(String(currentPassword), user.password)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    if (newPassword) {
      user.password = hashPassword(String(newPassword));
    }

    if (recoveryPin) {
      user.recoveryPin = hashPassword(String(recoveryPin));
    }

    if (securityAnswer) {
      user.securityAnswer = hashPassword(String(securityAnswer).toLowerCase().trim());
    }

    await user.save();

    return NextResponse.json({ success: true, message: 'Security settings updated' });
  } catch (error: unknown) {
    console.error('Security update error:', error);
    return NextResponse.json({ error: 'Failed to update security settings' }, { status: 500 });
  }
}
