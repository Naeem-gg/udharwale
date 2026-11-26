'use client';

import { Check, Copy, Link2, Share2, X } from 'lucide-react';
import { useState } from 'react';
import PersonAvatar from '@/app/components/PersonAvatar';

export type ChatShareOption = 'all' | 'gave' | 'got';

type Props = {
  open: boolean;
  contactName: string;
  onClose: () => void;
  onCopyLink: () => Promise<void> | void;
  onShareLedger: (option: ChatShareOption, action: 'copy' | 'share') => Promise<void> | void;
};

const LEDGER_OPTIONS: {
  opt: ChatShareOption;
  label: string;
  desc: string;
  accent: string;
  soft: string;
}[] = [
  {
    opt: 'all',
    label: 'Full khata',
    desc: 'Every entry, balance left, and chat link',
    accent: 'var(--primary)',
    soft: 'rgba(15,118,110,0.1)',
  },
  {
    opt: 'gave',
    label: 'What I paid',
    desc: 'Only money you gave them + chat link',
    accent: 'var(--emerald)',
    soft: 'rgba(4,120,87,0.1)',
  },
  {
    opt: 'got',
    label: 'What they paid',
    desc: 'Only money they gave you + chat link',
    accent: 'var(--rose)',
    soft: 'rgba(194,59,74,0.1)',
  },
];

export default function ChatShareSheet({
  open,
  contactName,
  onClose,
  onCopyLink,
  onShareLedger,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!open) return null;

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,16,14,0.48)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md overflow-hidden flex flex-col animate-slide-up"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '92vh',
          boxShadow: '0 -12px 40px rgba(20,32,28,0.12)',
        }}
      >
        {/* Accent header */}
        <div
          className="relative px-5 pt-5 pb-4 shrink-0"
          style={{
            background:
              'linear-gradient(165deg, rgba(15,118,110,0.14) 0%, rgba(15,118,110,0.04) 48%, transparent 100%)',
          }}
        >
          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full sm:hidden"
            style={{ background: 'var(--border-soft)' }}
          />
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <PersonAvatar name={contactName} seed={contactName} size="lg" />
              <div className="min-w-0">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--primary)' }}
                >
                  Share chat
                </p>
                <h3
                  className="text-lg font-extrabold leading-tight truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {contactName}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Send the live khata link or a summary
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Primary: chat link */}
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              run('link', async () => {
                await onCopyLink();
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              })
            }
            className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.99] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
              color: '#fff',
              boxShadow: '0 10px 24px rgba(15,118,110,0.28)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-xl inline-flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                {copiedLink ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{copiedLink ? 'Link copied' : 'Copy chat link'}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  Opens the live shared chat — best for a quick send
                </p>
              </div>
            </div>
          </button>

          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2.5 px-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Or share a summary
            </p>
            <div className="space-y-2.5">
              {LEDGER_OPTIONS.map(({ opt, label, desc, accent, soft }) => (
                <div
                  key={opt}
                  className="rounded-2xl p-3.5"
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="h-9 w-9 rounded-xl shrink-0"
                      style={{ background: soft, boxShadow: `inset 0 0 0 1px ${accent}33` }}
                    >
                      <div
                        className="h-full w-full rounded-xl flex items-center justify-center text-xs font-extrabold"
                        style={{ color: accent }}
                      >
                        {opt === 'all' ? 'Σ' : opt === 'gave' ? '↑' : '↓'}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {label}
                      </p>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                        {desc}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => run(`${opt}-copy`, () => onShareLedger(opt, 'copy'))}
                      className="h-10 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                      style={{
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-soft)',
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => run(`${opt}-share`, () => onShareLedger(opt, 'share'))}
                      className="h-10 rounded-xl text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                      style={{ background: accent }}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="shrink-0 px-5 pt-1"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        />
      </div>
    </div>
  );
}
