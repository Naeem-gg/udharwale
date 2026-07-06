'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign in');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}>

      {/* ── Aurora Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 600, height: 600, top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 500, height: 500, bottom: '-10%', right: '-8%', animationDelay: '5s', animationDirection: 'reverse', background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)' }} />
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 350, height: 350, top: '50%', right: '15%', animationDelay: '3s', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)' }} />
        {/* Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="w-full max-w-[400px] animate-fade-slide-up relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', boxShadow: '0 8px 32px rgba(124,58,237,0.45)' }}>
              🧾
            </div>
            {/* Pulsing ring */}
            <div className="absolute -inset-1 rounded-2xl animate-ping opacity-15"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }} />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black tracking-tight text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Udharwale</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1"
              style={{ color: 'var(--violet-bright)' }}>By Naeem Navjivan</span>
          </div>
          <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            Your smart debt ledger
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(8,12,24,0.85)',
            border: '1px solid rgba(124,58,237,0.2)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 1px 0 rgba(168,85,247,0.12) inset',
          }}>

          {/* Inner top glow */}
          <div className="absolute left-10 right-10 h-px top-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.35), transparent)' }} />

          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b" style={{ borderColor: 'rgba(124,58,237,0.12)' }}>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Welcome back
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl animate-fade-slide-down"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <span className="shrink-0 mt-0.5">⚠️</span>
                <p className="text-sm font-medium" style={{ color: '#fda4af' }}>{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <Link href="/forgot-password"
                  className="text-xs font-semibold transition-colors"
                  style={{ color: 'var(--violet-bright)' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-1.581c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-5.858-.908a3 3 0 00-4.243-4.243M9.878 9.878l-3.29-3.29" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full" style={{ marginTop: '8px', borderRadius: 12 }}>
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Authenticating…
                </>
              ) : 'Sign In →'}
            </button>

            <p className="text-center text-sm pt-1" style={{ color: 'var(--text-secondary)' }}>
              No account?{' '}
              <Link href="/signup" className="font-semibold transition-colors" style={{ color: 'var(--violet-bright)' }}>
                Create one free
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-faint)' }}>
          Crafted with precision · Secure · Private
        </p>
      </div>
    </div>
  );
}
