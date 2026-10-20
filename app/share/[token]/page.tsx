import type { Metadata } from 'next';
import { connectToDatabase } from '@/lib/db';
import Contact from '@/models/Contact';
import User from '@/models/User';
import { absoluteUrl } from '@/lib/seo';
import SharedChatClient from './SharedChatClient';

type PageProps = {
  params: Promise<{ token: string }>;
};

async function getShareMeta(token: string) {
  try {
    if (!token || token.length < 16) return null;
    await connectToDatabase();
    const contact = await Contact.findOne({ shareToken: token }).select('name userId').lean();
    if (!contact) return null;
    const owner = await User.findById(contact.userId).select('name').lean();
    return {
      contactName: contact.name as string,
      ownerName: (owner?.name as string) || 'Someone',
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const meta = await getShareMeta(token);
  const url = absoluteUrl(`/share/${token}`);

  if (!meta) {
    return {
      title: 'Shared Chat',
      description: 'Open a shared Udharwale money chat. This link may be invalid or removed.',
      alternates: { canonical: url },
      robots: { index: false, follow: false },
    };
  }

  const title = `Money chat with ${meta.contactName}`;
  const description = `${meta.ownerName} shared a Udharwale money chat with ${meta.contactName}. View the record — no login needed.`;

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

export default async function SharedChatPage({ params }: PageProps) {
  const { token } = await params;
  return <SharedChatClient token={token} />;
}
