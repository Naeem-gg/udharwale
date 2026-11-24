import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import { getAuthenticatedUserId } from '@/lib/session';
import { normalizePhone } from '@/lib/phone';
import { serializeContactForUser } from '@/lib/ledger-access';
import { normalizeAvatarSeed } from '@/lib/avatar-presets';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, dueDate, avatarSeed } = body;

    const contact = await Contact.findOne({ id, userId });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (name !== undefined) contact.name = name;
    if (phone !== undefined) contact.phone = normalizePhone(phone) || phone;
    if (email !== undefined) contact.email = email ? String(email).toLowerCase().trim() : undefined;
    if (dueDate !== undefined) {
      contact.dueDate =
        typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null;
    }
    if (avatarSeed !== undefined) {
      // Linked friends keep their account avatar in the UI; local seed is a tiny preset id only.
      (contact as any).avatarSeed = normalizeAvatarSeed(avatarSeed);
    }

    await contact.save();
    return NextResponse.json(serializeContactForUser(contact, 'owner'));
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const result = await Contact.deleteOne({ id, userId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
