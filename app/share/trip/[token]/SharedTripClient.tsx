'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  ReceiptText,
  RotateCcw,
  Share2,
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

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
        dim,
        avatarTone(name)
      )}
    >
      {name.trim()[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function SharedTripClient({ token }: { token: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settle' | 'expenses'>('settle');
  const [tabReady, setTabReady] = useState(false);
  const [shared, setShared] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [acknowledgingSettlement, setAcknowledgingSettlement] = useState<TripSettlement | null>(null);
  const [ackMethod, setAckMethod] = useState<'UPI' | 'Cash' | 'Bank' | 'Other'>('UPI');
  const [ackNote, setAckNote] = useState('');
  const [ackPayerName, setAckPayerName] = useState('');
  const [ackSettleMode, setAckSettleMode] = useState<'full' | 'partial'>('full');
  const [ackAmount, setAckAmount] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

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

  useEffect(() => {
    if (!summary || tabReady) return;
    setActiveTab(summary.pendingSettlementsCount > 0 ? 'settle' : 'expenses');
    setTabReady(true);
  }, [summary, tabReady]);

  const handleShare = async () => {
    if (!trip) return;
    const text = formatWhatsAppSummary(trip, ownerName);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${trip.name} — Expenses`, text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openAcknowledgeModal = (st: TripSettlement, mode: 'full' | 'partial' = 'full') => {
    const remaining =
      st.remainingAmount > 0.01 ? st.remainingAmount : Math.max(0, st.amount - (st.paidAmount || 0));
    setAcknowledgingSettlement(st);
    setAckPayerName(st.fromName);
    setAckMethod('UPI');
    setAckNote('');
    setAckSettleMode(mode);
    setAckAmount(mode === 'full' ? remaining.toString() : '');
    setIsAckModalOpen(true);
  };

  const applyLocalSettlement = (st: TripSettlement, paymentAmt: number) => {
    if (!trip) return;
    const previousPaid = st.paidAmount || 0;
    const newPaid = Math.min(st.amount, Math.round((previousPaid + paymentAmt) * 100) / 100);
    const newRemaining = Math.max(0, Math.round((st.amount - newPaid) * 100) / 100);
    const fullySettled = newRemaining <= 0.01;
    const nowIso = new Date().toISOString();
    const existing = trip.settlements ? [...trip.settlements] : [];
    const idx = existing.findIndex((s) => s.id === st.id);
    const record: TripSettlement = {
      ...st,
      paidAmount: fullySettled ? st.amount : newPaid,
      remainingAmount: fullySettled ? 0 : newRemaining,
      isSettled: fullySettled,
      isPartial: !fullySettled && newPaid > 0.01,
      payments: [
        ...(st.payments || []),
        {
          id: `pay_${Date.now()}`,
          amount: paymentAmt,
          paidAt: nowIso,
          paidBy: ackPayerName || st.fromName,
          paymentMethod: ackMethod,
          note: ackNote.trim(),
        },
      ],
      settledAt: nowIso,
      settledBy: ackPayerName || st.fromName,
      paymentMethod: ackMethod,
      note: ackNote.trim(),
    };
    if (idx >= 0) existing[idx] = record;
    else existing.push(record);
    setTrip({ ...trip, settlements: existing });
  };

  const handleConfirmAck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !acknowledgingSettlement) return;

    const previousPaid = acknowledgingSettlement.paidAmount || 0;
    const remaining = Math.max(
      0,
      Math.round((acknowledgingSettlement.amount - previousPaid) * 100) / 100
    );
    const parsed = parseFloat(ackAmount);
    const paymentAmt =
      ackSettleMode === 'full'
        ? remaining
        : Math.min(remaining, Math.max(0, Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0));

    if (paymentAmt <= 0.009) return;

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
          paymentAmount: paymentAmt,
          settledBy: ackPayerName || acknowledgingSettlement.fromName,
          paymentMethod: ackMethod,
          note: ackNote.trim(),
        }),
      });

      if (res.ok) {
        const body = await res.json();
        setTrip({ ...trip, settlements: body.settlements });
      } else {
        applyLocalSettlement(acknowledgingSettlement, paymentAmt);
      }
    } catch {
      applyLocalSettlement(acknowledgingSettlement, paymentAmt);
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
          amount: st.amount,
          reopen: true,
          isSettled: false,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setTrip({ ...trip, settlements: body.settlements });
      } else {
        const existing = trip.settlements ? [...trip.settlements] : [];
        const idx = existing.findIndex((s) => s.id === st.id);
        if (idx >= 0) {
          existing[idx] = {
            ...existing[idx],
            paidAmount: 0,
            remainingAmount: st.amount,
            isSettled: false,
            isPartial: false,
            payments: [],
          };
        }
        setTrip({ ...trip, settlements: existing });
      }
    } catch {
      const existing = trip.settlements ? [...trip.settlements] : [];
      const idx = existing.findIndex((s) => s.id === st.id);
      if (idx >= 0) {
        existing[idx] = {
          ...existing[idx],
          paidAmount: 0,
          remainingAmount: st.amount,
          isSettled: false,
          isPartial: false,
          payments: [],
        };
      }
      setTrip({ ...trip, settlements: existing });
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg-base)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Opening trip…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      >
        <h1 className="text-xl font-bold">Trip not found</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {error}
        </p>
        <Link href="/" className={buttonVariants({ size: 'default' })}>
          Go to Udharwale <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    );
  }

  if (!trip || !summary) return null;

  const pendingSettlements = summary.settlements.filter((s) => !s.isSettled);
  const settledSettlements = summary.settlements.filter((s) => s.isSettled);
  const remainingForAck = acknowledgingSettlement
    ? acknowledgingSettlement.remainingAmount > 0.01
      ? acknowledgingSettlement.remainingAmount
      : Math.max(0, acknowledgingSettlement.amount - (acknowledgingSettlement.paidAmount || 0))
    : 0;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}
      >
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
              style={{ background: 'var(--primary)' }}
            >
              <ReceiptText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{trip.name}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                Shared by {ownerName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
              style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}
              aria-label="Copy link"
            >
              {copiedLink ? <Check className="w-4 h-4" style={{ color: 'var(--emerald)' }} /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 text-white"
              style={{ background: 'var(--primary)' }}
            >
              {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {shared ? 'Done' : 'Share'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-3 space-y-3">
        {/* One-glance summary */}
        <div
          className="rounded-2xl px-4 py-4 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          {summary.totalPendingAmount > 0.01 ? (
            <>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Still to settle
              </p>
              <p className="text-3xl font-bold tabular-nums mt-1" style={{ color: 'var(--rose)' }}>
                {currency}
                {summary.totalPendingAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                {summary.pendingSettlementsCount} payment
                {summary.pendingSettlementsCount === 1 ? '' : 's'} left · total spent{' '}
                {currency}
                {summary.totalSpend.toLocaleString('en-IN')}
              </p>
            </>
          ) : (
            <>
              <div
                className="inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: 'var(--emerald)' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                All settled
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Total spent {currency}
                {summary.totalSpend.toLocaleString('en-IN')} ·{' '}
                {trip.participants.length} people
              </p>
            </>
          )}
        </div>

        <div
          className="flex p-1 rounded-2xl gap-1"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('settle')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: activeTab === 'settle' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'settle' ? 'var(--primary-foreground)' : 'var(--text-muted)',
            }}
          >
            Who pays
            {summary.pendingSettlementsCount > 0 ? ` (${summary.pendingSettlementsCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: activeTab === 'expenses' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'expenses' ? 'var(--primary-foreground)' : 'var(--text-muted)',
            }}
          >
            Expenses ({trip.expenses.length})
          </button>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-lg px-4 pb-10 space-y-3">
        {activeTab === 'settle' && (
          <>
            {summary.settlements.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <p className="text-sm font-semibold">Everyone is even</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  No payments needed
                </p>
              </div>
            ) : (
              <>
                {pendingSettlements.map((st) => {
                  const isPartial = st.isPartial || ((st.paidAmount || 0) > 0.01 && !st.isSettled);
                  const remaining =
                    st.remainingAmount > 0.01
                      ? st.remainingAmount
                      : Math.max(0, st.amount - (st.paidAmount || 0));

                  return (
                    <div
                      key={st.id}
                      className="rounded-2xl p-4 space-y-3"
                      style={{
                        background: 'var(--bg-surface)',
                        border: `1px solid ${isPartial ? 'rgba(180,83,9,0.25)' : 'var(--border-soft)'}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={st.fromName} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug">
                            <span style={{ color: 'var(--rose)' }}>{st.fromName}</span>
                            <span style={{ color: 'var(--text-muted)' }}> pays </span>
                            <span style={{ color: 'var(--emerald)' }}>{st.toName}</span>
                          </p>
                          {isPartial && (
                            <p className="text-[11px] mt-0.5" style={{ color: '#b45309' }}>
                              {currency}
                              {(st.paidAmount || 0).toLocaleString('en-IN')} paid ·{' '}
                              {currency}
                              {remaining.toLocaleString('en-IN')} left
                            </p>
                          )}
                        </div>
                        <p className="text-xl font-bold tabular-nums shrink-0">
                          {currency}
                          {remaining.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openAcknowledgeModal(st, 'full')}
                          className="flex-1 h-11 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-1.5"
                          style={{ background: 'var(--emerald)' }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isPartial ? 'Pay rest' : 'Mark paid'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openAcknowledgeModal(st, 'partial')}
                          className="h-11 px-3 rounded-xl text-sm font-semibold"
                          style={{
                            background: 'var(--bg-raised)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-soft)',
                          }}
                        >
                          Partial
                        </button>
                      </div>
                    </div>
                  );
                })}

                {settledSettlements.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Already paid
                    </p>
                    {settledSettlements.map((st) => (
                      <div
                        key={st.id}
                        className="rounded-2xl px-3.5 py-3 flex items-center gap-3"
                        style={{
                          background: 'rgba(4,120,87,0.06)',
                          border: '1px solid rgba(4,120,87,0.15)',
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--emerald)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            <span className="font-semibold">{st.fromName}</span>
                            <span style={{ color: 'var(--text-muted)' }}> → </span>
                            <span className="font-semibold">{st.toName}</span>
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {currency}
                            {st.amount.toLocaleString('en-IN')}
                            {st.paymentMethod ? ` · ${st.paymentMethod}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevertAck(st)}
                          className="h-8 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                          style={{ color: 'var(--text-muted)', background: 'var(--bg-raised)' }}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Undo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Simple per-person status */}
            <div className="pt-3 space-y-2">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Everyone
              </p>
              {summary.participantSummaries.map((s) => {
                const owes = s.netBalance < -0.01;
                const isOwed = s.netBalance > 0.01;
                const amount = Math.abs(s.netBalance);

                return (
                  <div
                    key={s.participant.id}
                    className="rounded-2xl px-3.5 py-3 flex items-center gap-3"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                  >
                    <Avatar name={s.participant.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{s.participant.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Spent {currency}
                        {s.totalPaid.toLocaleString('en-IN')} · share{' '}
                        {currency}
                        {s.totalShare.toLocaleString('en-IN')}
                      </p>
                    </div>
                    {owes ? (
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--rose)' }}>
                        owes {currency}
                        {amount.toLocaleString('en-IN')}
                      </span>
                    ) : isOwed ? (
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--emerald)' }}>
                        gets {currency}
                        {amount.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        even
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'expenses' && (
          <>
            {trip.expenses.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
              >
                <p className="text-sm font-semibold">No expenses yet</p>
              </div>
            ) : (
              trip.expenses.map((expense) => {
                const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                const payers = expense.paidBy
                  .map((p) => trip.participants.find((pt) => pt.id === p.participantId)?.name)
                  .filter(Boolean) as string[];
                const payerLabel =
                  payers.length === 0
                    ? 'Someone'
                    : payers.length === 1
                      ? payers[0]
                      : `${payers[0]} +${payers.length - 1}`;
                const splitCount = expense.splitAmong.length || 1;
                const splitLabel =
                  splitCount >= trip.participants.length
                    ? 'everyone'
                    : splitCount === 1
                      ? '1 person'
                      : `${splitCount} people`;

                return (
                  <div
                    key={expense.id}
                    className="rounded-2xl px-3.5 py-3.5"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{expense.title}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-semibold">{payerLabel}</span>
                          {' paid · split '}
                          {splitLabel}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {[cat.label, expense.date].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <p className="text-base font-bold tabular-nums shrink-0">
                        {currency}
                        {expense.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        <div className="pt-4 text-center">
          <Link href="/signup" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            Make your own trip on Udharwale →
          </Link>
        </div>
      </div>

      {/* Mark paid sheet */}
      {isAckModalOpen && acknowledgingSettlement && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setIsAckModalOpen(false)} />
          <div
            className="relative w-full max-w-md rounded-t-[20px] sm:rounded-[20px] overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <h3 className="text-base font-bold">Mark paid</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {acknowledgingSettlement.fromName} → {acknowledgingSettlement.toName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAckModalOpen(false)}
                className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAck} className="p-5 space-y-4">
              <div className="text-center py-2">
                <p className="text-3xl font-bold tabular-nums">
                  {currency}
                  {remainingForAck.toLocaleString('en-IN')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  due now
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAckSettleMode('full');
                    setAckAmount(remainingForAck.toString());
                  }}
                  className="h-11 rounded-xl text-sm font-semibold"
                  style={{
                    background: ackSettleMode === 'full' ? 'var(--emerald)' : 'var(--bg-raised)',
                    color: ackSettleMode === 'full' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Full amount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAckSettleMode('partial');
                    setAckAmount('');
                  }}
                  className="h-11 rounded-xl text-sm font-semibold"
                  style={{
                    background: ackSettleMode === 'partial' ? 'var(--emerald)' : 'var(--bg-raised)',
                    color: ackSettleMode === 'partial' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Partial
                </button>
              </div>

              {ackSettleMode === 'partial' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Amount paying now
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={ackAmount}
                      onChange={(e) => setAckAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-3 rounded-xl text-sm font-bold tabular-nums outline-none"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-soft)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="0"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  How was it paid?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['UPI', 'Cash', 'Bank', 'Other'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setAckMethod(m)}
                      className="h-10 rounded-xl text-xs font-semibold"
                      style={{
                        background: ackMethod === m ? 'var(--primary)' : 'var(--bg-raised)',
                        color: ackMethod === m ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                      }}
                    >
                      {m === 'UPI' ? 'UPI' : m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Who paid?
                </label>
                <input
                  type="text"
                  value={ackPayerName}
                  onChange={(e) => setAckPayerName(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none font-medium"
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GPay"
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingAck}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2"
                style={{ background: 'var(--emerald)' }}
              >
                {isSubmittingAck ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm paid
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
