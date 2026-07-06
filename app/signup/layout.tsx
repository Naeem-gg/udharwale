import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account | Udharwale',
  description: 'Sign up for Udharwale - the free, private, and smart digital debt ledger for your personal and business needs.',
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
