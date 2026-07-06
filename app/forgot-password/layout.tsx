import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | Udharwale',
  description: 'Reset your Udharwale password securely.',
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
