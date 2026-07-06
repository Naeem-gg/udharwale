import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Udharwale',
  description: 'Sign in to your Udharwale account to manage your digital khata book securely.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
