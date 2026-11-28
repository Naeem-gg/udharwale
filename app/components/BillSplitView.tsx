'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Copy, Link2, Minus, Plus, Share2 } from 'lucide-react';
import BrandMark from './BrandMark';
import {
  BILL_SPLIT_LIMITS,
  type BillDraft,
  type BillPerson,
  billSharePath,
  decodeBill,
  encodeBill,
  formatBillShareText,
  formatInr,
  moneyInputValue,
  roundMoney,
  settleBill,
  equalShares,
} from '@/lib/bill-split';

const COLORS = ['#0f766e', '#b45309', '#0e7490', '#047857', '#be123c', '#115e59', '#a16207', '#155e75'];
const RECENT_KEY = 'udharwale-splits-v1';
const TITLE_CHIPS = ['Dinner', 'Drinks', 'Cab', 'Movie', 'Groceries'];

const DINNER: BillDraft = {
  title: 'Dinner',
  total: 1500,
  people: [
    { id: 'p1', name: 'A', paid: 700 },
    { id: 'p2', name: 'B', paid: 300 },
    { id: 'p3', name: 'C', paid: 500 },
    { id: 'p4', name: 'D', paid: 0 },
    { id: 'p5', name: 'E', paid: 0 },
  ],
};

type Step = 'intro' | 'count' | 'bill' | 'paid' | 'crunch' | 'result';
type RecentSplit = { code: string; title: string; total: number; count: number; at: number };

const fade = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
};

function prefersReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function letterName(index: number) {
  return index < 26 ? String.fromCharCode(65 + index) : `P${index + 1}`;
}

function parseMoney(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  if (!cleaned || cleaned === '.') return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return 0;
  return roundMoney(Math.min(value, BILL_SPLIT_LIMITS.maxMoney));
}

function sanitizeMoneyInput(raw: string) {
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function readRecent(): RecentSplit[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as RecentSplit[];
    if (!Array.isArray(raw)) return [];
    return raw.filter((item) => item && typeof item.code === 'string').slice(0, 6);
  } catch {
    return [];
  }
}

function rememberSplit(draft: BillDraft) {
  try {
    const code = encodeBill(draft);
    const next: RecentSplit = {
      code,
      title: draft.title.trim() || 'Bill',
      total: roundMoney(draft.total),
      count: draft.people.length,
      at: Date.now(),
    };
    const prev = readRecent().filter((item) => item.code !== code);
    localStorage.setItem(RECENT_KEY, JSON.stringify([next, ...prev].slice(0, 6)));
  } catch {
    /* storage can be full or blocked */
  }
}

