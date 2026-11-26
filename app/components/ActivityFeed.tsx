'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Copy,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Split,
  Trash2,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { BalanceReminder, Contact } from './types';
import type { Trip } from './trip-types';
import {
  buildActivityFeed,
  filterActivityFeed,
  formatActivityAmount,
  formatActivityTime,
  groupActivityByDay,
  type ActivityFilter,
  type ActivityItem,
  type ActivityKind,
} from '@/lib/activity-feed';
import { formatReminderLabel, primaryRemindersByContact } from '@/lib/reminders';
import { readSessionCache, readTripsCache } from '@/lib/client-cache';
import { ActivityFeedSkeleton } from './Skeleton';
import PersonAvatar from './PersonAvatar';

type Props = {
  contacts: Contact[];
  reminders?: BalanceReminder[];
  netBalance: number;
  totalCredit: number;
  totalDebit: number;
  showBalances: boolean;
  userName?: string;
  userAvatarSeed?: string;
  onToggleBalances: () => void;
  onOpenAccount?: () => void;
  onOpenContact: (contactId: string) => void;
  onRemindWhatsApp?: (contactId: string, dueLabel: string) => void;
  onCopyReminder?: (contactId: string, dueLabel: string) => void;
  onPayUpi?: (contactId: string) => void;
  onOpenTrip: (tripId: string) => void;
};

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'money', label: 'Money' },
  { id: 'trips', label: 'Trips' },
  { id: 'people', label: 'People' },
];

function kindMeta(kind: ActivityKind): {
  icon: typeof Plus;
  tone: string;
  soft: string;
} {
  switch (kind) {
    case 'tx_create':
      return { icon: ArrowUpRight, tone: '#0f766e', soft: 'rgba(15,118,110,0.12)' };
    case 'tx_update':
      return { icon: Pencil, tone: '#0e7490', soft: 'rgba(14,116,144,0.12)' };
    case 'tx_delete':
      return { icon: Trash2, tone: '#c23b4a', soft: 'rgba(194,59,74,0.12)' };
    case 'tx_restore':
      return { icon: RotateCcw, tone: '#047857', soft: 'rgba(4,120,87,0.12)' };
    case 'contact_created':
      return { icon: UserPlus, tone: '#0f766e', soft: 'rgba(15,118,110,0.12)' };
    case 'trip_created':
      return { icon: MapPin, tone: '#0e7490', soft: 'rgba(14,116,144,0.12)' };
    case 'expense_added':
      return { icon: Wallet, tone: '#b45309', soft: 'rgba(180,83,9,0.12)' };
    case 'settlement_paid':
      return { icon: Split, tone: '#047857', soft: 'rgba(4,120,87,0.12)' };
    default:
      return { icon: Clock3, tone: '#5f6f68', soft: 'rgba(95,111,104,0.12)' };
  }
}

function amountColor(item: ActivityItem) {
  if (item.amountTone === 'credit') return 'var(--emerald)';
  if (item.amountTone === 'debit') return 'var(--rose)';
  return 'var(--text-secondary)';
}

function urgencyTone(urgency: BalanceReminder['urgency']) {
  if (urgency === 'overdue') {
    return { bg: 'rgba(244,63,94,0.12)', color: '#e11d48', border: 'rgba(244,63,94,0.28)' };
  }
  if (urgency === 'today') {
    return { bg: 'rgba(245,158,11,0.14)', color: '#d97706', border: 'rgba(245,158,11,0.32)' };
  }
  return { bg: 'rgba(15,118,110,0.1)', color: 'var(--primary)', border: 'rgba(15,118,110,0.22)' };
}

