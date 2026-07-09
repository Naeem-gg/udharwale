'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, ReceiptText, ShieldCheck, TriangleAlert, User } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function PasswordToggle({
  show,
  onClick,
  label,
}: {
  show: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      aria-label={label}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
}

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
        body: JSON.stringify({ name, email, password, recoveryPin, securityAnswer }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register account');

      setSuccess(true);

      const loginRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      window.location.href = loginRes?.error ? '/login' : '/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-base)] p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-blob animate-aurora absolute -right-24 -top-24 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(124,58,237,0.13)_0%,transparent_70%)]" />
        <div className="aurora-blob animate-aurora absolute -bottom-20 -left-24 h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(6,182,212,0.09)_0%,transparent_70%)] [animation-delay:4s] [animation-direction:reverse]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <section className="relative z-10 w-full max-w-[440px] animate-fade-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-white shadow-[0_8px_32px_rgba(124,58,237,0.45)]">
              <ReceiptText className="h-8 w-8" aria-hidden="true" />
            </div>
            <div className="absolute -inset-1 animate-ping rounded-lg bg-primary opacity-15" />
          </div>
          <h1 className="text-2xl font-bold">
            Join <span className="font-branding text-primary">Udharwale</span>
          </h1>
          <span className="mt-1 text-[10px] font-bold uppercase text-primary">By Naeem Navjivan</span>
          <p className="mt-2 text-sm font-medium text-muted-foreground">Your smart debt ledger</p>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-card/85 backdrop-blur-2xl">
          <CardHeader className="border-b border-border">
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Start tracking balances in seconds</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-fade-slide-down">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="font-medium">{error}</p>
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="animate-fade-slide-down">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="font-medium">Account created. Logging you in...</p>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Your Name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="pl-10" placeholder="e.g. Aarav Sharma" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" placeholder="Password" />
                    <PasswordToggle show={showPassword} onClick={() => setShowPassword(!showPassword)} label={showPassword ? 'Hide password' : 'Show password'} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm</Label>
                  <div className="relative">
                    <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-11" placeholder="Confirm password" />
                    <PasswordToggle show={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-primary/20 bg-primary/8 p-4">
                <div className="flex gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase text-primary">Account Recovery</p>
                    <p className="mt-1 text-xs text-muted-foreground">Set these up to recover your account if you forget your password.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="recovery-pin">4-Digit PIN</Label>
                    <Input id="recovery-pin" maxLength={4} required value={recoveryPin} onChange={(e) => setRecoveryPin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g. 1234" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="security-answer">Childhood Nickname</Label>
                    <Input id="security-answer" required value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Security answer" />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading || success} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-primary transition-colors hover:text-primary/80">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-[var(--text-faint)]">
          Crafted with precision · Secure · Private
        </p>
      </section>
    </main>
  );
}
