'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { CheckCircle2, HelpCircle, KeyRound, Loader2, Mail, ReceiptText, TriangleAlert } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccess(true);

      const loginRes = await signIn('credentials', {
        email,
        password: newPassword,
        redirect: false,
      });

      setTimeout(() => {
        window.location.href = loginRes?.error ? '/login' : '/dashboard';
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during password reset');
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-base)] p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-blob animate-aurora absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(244,63,94,0.11)_0%,transparent_70%)]" />
        <div className="aurora-blob animate-aurora absolute -right-20 -top-24 h-[440px] w-[440px] bg-[radial-gradient(circle,rgba(124,58,237,0.12)_0%,transparent_70%)] [animation-delay:3s]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.035)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <Card className="relative z-10 w-full max-w-md overflow-hidden border-primary/20 bg-card/85 backdrop-blur-2xl">
        <CardHeader className="items-center border-b border-border text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/25">
            <ReceiptText className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Recover your account securely</CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="font-medium">{error}</p>
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="font-medium">Password reset successfully. Logging you in...</p>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" />
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>How would you like to verify?</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-background/60 p-1">
                {([
                  { value: 'pin' as const, label: '4-Digit PIN', icon: KeyRound },
                  { value: 'question' as const, label: 'Question', icon: HelpCircle },
                ]).map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={recoveryMethod === value ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setRecoveryMethod(value)}
                    className={cn('h-10', recoveryMethod === value && 'text-foreground')}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {recoveryMethod === 'pin' ? (
              <div className="space-y-1.5 animate-fade-slide-down">
                <Label htmlFor="recovery-pin">Your 4-Digit Recovery PIN</Label>
                <Input id="recovery-pin" maxLength={4} required value={recoveryPin} onChange={(e) => setRecoveryPin(e.target.value.replace(/[^0-9]/g, ''))} className="font-mono tracking-widest" placeholder="e.g. 1234" />
              </div>
            ) : (
              <div className="space-y-1.5 animate-fade-slide-down">
                <Label htmlFor="security-answer">What is your childhood nickname?</Label>
                <Input id="security-answer" required value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Security answer" />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" />
              </div>
            </div>

            <Button type="submit" disabled={loading || success} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="font-bold text-primary transition-colors hover:text-primary/80">
                Log In
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
