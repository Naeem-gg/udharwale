'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Loader2, Lock, Mail, ReceiptText, TriangleAlert } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';
  const [identifier, setIdentifier] = useState('');
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
        identifier,
        email: identifier,
        password,
        redirect: false,
      });

      if (res?.error) throw new Error('Invalid email/phone or password');
      window.location.href = nextPath.startsWith('/') ? nextPath : '/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[var(--bg-base)]">
      <section className="app-shell flex min-h-dvh flex-col justify-center px-5 py-8">
        <div className="mb-8">
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-branding text-xl text-[var(--text-primary)]">Udharwale</span>
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with email or phone</p>
        </div>

        <Card className="border-[var(--border-soft)] bg-[var(--bg-surface)]">
          <CardHeader className="sr-only">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in with email or phone</CardDescription>
          </CardHeader>

          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="font-medium">{error}</p>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="identifier">Email or phone</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10"
                    placeholder="you@example.com or 9876543210"
                    autoComplete="username"
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
                <Link
                  href={nextPath !== '/dashboard' ? `/signup?next=${encodeURIComponent(nextPath)}` : '/signup'}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Create one free
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--bg-base)]" />}>
      <LoginForm />
    </Suspense>
  );
}
