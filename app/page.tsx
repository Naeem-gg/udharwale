import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { auth } from '@/auth';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AppDoor from '@/app/components/AppDoor';
import BrandMark from '@/app/components/BrandMark';
import CreatorCredit from '@/app/components/CreatorCredit';
import { SITE_CREATOR, SITE_NAME } from '@/lib/seo';

export default async function LandingPage() {
  // JWT only — no MongoDB round-trip, so CTAs render on first paint
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);
  const userName = session?.user?.name?.trim() || '';

  return (
    <AppDoor loggedIn={isLoggedIn}>
      <div className="min-h-dvh bg-[var(--bg-base)] text-foreground">
        <div className="app-shell flex min-h-dvh flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
          <header className="flex items-center justify-between py-3">
            <BrandMark
              size={36}
              withName
              priority
              subtitle={<span className="text-[10px] font-semibold text-primary">by {SITE_CREATOR}</span>}
            />
            {isLoggedIn ? (
              <Link href="/dashboard" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Open
              </Link>
            ) : (
              <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Sign in
              </Link>
            )}
          </header>

          <main className="flex flex-1 flex-col justify-center py-10">
            <CreatorCredit variant="hero" className="mb-4" />
            <h1 className="font-branding text-[2.75rem] leading-[1.05] text-[var(--text-primary)] sm:text-5xl">
              Udharwale
            </h1>
            <p className="mt-3 max-w-[18rem] text-[1.05rem] font-semibold leading-snug text-[var(--text-secondary)]">
              Your personal khata for friends, loans, and shared bills.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Log gave and got, share ledgers, split trip expenses, and settle balances without awkward maths.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-between')}
                >
                  Continue as {userName || 'you'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
                    Create account
                  </Link>
                  <Link
                    href="/login"
                    className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full')}
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
            <Link href="/split" className="mt-4 text-sm font-bold text-primary">
              Split a dinner bill
            </Link>
          </main>

          <footer className="space-y-3 border-t border-[var(--border-soft)] pt-5 text-center text-[11px] text-muted-foreground">
            <CreatorCredit withProduct />
            <div className="flex items-center justify-center gap-4">
              <Link href="/privacy-policy" className="hover:text-primary">
                Privacy
              </Link>
              <Link href="/terms-of-service" className="hover:text-primary">
                Terms
              </Link>
            </div>
            <p>
              © 2026 {SITE_NAME} · {SITE_CREATOR}
            </p>
          </footer>
        </div>
      </div>
    </AppDoor>
  );
}
