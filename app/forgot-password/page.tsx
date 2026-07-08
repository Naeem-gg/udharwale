'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [recoveryMethod, setRecoveryMethod] = useState<'pin' | 'question'>('pin');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (recoveryMethod === 'pin' && !recoveryPin) {
      setError('Please enter your 4-digit Recovery PIN');
      return;
    }

    if (recoveryMethod === 'question' && !securityAnswer) {
      setError('Please answer the security question');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          recoveryPin: recoveryMethod === 'pin' ? recoveryPin : undefined,
          securityAnswer: recoveryMethod === 'question' ? securityAnswer : undefined,
          newPassword 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      
      // Auto login user on reset success
      const loginRes = await signIn('credentials', {
        email,
        password: newPassword,
        redirect: false
      });
      
      if (!loginRes?.error) {
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during password reset');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 selection:bg-indigo-500/30 relative">
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl relative">
        {/* Logo/Branding Header */}
        <div className="p-6 border-b border-zinc-800/80 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-rose-600/20 mb-3">
            <span className="text-white font-black text-sm">🧮</span>
          </div>
          <h2 className="font-extrabold text-lg text-white">Reset Password</h2>
          <p className="text-xs text-zinc-500 mt-1">Recover your account securely</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
              <span>🚀</span>
              <span>Password reset successfully! Logging you in...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="pt-2 pb-1 border-t border-zinc-800/80">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">How would you like to verify?</label>
            <div className="flex bg-zinc-950 rounded-xl border border-zinc-800 p-1 mt-1.5">
              <button
                type="button"
                onClick={() => setRecoveryMethod('pin')}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${
                  recoveryMethod === 'pin' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                4-Digit PIN
              </button>
              <button
                type="button"
                onClick={() => setRecoveryMethod('question')}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${
                  recoveryMethod === 'question' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Security Question
              </button>
            </div>
          </div>

          {recoveryMethod === 'pin' ? (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Your 4-Digit Recovery PIN</label>
              <input
                type="text"
                maxLength={4}
                required={recoveryMethod === 'pin'}
                value={recoveryPin}
                onChange={(e) => setRecoveryPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors tracking-widest font-mono"
                placeholder="e.g. 1234"
              />
            </div>
          ) : (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">What is your childhood nickname?</label>
              <input
                type="text"
                required={recoveryMethod === 'question'}
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Security Answer"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-extrabold py-3 rounded-xl text-sm transition-all duration-155 active:scale-[0.98] shadow-lg shadow-rose-600/10 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Resetting...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>

          <p className="text-center text-xs text-zinc-500 pt-2">
            Remember your password?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
