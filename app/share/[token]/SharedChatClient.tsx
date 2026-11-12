'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Banknote, Loader2, ReceiptText, Sparkles } from 'lucide-react';
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

const AVATAR_GRADIENTS = [
  'from-cyan-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-blue-600',
  'from-lime-500 to-emerald-600',
  'from-fuchsia-500 to-pink-600',
];

function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
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

function formatEventDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function PersonChip({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-11 h-11 text-sm';
  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-tr flex items-center justify-center font-black text-white shrink-0 ring-2 ring-[var(--bg-base)] shadow-lg',
        dim,
        avatarGradient(name)
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

  const creditor = data
    ? data.balance > 0
      ? data.ownerName
      : data.balance < 0
        ? data.contactName
        : null
    : null;
  const debtor = data
    ? data.balance > 0
      ? data.contactName
      : data.balance < 0
        ? data.ownerName
        : null
    : null;
  const absBalance = data ? Math.abs(data.balance) : 0;

  const headline = (() => {
    if (!data) return '';
    const { viewer, ownerName, contactName } = data;
    if (viewer.isOwner) return `Your money chat with ${contactName}`;
    if (viewer.alreadyLinked) return `Your money chat with ${ownerName}`;
    if (viewer.canClaim) return `Open your chat with ${ownerName}`;
    if (viewer.mismatch) return `This chat is for ${contactName}`;
    return `${ownerName} & ${contactName}`;
  })();

  const subcopy = (() => {
    if (!data) return '';
    const { viewer, ownerName, contactName } = data;
    if (viewer.isOwner) {
      return `Anyone with this link can view the record. ${contactName} can join with their phone/email to edit with you.`;
    }
    if (viewer.alreadyLinked) {
      return `You're already linked. Open Udharwale to keep editing this chat with ${ownerName}.`;
    }
    if (viewer.canClaim) {
      return `Your phone/email matches. Open this chat in your account to edit it together with ${ownerName}.`;
    }
    if (viewer.mismatch) {
      return `You're signed in with a different phone/email than the one saved for ${contactName}. Switch accounts to join.`;
    }
    return `If you're ${contactName}, create an account or sign in with the same phone/email to edit this together with ${ownerName}.`;
  })();

  return (
    <div
      className="min-h-dvh flex flex-col relative overflow-hidden"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-24 -left-16 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.28) 0%, transparent 68%)' }}
        />
        <div
          className="absolute top-40 -right-20 w-[24rem] h-[24rem] rounded-full blur-3xl opacity-35"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,0.14) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            maskImage: 'linear-gradient(180deg, black 0%, transparent 78%)',
          }}
        />
      </div>

      <header
        className="relative z-10 shrink-0 px-4 py-3"
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 72%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shrink-0 shadow-lg shadow-cyan-500/20"
              style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
            >
              <ReceiptText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-branding text-lg text-primary leading-none">Udharwale</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                Shared money record
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0"
            style={{
              background: 'rgba(6,182,212,0.12)',
              border: '1px solid rgba(6,182,212,0.28)',
              color: '#67e8f9',
            }}
          >
            View only
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-lg flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-3 p-8"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}
              >
                <Loader2 className="w-5 h-5 animate-spin text-cyan-300" />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Opening chat…
              </p>
            </motion.div>
          )}

          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3"
            >
              <p className="text-lg font-bold">Link not working</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {error}
              </p>
              <Link href="/" className={buttonVariants({ size: 'sm' })}>
                Go to Udharwale
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && data && (
          <>
            {/* Hero */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="px-4 pt-5 pb-4 space-y-4 shrink-0"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="text-center min-w-0">
                  <PersonChip name={data.ownerName} size="lg" />
                  <p className="text-[11px] font-bold mt-1.5 truncate max-w-[7rem]" style={{ color: 'var(--text-secondary)' }}>
                    {data.ownerName}
                  </p>
                </div>

                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 380, damping: 22 }}
                  className="flex flex-col items-center gap-1 px-1"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(245,158,11,0.2))',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 8px 24px rgba(6,182,212,0.15)',
                    }}
                  >
                    <Banknote className="w-4 h-4 text-cyan-200" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    ledger
                  </span>
                </motion.div>

                <div className="text-center min-w-0">
                  <PersonChip name={data.contactName} size="lg" />
                  <p className="text-[11px] font-bold mt-1.5 truncate max-w-[7rem]" style={{ color: 'var(--text-secondary)' }}>
                    {data.contactName}
                  </p>
                </div>
              </div>

              <div className="text-center px-2">
                <h1 className="text-2xl font-black tracking-tight leading-tight">{headline}</h1>
                <p className="text-sm mt-2 leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  {subcopy}
                </p>
              </div>

              {/* Balance spotlight */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.12, duration: 0.3 }}
                className="relative overflow-hidden rounded-3xl p-4"
                style={{
                  background:
                    absBalance === 0
                      ? 'linear-gradient(145deg, rgba(6,182,212,0.14), rgba(15,23,42,0.4))'
                      : 'linear-gradient(145deg, rgba(245,158,11,0.18), rgba(6,182,212,0.1) 55%, rgba(15,23,42,0.45))',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
                }}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-10 w-36 h-36 rounded-full blur-2xl opacity-50"
                  style={{ background: absBalance === 0 ? 'rgba(6,182,212,0.35)' : 'rgba(245,158,11,0.35)' }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {absBalance === 0 ? 'All clear' : 'Open balance'}
                    </p>
                    {absBalance === 0 ? (
                      <p className="text-2xl font-black mt-1 tracking-tight">Settled</p>
                    ) : (
                      <>
                        <p className="text-3xl font-black tabular-nums mt-1 tracking-tight">
                          ₹{absBalance.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs font-semibold mt-1.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                          <span className="text-amber-200">{debtor}</span>
                          {' owes '}
                          <span className="text-cyan-200">{creditor}</span>
                        </p>
                      </>
                    )}
                  </div>
                  {absBalance === 0 ? (
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.35)' }}
                    >
                      <Sparkles className="w-5 h-5 text-cyan-300" />
                    </div>
                  ) : (
                    <div className="flex -space-x-2 shrink-0 pt-1">
                      {debtor && <PersonChip name={debtor} size="sm" />}
                      {creditor && <PersonChip name={creditor} size="sm" />}
                    </div>
                  )}
                </div>
              </motion.div>

              {!data.viewer.authenticated && (
                <div className="flex flex-col gap-2">
                  <Link
                    href={signupHref}
                    className={cn(buttonVariants({ size: 'lg' }), 'w-full border-0 text-white shadow-lg shadow-cyan-600/20')}
                    style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
                  >
                    I&apos;m {data.contactName} — create account
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
                    className={cn(buttonVariants({ size: 'lg' }), 'w-full border-0 text-white shadow-lg shadow-cyan-600/20')}
                    style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening…
                      </>
                    ) : data.viewer.isOwner ? (
                      'Open in my dashboard'
                    ) : (
                      'Open in my Udharwale'
                    )}
                  </button>
                  {claimError && (
                    <p className="text-xs text-center" style={{ color: '#fda4af' }}>
                      {claimError}
                    </p>
                  )}
                </div>
              )}

              {data.viewer.authenticated && data.viewer.mismatch && (
                <p
                  className="text-xs leading-relaxed rounded-2xl p-3"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: '#fcd34d',
                  }}
                >
                  Signed-in details don&apos;t match {data.contactName}. Use the account with their phone/email to join.
                </p>
              )}
            </motion.section>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-3 pb-8 space-y-5 min-h-0">
              {groups.length === 0 ? (
                <div
                  className="rounded-3xl p-10 text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                >
                  <p className="text-sm font-bold">No payments yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    New entries will show up here.
                  </p>
                </div>
              ) : (
                groups.map((group, gi) => (
                  <div key={group.date} className="space-y-2.5">
                    <div className="flex justify-center">
                      <span
                        className="px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md"
                        style={{
                          background: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)',
                          border: '1px solid var(--border-soft)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {formatChatDateLabel(group.date)}
                      </span>
                    </div>

                    {group.items.map((tx, ti) => {
                      const fromName = tx.type === 'gave' ? data.ownerName : data.contactName;
                      const toName = tx.type === 'gave' ? data.contactName : data.ownerName;

                      return (
                        <motion.article
                          key={tx.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(0.04 * (gi * 3 + ti), 0.28), duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="relative overflow-hidden rounded-3xl p-3.5"
                          style={{
                            background: 'linear-gradient(160deg, color-mix(in srgb, var(--bg-surface) 92%, #0e7490) 0%, var(--bg-surface) 55%)',
                            border: '1px solid var(--border-soft)',
                            boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
                          }}
                        >
                          <div
                            className="pointer-events-none absolute inset-y-0 left-0 w-1"
                            style={{ background: 'linear-gradient(180deg,#22d3ee,#f59e0b)' }}
                          />

                          <div className="flex items-center gap-2.5 pl-1.5">
                            <PersonChip name={fromName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                                  {fromName}
                                </span>
                                <span className="shrink-0 text-cyan-300/80">paid</span>
                                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                                  {toName}
                                </span>
                              </div>
                              <p className="text-2xl font-black tabular-nums leading-none mt-1 tracking-tight">
                                ₹{tx.amount.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <PersonChip name={toName} size="sm" />
                          </div>

                          {tx.remark ? (
                            <p
                              className="mt-3 ml-1.5 text-sm font-medium leading-snug rounded-2xl px-3 py-2"
                              style={{
                                background: 'color-mix(in srgb, var(--bg-raised) 80%, transparent)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {tx.remark}
                            </p>
                          ) : null}

                          <p className="mt-2.5 ml-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {formatEventDate(tx.date)}
                            {' · '}
                            {tx.mode === 'Online Transfer' ? 'Online' : 'Cash'}
                            {tx.category
                              ? ` · ${tx.category.charAt(0).toUpperCase()}${tx.category.slice(1)}`
                              : ''}
                          </p>
                        </motion.article>
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
