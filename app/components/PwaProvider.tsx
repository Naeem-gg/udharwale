'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { isStandaloneDisplay } from '@/lib/pwa';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'udharwale-pwa-install-dismissed';

export default function PwaProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {
          // Registration can fail on insecure origins other than localhost.
        });
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
      if (!dismissedAt) setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setVisible(false);
      setDeferredPrompt(null);
      window.localStorage.removeItem(DISMISS_KEY);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  if (isStandalone || !visible || !deferredPrompt) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setVisible(false);
  };

  const install = async () => {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    if (choice.outcome === 'dismissed') {
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    }
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[60] md:left-auto md:right-4 md:bottom-4 md:w-[360px]">
      <div
        className="rounded-2xl p-3.5 shadow-lg flex items-start gap-3"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)', color: 'var(--primary)' }}
        >
          <Download className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Install Udharwale
          </p>
          <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
            By Naeem Navjivan — add to your home screen for faster access and an offline app shell.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={install}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-primary-foreground"
              style={{ background: 'var(--primary)' }}
            >
              Install app
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
              style={{ color: 'var(--text-muted)' }}
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded-lg shrink-0"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
