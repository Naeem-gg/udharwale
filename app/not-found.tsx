import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'This Udharwale page does not exist. Head back home to continue tracking balances.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="app-shell w-full text-center space-y-6 px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Udharwale</p>
        <h1 className="text-6xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          404
        </h1>
        <div className="space-y-2">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Page not found
          </h2>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            This screen does not exist. Go home or open your ledger.
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <Link href="/" className="btn-primary w-full">
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center px-8 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-secondary)',
            }}
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
