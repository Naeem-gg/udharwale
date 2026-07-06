'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, recoveryPin, securityAnswer })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register account');

      setSuccess(true);

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (loginRes.ok) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
      setLoading(false);
    }
  };

  const EyeButton = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
      style={{ color: 'var(--text-muted)' }}>
      {show ? (
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
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}>

      {/* ── Aurora Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 600, height: 600, top: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(124,58,237,0.13) 0%, transparent 70%)' }} />
        <div className="animate-aurora absolute rounded-full aurora-blob"
          style={{ width: 500, height: 500, bottom: '-5%', left: '-10%', animationDelay: '4s', animationDirection: 'reverse', background: 'radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="w-full max-w-[440px] animate-fade-slide-up relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', boxShadow: '0 8px 32px rgba(124,58,237,0.45)' }}>
              🧾
            </div>
            <div className="absolute -inset-1 rounded-2xl animate-ping opacity-15"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }} />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black tracking-tight text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}>Udharwale</span>
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

          <div className="px-6 pt-6 pb-5 border-b" style={{ borderColor: 'rgba(124,58,237,0.12)' }}>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              Create your account
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Start tracking balances in seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl animate-fade-slide-down"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <span className="shrink-0">⚠️</span>
                <p className="text-sm font-medium" style={{ color: '#fda4af' }}>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl animate-fade-slide-down"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span>🚀</span>
                <p className="text-sm font-medium" style={{ color: '#6ee7b7' }}>Account created! Logging you in…</p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Your Name</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="input-field pl-10" placeholder="e.g. Aarav Sharma" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10" placeholder="you@example.com" />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10" placeholder="••••••••" />
                  <EyeButton show={showPassword} toggle={() => setShowPassword(!showPassword)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Confirm</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pr-10" placeholder="••••••••" />
                  <EyeButton show={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                </div>
              </div>
            </div>

            {/* Recovery section */}
            <div className="pt-3 mt-1 space-y-3 rounded-xl p-4"
              style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--violet-bright)' }}>Account Recovery</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Set these up to recover your account if you forget your password.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>4-Digit PIN</label>
                  <input type="text" maxLength={4} required value={recoveryPin}
                    onChange={(e) => setRecoveryPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field" placeholder="e.g. 1234" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Childhood Nickname</label>
                  <input type="text" required value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="input-field" placeholder="Security answer" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading || success} className="btn-primary w-full" style={{ marginTop: '4px', borderRadius: 12 }}>
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account…
                </>
              ) : 'Create Account →'}
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold" style={{ color: 'var(--violet-bright)' }}>Sign in</Link>
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
