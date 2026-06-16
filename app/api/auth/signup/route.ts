import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { name, email, password, recoveryPin, securityAnswer } = await req.json();

    if (!name || !email || !password || !recoveryPin || !securityAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
    }

    // Hash password and recovery options
    const hashedPassword = hashPassword(password);
    const hashedPin = hashPassword(recoveryPin); // We can reuse hashPassword for PIN and Answer
    const hashedAnswer = hashPassword(securityAnswer.toLowerCase().trim()); // normalize answer
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      recoveryPin: hashedPin,
      securityAnswer: hashedAnswer
    });

    await user.save();

    return NextResponse.json({ success: true, message: 'Registration successful' }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'An error occurred during registration' }, { status: 500 });
  }
}
