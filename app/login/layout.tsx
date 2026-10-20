import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to Udharwale to open your personal khata book, check balances, and send payment reminders.',
  alternates: {
    canonical: absoluteUrl('/login'),
  },
  openGraph: {
    title: 'Sign In | Udharwale',
    description: 'Access your private digital ledger and contact chats securely.',
    url: absoluteUrl('/login'),
  },
  twitter: {
    title: 'Sign In | Udharwale',
    description: 'Access your private digital ledger and contact chats securely.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
