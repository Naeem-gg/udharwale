'use client';

import { useEffect, useState, type ReactNode } from 'react';
import BrandMark from '@/app/components/BrandMark';
import { isStandaloneDisplay } from '@/lib/pwa';

type Props = {
  loggedIn: boolean;
  children: ReactNode;
};

/**
 * Dual-door entry:
 * - Browser tab → marketing / auth landing (children)
 * - Installed PWA → jump straight to dashboard (or login)
 */
export default function AppDoor({ loggedIn, children }: Props) {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (!isStandaloneDisplay()) return;
    setStandalone(true);
    const target = loggedIn ? '/dashboard' : '/login?next=/dashboard';
    // replace so Back doesn't return to the marketing shell inside the app
    window.location.replace(target);
  }, [loggedIn]);

  return (
    <>
      {/* CSS media query hides this in browser; shows instantly in standalone before JS */}
      <div className="app-door-splash" aria-live="polite">
        <BrandMark size={64} priority />
        <p className="app-door-splash-title">Udharwale</p>
        <p className="app-door-splash-sub">Opening your khata…</p>
      </div>

      <div className={standalone ? 'app-door-web app-door-web--hidden' : 'app-door-web'}>
        {children}
      </div>
    </>
  );
}
