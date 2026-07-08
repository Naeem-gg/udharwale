'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen text-white flex flex-col overflow-x-hidden relative"
      style={{ background: 'var(--bg-base)', fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* ── Aurora Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 700, height: 700, top: '-15%', left: '-10%', background: 'radial-gradient(circle at center, rgba(124,58,237,0.14) 0%, transparent 70%)' }} />
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 600, height: 600, bottom: '0%', right: '-8%', animationDelay: '4s', animationDirection: 'reverse', background: 'radial-gradient(circle at center, rgba(6,182,212,0.10) 0%, transparent 70%)' }} />
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 400, height: 400, top: '40%', left: '45%', animationDelay: '7s', background: 'radial-gradient(circle at center, rgba(168,85,247,0.08) 0%, transparent 70%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
        {/* Top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), rgba(6,182,212,0.3), transparent)' }} />
      </div>

      {/* ── Header / Navbar ── */}
      <header className="relative z-10 w-full">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                🧾
              </div>
              <div className="absolute inset-0 rounded-2xl animate-glow-pulse"
                style={{ background: 'transparent', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-violet-400 to-cyan-400 font-branding">Udharwale</span>
              <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5"
                style={{ color: 'var(--violet-bright)' }}>By Naeem Navjivan</span>
            </div>
            <span className="hidden sm:block text-[9px] tracking-wider uppercase font-extrabold px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--violet-bright)', border: '1px solid rgba(124,58,237,0.25)' }}>
              PRO v1.2
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-3">
            {isLoggedIn === null ? (
              <div className="w-24 h-8 rounded-xl animate-glow-pulse" style={{ background: 'var(--bg-raised)' }} />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Hey, {userName} 👋
                </span>
                <Link href="/dashboard"
                  className="btn-primary text-xs px-4 py-2" style={{ borderRadius: 10 }}>
                  Dashboard →
                </Link>
              </div>
            ) : (
              <>
                <Link href="/login"
                  className="text-xs font-semibold px-3 py-2 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}>
                  Sign In
                </Link>
                <Link href="/signup"
                  className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}>
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto px-6 py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">

          {/* Left: Hero Text */}
          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold animate-fade-slide-up"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: 'var(--violet-bright)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cyan)' }} />
              <span>✨ Free Personal Khata Book · No Hidden Fees</span>
            </div>

            {/* Headline */}
            <div className="space-y-2 animate-fade-slide-up" style={{ animationDelay: '0.08s' }}>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight"
                style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                Settle debts,<br />
                track loans,{' '}
                <span className="gradient-text">
                  maintain trust.
                </span>
              </h1>
            </div>

            {/* Subtext */}
            <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 animate-fade-slide-up"
              style={{ color: 'var(--text-secondary)', animationDelay: '0.16s' }}>
              Udharwale is a beautiful, personal ledger tracker designed to remove friction from shared bills, friend balances, and loan tracking — clean cards, auto logs, and instant WhatsApp reminders.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2 animate-fade-slide-up"
              style={{ animationDelay: '0.24s' }}>
              {isLoggedIn === null ? (
                <div className="w-40 h-12 rounded-xl shimmer-bg" />
              ) : isLoggedIn ? (
                <Link href="/dashboard"
                  className="btn-primary w-full sm:w-auto px-8 py-3.5 text-sm" style={{ borderRadius: 14 }}>
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link href="/signup"
                    className="btn-primary w-full sm:w-auto px-8 py-3.5 text-sm" style={{ borderRadius: 14 }}>
                    Get Started Free 🚀
                  </Link>
                  <Link href="/login"
                    className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 rounded-2xl text-sm font-bold transition-all"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Metrics */}
            <div className="flex items-center justify-center lg:justify-start gap-8 pt-6 border-t animate-fade-slide-up"
              style={{ borderColor: 'var(--border-soft)', animationDelay: '0.32s' }}>
              {[
                { value: '0%', label: 'Hidden Fees', color: 'var(--text-primary)' },
                { value: '1-Click', label: 'WhatsApp Share', color: 'var(--cyan-light)' },
                { value: '100%', label: 'Private & Safe', color: 'var(--violet-bright)' },
              ].map(({ value, label, color }) => (
                <div key={label}>
                  <p className="text-2xl font-black" style={{ color, fontFamily: "'Syne', sans-serif" }}>{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Mockup Card */}
          <div className="lg:col-span-5 relative w-full max-w-md mx-auto animate-float">
            {/* Glow behind card */}
            <div className="absolute inset-0 rounded-3xl animate-glow-pulse"
              style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(20px)' }} />

            {/* Main card */}
            <div className="relative rounded-3xl p-6 space-y-5 overflow-hidden"
              style={{
                background: 'rgba(8,12,24,0.80)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(124,58,237,0.2)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 1px 0 rgba(168,85,247,0.15) inset',
              }}>

              {/* Inner top glow line */}
              <div className="absolute top-0 left-10 right-10 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.4), transparent)' }} />

              {/* Contact header */}
              <div className="flex items-center justify-between pb-4"
                style={{ borderBottom: '1px solid rgba(124,58,237,0.12)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}>
                    AS
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Aarav Sharma</h4>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+91 98765 43210</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                  Owes ₹4,500
                </span>
              </div>

              {/* Transactions */}
              <div className="space-y-3">
                {[
                  { emoji: '🍔', label: 'Sunday Dinner', date: '20 May 2026', amount: '+₹1,200', isGave: true },
                  { emoji: '🚗', label: 'Cab Share Airport', date: '18 May 2026', amount: '-₹400', isGave: false },
                  { emoji: '☕', label: 'Coffee meetup', date: '14 May 2026', amount: '+₹280', isGave: true },
                ].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl"
                    style={{
                      background: 'rgba(14,20,38,0.7)',
                      borderLeft: `3px solid ${tx.isGave ? 'var(--emerald)' : 'var(--rose)'}`,
                      border: '1px solid rgba(124,58,237,0.08)',
                      borderLeftWidth: 3,
                      borderLeftColor: tx.isGave ? 'var(--emerald)' : 'var(--rose)',
                    }}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{tx.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold text-white">{tx.label}</p>
                        <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{tx.date}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black tabular-nums"
                      style={{ color: tx.isGave ? 'var(--emerald-light)' : 'var(--rose-light)' }}>
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-4 rounded-2xl"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)' }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--violet-bright)', opacity: 0.7 }}>Net Balance</p>
                  <p className="text-lg font-black mt-0.5 gradient-text" style={{ fontFamily: "'Syne', sans-serif" }}>₹4,500.00</p>
                </div>
                <button className="text-xs font-bold px-3 py-1.5 rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 12px rgba(16,185,129,0.3)' }}>
                  💬 Remind
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Features ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
            <span className="gradient-text">Everything you need</span> to manage shared money
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '📖', title: 'Smart Ledger', desc: 'Track who owes what, when, and how — with full transaction history.' },
            { icon: '💬', title: 'WhatsApp Reminders', desc: 'Send one-tap payment reminders directly via WhatsApp.' },
            { icon: '🔒', title: '100% Private', desc: 'Your data stays secure. No ads, no data selling, no nonsense.' },
            { icon: '⚡', title: 'Instant Settle', desc: 'Mark full or custom balance settlements with one tap.' },
            { icon: '📱', title: 'Contact Import', desc: 'Import contacts from your phone on Android Chrome instantly.' },
            { icon: '📊', title: 'Insights & Flow', desc: 'See your net position, credit, and debit at a glance.' },
          ].map(({ icon, title, desc }, i) => (
            <div key={i} className="p-5 rounded-2xl transition-all hover:-translate-y-1 hover:border-violet-500/30"
              style={{
                background: 'rgba(8,12,24,0.7)',
                border: '1px solid var(--border-soft)',
                backdropFilter: 'blur(12px)',
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}>
                {icon}
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 py-8 w-full border-t"
        style={{ borderColor: 'var(--border-soft)' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ color: 'var(--text-muted)' }}>
          <p>© 2026 Udharwale by Naeem Navjivan. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-violet-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-violet-400 transition-colors">Terms of Service</a>
            <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--emerald)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--emerald)' }} />
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
