import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { verifyToken } from '@/lib/auth';

// Next.js App Router forces dynamic execution for db calls
export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Retrieve contacts belonging to the logged-in user
    const contacts = await Contact.find({ userId }).sort({ updatedAt: -1 });
    return NextResponse.json(contacts);
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve contacts from backend' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    const { id, name, phone, email, transactions, createdAt } = body;

    if (!id || !name || !phone) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, name, phone' },
        { status: 400 }
      );
    }

    const newContact = new Contact({
      id,
      userId, // Scope contact to authenticated user
      name,
      phone,
      email: email || undefined,
      transactions: transactions || [],
      createdAt: createdAt || new Date().toISOString()
    });

    await newContact.save();
    return NextResponse.json(newContact, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
