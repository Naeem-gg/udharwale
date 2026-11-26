'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  RotateCcw,
  Share2,
  X,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import BrandMark from '@/app/components/BrandMark';
import CreatorCredit from '@/app/components/CreatorCredit';
import PersonAvatar from '@/app/components/PersonAvatar';
import { SITE_CREATOR } from '@/lib/seo';
import {
  Trip,
  TripSettlement,
  CATEGORY_CONFIG,
  calculateTripSummary,
  formatWhatsAppSummary,
} from '@/app/components/trip-types';

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return <PersonAvatar name={name} seed={name} size={size === 'sm' ? 'sm' : 'md'} />;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type ViewerState = {
  authenticated: boolean;
  isOwner: boolean;
  isParticipant: boolean;
  canSettle: boolean;
  participantIds: string[];
  displayName: string;
};

export default function SharedTripClient({ token }: { token: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [viewer, setViewer] = useState<ViewerState>({
    authenticated: false,
    isOwner: false,
    isParticipant: false,
    canSettle: false,
    participantIds: [],
    displayName: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settle' | 'expenses'>('settle');
  const [tabReady, setTabReady] = useState(false);
  const [shared, setShared] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [acknowledgingSettlement, setAcknowledgingSettlement] = useState<TripSettlement | null>(null);
  const [ackMethod, setAckMethod] = useState<'UPI' | 'Cash' | 'Bank' | 'Other'>('UPI');
  const [ackNote, setAckNote] = useState('');
  const [ackSettleMode, setAckSettleMode] = useState<'full' | 'partial'>('full');
  const [ackAmount, setAckAmount] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  const loginHref = `/login?next=${encodeURIComponent(`/t/${token}`)}`;
  const signupHref = `/signup?next=${encodeURIComponent(`/t/${token}`)}`;

  const canManageSettlementRow = (st: { fromId?: string }) => {
    if (!viewer.canSettle) return false;
    if (viewer.isOwner) return true;
    return !!st.fromId && viewer.participantIds.includes(st.fromId);
  };

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
          setViewer({
            authenticated: !!data.viewer?.authenticated,
            isOwner: !!data.viewer?.isOwner,
            isParticipant: !!data.viewer?.isParticipant,
            canSettle: !!data.viewer?.canSettle,
            participantIds: Array.isArray(data.viewer?.participantIds) ? data.viewer.participantIds : [],
            displayName: data.viewer?.displayName || '',
          });
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
    if (!canManageSettlementRow(st)) {
      setActionError(
        viewer.authenticated
          ? 'You can only mark payments you owe on this trip'
          : 'Sign in with your Udharwale account to mark your payments'
      );
      return;
    }
    const remaining =
      st.remainingAmount > 0.01 ? st.remainingAmount : Math.max(0, st.amount - (st.paidAmount || 0));
    setAcknowledgingSettlement(st);
    setAckMethod('UPI');
    setAckNote('');
    setAckSettleMode(mode);
    setAckAmount(mode === 'full' ? remaining.toString() : '');
    setActionError(null);
    setIsAckModalOpen(true);
  };

  const handleConfirmAck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !acknowledgingSettlement || !canManageSettlementRow(acknowledgingSettlement)) return;

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
    setActionError(null);
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
          paymentMethod: ackMethod,
          note: ackNote.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'Could not save payment');
      }
      setTrip({ ...trip, settlements: body.settlements });
      setIsAckModalOpen(false);
      setAcknowledgingSettlement(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not save payment');
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const handleRevertAck = async (st: TripSettlement) => {
    if (!trip || !canManageSettlementRow(st)) {
      setActionError(
        viewer.authenticated
          ? 'You can only undo payments on your side of the trip'
          : 'Sign in to manage your payments'
      );
      return;
    }
    setActionError(null);
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
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'Could not undo payment');
      }
      setTrip({ ...trip, settlements: body.settlements });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not undo payment');
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
            <BrandMark size={36} />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{trip.name}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                Shared by {ownerName} · Udharwale by {SITE_CREATOR}
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
                {summary.totalSpend.toLocaleString('en-IN')} · {trip.participants.length} people
              </p>
            </>
          )}
        </div>

        {/* Transparency / permission banner */}
        <div
          className="rounded-2xl px-3.5 py-3 flex items-start gap-2.5"
          style={{
            background: viewer.canSettle ? 'rgba(15,118,110,0.08)' : 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
          }}
        >
          <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
          <div className="min-w-0 space-y-1">
            {viewer.canSettle ? (
              <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
                Signed in as{' '}
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {viewer.displayName || ownerName}
                </span>
                .{' '}
                {viewer.isOwner
                  ? 'As trip owner you can mark any payment.'
                  : 'You can mark payments you owe — each confirmation is public.'}
              </p>
            ) : viewer.authenticated ? (
              <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
                Your account isn&apos;t linked to a person on this trip. Ask {ownerName} to save your
                phone/email on your participant, then refresh.
              </p>
            ) : (
              <>
                <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  Anyone can view. Trip members with an Udharwale account can sign in and mark only
                  what they owe.
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <Link href={loginHref} className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                    Sign in to mark paid →
                  </Link>
                  <Link href={signupHref} className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Create account
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {actionError && (
          <p
            className="text-xs text-center rounded-xl px-3 py-2"
            style={{
              background: 'rgba(194,59,74,0.08)',
              color: 'var(--rose)',
              border: '1px solid rgba(194,59,74,0.2)',
            }}
          >
            {actionError}
          </p>
        )}

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
                  const payments = st.payments || [];

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

                      {payments.length > 0 && (
                        <div
                          className="rounded-xl px-3 py-2 space-y-1.5"
                          style={{ background: 'var(--bg-raised)' }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Payment log
                          </p>
                          {payments.map((p) => (
                            <p key={p.id} className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {currency}
                                {p.amount.toLocaleString('en-IN')}
                              </span>
                              {' · confirmed by '}
                              <span className="font-semibold">{p.paidBy || st.settledBy || ownerName}</span>
                              {p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                              {p.paidAt ? ` · ${formatWhen(p.paidAt)}` : ''}
                              {p.note ? ` · ${p.note}` : ''}
                            </p>
                          ))}
                        </div>
                      )}

                      {canManageSettlementRow(st) ? (
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
                      ) : (
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {viewer.authenticated
                            ? `Waiting for ${st.fromName} to mark paid`
                            : `${st.fromName} can mark this after signing in`}
                        </p>
                      )}
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
                    {settledSettlements.map((st) => {
                      const payments = st.payments || [];
                      return (
                        <div
                          key={st.id}
                          className="rounded-2xl px-3.5 py-3 space-y-2"
                          style={{
                            background: 'rgba(4,120,87,0.06)',
                            border: '1px solid rgba(4,120,87,0.15)',
                          }}
                        >
                          <div className="flex items-center gap-3">
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
                                {st.settledBy ? ` · confirmed by ${st.settledBy}` : ''}
                                {st.settledAt ? ` · ${formatWhen(st.settledAt)}` : ''}
                                {st.paymentMethod ? ` · ${st.paymentMethod}` : ''}
                              </p>
                            </div>
                            {canManageSettlementRow(st) && (
                              <button
                                type="button"
                                onClick={() => handleRevertAck(st)}
                                className="h-8 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                                style={{ color: 'var(--text-muted)', background: 'var(--bg-raised)' }}
                              >
                                <RotateCcw className="w-3 h-3" />
                                Undo
                              </button>
                            )}
                          </div>
                          {payments.length > 1 && (
                            <div className="pl-7 space-y-1">
                              {payments.map((p) => (
                                <p key={p.id} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                  {currency}
                                  {p.amount.toLocaleString('en-IN')}
                                  {p.paidBy ? ` · ${p.paidBy}` : ''}
                                  {p.paidAt ? ` · ${formatWhen(p.paidAt)}` : ''}
                                  {p.note ? ` · ${p.note}` : ''}
                                </p>
                              ))}
                            </div>
                          )}
                          {st.note && (
                            <p className="pl-7 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              Note: {st.note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

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

        <div className="pt-4 text-center space-y-2">
          <Link href="/signup" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            Make your own trip on Udharwale →
          </Link>
          <CreatorCredit withProduct />
        </div>
      </div>

      {isAckModalOpen && acknowledgingSettlement && canManageSettlementRow(acknowledgingSettlement) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setIsAckModalOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-t-[20px] sm:rounded-[20px] overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            <div
              className="flex items-center justify-between px-5 pt-4 pb-3"
              style={{ borderBottom: '1px solid var(--border-soft)' }}
            >
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
                  Confirmed publicly as {viewer.displayName || ownerName}
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
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Public note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul paid via GPay"
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
