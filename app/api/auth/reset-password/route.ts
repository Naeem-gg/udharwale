import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { email, recoveryPin, securityAnswer, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Missing email or new password' }, { status: 400 });
    }

    if (!recoveryPin && !securityAnswer) {
      return NextResponse.json({ error: 'Provide either your Recovery PIN or Security Answer' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Don't leak that the email doesn't exist, just return generic error
      return NextResponse.json({ error: 'Invalid recovery details' }, { status: 400 });
    }

    // Check which recovery method was provided and verify
    let isRecoveryValid = false;

    if (recoveryPin) {
      isRecoveryValid = verifyPassword(recoveryPin, user.recoveryPin);
    } 
    
    if (!isRecoveryValid && securityAnswer) {
      const normalizedAnswer = securityAnswer.toLowerCase().trim();
      isRecoveryValid = verifyPassword(normalizedAnswer, user.securityAnswer);
    }

    if (!isRecoveryValid) {
      return NextResponse.json({ error: 'Invalid recovery details' }, { status: 400 });
    }

    // If valid, update the password
    user.password = hashPassword(newPassword);
    await user.save();

    return NextResponse.json({ success: true, message: 'Password reset successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'An error occurred during password reset' }, { status: 500 });
  }
}
