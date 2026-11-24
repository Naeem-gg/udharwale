import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/session';
import { clearSampleDataForUser } from '@/lib/seed-sample-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const result = await clearSampleDataForUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Sample examples removed',
      ...result,
    });
  } catch (error) {
    console.error('Clear sample data error:', error);
    return NextResponse.json({ error: 'Failed to clear sample data' }, { status: 500 });
  }
}
