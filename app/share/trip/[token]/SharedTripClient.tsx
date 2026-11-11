'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Copy,
  Share2,
  Sparkles,
  ReceiptText,
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

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function SharedTripClient({ token }: { token: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlement'>('expenses');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [shared, setShared] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Acknowledgement state
  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [acknowledgingSettlement, setAcknowledgingSettlement] = useState<TripSettlement | null>(null);
  const [ackMethod, setAckMethod] = useState<'UPI' | 'Cash' | 'Bank' | 'Other'>('UPI');
  const [ackNote, setAckNote] = useState('');
  const [ackPayerName, setAckPayerName] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

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
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)', backdropFilter: 'blur(16px)', borderColor: 'var(--border-soft)' }}
      >
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <ReceiptText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-branding text-base text-primary leading-none block">Udharwale</span>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>Shared by {ownerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-8 px-2.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5"
              style={{
                background: copiedLink ? 'rgba(16,185,129,0.15)' : 'var(--bg-raised)',
                border: `1px solid ${copiedLink ? 'rgba(16,185,129,0.4)' : 'var(--border-soft)'}`,
                color: copiedLink ? '#34d399' : 'var(--text-secondary)',
              }}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Link'}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 text-white"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
            >
              {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{shared ? 'Shared' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Trip summary */}
      <div className="mx-auto w-full max-w-lg px-4 pt-5 pb-3 space-y-3">
        <div>
          {trip.destination ? (
            <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
              {trip.destination}{trip.startDate ? ` · ${trip.startDate}` : ''}
            </p>
          ) : null}
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{trip.name}</h1>
          {trip.description ? (
            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{trip.description}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl px-2.5 py-2.5 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
            <p className="text-base font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {currency}{summary.totalSpend.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Spent</p>
          </div>
          <div className="rounded-2xl px-2.5 py-2.5 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
            <p className="text-base font-black tabular-nums leading-tight" style={{ color: '#34d399' }}>
              {summary.hasUnevenShares
                ? `${currency}${summary.minShare.toLocaleString('en-IN')}–${summary.maxShare.toLocaleString('en-IN')}`
                : `${currency}${summary.perHeadAverage.toLocaleString('en-IN')}`}
            </p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {summary.hasUnevenShares ? 'Share range' : 'Per head'}
            </p>
          </div>
          <div className="rounded-2xl px-2.5 py-2.5 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
            <p className="text-base font-black tabular-nums" style={{ color: summary.totalPendingAmount > 0 ? '#fb7185' : '#34d399' }}>
              {currency}{summary.totalPendingAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>Pending</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {trip.participants.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-full pl-1 pr-2.5 py-1"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              <div className={cn('w-6 h-6 rounded-full bg-gradient-to-tr flex items-center justify-center text-[10px] font-black text-white', avatarGradient(p.name))}>
                {p.name[0].toUpperCase()}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
            </div>
          ))}
        </div>

        <div
          className="flex p-1 rounded-2xl gap-1"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
            style={{
              background: activeTab === 'expenses' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeTab === 'expenses' ? '#a5b4fc' : 'var(--text-muted)',
            }}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settlement')}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
            style={{
              background: activeTab === 'settlement' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeTab === 'settlement' ? '#a5b4fc' : 'var(--text-muted)',
            }}
          >
            {summary.pendingSettlementsCount > 0 ? `Settle (${summary.pendingSettlementsCount})` : 'Settle'}
          </button>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-lg px-4 pb-10 pt-1 space-y-4">
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
              <div
                className="p-3.5 rounded-2xl space-y-2.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                      {summary.settlementProgressPct}% settled
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {summary.settledSettlementsCount}/{summary.settlements.length} transfers
                    </p>
                  </div>
                  <p className="text-sm font-black tabular-nums" style={{ color: summary.totalPendingAmount > 0 ? '#fb7185' : '#34d399' }}>
                    {currency}{summary.totalPendingAmount.toLocaleString('en-IN')} due
                  </p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-raised)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${summary.settlementProgressPct}%`, background: '#34d399' }}
                  />
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl space-y-3"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                      Who pays whom
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Mark a transfer paid when money moves
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

              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-soft)' }}>
                <div
                  className="px-4 py-3"
                  style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}
                >
                  <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                    Each person&apos;s share
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {summary.hasUnevenShares
                      ? `Personal / partial splits change this — equal would be ${currency}${summary.perHeadAverage.toLocaleString('en-IN')}`
                      : 'Paid vs their share and what\'s still due'}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface)' }}>
                  {summary.participantSummaries.map((s, i) => {
                    const isOwed = s.netBalance > 0.01;
                    const owes = s.netBalance < -0.01;
                    const maxShare = Math.max(...summary.participantSummaries.map((x) => x.totalShare), 1);
                    const barPct = Math.min(100, Math.max(0, (s.totalShare / maxShare) * 100));
                    const vsEqual = Math.round((s.totalShare - summary.perHeadAverage) * 100) / 100;

                    return (
                      <motion.div
                        key={s.participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 + 0.1 }}
                        className="px-4 py-3.5 border-b last:border-b-0 space-y-2"
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
                              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{s.participant.name}</p>
                              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                Share{' '}
                                <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                                  {currency}{s.totalShare.toLocaleString('en-IN')}
                                </span>
                                {summary.hasUnevenShares && Math.abs(vsEqual) > 0.01 && (
                                  <span style={{ color: vsEqual > 0 ? '#fb7185' : '#34d399' }}>
                                    {' '}
                                    ({vsEqual > 0 ? '+' : '−'}
                                    {currency}
                                    {Math.abs(vsEqual).toLocaleString('en-IN')})
                                  </span>
                                )}
                                {' · '}paid {currency}{s.totalPaid.toLocaleString('en-IN')}
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

          {activeTab === 'expenses' && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-2"
            >
              {trip.expenses.length === 0 ? (
                <div
                  className="p-8 rounded-2xl text-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No expenses recorded yet.</p>
                </div>
              ) : (
                trip.expenses.map((expense) => {
                  const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                  const payerNames = expense.paidBy
                    .map((p) => trip.participants.find((pt) => pt.id === p.participantId)?.name || 'Friend')
                    .join(', ');
                  const splitCount = expense.splitAmong.length || 1;
                  const splitLabel =
                    splitCount <= 1
                      ? 'personal'
                      : splitCount < trip.participants.length
                        ? `split ${splitCount}/${trip.participants.length}`
                        : `split ${splitCount}`;
                  return (
                    <div
                      key={expense.id}
                      className="rounded-2xl p-3.5 flex items-center gap-3"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                    >
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: cat.bg, color: cat.tone }}
                      >
                        {cat.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {expense.title}
                          </h4>
                          <p className="text-sm font-black tabular-nums shrink-0" style={{ color: 'var(--text-primary)' }}>
                            {currency}{expense.amount.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {payerNames} · {splitLabel} · {expense.date}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

        </AnimatePresence>

        <div
          className="mt-4 p-5 rounded-2xl text-center space-y-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Track trips on Udharwale</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Split bills, settle dues, and share with friends — free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: 'default' }), 'font-bold px-5 border-0 text-white')}
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
            >
              Create free account
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}
            >
              <Share2 className="w-4 h-4" />
              Share summary
            </button>
          </div>
        </div>

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
