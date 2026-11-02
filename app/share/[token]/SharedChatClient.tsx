'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SharedTx = {
  id: string;
  amount: number;
  type: 'gave' | 'got';
  remark: string;
  date: string;
  createdAt?: string;
  mode: string;
};

type ViewerState = {
  authenticated: boolean;
  canClaim: boolean;
  alreadyLinked: boolean;
  isOwner: boolean;
  mismatch: boolean;
};

type SharedLedger = {
  ownerName: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string | null;
  balance: number;
  peerLinked?: boolean;
  viewer: ViewerState;
  transactions: SharedTx[];
};

function formatChatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function formatEventDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SharedChatClient({ token }: { token: string }) {
  const router = useRouter();
  const [data, setData] = useState<SharedLedger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const sharePath = `/share/${token}`;
  const loginHref = `/login?next=${encodeURIComponent(sharePath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(sharePath)}`;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch(`/api/share/${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || 'Could not open this chat');
        return body as SharedLedger;
      })
      .then((body) => {
        if (!cancelled) {
          setData(body);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Could not open this chat');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const groups = useMemo(() => {
    if (!data) return [] as { date: string; items: SharedTx[] }[];
    const result: { date: string; items: SharedTx[] }[] = [];
    for (const tx of data.transactions) {
      const last = result[result.length - 1];
      if (last && last.date === tx.date) last.items.push(tx);
      else result.push({ date: tx.date, items: [tx] });
    }
    return result;
  }, [data]);

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch(`/api/share/${token}/claim`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Could not open this chat in your account');
      router.push('/dashboard');
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : 'Could not claim this chat');
      setClaiming(false);
    }
  };

  const balanceLine = data
    ? data.balance > 0
      ? `${data.contactName} owes ${data.ownerName} ₹${data.balance.toLocaleString('en-IN')}`
      : data.balance < 0
        ? `${data.ownerName} owes ${data.contactName} ₹${Math.abs(data.balance).toLocaleString('en-IN')}`
        : 'Settled — nothing left to pay'
    : '';

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="shrink-0 px-4 py-3 border-b" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-soft)' }}>
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shrink-0">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-branding text-lg text-primary leading-none">Udharwale</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                Shared by {data?.ownerName || '…'}
              </p>
            </div>
          </div>
          <Badge>View only</Badge>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-lg flex flex-col min-h-0">
        {loading && (
          <div className="flex-1 flex items-center justify-center p-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Opening chat…
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <p className="text-lg font-bold">Link not working</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <Link href="/" className={buttonVariants({ size: 'sm' })}>
              Go to Udharwale
            </Link>
          </div>
        )}

        {!loading && data && (
          <>
            <div
              className="px-4 py-4 shrink-0 space-y-3"
              style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}
            >
              <div>
                <h1 className="text-xl font-black leading-tight">
                  Are you {data.contactName}?
                </h1>
                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Sign up or log in with the same phone/email to open this chat in your app and edit it together.
                </p>
              </div>

              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background:
                    data.balance > 0
                      ? 'rgba(16,185,129,0.1)'
                      : data.balance < 0
                        ? 'rgba(244,63,94,0.1)'
                        : 'var(--bg-raised)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Balance</p>
                <p
                  className="text-sm font-bold mt-0.5"
                  style={{
                    color: data.balance > 0 ? '#34d399' : data.balance < 0 ? '#fb7185' : 'var(--text-secondary)',
                  }}
                >
                  {balanceLine}
                </p>
              </div>

              {!data.viewer.authenticated && (
                <div className="flex flex-col gap-2">
                  <Link href={signupHref} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={loginHref} className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full')}>
                    Sign in
                  </Link>
                </div>
              )}

              {data.viewer.authenticated && (data.viewer.canClaim || data.viewer.alreadyLinked || data.viewer.isOwner) && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={claiming}
                    className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening…
                      </>
                    ) : (
                      'Open in my Udharwale'
                    )}
                  </button>
                  {claimError && (
                    <p className="text-xs text-center" style={{ color: '#fda4af' }}>{claimError}</p>
                  )}
                </div>
              )}

              {data.viewer.authenticated && data.viewer.mismatch && (
                <p className="text-xs leading-relaxed rounded-xl p-3"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}>
                  Your signed-in phone/email doesn’t match {data.contactName}. Use the matching account.
                </p>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto px-3 py-4 space-y-4"
              style={{ background: 'var(--bg-base)' }}
            >
              {groups.length === 0 ? (
                <p className="text-center text-sm py-12" style={{ color: 'var(--text-muted)' }}>
                  No payments yet.
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.date} className="space-y-2.5">
                    <div className="flex justify-center">
                      <span
                        className="px-3 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}
                      >
                        {formatChatDateLabel(group.date)}
                      </span>
                    </div>

                    {group.items.map((tx) => {
                      // Owner-frame: gave = owner gave money; got = contact gave money
                      const ownerGave = tx.type === 'gave';
                      const whoGaveLabel = ownerGave
                        ? `${data.ownerName} gave`
                        : `${data.contactName} gave`;
                      const tint = ownerGave ? 'rgba(16,185,129,0.14)' : 'rgba(244,63,94,0.12)';
                      const border = ownerGave ? 'rgba(16,185,129,0.28)' : 'rgba(244,63,94,0.28)';
                      const color = ownerGave ? '#10b981' : '#f43f5e';
                      const labelColor = ownerGave ? '#34d399' : '#fb7185';

                      return (
                        <div key={tx.id} className={cn('flex', ownerGave ? 'justify-end' : 'justify-start')}>
                          <div
                            className="max-w-[85%] rounded-2xl px-4 py-3"
                            style={{ background: tint, border: `1px solid ${border}` }}
                          >
                            <p className="text-[11px] font-bold" style={{ color: labelColor }}>
                              {whoGaveLabel}
                            </p>
                            <p className="text-2xl font-black tabular-nums mt-0.5 leading-none" style={{ color }}>
                              ₹{tx.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-sm mt-2 font-medium leading-snug">{tx.remark}</p>
                            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                              {formatEventDate(tx.date)}
                              {' · '}
                              {tx.mode === 'Online Transfer' ? 'Online' : 'Cash'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
