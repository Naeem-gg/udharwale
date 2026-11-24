import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';
import { seedSampleDataForUser } from '@/lib/seed-sample-data';
import { normalizeAvatarSeed, randomAvatarPreset } from '@/lib/avatar-presets';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { name, email, phone, password, recoveryPin, securityAnswer, avatarSeed } = await req.json();

    if (!name || !email || !phone || !password || !recoveryPin || !securityAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone.length < 8) {
      return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
    }

    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number is already registered' }, { status: 409 });
    }

    const hashedPassword = hashPassword(password);
    const hashedPin = hashPassword(recoveryPin);
    const hashedAnswer = hashPassword(securityAnswer.toLowerCase().trim());
    const user = new User({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      recoveryPin: hashedPin,
      securityAnswer: hashedAnswer,
      avatarSeed: normalizeAvatarSeed(avatarSeed) || randomAvatarPreset(),
    });

    await user.save();

    try {
      await seedSampleDataForUser(String(user._id), name);
    } catch (seedErr) {
      console.error('Sample seed after signup failed:', seedErr);
    }

    return NextResponse.json({ success: true, message: 'Registration successful' }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'Email or phone is already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An error occurred during registration' }, { status: 500 });
  }
}
