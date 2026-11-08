'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Copy,
  MessageCircle,
  ReceiptText,
  Share2,
  Users,
  Compass,
  CreditCard,
  Split,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Trip,
  CATEGORY_CONFIG,
  calculateTripSummary,
  formatWhatsAppSummary,
} from '@/app/components/trip-types';

export default function SharedTripClient({ token }: { token: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ownerName, setOwnerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'settlement' | 'expenses'>('chat');
  const [copiedText, setCopiedText] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

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
          setError(err.message || 'Could not open this trip');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const summary = useMemo(() => {
    if (!trip) return null;
    return calculateTripSummary(trip);
  }, [trip]);

  const handleCopyWhatsApp = async () => {
    if (!trip) return;
    const text = formatWhatsAppSummary(trip, ownerName);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${trip.name} — Expenses`,
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2500);
      }
    } catch {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const currency = trip?.currency || '₹';

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Top App Header */}
      <header
        className="shrink-0 px-4 py-3 border-b sticky top-0 z-30"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-soft)' }}
      >
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shrink-0 shadow-lg shadow-violet-500/20">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="font-branding text-lg text-primary leading-none block">
                Udharwale
              </span>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                Trip Shared by {ownerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px] border-violet-500/30 text-violet-400">
              Public Trip View
            </Badge>
            <button
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md active:scale-95 text-white"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              title="Share breakdown"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-2xl flex flex-col min-h-0 p-3 sm:p-5 space-y-4">
        {loading && (
          <div
            className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Opening trip expenses…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl">
              ⚠️
            </div>
            <p className="text-lg font-bold">Trip Not Found</p>
            <p className="text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
              {error}
            </p>
            <Link href="/" className={buttonVariants({ size: 'sm' })}>
              Go to Udharwale
            </Link>
          </div>
        )}

        {!loading && trip && summary && (
          <>
            {/* Trip Hero Banner */}
            <div
              className="rounded-3xl p-5 relative overflow-hidden space-y-4"
              style={{
                background:
                  'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(99,102,241,0.08))',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-violet-400 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5" />
                      Trip Ledger
                    </span>
                    {trip.destination && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">
                        📍 {trip.destination}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {trip.name}
                  </h1>
                  {trip.description && (
                    <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {trip.description}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Total Spend
                  </span>
                  <div className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-400">
                    {currency}{summary.totalSpend.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Stats Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                <div
                  className="rounded-2xl p-3 flex flex-col justify-center"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    Average Per Head
                  </span>
                  <p className="text-lg font-black tabular-nums mt-0.5 text-white">
                    {currency}{summary.perHeadAverage.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    for {trip.participants.length} friends
                  </span>
                </div>

                <div
                  className="rounded-2xl p-3 flex flex-col justify-center"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Total Items
                  </span>
                  <p className="text-lg font-black tabular-nums mt-0.5 text-white">
                    {trip.expenses.length} expenses
                  </p>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    recorded in chat
                  </span>
                </div>

                <div
                  className="col-span-2 sm:col-span-1 rounded-2xl p-3 flex flex-col justify-center"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Pending Debts
                  </span>
                  <p className="text-lg font-black tabular-nums mt-0.5 text-white">
                    {summary.settlements.length === 0 ? 'All Settled ✨' : `${summary.settlements.length} transfers`}
                  </p>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    to square up
                  </span>
                </div>
              </div>

              {/* Participants avatar badges */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Group:
                </span>
                {trip.participants.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-soft)',
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div
              className="flex items-center p-1 rounded-2xl shrink-0"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
              }}
            >
              {[
                { id: 'chat', label: 'Chat Feed 💬', icon: MessageCircle },
                { id: 'settlement', label: 'Who Owes Whom ⚖️', icon: Split },
                { id: 'expenses', label: 'All Items 🧾', icon: ReceiptText },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={cn(
                      'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all text-center',
                      isActive
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT 1: CHAT FEED */}
            {activeTab === 'chat' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Activity & Expense Stream
                  </p>
                  <span className="text-[11px] text-slate-500">
                    {trip.expenses.length} messages
                  </span>
                </div>

                {trip.expenses.length === 0 ? (
                  <div
                    className="rounded-3xl p-8 text-center space-y-2"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-soft)',
                    }}
                  >
                    <p className="text-sm font-semibold">No expenses added yet.</p>
                  </div>
                ) : (
                  trip.expenses.map((expense) => {
                    const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                    const perHead =
                      expense.splitAmong.length > 0
                        ? Math.round((expense.amount / expense.splitAmong.length) * 100) / 100
                        : expense.amount;
                    const isExpanded = expandedExpenseId === expense.id;
                    const hasMultiplePayers = expense.paidBy.length > 1;

                    return (
                      <div
                        key={expense.id}
                        className="rounded-3xl p-4 transition-all hover:border-violet-500/40 space-y-3"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-soft)',
                        }}
                      >
                        {/* Header: Category Badge + Amount */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                              style={{ background: cat.bg, color: cat.tone }}
                            >
                              <span>{cat.icon}</span>
                              <span>{cat.label}</span>
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {expense.date}
                            </span>
                          </div>

                          <div className="text-right">
                            <div className="text-xl font-black tabular-nums text-white">
                              {currency}{expense.amount.toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] font-bold text-violet-400 block">
                              {currency}{perHead.toLocaleString('en-IN')}/head
                            </span>
                          </div>
                        </div>

                        {/* Title and Notes */}
                        <div>
                          <h3 className="font-extrabold text-base text-white">{expense.title}</h3>
                          {expense.notes && (
                            <p className="text-xs mt-1 text-slate-400 leading-relaxed">
                              &ldquo;{expense.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Who Paid Pill — HIGHLIGHTING PARTIAL PAYERS! */}
                        <div
                          className="p-3 rounded-2xl flex flex-col gap-2"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-soft)',
                          }}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400 flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                              {hasMultiplePayers ? 'Split Payment by:' : 'Paid by:'}
                            </span>
                            {hasMultiplePayers && (
                              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Multiple Payers
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {expense.paidBy.map((payer) => {
                              const pName =
                                trip.participants.find((pt) => pt.id === payer.participantId)?.name ||
                                'Friend';
                              const pct = Math.round((payer.amount / expense.amount) * 100);
                              return (
                                <span
                                  key={payer.participantId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold"
                                  style={{
                                    background: 'rgba(16,185,129,0.12)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                  }}
                                >
                                  <span>{pName}</span>
                                  <span className="font-black">
                                    {currency}{payer.amount.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[10px] opacity-75">({pct}%)</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Split Among Preview & Toggle */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-violet-400" />
                            Split among {expense.splitAmong.length} people
                          </span>

                          <button
                            onClick={() =>
                              setExpandedExpenseId(isExpanded ? null : expense.id)
                            }
                            className="text-violet-400 hover:text-violet-300 font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>{isExpanded ? 'Hide breakdown' : 'Show transparency'}</span>
                            <ChevronDown
                              className={cn(
                                'w-3.5 h-3.5 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          </button>
                        </div>

                        {/* Transparency math breakdown */}
                        {isExpanded && (
                          <div
                            className="p-3 rounded-2xl space-y-2 mt-2"
                            style={{
                              background: 'rgba(124,58,237,0.06)',
                              border: '1px solid rgba(139,92,246,0.2)',
                            }}
                          >
                            <p className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">
                              Transparent Share Per Person:
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {expense.splitAmong.map((split) => {
                                const pName =
                                  trip.participants.find((pt) => pt.id === split.participantId)?.name ||
                                  'Friend';
                                return (
                                  <div
                                    key={split.participantId}
                                    className="flex items-center justify-between p-2 rounded-xl text-xs"
                                    style={{ background: 'var(--bg-surface)' }}
                                  >
                                    <span className="font-semibold text-slate-300">{pName}</span>
                                    <span className="font-black tabular-nums text-white">
                                      {currency}{split.amount.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB CONTENT 2: SETTLEMENT & PARTICIPANT MATRIX */}
            {activeTab === 'settlement' && (
              <div className="space-y-5">
                {/* Simplified Settlements */}
                <div
                  className="rounded-3xl p-5 space-y-4"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-white flex items-center gap-2">
                        <span>⚖️ Who Pays Whom</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Minimal debt algorithm: settled in the fewest transactions.
                      </p>
                    </div>

                    <button
                      onClick={handleCopyWhatsApp}
                      className="px-3 py-1 rounded-xl text-xs font-bold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Plan
                    </button>
                  </div>

                  {summary.settlements.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-emerald-500/10 text-center space-y-1">
                      <p className="text-base font-extrabold text-emerald-400">
                        🎉 All Settled Up!
                      </p>
                      <p className="text-xs text-emerald-300/80">
                        Everyone has contributed their exact fair share. No debts remaining.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {summary.settlements.map((st, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-transform hover:scale-[1.01]"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-soft)',
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 font-black text-xs flex items-center justify-center shrink-0">
                              {st.fromName[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-200">
                                <span className="text-rose-400">{st.fromName}</span> pays{' '}
                                <span className="text-emerald-400">{st.toName}</span>
                              </p>
                              <span className="text-[10px] text-slate-500">
                                Direct settlement transfer
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-black tabular-nums text-white">
                              {currency}{st.amount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Participant Fair Share Matrix */}
                <div
                  className="rounded-3xl p-5 space-y-3"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <h3 className="text-base font-black text-white">
                    👥 Participant Balance Sheet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total spent out-of-pocket vs each person&apos;s fair consumption share.
                  </p>

                  <div className="space-y-2 pt-1">
                    {summary.participantSummaries.map((s) => {
                      const isOwed = s.netBalance > 0;
                      const owes = s.netBalance < 0;

                      return (
                        <div
                          key={s.participant.id}
                          className="p-3 rounded-2xl flex items-center justify-between gap-3"
                          style={{
                            background: isOwed
                              ? 'rgba(16,185,129,0.06)'
                              : owes
                              ? 'rgba(244,63,94,0.06)'
                              : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${
                              isOwed
                                ? 'rgba(16,185,129,0.2)'
                                : owes
                                ? 'rgba(244,63,94,0.2)'
                                : 'var(--border-soft)'
                            }`,
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-violet-600/30 text-violet-300 font-black text-xs flex items-center justify-center shrink-0">
                              {s.participant.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {s.participant.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Paid {currency}{s.totalPaid.toLocaleString('en-IN')} · Consumed{' '}
                                {currency}{s.totalShare.toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={cn(
                                'text-sm font-black tabular-nums',
                                isOwed ? 'text-emerald-400' : owes ? 'text-rose-400' : 'text-slate-400'
                              )}
                            >
                              {isOwed ? '+' : ''}{currency}{s.netBalance.toLocaleString('en-IN')}
                            </p>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                              {isOwed ? 'Gets Back' : owes ? 'Needs to Pay' : 'Settled'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: EXPENSES LIST */}
            {activeTab === 'expenses' && (
              <div
                className="rounded-3xl p-5 space-y-4"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">All Trip Expenses</h3>
                  <span className="text-xs font-bold text-slate-400">
                    {trip.expenses.length} records
                  </span>
                </div>

                <div className="divide-y divide-slate-800">
                  {trip.expenses.map((expense) => {
                    const cat = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.general;
                    const payersStr = expense.paidBy
                      .map((p) => {
                        const name =
                          trip.participants.find((pt) => pt.id === p.participantId)?.name || 'Friend';
                        return `${name} (${currency}${p.amount.toLocaleString('en-IN')})`;
                      })
                      .join(' + ');

                    return (
                      <div key={expense.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ background: cat.bg, color: cat.tone }}
                          >
                            {cat.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{expense.title}</h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              Paid by {payersStr}
                            </p>
                            <span className="text-[10px] text-slate-500">{expense.date}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-black tabular-nums text-white">
                            {currency}{expense.amount.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] text-violet-400">
                            {currency}
                            {Math.round((expense.amount / expense.splitAmong.length) * 100) / 100}
                            /head
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Call to action: Use Udharwale */}
            <div
              className="p-5 rounded-3xl text-center space-y-3"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(124,58,237,0.15))',
                border: '1px solid rgba(139,92,246,0.3)',
              }}
            >
              <div className="w-10 h-10 mx-auto rounded-2xl bg-violet-600/30 text-violet-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white">
                Track your own trip expenses on Udharwale
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Automatic partial bill splitting, debt minimization, and seamless WhatsApp reminders.
              </p>
              <div className="pt-1">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: 'default' }),
                    'bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 shadow-lg shadow-violet-600/30'
                  )}
                >
                  Create Free Account
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
