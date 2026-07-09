'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Loader2, Lock, Mail, ReceiptText, TriangleAlert } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) throw new Error('Invalid email or password');
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-base)] p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-blob animate-aurora absolute -left-24 -top-32 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(124,58,237,0.15)_0%,transparent_70%)]" />
        <div className="aurora-blob animate-aurora absolute -bottom-24 -right-24 h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(6,182,212,0.10)_0%,transparent_70%)] [animation-delay:5s] [animation-direction:reverse]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <section className="relative z-10 w-full max-w-[400px] animate-fade-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-white shadow-[0_8px_32px_rgba(124,58,237,0.45)]">
              <ReceiptText className="h-8 w-8" aria-hidden="true" />
            </div>
            <div className="absolute -inset-1 animate-ping rounded-lg bg-primary opacity-15" />
          </div>
          <span className="font-branding text-3xl text-white">Udharwale</span>
          <span className="mt-1 text-[10px] font-bold uppercase text-primary">By Naeem Navjivan</span>
          <p className="mt-2 text-sm font-medium text-muted-foreground">Your smart debt ledger</p>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-card/85 backdrop-blur-2xl">
          <CardHeader className="border-b border-border">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-fade-slide-down">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="font-medium">{error}</p>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-primary transition-colors hover:text-primary/80">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-11"
                    placeholder="Password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                No account?{' '}
                <Link href="/signup" className="font-semibold text-primary transition-colors hover:text-primary/80">
                  Create one free
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
