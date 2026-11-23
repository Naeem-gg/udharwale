'use client';

import React, { useRef, useState } from 'react';
import { Check, Copy, Download, Loader2, Share2, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { SITE_CREATOR, SITE_NAME } from '@/lib/seo';
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
    ? `Hey! I paid you ${amount} and logged it in Udharwale`
    : `Hey! I got ${amount} from you and logged it in Udharwale`;

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
  const fromName = isGave ? userName || 'You' : contactName;
  const toName = isGave ? contactName : userName || 'You';
  const statusLabel = isGave ? 'You gave' : 'You got';
  const title = isGave ? 'Payment to' : 'Payment from';
  const counterpart = contactName;

  const capturePng = async () => {
    if (!cardRef.current) throw new Error('Card not ready');
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

  /** System share sheet: pick who gets it. Sends receipt image + caption (with chat link). */
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

  const detailRows = [
    { label: 'Date', value: formatLongDate(transaction.date) },
    { label: 'Mode', value: mode },
    { label: 'Category', value: category },
    { label: 'Reference', value: ref },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-t-[20px] sm:rounded-[20px] overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          maxHeight: '94vh',
        }}
      >
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Share payment
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Pick who to send — receipt image + note + chat link
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="flex justify-center">
            <div
              ref={cardRef}
              style={{
                width: 340,
                background: paper,
                borderRadius: '0 0 18px 18px',
                overflow: 'hidden',
                fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
                color: ink,
                border: `1px solid ${line}`,
                borderTop: `3px solid ${accent}`,
                boxShadow: '0 10px 28px rgba(20,32,28,0.08)',
              }}
            >
              <div style={{ padding: '22px 22px 8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div>
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
                      {SITE_NAME}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, color: muted }}>
                      by {SITE_CREATOR}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: 'rgba(20,32,28,0.05)',
                      color: ink,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: muted }}>{title}</p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    wordBreak: 'break-word',
                  }}
                >
                  {counterpart}
                </p>
                <p
                  style={{
                    margin: '14px 0 0',
                    fontSize: 36,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {amountLabel}
                </p>
              </div>

              <div style={{ padding: '16px 22px 12px' }}>
                <div
                  style={{
                    borderTop: `1px solid ${line}`,
                    borderBottom: `1px solid ${line}`,
                    padding: '14px 0',
                    marginBottom: 14,
                    display: 'grid',
                    gap: 12,
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
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {fromName}
                    </p>
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
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {toName}
                    </p>
                  </div>
                </div>

                {transaction.remark?.trim() ? (
                  <div style={{ marginBottom: 14 }}>
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
                      Remarks
                    </p>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}
                    >
                      {transaction.remark.trim()}
                    </p>
                  </div>
                ) : null}

                <div style={{ display: 'grid', gap: 9 }}>
                  {detailRows.map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 16,
                        fontSize: 13,
                        alignItems: 'flex-start',
                      }}
                    >
                      <span style={{ color: muted, fontWeight: 600, flexShrink: 0 }}>{row.label}</span>
                      <span
                        style={{
                          color: ink,
                          fontWeight: 700,
                          textAlign: 'right',
                          wordBreak: 'break-word',
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 16 }} />
            </div>
          </div>

          <div
            className="rounded-2xl px-3.5 py-3"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-soft)' }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Goes with the image
            </p>
            <p className="text-xs leading-relaxed m-0 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {caption}
            </p>
          </div>
        </div>

        <div
          className="shrink-0 px-4 pt-3 space-y-2"
          style={{
            borderTop: '1px solid var(--border-soft)',
            paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={handleShare}
            disabled={!!busy}
            className="w-full h-12 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--primary)' }}
          >
            {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Share
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
              Save image
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
              {copied ? 'Copied' : 'Copy caption'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
