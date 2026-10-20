import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Reset Password',
  description:
    'Reset your Udharwale password using your recovery PIN or security answer.',
  alternates: {
    canonical: absoluteUrl('/forgot-password'),
  },
  openGraph: {
    title: 'Reset Password | Udharwale',
    description: 'Recover access to your Udharwale account safely.',
    url: absoluteUrl('/forgot-password'),
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
