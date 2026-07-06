import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Udharwale',
  description: 'Manage your personal ledger, track debts, and send reminders to contacts.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