function Avatar({ name, color, size = 42 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size < 36 ? 13 : 16,
        boxShadow: '0 6px 16px rgba(20, 32, 28, 0.12)',
      }}
    >
      {(name.trim().charAt(0) || '?').toUpperCase()}
    </span>
  );
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (prefersReduced()) {
      setShown(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 560);
      const eased = 1 - (1 - t) ** 3;
      setShown(roundMoney(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>₹{formatInr(shown)}</>;
}

function Confetti() {
  const bits = Array.from({ length: 16 }, (_, index) => ({
    left: `${(index * 41) % 100}%`,
    delay: (index % 8) * 0.05,
    color: COLORS[index % COLORS.length],
    rotate: (index * 53) % 200,
    size: 6 + (index % 3) * 3,
  }));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
      {bits.map((bit, index) => (
        <motion.span
          key={index}
          className="absolute top-0 rounded-sm"
          style={{ left: bit.left, width: bit.size, height: bit.size + 2, background: bit.color }}
          initial={{ y: -16, opacity: 1, rotate: 0 }}
          animate={{ y: 280, opacity: 0, rotate: bit.rotate }}
          transition={{ duration: 1.25, delay: bit.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

export default function BillSplitView({ standalone = false }: { standalone?: boolean }) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>('intro');
  const [title, setTitle] = useState('Dinner');
  const [totalText, setTotalText] = useState('');
  const [peopleCount, setPeopleCount] = useState(4);
  const [people, setPeople] = useState<BillPerson[]>([]);
  const [paidText, setPaidText] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState('');
  const [recent, setRecent] = useState<RecentSplit[]>([]);
  const [linkError, setLinkError] = useState(false);
  const [fromShare, setFromShare] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [copied, setCopied] = useState<'link' | 'text' | null>(null);
  const [canShare, setCanShare] = useState(false);
  const draftRef = useRef<BillDraft | null>(null);

  const draft = useMemo<BillDraft>(
    () => ({
      title: title.trim() || 'Bill',
      total: parseMoney(totalText),
      people: people.map((person) => ({
        ...person,
        name: person.name,
        paid: parseMoney(paidText[person.id] ?? ''),
      })),
    }),
    [title, totalText, people, paidText]
  );
  draftRef.current = draft;

  const result = useMemo(() => settleBill(draft), [draft]);
  const shares = useMemo(
    () => equalShares(parseMoney(totalText), people.length || peopleCount),
    [totalText, people.length, peopleCount]
  );

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === 'function');
    setRecent(readRecent());
    const code = new URLSearchParams(window.location.search).get('b');
    if (code) {
      const parsed = decodeBill(code);
      if (parsed) applyDraft(parsed, { step: 'result', fromShare: true, celebrate: !prefersReduced() });
      else setLinkError(true);
    }
    setReady(true);
    // applyDraft is stable enough for first paint only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!celebrate) return;
    const timer = window.setTimeout(() => setCelebrate(false), 1500);
    return () => window.clearTimeout(timer);
  }, [celebrate]);

  useEffect(() => {
    if (step !== 'crunch') return;
    const timer = window.setTimeout(() => {
      const current = draftRef.current;
      if (current) {
        rememberSplit(current);
        setRecent(readRecent());
        if (standalone) {
          window.history.replaceState(null, '', billSharePath(encodeBill(current)));
        }
      }
      setCelebrate(!prefersReduced());
      setStep('result');
    }, prefersReduced() ? 0 : 1680);
    return () => window.clearTimeout(timer);
  }, [step, standalone]);

  function applyDraft(
    next: BillDraft,
    options: { step: Step; fromShare?: boolean; celebrate?: boolean }
  ) {
    const paid: Record<string, string> = {};
    next.people.forEach((person) => {
      paid[person.id] = moneyInputValue(person.paid);
    });
    setTitle(next.title || 'Bill');
    setTotalText(next.total ? String(next.total) : '');
    setPeopleCount(next.people.length);
    setPeople(next.people);
    setPaidText(paid);
    setFromShare(Boolean(options.fromShare));
    setCelebrate(Boolean(options.celebrate));
    setLinkError(false);
    setStep(options.step);
  }

  function syncPeople(count: number) {
    setPeople((current) => {
      const next = current.slice(0, count);
      while (next.length < count) {
        const index = next.length;
        next.push({ id: `p${index + 1}`, name: letterName(index), paid: 0 });
      }
      return next.map((person, index) => ({
        ...person,
        id: person.id || `p${index + 1}`,
        name: person.name.trim() ? person.name : letterName(index),
      }));
    });
  }

  function openRecent(item: RecentSplit) {
    const parsed = decodeBill(item.code);
    if (!parsed) return;
    applyDraft(parsed, { step: 'result', celebrate: !prefersReduced() });
  }

  function startFresh() {
    setTitle('Dinner');
    setTotalText('');
    setPeopleCount(4);
    setPeople([]);
    setPaidText({});
    setFromShare(false);
    setCelebrate(false);
    setStep('count');
  }

  function playExample() {
    applyDraft(DINNER, { step: prefersReduced() ? 'result' : 'crunch' });
    if (prefersReduced()) {
      rememberSplit(DINNER);
      setRecent(readRecent());
      if (standalone) window.history.replaceState(null, '', billSharePath(encodeBill(DINNER)));
    }
  }

  function goToPaid() {
    if (parseMoney(totalText) <= 0) return;
    syncPeople(peopleCount);
    setStep('paid');
  }

  function reveal() {
    if (!result.balanced) {
      setNudge(true);
      return;
    }
    setFromShare(false);
    if (prefersReduced()) {
      rememberSplit(draft);
      setRecent(readRecent());
      if (standalone) window.history.replaceState(null, '', billSharePath(encodeBill(draft)));
      setStep('result');
      return;
    }
    setStep('crunch');
  }

  const shareCode = result.balanced ? encodeBill(draft) : '';
  const shareUrl = shareCode ? `${origin}${billSharePath(shareCode)}` : '';
  const shareText = shareUrl ? formatBillShareText(draft, shareUrl) : '';

  async function copyValue(value: string, kind: 'link' | 'text') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function nativeShare() {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: `${draft.title} split`,
        text: formatBillShareText(draft),
        url: shareUrl,
      });
    } catch {
      /* dismissed */
    }
  }

  function setPersonPaid(id: string, raw: string) {
    setPaidText((current) => ({ ...current, [id]: sanitizeMoneyInput(raw) }));
    setNudge(false);
  }

  const paidTotal = result.paidTotal;
  const billTotal = parseMoney(totalText);
  const gapLabel =
    billTotal <= 0
      ? 'Add the bill first'
      : result.gap < -0.009
        ? `₹${formatInr(Math.abs(result.gap))} still unpaid`
        : result.gap > 0.009
          ? `₹${formatInr(result.gap)} over the bill`
          : 'Payments match the bill';

  const header =
    step === 'intro'
      ? { title: 'Split the bill', back: null as Step | null }
      : step === 'count'
        ? { title: 'How many people?', back: 'intro' as Step }
        : step === 'bill'
          ? { title: 'What was the bill?', back: 'count' as Step }
          : step === 'paid'
            ? { title: 'Who paid what?', back: 'bill' as Step }
            : step === 'crunch'
              ? { title: 'Settling up', back: null }
              : { title: 'Who owes whom', back: 'paid' as Step };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="uw-float text-4xl" aria-hidden>
          🍽️
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="uw-orb absolute -left-16 -top-24 h-56 w-56 rounded-full" style={{ background: 'rgba(15,118,110,0.18)' }} />
        <div className="uw-orb uw-orb-delay absolute -right-16 top-28 h-64 w-64 rounded-full" style={{ background: 'rgba(180,83,9,0.14)' }} />
      </div>

      <header
        className="relative z-10 flex shrink-0 items-center gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        {header.back ? (
          <button
            type="button"
            onClick={() => setStep(header.back as Step)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)' }}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : standalone ? (
          <BrandMark size={32} />
        ) : (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ background: 'var(--accent)' }}>
            🍽️
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
            {header.title}
          </p>
          {step === 'count' || step === 'bill' || step === 'paid' ? (
            <div className="mt-1 flex gap-1" aria-hidden>
              {(['count', 'bill', 'paid'] as const).map((item, index) => {
                const current = ['count', 'bill', 'paid'].indexOf(step);
                const filled = index <= current;
                return (
                  <span
                    key={item}
                    className="h-1 flex-1 rounded-full"
                    style={{
                      background: filled ? 'var(--primary)' : 'var(--bg-overlay)',
                      opacity: index === current ? 1 : filled ? 0.55 : 1,
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <p className="truncate text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {standalone ? 'No account needed' : 'Fair share, then the shortest paybacks'}
            </p>
          )}
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.section key="intro" {...fade} className="px-4 pb-8 pt-2">
              <div className="uw-float mx-auto max-w-[280px] rounded-[24px] p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-elevated)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--primary)' }}>
                    Dinner
                  </p>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    5 friends
                  </p>
                </div>
                <p className="mt-1 text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  ₹1,500
                </p>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  ₹300 each if you split it evenly
                </p>
                <div className="mt-3 space-y-1.5">
                  {DINNER.people.map((person, index) => (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + index * 0.08 }}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: COLORS[index] }} />
                        {person.name} paid
                      </span>
                      <span className="font-extrabold tabular-nums" style={{ color: person.paid ? 'var(--text-primary)' : 'var(--rose)' }}>
                        ₹{formatInr(person.paid)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <h2 className="mt-6 text-[1.65rem] font-extrabold leading-[1.05]" style={{ color: 'var(--text-primary)' }}>
                A paid extra. D and E paid nothing. Who sends money to whom?
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Udharwale works out the fair share, then the fewest payments that settle the table. Send the link so nobody has to re-do the maths.
              </p>

              {linkError && (
                <p className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: 'var(--rose-glow)', color: 'var(--rose)' }}>
                  That share link could not be opened. Start a new split below.
                </p>
              )}

              <div className="mt-5 space-y-2.5">
                <button type="button" onClick={playExample} className="uw-shine btn-primary w-full text-[15px]">
                  Show this dinner
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={startFresh}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-bold"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)' }}
                >
                  Split a different bill
                </button>
              </div>

              {recent.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                    Recent on this phone
                  </p>
                  <div className="space-y-2">
                    {recent.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => openRecent(item)}
                        className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                      >
                        <span>
                          <span className="block text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {item.count} people
                          </span>
                        </span>
                        <span className="text-sm font-extrabold" style={{ color: 'var(--primary)' }}>
                          ₹{formatInr(item.total)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {step === 'count' && (
            <motion.section key="count" {...fade} className="flex min-h-full flex-col px-4 pb-6 pt-6">
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    aria-label="Fewer people"
                    disabled={peopleCount <= BILL_SPLIT_LIMITS.minPeople}
                    onClick={() => setPeopleCount((count) => Math.max(BILL_SPLIT_LIMITS.minPeople, count - 1))}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full disabled:opacity-35"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <motion.div
                    key={peopleCount}
                    initial={{ scale: 0.72, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    className="w-24 text-center text-7xl font-extrabold tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {peopleCount}
                  </motion.div>
                  <button
                    type="button"
                    aria-label="More people"
                    disabled={peopleCount >= BILL_SPLIT_LIMITS.maxPeople}
                    onClick={() => setPeopleCount((count) => Math.min(BILL_SPLIT_LIMITS.maxPeople, count + 1))}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full disabled:opacity-35"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {peopleCount === 1 ? 'person' : 'people split this bill'}
                </p>
                <div className="mt-6 flex max-w-[280px] flex-wrap justify-center gap-2">
                  {Array.from({ length: peopleCount }, (_, index) => (
                    <motion.span
                      key={letterName(index)}
                      className="uw-pop inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold text-white"
                      style={{ background: COLORS[index % COLORS.length], animationDelay: `${index * 40}ms` }}
                    >
                      {letterName(index)}
                    </motion.span>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => setStep('bill')} className="btn-primary mt-8 w-full">
                Continue
              </button>
            </motion.section>
          )}

          {step === 'bill' && (
            <motion.section key="bill" {...fade} className="flex min-h-full flex-col px-4 pb-6 pt-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, 40))}
                className="bg-transparent text-center text-sm font-extrabold uppercase tracking-[0.16em] outline-none"
                style={{ color: 'var(--primary)' }}
                aria-label="Bill name"
              />
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {TITLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setTitle(chip)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      background: title === chip ? 'var(--primary)' : 'var(--bg-surface)',
                      color: title === chip ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-soft)',
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <label className="mt-8 block text-center">
                <span className="sr-only">Bill total</span>
                <span className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  Total, including tax and tip
                </span>
                <span className="flex items-end justify-center gap-1">
                  <span className="pb-2 text-2xl font-extrabold" style={{ color: 'var(--text-muted)' }}>
                    ₹
                  </span>
                  <input
                    inputMode="decimal"
                    value={totalText}
                    placeholder="0"
                    onChange={(event) => setTotalText(sanitizeMoneyInput(event.target.value))}
                    className="w-full max-w-[240px] bg-transparent text-center text-6xl font-extrabold tabular-nums outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </span>
              </label>

              <div className="mt-6 rounded-3xl px-4 py-5 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  {peopleCount > 0 && Math.round(billTotal * 100) % peopleCount === 0 ? 'Each person' : 'About each'}
                </p>
                <p className="mt-1 text-4xl font-extrabold" style={{ color: 'var(--primary)' }}>
                  <CountUp value={peopleCount ? roundMoney(billTotal / peopleCount) : 0} />
                </p>
                <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Split equally between {peopleCount}
                </p>
              </div>

              <button type="button" onClick={goToPaid} disabled={billTotal <= 0} className="btn-primary mt-auto w-full">
                Enter who paid
              </button>
            </motion.section>
          )}

          {step === 'paid' && (
            <motion.section key="paid" {...fade} className="px-4 pb-6 pt-2">
              <div className={nudge ? 'uw-shake rounded-2xl px-3 py-3' : 'rounded-2xl px-3 py-3'} style={{ background: result.balanced ? 'rgba(4,120,87,0.1)' : 'var(--bg-surface)', border: '1px solid var(--border-soft)' }} onAnimationEnd={() => setNudge(false)}>
                <div className="mb-2 flex items-center justify-between text-xs font-extrabold">
                  <span style={{ color: 'var(--text-secondary)' }}>Collected ₹{formatInr(paidTotal)}</span>
                  <span style={{ color: result.balanced ? 'var(--emerald)' : 'var(--text-primary)' }}>{gapLabel}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-overlay)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${billTotal > 0 ? Math.min(100, (paidTotal / billTotal) * 100) : 0}%` }}
                    transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                    style={{ background: result.gap > 0.009 ? 'var(--rose)' : result.balanced ? 'var(--emerald)' : 'var(--primary)' }}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {people.map((person, index) => {
                  const share = shares[index] ?? 0;
                  const others = people.reduce((sum, item) => (item.id === person.id ? sum : sum + parseMoney(paidText[item.id] || '')), 0);
                  const rest = roundMoney(Math.max(0, billTotal - others));
                  return (
                    <motion.div
                      key={person.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="rounded-2xl p-3"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={person.name || letterName(index)} color={COLORS[index % COLORS.length]} size={38} />
                        <div className="min-w-0 flex-1">
                          <input
                            value={person.name}
                            aria-label={`Name ${index + 1}`}
                            onChange={(event) =>
                              setPeople((current) =>
                                current.map((item) =>
                                  item.id === person.id ? { ...item, name: event.target.value.slice(0, 24) } : item
                                )
                              )
                            }
                            className="input-field py-2 font-extrabold"
                          />
                        </div>
                      </div>
                      <label className="mt-2 block">
                        <span className="mb-1 block text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          Paid · fair share ₹{formatInr(share)}
                        </span>
                        <span className="relative block">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-extrabold" style={{ color: 'var(--text-muted)' }}>
                            ₹
                          </span>
                          <input
                            inputMode="decimal"
                            value={paidText[person.id] ?? ''}
                            placeholder="0"
                            aria-label={`${person.name || letterName(index)} paid`}
                            onChange={(event) => setPersonPaid(person.id, event.target.value)}
                            className="input-field pl-8 text-lg font-extrabold tabular-nums"
                          />
                        </span>
                      </label>
                      <div className="mt-2 flex gap-1.5">
                        {[
                          { label: 'Nothing', value: '' },
                          { label: 'Fair', value: moneyInputValue(share) },
                          { label: rest > 0 ? `Rest ₹${formatInr(rest)}` : 'Rest', value: moneyInputValue(rest) },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setPersonPaid(person.id, chip.value)}
                            className="flex-1 rounded-xl px-2 py-2 text-[11px] font-extrabold"
                            style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div
                className="sticky bottom-0 -mx-4 mt-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
                style={{ background: 'linear-gradient(to top, var(--bg-base) 72%, transparent)' }}
              >
                <button type="button" onClick={reveal} className="btn-primary w-full">
                  See who owes whom
                </button>
              </div>
            </motion.section>
          )}

          {step === 'crunch' && (
            <motion.section key="crunch" {...fade} className="flex min-h-[70%] flex-col items-center justify-center px-6 py-16 text-center">
              <motion.div
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-3xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
              >
                🍽️
              </motion.div>
              <CrunchLines
                lines={[
                  `${draft.people.length} people`,
                  `${draft.title} is ₹${formatInr(draft.total)}`,
                  result.evenSplit
                    ? `Fair share ₹${formatInr(result.perHead)} each`
                    : `About ₹${formatInr(result.perHead)} each`,
                  'Finding the shortest paybacks',
                ]}
              />
            </motion.section>
          )}

          {step === 'result' && (
            <motion.section key="result" {...fade} className="relative px-4 pb-8 pt-2">
              {celebrate && <Confetti />}
              <div className="relative overflow-hidden rounded-[28px] px-4 py-5" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                <motion.div
                  className="absolute -right-8 -top-10 h-32 w-32 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 3.2, repeat: Infinity }}
                />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] opacity-80">{draft.title}</p>
                <p className="mt-1 text-4xl font-extrabold">
                  <CountUp value={result.total} />
                </p>
                <p className="mt-1 text-sm font-semibold opacity-90">
                  {result.people.length} people
                  {result.evenSplit ? ` · ₹${formatInr(result.perHead)} each` : ` · about ₹${formatInr(result.perHead)} each`}
                </p>
              </div>

              {fromShare && (
                <p className="mt-3 text-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  Shared split · anyone with this link sees the same hisab
                </p>
              )}

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  {!result.balanced
                    ? 'Payments don’t match'
                    : result.transfers.length
                      ? `${result.transfers.length} payment${result.transfers.length === 1 ? '' : 's'} settle it`
                      : 'Already even'}
                </p>
                {!result.balanced ? (
                  <div className="rounded-2xl px-4 py-5 text-center" style={{ background: 'var(--rose-glow)', border: '1px solid var(--border-soft)' }}>
                    <p className="text-lg font-extrabold" style={{ color: 'var(--rose)' }}>
                      {gapLabel}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      The payments have to add up to the bill before anyone can be settled.
                    </p>
                  </div>
                ) : result.transfers.length === 0 ? (
                  <div className="rounded-2xl px-4 py-5 text-center" style={{ background: 'rgba(4,120,87,0.1)', border: '1px solid var(--border-soft)' }}>
                    <p className="text-lg font-extrabold" style={{ color: 'var(--emerald)' }}>
                      Nobody owes anyone
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Everyone already paid their share.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5" aria-live="polite">
                    {result.transfers.map((transfer, index) => (
                      <motion.div
                        key={`${transfer.fromId}-${transfer.toId}-${index}`}
                        initial={{ opacity: 0, x: -18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + index * 0.12, type: 'spring', stiffness: 260, damping: 22 }}
                        className="flex items-center gap-2 rounded-2xl px-3 py-3"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                      >
                        <Avatar name={transfer.from} color={colorFor(people, transfer.fromId)} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                            {transfer.from}
                            <span className="font-semibold" style={{ color: 'var(--text-muted)' }}> pays </span>
                            {transfer.to}
                          </p>
                          <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-raised)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ delay: 0.25 + index * 0.12, duration: 0.55 }}
                              style={{ background: COLORS[index % COLORS.length] }}
                            />
                          </div>
                        </div>
                        <p className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--primary)' }}>
                          ₹{formatInr(transfer.amount)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  Each person
                </p>
                <div className="space-y-2">
                  {result.people.map((person, index) => {
                    const max = Math.max(person.paid, person.share, 1);
                    const tone = person.net > 0.009 ? 'var(--emerald)' : person.net < -0.009 ? 'var(--rose)' : 'var(--text-muted)';
                    const label =
                      person.net > 0.009
                        ? `Gets ₹${formatInr(person.net)} back`
                        : person.net < -0.009
                          ? `Owes ₹${formatInr(-person.net)}`
                          : 'Even';
                    return (
                      <motion.div
                        key={person.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="rounded-2xl px-3 py-3"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={person.name} color={COLORS[index % COLORS.length]} size={34} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                                {person.name}
                              </p>
                              <p className="shrink-0 text-xs font-extrabold" style={{ color: tone }}>
                                {label}
                              </p>
                            </div>
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                              Paid ₹{formatInr(person.paid)} · share ₹{formatInr(person.share)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-raised)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (person.paid / max) * 100)}%` }}
                            transition={{ delay: 0.25 + index * 0.05, duration: 0.5 }}
                            style={{ background: tone }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Everyone owes the same share. People who paid more get money back, and people who paid less send it — without passing cash in a circle.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => shareUrl && window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer')}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold text-white"
                  style={{ background: '#128C7E' }}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => shareUrl && copyValue(shareUrl, 'link')}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)' }}
                >
                  {copied === 'link' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied === 'link' ? 'Copied' : 'Copy link'}
                </button>
                <button
                  type="button"
                  onClick={() => shareText && copyValue(shareText, 'text')}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)' }}
                >
                  {copied === 'text' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === 'text' ? 'Copied' : 'Copy text'}
                </button>
                {canShare ? (
                  <button
                    type="button"
                    onClick={() => void nativeShare()}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)' }}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFromShare(false);
                      setStep('paid');
                    }}
                    className="flex min-h-11 items-center justify-center rounded-xl text-sm font-extrabold"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)' }}
                  >
                    Edit amounts
                  </button>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {canShare && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromShare(false);
                      setStep('paid');
                    }}
                    className="flex-1 rounded-xl py-3 text-sm font-extrabold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Edit amounts
                  </button>
                )}
                <button type="button" onClick={startFresh} className="flex-1 rounded-xl py-3 text-sm font-extrabold" style={{ color: 'var(--primary)' }}>
                  New split
                </button>
              </div>

              {standalone && (
                <p className="mt-2 text-center text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <Link href="/dashboard" className="underline-offset-2 hover:underline">
                    Open Udharwale
                  </Link>{' '}
                  to keep ledgers with friends.
                </p>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function colorFor(people: BillPerson[], id: string) {
  const index = people.findIndex((person) => person.id === id);
  return COLORS[(index < 0 ? 0 : index) % COLORS.length];
}

function CrunchLines({ lines }: { lines: string[] }) {
  const [visible, setVisible] = useState(1);
  useEffect(() => {
    if (visible >= lines.length) return;
    const timer = window.setTimeout(() => setVisible((count) => count + 1), 380);
    return () => window.clearTimeout(timer);
  }, [visible, lines.length]);

  return (
    <div className="space-y-2">
      {lines.slice(0, visible).map((line) => (
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-extrabold"
          style={{ color: 'var(--text-primary)' }}
        >
          {line}
        </motion.p>
      ))}
    </div>
  );
}
