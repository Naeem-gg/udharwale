import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Manage your Udharwale contacts, payment chat history, balances, settlements, and reminders.',
  alternates: {
    canonical: absoluteUrl('/dashboard'),
  },
  openGraph: {
    title: 'Dashboard | Udharwale',
    description: 'Your private money chats, balances, and settlement tools.',
    url: absoluteUrl('/dashboard'),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