export default function ActivityFeed({
  contacts,
  reminders = [],
  netBalance,
  totalCredit,
  totalDebit,
  showBalances,
  userName = 'You',
  userAvatarSeed,
  onToggleBalances,
  onOpenAccount,
  onOpenContact,
  onRemindWhatsApp,
  onCopyReminder,
  onPayUpi,
  onOpenTrip,
}: Props) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const key = readSessionCache()?.userKey;
    const cached = readTripsCache<Trip>(key) || [];
    if (cached.length > 0) {
      setTrips(cached);
      setLoadingTrips(false);
    }

    const load = (showSpinner = cached.length === 0) => {
      if (showSpinner) setLoadingTrips(true);
      fetch('/api/trips')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!cancelled && Array.isArray(data)) setTrips(data);
        })
        .catch(() => {
          if (!cancelled && cached.length === 0) setTrips([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingTrips(false);
        });
    };
    load(cached.length === 0);
    const onSampleCleared = () => load(false);
    window.addEventListener('udharwale:sample-cleared', onSampleCleared);
    return () => {
      cancelled = true;
      window.removeEventListener('udharwale:sample-cleared', onSampleCleared);
    };
  }, []);

  const feed = useMemo(() => buildActivityFeed(contacts, trips), [contacts, trips]);
  const filtered = useMemo(() => filterActivityFeed(feed, filter), [feed, filter]);
  const groups = useMemo(() => groupActivityByDay(filtered), [filtered]);
  const hasSampleActivity = useMemo(
    () => feed.some((item) => item.isSample) || contacts.some((c) => c.isSample) || trips.some((t) => t.isSample),
    [feed, contacts, trips]
  );

  const dueRows = useMemo(() => primaryRemindersByContact(reminders), [reminders]);
  const overdueCount = useMemo(
    () => dueRows.filter((r) => r.urgency === 'overdue' || r.urgency === 'today').length,
    [dueRows]
  );
  const contactsById = useMemo(() => {
    const map = new Map<string, Contact>();
    for (const contact of contacts) map.set(contact.id, contact);
    return map;
  }, [contacts]);

  const handleOpen = (item: ActivityItem) => {
    if (item.contactId) onOpenContact(item.contactId);
    else if (item.tripId) onOpenTrip(item.tripId);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 pt-4 pb-2 space-y-4">
        <div className="px-1 flex items-center gap-3">
          {onOpenAccount ? (
            <button
              type="button"
              onClick={onOpenAccount}
              className="shrink-0 rounded-full"
              aria-label="Open account"
              title="Account"
            >
              <PersonAvatar
                name={userName}
                seed={userAvatarSeed || userName || 'you'}
                size="md"
              />
            </button>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
              Activity
            </h1>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Due balances and recent account actions
            </p>
          </div>
        </div>

        <div
          className="rounded-3xl p-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                Net balance
              </p>
              <p
                className="text-3xl font-extrabold tabular-nums mt-1 tracking-tight"
                style={{
                  color: showBalances
                    ? netBalance >= 0
                      ? 'var(--emerald)'
                      : 'var(--rose)'
                    : 'var(--text-primary)',
                }}
              >
                {showBalances
                  ? `${netBalance >= 0 ? '+' : '−'}₹${Math.abs(netBalance).toLocaleString('en-IN')}`
                  : '••••'}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleBalances}
              className="h-9 px-3 rounded-full text-xs font-bold"
              style={{
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-soft)',
              }}
            >
              {showBalances ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(4,120,87,0.08)' }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--emerald)' }}>
                You&apos;ll get
              </p>
              <p className="text-base font-bold tabular-nums mt-0.5" style={{ color: 'var(--emerald)' }}>
                {showBalances ? `₹${totalCredit.toLocaleString('en-IN')}` : '••••'}
              </p>
            </div>
            <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(194,59,74,0.08)' }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--rose)' }}>
                You owe
              </p>
              <p className="text-base font-bold tabular-nums mt-0.5" style={{ color: 'var(--rose)' }}>
                {showBalances ? `₹${totalDebit.toLocaleString('en-IN')}` : '••••'}
              </p>
            </div>
          </div>
        </div>

        {dueRows.length > 0 ? (
          <section className="space-y-2">
            <div className="px-1 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Due
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {overdueCount > 0
                    ? `${overdueCount} need attention now`
                    : 'Upcoming repayments in the next 2 weeks'}
                </p>
              </div>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              {dueRows.map((reminder, index) => {
                const contact = contactsById.get(reminder.contactId);
                const tone = urgencyTone(reminder.urgency);
                const label = formatReminderLabel(reminder);
                const isLast = index === dueRows.length - 1;
                const amountPrefix = reminder.direction === 'receive' ? '+' : '−';
                const amountColor =
                  reminder.direction === 'receive' ? 'var(--emerald)' : 'var(--rose)';

                return (
                  <div
                    key={reminder.id}
                    className="flex items-center gap-3 px-3.5 py-3"
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenContact(reminder.contactId)}
                      className="shrink-0 rounded-full"
                      aria-label={`Open ${reminder.contactName}`}
                    >
                      <PersonAvatar
                        name={reminder.contactName}
                        seed={contact?.avatarSeed || reminder.contactId}
                        size="md"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenContact(reminder.contactId)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {reminder.contactName}
                        </p>
                        <span
                          className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                          style={{
                            background: tone.bg,
                            color: tone.color,
                            border: `1px solid ${tone.border}`,
                          }}
                        >
                          {reminder.urgency === 'overdue'
                            ? 'Overdue'
                            : reminder.urgency === 'today'
                              ? 'Today'
                              : 'Upcoming'}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {label}
                        {reminder.direction === 'receive' ? ' · they owe you' : ' · you owe them'}
                      </p>
                    </button>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <div className="text-right mr-0.5">
                        <p
                          className="text-sm font-bold tabular-nums"
                          style={{ color: showBalances ? amountColor : 'var(--text-primary)' }}
                        >
                          {showBalances
                            ? `${amountPrefix}₹${reminder.amount.toLocaleString('en-IN')}`
                            : '••••'}
                        </p>
                      </div>
                      {onRemindWhatsApp && reminder.direction === 'receive' ? (
                        <button
                          type="button"
                          onClick={() => onRemindWhatsApp(reminder.contactId, label)}
                          className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                          style={{
                            background: 'rgba(15,118,110,0.12)',
                            color: 'var(--primary)',
                          }}
                          aria-label={`Remind ${reminder.contactName} on WhatsApp`}
                          title="Remind on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      ) : null}
                      {onPayUpi && reminder.direction === 'pay' ? (
                        <button
                          type="button"
                          onClick={() => onPayUpi(reminder.contactId)}
                          className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                          style={{
                            background: 'rgba(15,118,110,0.12)',
                            color: 'var(--primary)',
                          }}
                          aria-label={`Pay ${reminder.contactName} via UPI`}
                          title="Pay via UPI"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                      ) : null}
                      {onCopyReminder ? (
                        <button
                          type="button"
                          onClick={() => onCopyReminder(reminder.contactId, label)}
                          className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
                          style={{
                            background: 'var(--bg-raised)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-soft)',
                          }}
                          aria-label={`Copy reminder for ${reminder.contactName}`}
                          title="Copy reminder"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {hasSampleActivity ? (
          <div
            className="rounded-xl px-3 py-2.5"
            style={{
              background: 'rgba(180,83,9,0.1)',
              border: '1px dashed rgba(180,83,9,0.35)',
            }}
          >
            <p className="text-[11px] font-bold" style={{ color: '#b45309' }}>
              Includes practice examples
            </p>
            <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
              Rows marked Sample are fake data so you can learn the app — not real balances.
            </p>
          </div>
        ) : null}

        <div
          className="flex gap-1.5 p-1 rounded-2xl overflow-x-auto"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="flex-1 min-w-[4.5rem] h-9 rounded-xl text-xs font-bold transition-colors"
                style={{
                  background: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: active ? '0 1px 2px rgba(20,32,28,0.06)' : 'none',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loadingTrips && feed.length === 0 ? (
          <ActivityFeedSkeleton rows={5} />
        ) : groups.length === 0 ? (
          <div
            className="rounded-3xl px-5 py-10 text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            <div
              className="mx-auto mb-3 h-12 w-12 rounded-2xl inline-flex items-center justify-center"
              style={{ background: 'var(--accent)', color: 'var(--primary)' }}
            >
              <Clock3 className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              No activity yet
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Payments, friends, and trip updates will show up here as you use Udharwale.
            </p>
          </div>
        ) : (
          <div className="space-y-5 pb-6">
            {groups.map((group) => (
              <section key={group.label}>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em] px-1 mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {group.label}
                </p>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                >
                  {group.items.map((item, index) => {
                    const meta = kindMeta(item.kind);
                    const Icon = meta.icon;
                    const amount = formatActivityAmount(item);
                    const isLast = index === group.items.length - 1;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleOpen(item)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors"
                        style={{
                          borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
                        }}
                      >
                        <div
                          className="h-10 w-10 rounded-xl shrink-0 inline-flex items-center justify-center"
                          style={{ background: meta.soft, color: meta.tone }}
                        >
                          {item.kind === 'tx_create' && item.amountTone === 'debit' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p
                                className="text-sm font-bold leading-snug truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {item.title}
                              </p>
                              {item.isSample ? (
                                <span
                                  className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                                  style={{
                                    background: 'rgba(180,83,9,0.14)',
                                    color: '#b45309',
                                    border: '1px dashed rgba(180,83,9,0.4)',
                                  }}
                                >
                                  Sample
                                </span>
                              ) : null}
                            </div>
                            <span
                              className="text-[10px] font-semibold shrink-0 pt-0.5"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              {formatActivityTime(item.at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p
                              className="text-xs truncate"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {item.subtitle}
                            </p>
                            {amount ? (
                              <span
                                className="text-xs font-bold tabular-nums shrink-0"
                                style={{ color: amountColor(item) }}
                              >
                                {amount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
