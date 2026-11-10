'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Share2,
  Sparkles,
  Users,
  Zap,
  TrendingDown,
  TrendingUp,
  ReceiptText,
  MapPin,
  Calendar,
  Compass,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Trip,
  TripSettlement,
  CATEGORY_CONFIG,
  calculateTripSummary,
  formatWhatsAppSummary,
} from '@/app/components/trip-types';

/* ─── Avatar colours (deterministic by name) ─── */
const AVATAR_GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];
function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/* ─── Animated counter ─── */
function Counter({ to, prefix = '', duration = 1.4 }: { to: number; prefix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(eased * to));
      if (pct < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {prefix}{val.toLocaleString('en-IN')}
    </span>
  );
}

/* ─── Section fade-in wrapper ─── */
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Tab button ─── */
function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-colors duration-200 text-center',
        active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
      )}
    >
      {active && (
        <motion.span
          layoutId="shared-tab-pill"
          className="absolute inset-0 rounded-xl bg-violet-600 shadow-lg shadow-violet-700/50"
          style={{ zIndex: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function SharedTripClient({ token }: { token: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'settlement' | 'breakdown'>('settlement');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [shared, setShared] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Acknowledgement state
  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [acknowledgingSettlement, setAcknowledgingSettlement] = useState<TripSettlement | null>(null);
  const [ackMethod, setAckMethod] = useState<'UPI' | 'Cash' | 'Bank' | 'Other'>('UPI');
  const [ackNote, setAckNote] = useState('');
  const [ackPayerName, setAckPayerName] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 220], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 220], [1, 0.96]);
  const heroY = useTransform(scrollY, [0, 220], [0, -30]);

  /* Fetch ─────────────────────────────────────────── */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/trips/share/${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || 'Could not load this shared trip');
        return body;
      })
      .then((data) => {
        if (!cancelled) {
          setTrip(data);
          setOwnerName(data.ownerName || 'Someone');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const summary = useMemo(() => (trip ? calculateTripSummary(trip) : null), [trip]);
  const currency = trip?.currency || '₹';

  /* Share ─────────────────────────────────────────── */
  const handleShare = async () => {
    if (!trip) return;
    const text = formatWhatsAppSummary(trip, ownerName);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${trip.name} — Expenses`, text, url: window.location.href });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      }
    } catch {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ── ACKNOWLEDGE SETTLEMENT FROM SHARED VIEW ────────
  const openAcknowledgeModal = (st: TripSettlement) => {
    setAcknowledgingSettlement(st);
    setAckPayerName(st.fromName);
    setAckMethod('UPI');
    setAckNote('');
    setIsAckModalOpen(true);
  };

  const handleConfirmAck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !acknowledgingSettlement) return;

    setIsSubmittingAck(true);
    try {
      const res = await fetch(`/api/trips/share/${token}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: acknowledgingSettlement.id,
          fromId: acknowledgingSettlement.fromId,
          fromName: acknowledgingSettlement.fromName,
          toId: acknowledgingSettlement.toId,
          toName: acknowledgingSettlement.toName,
          amount: acknowledgingSettlement.amount,
          isSettled: true,
          settledBy: ackPayerName || acknowledgingSettlement.fromName,
          paymentMethod: ackMethod,
          note: ackNote.trim(),
        }),
      });

      if (res.ok) {
        const body = await res.json();
        setTrip({
          ...trip,
          settlements: body.settlements,
        });
      } else {
        // Optimistic fallback
        const existing = trip.settlements ? [...trip.settlements] : [];
        const idx = existing.findIndex((s) => s.id === acknowledgingSettlement.id);
        const record = {
          ...acknowledgingSettlement,
          isSettled: true,
          settledAt: new Date().toISOString(),
          settledBy: ackPayerName || acknowledgingSettlement.fromName,
          paymentMethod: ackMethod,
          note: ackNote.trim(),
        };
        if (idx >= 0) existing[idx] = record;
        else existing.push(record);
        setTrip({ ...trip, settlements: existing });
      }
    } catch {
      // Optimistic fallback
      const existing = trip.settlements ? [...trip.settlements] : [];
      const idx = existing.findIndex((s) => s.id === acknowledgingSettlement.id);
      const record = {
        ...acknowledgingSettlement,
        isSettled: true,
        settledAt: new Date().toISOString(),
        settledBy: ackPayerName || acknowledgingSettlement.fromName,
        paymentMethod: ackMethod,
        note: ackNote.trim(),
      };
      if (idx >= 0) existing[idx] = record;
      else existing.push(record);
      setTrip({ ...trip, settlements: existing });
    } finally {
      setIsSubmittingAck(false);
      setIsAckModalOpen(false);
      setAcknowledgingSettlement(null);
    }
  };

  const handleRevertAck = async (st: TripSettlement) => {
    if (!trip) return;
    try {
      const res = await fetch(`/api/trips/share/${token}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: st.id,
          isSettled: false,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setTrip({ ...trip, settlements: body.settlements });
      } else {
        const existing = trip.settlements ? [...trip.settlements] : [];
        const idx = existing.findIndex((s) => s.id === st.id);
        if (idx >= 0) existing[idx] = { ...existing[idx], isSettled: false };
        setTrip({ ...trip, settlements: existing });
      }
    } catch {
      const existing = trip.settlements ? [...trip.settlements] : [];
      const idx = existing.findIndex((s) => s.id === st.id);
      if (idx >= 0) existing[idx] = { ...existing[idx], isSettled: false };
      setTrip({ ...trip, settlements: existing });
    }
  };

  // Filtered settlements in settlement tab
  const filteredSettlements = useMemo(() => {
    if (!summary) return [];
    if (settlementFilter === 'pending') return summary.settlements.filter((s) => !s.isSettled);
    if (settlementFilter === 'settled') return summary.settlements.filter((s) => s.isSettled);
    return summary.settlements;
  }, [summary, settlementFilter]);

  /* ── LOADING SCREEN ───────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/40"
        >
          <ReceiptText className="w-7 h-7 text-white" />
        </motion.div>

        <div className="flex gap-2">
          {[0, 0.15, 0.3].map((d, i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-violet-500"
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: d, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <p className="text-sm font-semibold text-slate-400">Opening trip expenses…</p>
      </div>
    );
  }

  /* ── ERROR SCREEN ─────────────────────────────────── */
  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 p-8 text-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-4xl"
        >
          🔗
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
          <h1 className="text-2xl font-black text-white">Trip Not Found</h1>
          <p className="text-sm text-slate-400 max-w-sm">{error}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Link href="/" className={buttonVariants({ size: 'default' })}>
            Go to Udharwale <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!trip || !summary) return null;

  /* ════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* ── STICKY TOP NAV ─────────────────────────────── */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-40 border-b"
        style={{ background: 'rgba(3,4,10,0.85)', backdropFilter: 'blur(20px)', borderColor: 'var(--border-soft)' }}
      >
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
              <ReceiptText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-branding text-base text-primary leading-none block">Udharwale</span>
              <p className="text-[9px] mt-0.5 truncate text-slate-500">Shared by {ownerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleCopyLink}
              className="h-8 px-2.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors"
              style={{
                background: copiedLink ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${copiedLink ? 'rgba(16,185,129,0.4)' : 'var(--border-soft)'}`,
                color: copiedLink ? '#34d399' : 'var(--text-secondary)',
              }}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Copy link'}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleShare}
              className="h-8 px-3 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 text-white shadow-lg shadow-emerald-600/25"
              style={{ background: shared ? '#059669' : 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{shared ? 'Shared!' : 'Share'}</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ── CINEMATIC HERO ─────────────────────────────── */}
      <motion.div ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="aurora-blob animate-aurora absolute -left-24 -top-24 h-[500px] w-[500px] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.22)_0%,transparent_70%)]" />
          <div className="aurora-blob animate-aurora absolute right-0 bottom-0 h-[400px] w-[400px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.14)_0%,transparent_70%)] [animation-delay:4s]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-base)]" />
        </div>

        <div className="relative mx-auto max-w-2xl px-4 pt-10 pb-8 space-y-6">
          <FadeUp delay={0.05}>
            <div className="flex flex-wrap items-center gap-2">
              {trip.destination && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
                >
                  <MapPin className="w-3 h-3" /> {trip.destination}
                </span>
              )}
              {trip.startDate && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-400"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-soft)' }}
                >
                  <Calendar className="w-3 h-3" /> {trip.startDate}
                </span>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider',
                  summary.allSettled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                )}
              >
                {summary.allSettled ? <Sparkles className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {summary.allSettled
                  ? 'All 100% Settled'
                  : `${summary.settlementProgressPct}% Resolved (${currency}${summary.totalPendingAmount.toLocaleString('en-IN')} pending)`}
              </span>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">{trip.name}</h1>
            {trip.description && <p className="text-sm mt-2 text-slate-400 leading-relaxed max-w-lg">{trip.description}</p>}
          </FadeUp>

          <FadeUp delay={0.18}>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
              <div>
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-1">Total Group Spend</p>
                <div className="text-5xl sm:text-6xl font-black tabular-nums text-emerald-400 leading-none">
                  <Counter to={summary.totalSpend} prefix={currency} duration={1.6} />
                </div>
              </div>

              <div className="flex gap-5 sm:gap-8 pb-1">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Per Head</p>
                  <p className="text-2xl font-black tabular-nums text-indigo-300">
                    <Counter to={summary.perHeadAverage} prefix={currency} duration={1.4} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Pending Dues</p>
                  <p className="text-2xl font-black tabular-nums text-rose-400">
                    <Counter to={summary.totalPendingAmount} prefix={currency} duration={1} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">People</p>
                  <p className="text-2xl font-black tabular-nums text-pink-300">
                    <Counter to={trip.participants.length} duration={0.8} />
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.26}>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {trip.participants.slice(0, 6).map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28 + i * 0.06 }}
                    className={cn(
                      'w-9 h-9 rounded-full bg-gradient-to-tr flex items-center justify-center font-black text-xs text-white ring-2 ring-[var(--bg-base)]',
                      avatarGradient(p.name)
                    )}
                    style={{ zIndex: 10 - i }}
                    title={p.name}
                  >
                    {p.name[0].toUpperCase()}
                  </motion.div>
                ))}
                {trip.participants.length > 6 && (
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-300 ring-2 ring-[var(--bg-base)]">
                    +{trip.participants.length - 6}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trip.participants.slice(0, 4).map((p) => (
                  <span key={p.id} className="text-xs font-semibold text-slate-400">
                    {p.name}
                  </span>
                ))}
                {trip.participants.length > 4 && (
                  <span className="text-xs font-semibold text-slate-500">& {trip.participants.length - 4} more</span>
                )}
              </div>
            </div>
          </FadeUp>
        </div>
      </motion.div>

      {/* ── STICKY TABS ────────────────────────────────── */}
      <div className="sticky top-[53px] z-30 px-4 py-2 mx-auto w-full max-w-2xl">
        <div
          className="flex p-1 rounded-2xl"
          style={{ background: 'rgba(8,12,24,0.92)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-soft)' }}
        >
          <TabBtn active={activeTab === 'settlement'} onClick={() => setActiveTab('settlement')}>
            ⚖️ Who Owes Whom {summary.pendingSettlementsCount > 0 ? `(${summary.pendingSettlementsCount})` : ''}
          </TabBtn>
          <TabBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
            💬 Chat Feed
          </TabBtn>
          <TabBtn active={activeTab === 'breakdown'} onClick={() => setActiveTab('breakdown')}>
            🧾 All Items
          </TabBtn>
        </div>
      </div>

      {/* ── TAB CONTENT ────────────────────────────────── */}
      <div className="flex-1 mx-auto w-full max-w-2xl px-4 pb-10 pt-3 space-y-4">
        <AnimatePresence mode="wait">
          {/* ══ SETTLEMENT & ACKNOWLEDGEMENT TAB ══ */}
          {activeTab === 'settlement' && (
            <motion.div
              key="settlement"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* ── RESOLUTION & PROGRESS HERO BANNER ── */}
              <div
                className="p-5 rounded-3xl space-y-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(124,58,237,0.08))',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400 block">
                      Settlement Resolution Progress
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-0.5">
                      <span>{summary.settlementProgressPct}% Resolved</span>
                      {summary.allSettled && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                          100% Cleared 🎉
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {summary.settledSettlementsCount} of {summary.settlements.length} transfers cleared · Minimum-debt algorithm
                    </p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={handleShare}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/30 shrink-0 self-start sm:self-auto"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Status on WhatsApp</span>
                  </motion.button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-2.5 rounded-full bg-slate-800/90 overflow-hidden relative">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${summary.settlementProgressPct}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Stat pills: Settled vs Pending */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-2xl border" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}>
                    <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                      ✅ Paid & Acknowledged
                    </span>
                    <div className="text-lg font-black text-white tabular-nums mt-0.5">
                      {currency}{summary.totalSettledAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {summary.settledSettlementsCount} transfer{summary.settledSettlementsCount !== 1 ? 's' : ''} completed
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl border" style={{ background: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.2)' }}>
                    <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider block">
                      ⏳ Pending Resolution
                    </span>
                    <div className="text-lg font-black text-white tabular-nums mt-0.5">
                      {currency}{summary.totalPendingAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {summary.pendingSettlementsCount} transfer{summary.pendingSettlementsCount !== 1 ? 's' : ''} remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* ── SETTLEMENT TRANSFERS LIST WITH FILTERS & ACKNOWLEDGEMENT ── */}
              <div
                className="p-5 rounded-3xl space-y-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>⚖️ Who Pays Whom</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Acknowledge transfers as they are paid via UPI, Cash, or Ledger
                    </p>
                  </div>

                  <div className="flex p-0.5 rounded-xl text-xs font-bold" style={{ background: 'var(--bg-raised)' }}>
                    <button
                      onClick={() => setSettlementFilter('all')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg transition-colors',
                        settlementFilter === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      All ({summary.settlements.length})
                    </button>
                    <button
                      onClick={() => setSettlementFilter('pending')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1',
                        settlementFilter === 'pending' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Pending ({summary.pendingSettlementsCount})</span>
                    </button>
                    <button
                      onClick={() => setSettlementFilter('settled')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1',
                        settlementFilter === 'settled' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Settled ({summary.settledSettlementsCount})</span>
                    </button>
                  </div>
                </div>

                {filteredSettlements.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-800/40 text-center space-y-2">
                    <p className="text-sm font-extrabold text-slate-300">
                      {settlementFilter === 'pending'
                        ? '🎉 Awesome! No pending settlements.'
                        : settlementFilter === 'settled'
                        ? 'No acknowledged settlements yet.'
                        : 'No settlements required.'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {settlementFilter === 'pending'
                        ? 'Everyone has paid their dues or all balances are even.'
                        : 'Mark payments as settled when you transfer your share.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSettlements.map((st, i) => {
                      const isSettled = st.isSettled;

                      return (
                        <motion.div
                          key={st.id || i}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={cn(
                            'p-4 rounded-2xl flex flex-col gap-3 transition-all',
                            isSettled
                              ? 'border border-emerald-500/30 bg-emerald-500/5'
                              : 'border border-rose-500/20 bg-rose-500/5 hover:border-violet-500/40'
                          )}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-xl bg-gradient-to-tr flex items-center justify-center font-black text-xs text-white shrink-0',
                                  avatarGradient(st.fromName)
                                )}
                              >
                                {st.fromName[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                                  <span className="text-rose-400 font-extrabold">{st.fromName}</span>
                                  <span className="text-slate-500 font-normal">owes</span>
                                  <span className="text-emerald-400 font-extrabold">{st.toName}</span>

                                  {isSettled ? (
                                    <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      Paid & Settled
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      Pending
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                  {isSettled ? (
                                    <span>
                                      Confirmed {st.settledAt ? `on ${new Date(st.settledAt).toLocaleDateString('en-IN')}` : ''}
                                      {st.paymentMethod ? ` via ${st.paymentMethod}` : ''}
                                      {st.note ? ` • "${st.note}"` : ''}
                                    </span>
                                  ) : (
                                    <span>Direct settlement transfer to square off trip balance</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 self-end sm:self-auto">
                              <div
                                className={cn(
                                  'text-xl font-black tabular-nums',
                                  isSettled ? 'text-emerald-400 line-through opacity-80' : 'text-white'
                                )}
                              >
                                {currency}{st.amount.toLocaleString('en-IN')}
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                {isSettled ? 'Settled ✅' : 'Due payment'}
                              </span>
                            </div>
                          </div>

                          {/* Action Toolbar on Shared Page */}
                          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                            {isSettled ? (
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleRevertAck(st)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 border border-slate-700"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reopen</span>
                              </motion.button>
                            ) : (
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() => openAcknowledgeModal(st)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>I Have Paid / Mark Settled</span>
                              </motion.button>
                            )}

                            <span className="text-[11px] text-slate-500 italic">
                              {isSettled ? 'Resolved for group' : 'Tap to acknowledge your payment'}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── PARTICIPANT BALANCE SHEET ── */}
              <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
                <div
                  className="px-5 py-4 flex items-center justify-between gap-3"
                  style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}
                >
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-400" />
                      Who Paid & Who is Remaining
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Out-of-pocket vs fair consumption share</p>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)' }}>
                  {summary.participantSummaries.map((s, i) => {
                    const isOwed = s.netBalance > 0.01;
                    const owes = s.netBalance < -0.01;
                    const maxPaid = Math.max(...summary.participantSummaries.map((x) => x.totalPaid), 1);
                    const barPct = Math.min(100, Math.max(0, (s.totalPaid / maxPaid) * 100));

                    return (
                      <motion.div
                        key={s.participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 + 0.1 }}
                        className="px-5 py-4 border-b last:border-b-0 space-y-2"
                        style={{ borderColor: 'var(--border-soft)' }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-xl bg-gradient-to-tr flex items-center justify-center font-black text-xs text-white shrink-0',
                                avatarGradient(s.participant.name)
                              )}
                            >
                              {s.participant.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{s.participant.name}</p>
                              <p className="text-[11px] text-slate-400">
                                Paid {currency}{s.totalPaid.toLocaleString('en-IN')} · Share {currency}{s.totalShare.toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            {owes ? (
                              s.pendingDebt > 0 ? (
                                <div>
                                  <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-rose-400" />
                                    {currency}{s.pendingDebt.toLocaleString('en-IN')} Pending
                                  </span>
                                  {s.settledDebt > 0 && (
                                    <p className="text-[10px] text-emerald-400 mt-0.5 font-semibold">
                                      ({currency}{s.settledDebt.toLocaleString('en-IN')} paid)
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  All Dues Paid ({currency}{s.settledDebt.toLocaleString('en-IN')})
                                </span>
                              )
                            ) : isOwed ? (
                              s.pendingCredit > 0 ? (
                                <div>
                                  <span className="text-[10px] font-extrabold text-violet-300 uppercase tracking-wider bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/30 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-violet-400" />
                                    {currency}{s.pendingCredit.toLocaleString('en-IN')} Due
                                  </span>
                                  {s.settledCredit > 0 && (
                                    <p className="text-[10px] text-emerald-400 mt-0.5 font-semibold">
                                      ({currency}{s.settledCredit.toLocaleString('en-IN')} collected)
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  All Received ({currency}{s.settledCredit.toLocaleString('en-IN')})
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                Even · Settled
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Paid bar */}
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', isOwed ? 'bg-emerald-500' : owes ? 'bg-rose-500' : 'bg-slate-500')}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ delay: i * 0.07 + 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Category breakdown donut-ish list */}
              {(() => {
                const cats = Object.entries(summary.categoryTotals)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a);
                if (cats.length === 0) return null;
                const total = cats.reduce((a, [, v]) => a + v, 0);
                return (
                  <div
                    className="rounded-3xl p-5 space-y-3"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                  >
                    <h3 className="text-sm font-black text-white">Spending by Category</h3>
                    <div className="space-y-2.5">
                      {cats.map(([cat, amt], i) => {
                        const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.general;
                        const pct = Math.round((amt / total) * 100);
                        return (
                          <motion.div
                            key={cat}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-bold" style={{ color: cfg.tone }}>
                                <span>{cfg.icon}</span> {cfg.label}
                              </span>
                              <span className="font-black tabular-nums text-white">
                                {currency}{amt.toLocaleString('en-IN')}
                                <span className="text-slate-500 font-normal ml-1">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: cfg.tone }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: i * 0.06 + 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ══ CHAT FEED TAB ══ */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              <div className="flex justify-center">
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}
                >
                  <Compass className="w-3 h-3 text-violet-400" />
                  {trip.name} · {trip.expenses.length} expense{trip.expenses.length !== 1 ? 's' : ''}
                </span>
              </div>

              {trip.expenses.length === 0 ? (
                <div
                  className="p-10 rounded-3xl text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                >
                  <p className="text-slate-400 text-sm">No expenses recorded yet.</p>
                </div>
              ) : (
                trip.expenses.map((expense, i) => {
                  const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                  const perHead =
                    expense.splitAmong.length > 0
                      ? Math.round((expense.amount / expense.splitAmong.length) * 100) / 100
                      : expense.amount;
                  const isExpanded = expandedId === expense.id;
                  const hasMultiple = expense.paidBy.length > 1;

                  return (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-3xl overflow-hidden transition-shadow hover:shadow-lg hover:shadow-violet-500/5"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                    >
                      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                            style={{ background: cat.bg, color: cat.tone }}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                          <span className="text-[10px] text-slate-500">{expense.date}</span>
                          {hasMultiple && (
                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              Split payment
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xl font-black tabular-nums text-white">
                            {currency}{expense.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] font-bold text-violet-400">
                            {currency}{perHead.toLocaleString('en-IN')}/head
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-3">
                        <h3 className="text-base font-extrabold text-white leading-snug">{expense.title}</h3>
                        {expense.notes && <p className="text-xs text-slate-400 mt-1 leading-relaxed italic">"{expense.notes}"</p>}
                      </div>

                      <div className="px-4 pb-3">
                        <div
                          className="p-3 rounded-2xl space-y-2"
                          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
                        >
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                            <CreditCard className="w-3.5 h-3.5" />
                            {hasMultiple ? 'Partial bill paid by:' : 'Paid by:'}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {expense.paidBy.map((payer) => {
                              const pName = trip.participants.find((pt) => pt.id === payer.participantId)?.name || 'Friend';
                              const pct = Math.round((payer.amount / expense.amount) * 100);
                              return (
                                <div
                                  key={payer.participantId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold"
                                  style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}
                                >
                                  <span className="w-4 h-4 rounded-full bg-emerald-500/30 flex items-center justify-center text-[9px] font-black">
                                    {pName[0]}
                                  </span>
                                  <span>{pName}</span>
                                  <span className="font-black">
                                    {currency}{payer.amount.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] opacity-70">({pct}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                        className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold border-t transition-colors hover:bg-white/[0.02]"
                        style={{ borderColor: 'var(--border-soft)', color: 'var(--text-muted)' }}
                      >
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Users className="w-3.5 h-3.5 text-violet-400" />
                          Split {expense.splitAmong.length} ways
                        </span>
                        <span className="flex items-center gap-1 text-violet-400">
                          {isExpanded ? 'Hide' : 'Show full breakdown'}
                          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.25 }} className="inline-block">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </motion.span>
                        </span>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-2">
                              <div
                                className="p-3 rounded-2xl space-y-2"
                                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}
                              >
                                <p className="text-[10px] font-extrabold text-violet-300 uppercase tracking-wider">
                                  Transparent share per person
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {expense.splitAmong.map((split) => {
                                    const pName = trip.participants.find((pt) => pt.id === split.participantId)?.name || 'Friend';
                                    return (
                                      <div
                                        key={split.participantId}
                                        className="flex items-center justify-between p-2.5 rounded-xl text-xs"
                                        style={{ background: 'var(--bg-raised)' }}
                                      >
                                        <span className="font-semibold text-slate-300 truncate mr-2">{pName}</span>
                                        <span className="font-black tabular-nums text-white shrink-0">
                                          {currency}{split.amount.toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* ══ BREAKDOWN / ALL ITEMS TAB ══ */}
          {activeTab === 'breakdown' && (
            <motion.div
              key="breakdown"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="rounded-3xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <h3 className="text-base font-black text-white">All Expenses</h3>
                  <span className="text-xs text-slate-400">{currency}{summary.totalSpend.toLocaleString('en-IN')} total</span>
                </div>

                <div>
                  {trip.expenses.map((expense, i) => {
                    const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                    const perHead =
                      expense.splitAmong.length > 0
                        ? Math.round((expense.amount / expense.splitAmong.length) * 100) / 100
                        : expense.amount;
                    const payersStr = expense.paidBy
                      .map((p) => {
                        const name = trip.participants.find((pt) => pt.id === p.participantId)?.name || 'Friend';
                        return expense.paidBy.length > 1 ? `${name} (${currency}${p.amount.toLocaleString('en-IN')})` : name;
                      })
                      .join(' + ');

                    return (
                      <motion.div
                        key={expense.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="px-5 py-4 flex items-center justify-between gap-3 border-b last:border-b-0"
                        style={{ borderColor: 'var(--border-soft)' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: cat.bg }}
                          >
                            {cat.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{expense.title}</h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {payersStr} · {expense.splitAmong.length} people
                            </p>
                            <span className="text-[10px] text-slate-500">{expense.date}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-black tabular-nums text-white">
                            {currency}{expense.amount.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] text-violet-400">{currency}{perHead.toLocaleString('en-IN')}/head</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BOTTOM CTA ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-6 p-6 rounded-3xl text-center space-y-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(124,58,237,0.18))',
            border: '1px solid rgba(139,92,246,0.3)',
          }}
        >
          <div className="aurora-blob animate-aurora absolute -top-10 -left-10 h-28 w-28 bg-[radial-gradient(circle,rgba(124,58,237,0.3)_0%,transparent_70%)]" />
          <div className="aurora-blob animate-aurora absolute -bottom-6 -right-6 h-24 w-24 bg-[radial-gradient(circle,rgba(99,102,241,0.2)_0%,transparent_70%)] [animation-delay:3s]" />

          <div className="relative">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-4xl mb-3"
            >
              ✈️
            </motion.div>
            <h3 className="text-xl font-black text-white">Track your trips on Udharwale</h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Partial bill splitting, debt minimisation, settlement acknowledgement, and WhatsApp reminders — all free.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: 'default' }),
                  'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-6 shadow-xl shadow-violet-600/30 border-0'
                )}
              >
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-emerald-300 transition-colors hover:text-emerald-200"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <Share2 className="w-4 h-4" />
                Share this breakdown
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── ACKNOWLEDGE SETTLEMENT MODAL (SHARED VIEW) ── */}
      <AnimatePresence>
        {isAckModalOpen && acknowledgingSettlement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAckModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Acknowledge Payment</h3>
                    <p className="text-[11px] text-slate-400">Let the group know this is settled</p>
                  </div>
                </div>
                <button onClick={() => setIsAckModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmAck} className="p-5 space-y-4">
                <div className="p-4 rounded-2xl space-y-1.5 border" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">Settlement Due</span>
                  <div className="text-sm font-bold text-white flex items-center justify-between">
                    <span>
                      <strong className="text-rose-400">{acknowledgingSettlement.fromName}</strong> owes{' '}
                      <strong className="text-emerald-400">{acknowledgingSettlement.toName}</strong>
                    </span>
                    <span className="text-xl font-black text-white tabular-nums">
                      {currency}{acknowledgingSettlement.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Your Name / Who Paid</label>
                  <input
                    type="text"
                    value={ackPayerName}
                    onChange={(e) => setAckPayerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Payment Mode</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'UPI', label: 'UPI / GPay' },
                      { id: 'Cash', label: 'Cash' },
                      { id: 'Bank', label: 'Bank' },
                      { id: 'Other', label: 'Other' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setAckMethod(m.id as any)}
                        className={cn(
                          'py-2 px-1 rounded-xl text-xs font-extrabold transition-all text-center',
                          ackMethod === m.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800/60 text-slate-400 hover:text-white'
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Note / Reference (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sent via Google Pay"
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none font-medium text-white"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
                  />
                </div>

                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={isSubmittingAck}
                    type="submit"
                    className="w-full py-3 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmittingAck ? 'Acknowledging…' : 'Confirm & Acknowledge Payment'}</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
