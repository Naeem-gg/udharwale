import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded ? decoded.userId : null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();

    if (!Array.isArray(body.contacts)) {
      return NextResponse.json(
        { error: 'Invalid payload: "contacts" must be an array' },
        { status: 400 }
      );
    }

    const insertedContacts = [];

    // Process each contact
    for (const contactData of body.contacts) {
      const { id, name, phone, email, transactions, createdAt } = contactData;

      if (!id || !name || !phone) {
        continue; // Skip invalid contacts
      }

      // We will try to insert and catch duplicate key errors if 'id' is duplicate.
      const newContact = new Contact({
        id,
        userId,
        name,
        phone,
        email: email || undefined,
        transactions: transactions || [],
        createdAt: createdAt || new Date().toISOString()
      });

      try {
        await newContact.save();
        insertedContacts.push(newContact);
      } catch (err: any) {
        // If duplicate id, it throws E11000. Just ignore and skip saving duplicates.
        if (err.code !== 11000) {
          console.error('Error saving individual contact:', err);
        }
      }
    }

    return NextResponse.json({ insertedCount: insertedContacts.length, contacts: insertedContacts }, { status: 201 });
  } catch (error: any) {
    console.error('Error in bulk contacts import:', error);
    return NextResponse.json(
      { error: 'Failed to import contacts' },
      { status: 500 }
    );
  }
}
