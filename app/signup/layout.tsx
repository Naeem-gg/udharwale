import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Create Account',
  description:
    'Create a free Udharwale account to track money given, money received, settlements, and WhatsApp reminders.',
  alternates: {
    canonical: absoluteUrl('/signup'),
  },
  openGraph: {
    title: 'Create Account | Udharwale',
    description: 'Start your free personal khata book in minutes — private and simple.',
    url: absoluteUrl('/signup'),
  },
  twitter: {
    title: 'Create Account | Udharwale',
    description: 'Start your free personal khata book in minutes — private and simple.',
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
