'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // Check authentication status on mount
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Not logged in');
      })
      .then((data) => {
        setIsLoggedIn(true);
        setUserName(data.user?.name || '');
      })
      .catch(() => {
        setIsLoggedIn(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 overflow-x-hidden relative">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[50%] bg-indigo-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[60%] bg-emerald-900/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-zinc-900/60 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="text-white font-black text-sm">🧮</span>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              UdharWale
              <span className="text-[10px] tracking-wider uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                PRO v1.2
              </span>
            </h1>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          {isLoggedIn === null ? (
            <div className="w-20 h-8 rounded-lg bg-zinc-900 animate-pulse" />
          ) : isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-bold hidden sm:inline">
                Welcome back, {userName}!
              </span>
              <Link
                href="/dashboard"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all duration-200"
              >
                Enter App
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-zinc-400 hover:text-zinc-200 text-xs font-bold py-2 px-3 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold py-2 px-4 rounded-xl transition-all duration-200"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-7xl w-full mx-auto px-6 py-12 md:py-24 z-10 gap-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-900/60 rounded-full px-3.5 py-1.5 text-xs text-indigo-300 font-bold">
              <span>✨</span>
              <span>Free Personal Khata Book</span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.08] tracking-tight">
              Settle debts, track loans, <br />
              <span className="bg-gradient-to-r from-indigo-400 to-indigo-500 bg-clip-text text-transparent">
                maintain trust.
              </span>
            </h2>

            <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              UdharWale is a beautiful, personal ledger tracker designed to take the friction out of shared bills, friends&apos; balances, and loan tracking. No confusing tables—just clean cards, automatic logs, and instant sharing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              {isLoggedIn === null ? (
                <div className="w-36 h-12 rounded-xl bg-zinc-900 animate-pulse" />
              ) : isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 px-8 rounded-xl shadow-xl shadow-indigo-600/10 transition-all duration-200 active:scale-[0.98]"
                >
                  Go to Dashboard <span>➡️</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 px-8 rounded-xl shadow-xl shadow-indigo-600/10 transition-all duration-200 active:scale-[0.98]"
                  >
                    Get Started for Free <span>🚀</span>
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto flex items-center justify-center bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-extrabold py-3.5 px-8 rounded-xl transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-zinc-900/60 max-w-md mx-auto lg:mx-0">
              <div>
                <p className="text-2xl font-black text-white">0%</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Hidden Fees</p>
              </div>
              <div className="border-l border-zinc-900/60 pl-6">
                <p className="text-2xl font-black text-emerald-400">1-Click</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">WhatsApp Reminders</p>
              </div>
              <div className="border-l border-zinc-900/60 pl-6">
                <p className="text-2xl font-black text-indigo-400">100%</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Private & Safe</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 relative w-full max-w-md mx-auto">
            <div className="absolute inset-0 bg-indigo-600/10 blur-[60px] rounded-full pointer-events-none" />
            
            {/* Visual Glassmorphic Card */}
            <div className="relative p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 shadow-2xl backdrop-blur-xl space-y-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
                    AS
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Aarav Sharma</h4>
                    <p className="text-[10px] text-zinc-500">+91 98765 43210</p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                  Owes you ₹4,500
                </span>
              </div>

              {/* Transactions Timeline demonstration */}
              <div className="space-y-3.5">
                <div className="flex items-start justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-850 border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🍔</span>
                    <div>
                      <p className="text-xs font-extrabold text-zinc-200">Shared Sunday Dinner</p>
                      <p className="text-[9px] text-zinc-500 font-semibold">20 May 2026</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-400">+₹1,200</span>
                </div>

                <div className="flex items-start justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-850 border-l-4 border-l-rose-500 opacity-80">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🚗</span>
                    <div>
                      <p className="text-xs font-extrabold text-zinc-350">Cab Share Airport</p>
                      <p className="text-[9px] text-zinc-500 font-semibold">18 May 2026</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-rose-400">-₹400</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-500/5 to-indigo-600/10 border border-indigo-500/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Active Position</p>
                  <p className="text-lg font-black text-white mt-0.5">₹4,500.00 Net</p>
                </div>
                <button className="text-xs bg-indigo-600 text-white font-bold py-1.5 px-3 rounded-lg hover:bg-indigo-500 transition-colors">
                  Send Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-zinc-900/60 mt-12 flex flex-col sm:flex-row items-center justify-between text-zinc-650 text-xs gap-4 z-10">
        <p>© 2026 UdharWale Inc. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-zinc-450 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-zinc-450 transition-colors">Terms of Service</a>
          <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Your data is safe</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
