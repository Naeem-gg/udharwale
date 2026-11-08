import type { Metadata } from 'next';
import { connectToDatabase } from '@/lib/db';
import Trip from '@/models/Trip';
import { absoluteUrl } from '@/lib/seo';
import SharedTripClient from './SharedTripClient';

type PageProps = {
  params: Promise<{ token: string }>;
};

async function getTripMeta(token: string) {
  try {
    if (!token) return null;
    await connectToDatabase();
    const trip = await Trip.findOne({ shareToken: token }).select('name destination participants expenses').lean();
    if (!trip) return null;
    return {
      name: trip.name as string,
      destination: (trip.destination as string) || '',
      memberCount: (trip.participants?.length as number) || 0,
      totalSpend: (trip.expenses as any[])?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const meta = await getTripMeta(token);
  const url = absoluteUrl(`/share/trip/${token}`);

  if (!meta) {
    return {
      title: 'Shared Trip Expenses',
      description: 'Open a shared trip expense breakdown on Udharwale.',
      alternates: { canonical: url },
      robots: { index: false, follow: false },
    };
  }

  const title = `${meta.name} — Trip Expenses`;
  const description = `View transparent trip expense breakdown, who paid what, per-head costs, and who owes whom for ${meta.name} on Udharwale.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Udharwale`,
      description,
      url,
      type: 'website',
    },
    twitter: {
      title: `${title} | Udharwale`,
      description,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function SharedTripPage({ params }: PageProps) {
  const { token } = await params;
  return <SharedTripClient token={token} />;
}

