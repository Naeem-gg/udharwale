'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LockKeyhole, MessageCircle, ReceiptText, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const features = [
  { icon: ReceiptText, title: 'Smart Ledger', desc: 'Track who owes what, when, and how with full transaction history.' },
  { icon: MessageCircle, title: 'WhatsApp Reminders', desc: 'Send payment reminders directly via WhatsApp in one tap.' },
  { icon: ShieldCheck, title: '100% Private', desc: 'Your data stays secure. No ads, no data selling, no nonsense.' },
  { icon: Zap, title: 'Instant Settle', desc: 'Mark full or custom balance settlements without losing context.' },
  { icon: LockKeyhole, title: 'Account Recovery', desc: 'Recover access with a PIN or security answer when needed.' },
  { icon: Sparkles, title: 'Insights & Flow', desc: 'See your net position, credit, and debit at a glance.' },
];

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then((data) => {
        setIsLoggedIn(true);
        setUserName(data.user?.name || '');
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--bg-base)] text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="aurora-blob animate-aurora absolute -left-28 -top-32 h-[700px] w-[700px] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.14)_0%,transparent_70%)]" />
        <div className="aurora-blob animate-aurora absolute -right-24 bottom-0 h-[600px] w-[600px] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.10)_0%,transparent_70%)] [animation-delay:4s] [animation-direction:reverse]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(124,58,237,0.4),rgba(6,182,212,0.3),transparent)]" />
      </div>

      <header className="relative z-10 w-full">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-[0_4px_20px_rgba(124,58,237,0.4)]">
                <ReceiptText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="absolute inset-0 animate-glow-pulse rounded-lg shadow-[0_0_20px_rgba(124,58,237,0.3)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-branding text-xl text-primary">Udharwale</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase text-primary">By Naeem Navjivan</span>
            </div>
            <Badge className="hidden sm:inline-flex">PRO v1.2</Badge>
          </div>

          <nav className="flex items-center gap-3">
            {isLoggedIn === null ? (
              <div className="h-8 w-24 rounded-md bg-secondary shimmer-bg" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-xs font-semibold text-muted-foreground sm:block">
                  Hey, {userName || 'there'}
                </span>
                <Link href="/dashboard" className={buttonVariants({ size: 'sm' })}>
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                  Sign In
                </Link>
                <Link href="/signup" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12">
          <section className="space-y-7 text-center lg:col-span-7 lg:text-left">
            <Badge className="animate-fade-slide-up gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Free Personal Khata Book · No Hidden Fees
            </Badge>

            <div className="space-y-2 animate-fade-slide-up [animation-delay:0.08s]">
              <h1 className="text-5xl font-black leading-[1.05] text-foreground sm:text-6xl md:text-7xl">
                Settle debts,
                <br />
                track loans, <span className="gradient-text">maintain trust.</span>
              </h1>
            </div>

            <p className="mx-auto max-w-xl animate-fade-slide-up text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0 [animation-delay:0.16s]">
              Udharwale is a personal ledger tracker designed to remove friction from shared bills, friend balances, and loan tracking with clean cards, auto logs, and instant WhatsApp reminders.
            </p>

            <div className="flex animate-fade-slide-up flex-col items-center justify-center gap-3 pt-2 sm:flex-row lg:justify-start [animation-delay:0.24s]">
              {isLoggedIn === null ? (
                <div className="h-12 w-40 rounded-md shimmer-bg" />
              ) : isLoggedIn ? (
                <Link href="/dashboard" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link href="/signup" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
                    Get Started Free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href="/login" className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'w-full sm:w-auto' })}>
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="flex animate-fade-slide-up items-center justify-center gap-8 border-t border-border pt-6 lg:justify-start [animation-delay:0.32s]">
              {[
                { value: '0%', label: 'Hidden Fees', tone: 'text-foreground' },
                { value: '1-Click', label: 'WhatsApp Share', tone: 'text-cyan-300' },
                { value: '100%', label: 'Private & Safe', tone: 'text-primary' },
              ].map(({ value, label, tone }) => (
                <div key={label}>
                  <p className={cn('text-2xl font-black', tone)}>{value}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-md animate-float lg:col-span-5">
            <div className="absolute inset-0 rounded-lg bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.18)_0%,transparent_70%)] blur-xl" />
            <Card className="relative overflow-hidden border-primary/20 bg-card/85 p-0 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#06b6d4,#7c3aed)] text-sm font-black text-white shadow-[0_4px_16px_rgba(6,182,212,0.3)]">
                      AS
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Aarav Sharma</h4>
                      <p className="text-[10px] text-muted-foreground">+91 98765 43210</p>
                    </div>
                  </div>
                  <Badge variant="success">Owes ₹4,500</Badge>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Sunday Dinner', date: '20 May 2026', amount: '+₹1,200', isGave: true },
                    { label: 'Cab Share Airport', date: '18 May 2026', amount: '-₹400', isGave: false },
                    { label: 'Coffee meetup', date: '14 May 2026', amount: '+₹280', isGave: true },
                  ].map((tx) => (
                    <div key={tx.label} className={cn('flex items-center justify-between rounded-md border bg-secondary/70 p-3.5', tx.isGave ? 'border-l-emerald-400' : 'border-l-rose-400', 'border-l-3')}>
                      <div>
                        <p className="text-xs font-semibold text-white">{tx.label}</p>
                        <p className="text-[9px] text-muted-foreground">{tx.date}</p>
                      </div>
                      <span className={cn('text-xs font-black tabular-nums', tx.isGave ? 'text-emerald-300' : 'text-rose-300')}>
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-md border border-primary/25 bg-primary/10 p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-primary/80">Net Balance</p>
                    <p className="gradient-text mt-0.5 text-lg font-black">₹4,500.00</p>
                  </div>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Remind
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-black">
            <span className="gradient-text">Everything you need</span> to manage shared money
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-primary/15 bg-card/70 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-primary/30">
              <CardContent className="p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-primary/15 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-foreground">{title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto w-full max-w-6xl border-t border-border px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 Udharwale by Naeem Navjivan. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="transition-colors hover:text-primary">Privacy Policy</Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-primary">Terms of Service</Link>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
