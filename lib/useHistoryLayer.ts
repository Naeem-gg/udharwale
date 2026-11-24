'use client';

import { useEffect, useRef } from 'react';

type Layer = {
  id: string;
  onDismiss: () => void;
};

const layers: Layer[] = [];
let listening = false;
/** Skips the next N popstate events (used when UI close syncs history via history.back()). */
let ignorePops = 0;

type ExitGuard = {
  /** Return true if the back press was consumed (stay in app). */
  onBack: () => boolean;
};

let exitGuard: ExitGuard | null = null;

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops -= 1;
      return;
    }
    const top = layers.pop();
    if (top) {
      top.onDismiss();
      return;
    }
    // No nested screens — optional double-back exit trap
    if (exitGuard?.onBack()) {
      window.history.pushState({ __uwRoot: true }, '');
    }
  });
}

/**
 * Push a browser-history entry for an in-app screen/sheet.
 * Hardware/gesture back dismisses the top layer; UI close should let the
 * hook cleanup call history.back() so the stack stays in sync.
 */
export function pushHistoryLayer(onDismiss: () => void): () => void {
  ensureListener();
  const id = `uw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  layers.push({ id, onDismiss });
  window.history.pushState({ __uw: id }, '');

  return () => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1) return; // already removed by hardware back
    layers.splice(idx, 1);
    ignorePops += 1;
    window.history.back();
  };
}

/** While `active`, Android/PWA back runs `onDismiss` instead of leaving the page. */
export function useHistoryLayer(active: boolean, onDismiss: () => void) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) return;
    return pushHistoryLayer(() => onDismissRef.current());
  }, [active]);
}

/**
 * At the app root (no nested screens), first back shows a prompt and stays;
 * second back within `windowMs` leaves the page/PWA.
 */
export function useDoubleBackExit(
  enabled: boolean,
  onPrompt: () => void,
  windowMs = 2000
) {
  const lastPromptAt = useRef(0);
  const onPromptRef = useRef(onPrompt);
  onPromptRef.current = onPrompt;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      exitGuard = null;
      return;
    }

    ensureListener();
    window.history.pushState({ __uwRoot: true }, '');

    exitGuard = {
      onBack: () => {
        const now = Date.now();
        if (now - lastPromptAt.current < windowMs) {
          // Second back — allow leaving (do not re-push)
          return false;
        }
        lastPromptAt.current = now;
        onPromptRef.current();
        return true;
      },
    };

    return () => {
      exitGuard = null;
      ignorePops += 1;
      window.history.back();
    };
  }, [enabled, windowMs]);
}

/** How many in-app layers are currently trapping back. */
export function getHistoryLayerCount() {
  return layers.length;
}
