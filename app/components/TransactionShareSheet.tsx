'use client';

import React, { useRef, useState } from 'react';
import { Check, Copy, Download, Loader2, Share2, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { SITE_CREATOR, SITE_ICON, SITE_NAME } from '@/lib/seo';
import {
  LEDGER_CATEGORIES,
  LEDGER_CATEGORY_CONFIG,
  Transaction,
} from './types';

export type TransactionSharePayload = {
  transaction: Transaction;
  contactName: string;
  userName: string;
  chatLink?: string | null;
  contactPhone?: string | null;
};

type Props = {
  open: boolean;
  data: TransactionSharePayload | null;
  onClose: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
};

function formatLongDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function shortRef(id: string) {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `UW${clean.slice(-8) || Date.now().toString(36).toUpperCase()}`;
}

function modeLabel(mode: string) {
  return mode === 'Online Transfer' ? 'Online / UPI' : 'Cash';
}

function modePhrase(mode: string) {
  return mode === 'Online Transfer' ? 'on UPI' : 'in cash';
}

/** Informal WhatsApp caption — pronouns only, always includes chat link when present. */
export function buildTransactionShareMessage({
  transaction,
  chatLink,
}: TransactionSharePayload) {
  const amount = `₹${transaction.amount.toLocaleString('en-IN')}`;
  const via = modePhrase(transaction.mode);
  const remarks = transaction.remark?.trim();
  const isGave = transaction.type === 'gave';

  let text = isGave
    ? `Hey! I paid you ${amount} ${via} and logged it in Udharwale`
    : `Hey! I got ${amount} from you ${via} and logged it in Udharwale`;

  if (remarks) text += ` for ${remarks}`;
  text += '.';

  if (chatLink) {
    text += `\n\nClick the link to see our chat:\n${chatLink}`;
  }

  return text;
}

export default function TransactionShareSheet({
  open,
  data,
  onClose,
  showToast = () => {},
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'share' | 'download' | 'copy' | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open || !data) return null;

  const { transaction, contactName, userName } = data;
  const isGave = transaction.type === 'gave';
  const amountLabel = `₹${transaction.amount.toLocaleString('en-IN')}`;
  const mode = modeLabel(transaction.mode);
  const category =
    LEDGER_CATEGORY_CONFIG[
      transaction.category && LEDGER_CATEGORIES.includes(transaction.category)
        ? transaction.category
        : 'other'
    ].label;
  const ref = shortRef(transaction.id);
  const caption = buildTransactionShareMessage(data);
  const ink = '#14201c';
  const muted = '#5f6f68';
  const paper = '#fffcf7';
  const line = 'rgba(20,32,28,0.1)';
  const accent = isGave ? '#0f766e' : '#9f1239';
  const accentSoft = isGave ? 'rgba(15,118,110,0.12)' : 'rgba(159,18,57,0.1)';
  const fromName = isGave ? userName || 'You' : contactName;
  const toName = isGave ? contactName : userName || 'You';
  const statusLabel = isGave ? 'You gave' : 'You got';

  const ensureLogoLoaded = () =>
    new Promise<void>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = SITE_ICON;
    });

  const capturePng = async () => {
    if (!cardRef.current) throw new Error('Card not ready');
    await ensureLogoLoaded();
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: paper,
    });
  };

  const dataUrlToFile = async (dataUrl: string, filename: string) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
  };

  const handleCopyMessage = async () => {
    setBusy('copy');
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      showToast('Caption copied', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Could not copy', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy('download');
    try {
      const dataUrl = await capturePng();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `udharwale-${ref.toLowerCase()}.png`;
      a.click();
      showToast('Receipt saved', 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not create image', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const dataUrl = await capturePng();
      const file = await dataUrlToFile(dataUrl, `udharwale-${ref.toLowerCase()}.png`);

      if (typeof navigator.share === 'function') {
        const withImageAndCaption = { files: [file], text: caption };
        if (navigator.canShare?.(withImageAndCaption) || navigator.canShare?.({ files: [file] })) {
          await navigator.share(withImageAndCaption);
          showToast('Shared', 'success');
          return;
        }
        await navigator.share({ text: caption });
        showToast('Shared', 'success');
        return;
      }

      await navigator.clipboard.writeText(caption);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `udharwale-${ref.toLowerCase()}.png`;
      a.click();
      showToast('Caption copied · image downloaded', 'success');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error(err);
      showToast('Could not share', 'error');
    } finally {
      setBusy(null);
    }
  };

  const metaBits = [
    { label: 'Date', value: formatLongDate(transaction.date) },
    { label: 'Mode', value: mode },
    { label: 'Category', value: category },
    { label: 'Ref', value: ref },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,16,14,0.5)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '94vh',
          boxShadow: '0 -16px 48px rgba(20,32,28,0.14)',
        }}
      >
        <div
          className="shrink-0 px-5 pt-4 pb-3"
          style={{
            background:
              'linear-gradient(165deg, rgba(15,118,110,0.12) 0%, rgba(15,118,110,0.03) 55%, transparent 100%)',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full sm:hidden"
            style={{ background: 'var(--border-soft)' }}
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--primary)' }}
              >
                Payment receipt
              </p>
              <h3 className="text-lg font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
                Share this entry
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Image + note + chat link — pick who gets it
              </p>
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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="flex justify-center">
            <div
              ref={cardRef}
              style={{
                width: 340,
                background: paper,
                borderRadius: 22,
                overflow: 'hidden',
                fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
                color: ink,
                border: `1px solid ${line}`,
                boxShadow: '0 18px 40px rgba(20,32,28,0.12)',
              }}
            >
              {/* Brand band */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${accent} 0%, ${isGave ? '#0d9488' : '#be123c'} 100%)`,
                  padding: '18px 20px 16px',
                  color: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={SITE_ICON}
                      alt=""
                      width={36}
                      height={36}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: 'block',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {SITE_NAME}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, opacity: 0.85 }}>
                        by {SITE_CREATOR}
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* Amount hero */}
              <div style={{ padding: '22px 22px 8px', textAlign: 'center' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: muted,
                  }}
                >
                  Amount
                </p>
                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: accent,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {amountLabel}
                </p>
                {transaction.remark?.trim() ? (
                  <p
                    style={{
                      margin: '12px auto 0',
                      maxWidth: 280,
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: ink,
                      wordBreak: 'break-word',
                    }}
                  >
                    {transaction.remark.trim()}
                  </p>
                ) : null}
              </div>

              {/* From → To */}
              <div style={{ padding: '16px 22px 6px' }}>
                <div
                  style={{
                    borderRadius: 16,
                    background: accentSoft,
                    padding: '14px 16px',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: muted,
                      }}
                    >
                      From
                    </p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 15,
                        fontWeight: 800,
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                      }}
                    >
                      {fromName}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: accent,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      ↓
                    </div>
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: muted,
                      }}
                    >
                      To
                    </p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 15,
                        fontWeight: 800,
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                      }}
                    >
                      {toName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Meta grid */}
              <div style={{ padding: '14px 22px 20px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                  }}
                >
                  {metaBits.map((row) => (
                    <div
                      key={row.label}
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${line}`,
                        padding: '10px 12px',
                        background: 'rgba(20,32,28,0.02)',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: muted,
                        }}
                      >
                        {row.label}
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.35,
                          wordBreak: 'break-word',
                        }}
                      >
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl px-3.5 py-3"
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Message caption
            </p>
            <p
              className="text-xs leading-relaxed m-0 whitespace-pre-wrap"
              style={{ color: 'var(--text-secondary)' }}
            >
              {caption}
            </p>
          </div>
        </div>

        <div
          className="shrink-0 px-4 pt-3 space-y-2"
          style={{
            borderTop: '1px solid var(--border-soft)',
            background: 'var(--bg-surface)',
            paddingBottom: 'max(0.9rem, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={handleShare}
            disabled={!!busy}
            className="w-full h-12 rounded-2xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
              boxShadow: '0 10px 24px rgba(15,118,110,0.28)',
            }}
          >
            {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Share receipt
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!!busy}
              className="h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-soft)',
              }}
            >
              {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Save
            </button>
            <button
              type="button"
              onClick={handleCopyMessage}
              disabled={!!busy}
              className="h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-soft)',
              }}
            >
              {busy === 'copy' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : copied ? (
                <Check className="w-4 h-4" style={{ color: 'var(--emerald)' }} />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copied' : 'Copy note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
