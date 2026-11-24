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

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops -= 1;
      return;
    }
    const top = layers.pop();
    if (top) top.onDismiss();
    // If no overlay layer, leave the event alone — URL-based screens sync via their own popstate handlers.
  });
}

/**
 * Push a browser-history entry for a modal/sheet overlay.
 * Hardware back dismisses the top overlay; URL screens use dashboard-nav instead.
 */
export function pushHistoryLayer(onDismiss: () => void): () => void {
  ensureListener();
  const id = `uw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  layers.push({ id, onDismiss });
  window.history.pushState({ __uwOverlay: id }, '');

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

export function getHistoryLayerCount() {
  return layers.length;
}
