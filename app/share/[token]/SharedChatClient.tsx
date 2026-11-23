'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import BrandMark from '@/app/components/BrandMark';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CreatorCredit from '@/app/components/CreatorCredit';
import { SITE_CREATOR } from '@/lib/seo';

type SharedTx = {
  id: string;
  amount: number;
  type: 'gave' | 'got';
  remark: string;
  date: string;
  createdAt?: string;
  mode: string;
  category?: string;
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

const AVATAR_TONES = [
  'bg-[#0f766e]',
  'bg-[#115e59]',
  'bg-[#134e4a]',
  'bg-[#1e3a36]',
  'bg-[#0e7490]',
  'bg-[#3d4f47]',
];

function avatarTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

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

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-sm';
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
        dim,
        avatarTone(name)
      )}
      title={name}
    >
      {initials(name)}
    </div>
  );
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
    if (data?.viewer.isOwner) {
      router.push('/dashboard');
      return;
    }
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

  const absBalance = data ? Math.abs(data.balance) : 0;
  const debtor = data
    ? data.balance > 0
      ? data.contactName
      : data.balance < 0
        ? data.ownerName
        : null
    : null;
  const creditor = data
    ? data.balance > 0
      ? data.ownerName
      : data.balance < 0
        ? data.contactName
        : null
    : null;

  const showPrimaryCta =
    !!data &&
    (!data.viewer.authenticated ||
      data.viewer.canClaim ||
      data.viewer.alreadyLinked ||
      data.viewer.isOwner);

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <header
        className="sticky top-0 z-20 shrink-0 px-4 py-3"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <BrandMark
            size={36}
            withName
            className="min-w-0"
            subtitle={
              <p className="text-[10px] mt-0.5 font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
                by {SITE_CREATOR}
                {data ? ` · ${data.ownerName} · ${data.contactName}` : ''}
              </p>
            }
          />
        </div>
      </header>

      <main
        className={cn(
          'flex-1 mx-auto w-full max-w-lg flex flex-col min-h-0',
          showPrimaryCta && 'pb-28'
        )}
      >
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Opening…
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <p className="text-lg font-bold">Link not working</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {error}
            </p>
            <Link href="/" className={buttonVariants({ size: 'sm' })}>
              Go to Udharwale
            </Link>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Balance — one glance */}
            <section
              className="px-4 pt-5 pb-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <Avatar name={data.ownerName} size="lg" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  ↔
                </span>
                <Avatar name={data.contactName} size="lg" />
              </div>

              {absBalance === 0 ? (
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--emerald)' }}>
                    <CheckCircle2 className="w-4 h-4" />
                    Settled
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Nothing pending between them
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--rose)' }}>{debtor}</span>
                    {' owes '}
                    <span style={{ color: 'var(--emerald)' }}>{creditor}</span>
                  </p>
                  <p className="text-4xl font-bold tabular-nums tracking-tight">
                    ₹{absBalance.toLocaleString('en-IN')}
                  </p>
                </div>
              )}

              {data.viewer.authenticated && data.viewer.mismatch && (
                <p
                  className="mt-4 text-xs text-center rounded-xl px-3 py-2"
                  style={{
                    background: 'rgba(180,83,9,0.08)',
                    color: '#b45309',
                    border: '1px solid rgba(180,83,9,0.2)',
                  }}
                >
                  Switch to {data.contactName}&apos;s account to join this chat
                </p>
              )}
            </section>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Entries ({data.transactions.length})
              </p>

              {groups.length === 0 ? (
                <div
                  className="rounded-2xl p-8 text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                >
                  <p className="text-sm font-semibold">No entries yet</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.date} className="space-y-2">
                    <div className="flex justify-center">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{
                          background: 'var(--bg-raised)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {formatChatDateLabel(group.date)}
                      </span>
                    </div>

                    {group.items.map((tx) => {
                      const fromName = tx.type === 'gave' ? data.ownerName : data.contactName;
                      const toName = tx.type === 'gave' ? data.contactName : data.ownerName;

                      return (
                        <article
                          key={tx.id}
                          className="rounded-2xl px-3.5 py-3"
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-soft)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar name={fromName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xl font-bold tabular-nums leading-none">
                                ₹{tx.amount.toLocaleString('en-IN')}
                              </p>
                              <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                                <span className="font-semibold">{fromName}</span>
                                <span style={{ color: 'var(--text-muted)' }}> → </span>
                                <span className="font-semibold">{toName}</span>
                              </p>
                            </div>
                          </div>

                          {(tx.remark || tx.mode || tx.category) && (
                            <p className="mt-2 text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                              {[
                                tx.remark || null,
                                tx.mode === 'Online Transfer' ? 'Online' : 'Cash',
                                tx.category
                                  ? tx.category.charAt(0).toUpperCase() + tx.category.slice(1)
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ))
              )}
              <CreatorCredit withProduct className="pt-4 pb-2" />
            </div>
          </>
        )}
      </main>

      {/* Sticky action — one clear next step */}
      {!loading && data && showPrimaryCta && (
        <div
          className="fixed bottom-0 inset-x-0 z-30 px-4 pt-3"
          style={{
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-soft)',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="mx-auto max-w-lg space-y-2">
            {!data.viewer.authenticated ? (
              <>
                <Link
                  href={signupHref}
                  className={cn(buttonVariants({ size: 'lg' }), 'w-full border-0 text-white')}
                  style={{ background: 'var(--primary)' }}
                >
                  I&apos;m {data.contactName} — join
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={loginHref}
                  className="block text-center text-xs font-semibold py-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Already have an account? Sign in
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming || data.viewer.mismatch}
                className={cn(buttonVariants({ size: 'lg' }), 'w-full border-0 text-white')}
                style={{ background: 'var(--primary)' }}
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening…
                  </>
                ) : data.viewer.isOwner ? (
                  'Open in my app'
                ) : data.viewer.alreadyLinked || data.viewer.canClaim ? (
                  'Open in my app'
                ) : (
                  'Open in my app'
                )}
              </button>
            )}
            {claimError && (
              <p className="text-xs text-center" style={{ color: 'var(--rose)' }}>
                {claimError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
