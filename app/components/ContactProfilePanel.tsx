'use client';

import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Link2,
  MessageCircle,
  Pencil,
  Phone,
  Share2,
  Trash2,
  Unlink,
  Wallet,
} from 'lucide-react';
import PersonAvatar, { getAvatarAccent } from '@/app/components/PersonAvatar';
import type { Contact } from './types';

type Props = {
  contact: Contact;
  balance: number;
  showBalances: boolean;
  onToggleBalances: () => void;
  onClose: () => void;
  onMessage: () => void;
  onEdit?: () => void;
  onCopyPhone?: () => void;
  onCall?: () => void;
  onShareChat?: () => void;
  onCopyChatLink?: () => void;
  onSettleFull?: () => void;
  onSettlePartial?: () => void;
  onPayUpi?: () => void;
  onUnlink?: () => void;
  onDelete?: () => void;
};

function ActionChip({
  label,
  icon: Icon,
  onClick,
  tone = 'default',
}: {
  label: string;
  icon: typeof MessageCircle;
  onClick: () => void;
  tone?: 'default' | 'accent';
}) {
  const color = tone === 'accent' ? 'var(--primary)' : 'var(--text-secondary)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-0 flex flex-col items-center gap-1 py-1.5 px-0.5 transition-transform active:scale-95"
    >
      <span
        className="h-9 w-9 rounded-full inline-flex items-center justify-center"
        style={{
          background:
            tone === 'accent'
              ? 'color-mix(in srgb, var(--primary) 14%, var(--bg-raised))'
              : 'var(--bg-raised)',
          color,
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={2.1} />
      </span>
      <span
        className="text-[10px] font-semibold leading-none truncate w-full text-center"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
    </button>
  );
}

function InfoRow({
  label,
  value,
  onClick,
  hint,
  last,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  hint?: string;
  last?: boolean;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="w-full text-left px-4 py-3"
      style={{ borderBottom: last ? undefined : '1px solid var(--border-soft)' }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>
      <p className="text-[14px] font-semibold mt-1 break-all" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {hint ? (
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
          {hint}
        </p>
      ) : null}
    </Comp>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.14em] px-1 mb-2"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </p>
  );
}

export default function ContactProfilePanel({
  contact,
  balance,
  showBalances,
  onToggleBalances,
  onClose,
  onMessage,
  onEdit,
  onCopyPhone,
  onCall,
  onShareChat,
  onCopyChatLink,
  onSettleFull,
  onSettlePartial,
  onPayUpi,
  onUnlink,
  onDelete,
}: Props) {
  const isPeer = contact.role === 'peer';
  const txCount = contact.transactions?.length || 0;
  const accent = getAvatarAccent(contact.avatarSeed || contact.id || contact.name);
  const since = contact.createdAt
    ? new Date(contact.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const amountText = `₹${Math.abs(balance).toLocaleString('en-IN')}`;
  const balanceTitle =
    balance === 0 ? 'Settled up' : balance > 0 ? 'Owes you' : 'You owe';
  const balanceColor =
    balance === 0 ? 'var(--text-muted)' : balance > 0 ? 'var(--emerald)' : 'var(--rose)';
  const revealed = showBalances || balance === 0;

  const actions: Array<{
    key: string;
    label: string;
    icon: typeof MessageCircle;
    onClick: () => void;
    tone?: 'default' | 'accent';
  }> = [{ key: 'message', label: 'Message', icon: MessageCircle, onClick: onMessage, tone: 'accent' }];

  if (onCall && contact.phone && !contact.isSample) {
    actions.push({ key: 'call', label: 'Call', icon: Phone, onClick: onCall });
  }
  if (onCopyPhone && contact.phone) {
    actions.push({ key: 'copy', label: 'Copy', icon: Copy, onClick: onCopyPhone });
  }
  if (onEdit && !isPeer) {
    actions.push({ key: 'edit', label: 'Edit', icon: Pencil, onClick: onEdit });
  }
  if (onShareChat && !isPeer) {
    actions.push({ key: 'share', label: 'Share', icon: Share2, onClick: onShareChat });
  }
  if (onPayUpi) {
    actions.push({ key: 'upi', label: 'Pay UPI', icon: Wallet, onClick: onPayUpi, tone: 'accent' });
  }

  const detailRows: Array<{
    key: string;
    label: string;
    value: string;
    onClick?: () => void;
    hint?: string;
  }> = [];

  if (contact.phone) {
    detailRows.push({
      key: 'phone',
      label: 'Phone',
      value: contact.phone,
      onClick: onCall || onCopyPhone,
      hint: contact.isSample ? 'Fake sample number' : onCall ? 'Tap to call' : 'Tap to copy',
    });
  } else {
    detailRows.push({ key: 'phone', label: 'Phone', value: 'Not added' });
  }

  if (contact.email) {
    detailRows.push({
      key: 'email',
      label: 'Email',
      value: contact.email,
      hint: contact.isSample ? 'Fake sample email' : undefined,
    });
  }

  if (contact.upiId) {
    detailRows.push({
      key: 'upi',
      label: 'UPI ID',
      value: contact.upiId,
      hint: contact.upiLocked ? 'From their Udharwale account' : 'Saved for Pay via UPI',
    });
  }

  if (contact.dueDate) {
    detailRows.push({
      key: 'due',
      label: 'Balance due',
      value: new Date(`${contact.dueDate}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    });
  }

  if (isPeer && contact.ownerName) {
    detailRows.push({
      key: 'shared',
      label: 'Shared by',
      value: contact.ownerName,
      hint: 'Both can edit this ledger',
    });
  }

  const hasEmptyDetails =
    !contact.phone && !contact.email && !contact.upiId && !contact.dueDate && !isPeer;

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col animate-fade-slide-up"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      role="dialog"
      aria-label={`${contact.name} profile`}
    >
      <div
        className="shrink-0 flex items-center justify-between gap-2 px-3 pt-3 pb-2"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full inline-flex items-center justify-center shrink-0"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-primary)',
            }}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>
            Contact
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleBalances}
          className="h-10 w-10 rounded-full inline-flex items-center justify-center shrink-0"
          style={{
            background: showBalances ? 'var(--accent)' : 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            color: showBalances ? 'var(--primary)' : 'var(--text-muted)',
          }}
          aria-label={showBalances ? 'Hide balances' : 'Show balances'}
          title={showBalances ? 'Hide balances' : 'Show balances'}
        >
          {showBalances ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="relative px-4 pt-5 pb-4 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-6 h-40"
            style={{
              background: `radial-gradient(ellipse 75% 85% at 50% 0%, color-mix(in srgb, ${accent} 14%, transparent) 0%, transparent 70%)`,
            }}
          />

          <div className="relative flex items-center gap-3.5">
            <PersonAvatar
              name={contact.name}
              seed={contact.avatarSeed || contact.id}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <h1
                className="text-[1.35rem] font-extrabold tracking-tight leading-tight truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {contact.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {contact.isSample ? (
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md"
                    style={{
                      background: 'color-mix(in srgb, var(--amber) 12%, transparent)',
                      color: 'var(--amber)',
                    }}
                  >
                    Sample
                  </span>
                ) : null}
                {(contact.role === 'peer' || contact.peerLinked) && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md"
                    style={{
                      background: 'color-mix(in srgb, var(--cyan) 12%, transparent)',
                      color: 'var(--cyan)',
                    }}
                  >
                    {contact.role === 'peer' ? 'Linked' : 'Shared'}
                  </span>
                )}
              </div>
              {since ? (
                <p className="mt-1.5 text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>
                  Since {since}
                  {txCount > 0 ? ` · ${txCount} payment${txCount === 1 ? '' : 's'}` : ''}
                </p>
              ) : null}
            </div>
          </div>

          {contact.isSample ? (
            <p className="relative mt-3 text-xs" style={{ color: 'var(--amber)' }}>
              Practice example — not a real person
            </p>
          ) : null}

          <div
            className="relative mt-4 rounded-2xl px-3.5 py-3 flex items-center gap-3"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Balance
              </p>
              <p className="mt-0.5 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {balanceTitle}
              </p>
              <p className="mt-0.5 text-xl font-extrabold tabular-nums leading-none" style={{ color: balanceColor }}>
                {revealed ? (balance === 0 ? '₹0' : amountText) : '••••'}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleBalances}
              className="h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold shrink-0"
              style={{
                background: showBalances ? 'var(--accent)' : 'var(--bg-raised)',
                color: showBalances ? 'var(--primary)' : 'var(--text-secondary)',
                border: '1px solid var(--border-soft)',
              }}
            >
              {showBalances ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showBalances ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Single-row actions */}
        <div className="px-4 pb-4">
          <div
            className="flex items-stretch gap-0.5 rounded-2xl px-1 py-1.5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            {actions.map((action) => (
              <ActionChip
                key={action.key}
                label={action.label}
                icon={action.icon}
                onClick={action.onClick}
                tone={action.tone}
              />
            ))}
          </div>
        </div>

        <div className="px-4 pb-3">
          <SectionLabel>Details</SectionLabel>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            {hasEmptyDetails ? (
              <div className="px-4 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                No contact details yet — edit to add phone or email.
              </div>
            ) : (
              detailRows.map((row, index) => (
                <InfoRow
                  key={row.key}
                  label={row.label}
                  value={row.value}
                  onClick={row.onClick}
                  hint={row.hint}
                  last={index === detailRows.length - 1}
                />
              ))
            )}
          </div>
        </div>

        {balance !== 0 && (onSettleFull || onSettlePartial || onPayUpi) ? (
          <div className="px-4 pb-3">
            <SectionLabel>Settle</SectionLabel>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              {onPayUpi ? (
                <button
                  type="button"
                  onClick={onPayUpi}
                  className="w-full text-left px-4 py-3.5 text-[15px] font-semibold"
                  style={{
                    color: 'var(--primary)',
                    borderBottom:
                      onSettleFull || onSettlePartial ? '1px solid var(--border-soft)' : undefined,
                  }}
                >
                  {contact.upiId ? 'Pay via UPI' : 'Add UPI to pay'}
                </button>
              ) : null}
              {onSettleFull ? (
                <button
                  type="button"
                  onClick={onSettleFull}
                  className="w-full text-left px-4 py-3.5 text-[15px] font-semibold"
                  style={{
                    color: 'var(--emerald)',
                    borderBottom: onSettlePartial ? '1px solid var(--border-soft)' : undefined,
                  }}
                >
                  Settle in full
                </button>
              ) : null}
              {onSettlePartial ? (
                <button
                  type="button"
                  onClick={onSettlePartial}
                  className="w-full text-left px-4 py-3.5 text-[15px] font-semibold"
                  style={{ color: 'var(--cyan)' }}
                >
                  Settle partly
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {(onCopyChatLink && !isPeer) || onUnlink || (onDelete && !isPeer) ? (
          <div className="px-4 pb-8">
            <SectionLabel>More</SectionLabel>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              {onCopyChatLink && !isPeer ? (
                <button
                  type="button"
                  onClick={onCopyChatLink}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  style={{
                    borderBottom:
                      onUnlink || (onDelete && !isPeer) ? '1px solid var(--border-soft)' : undefined,
                  }}
                >
                  <Link2 className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                  <span className="text-[15px] font-semibold">Copy chat link</span>
                </button>
              ) : null}
              {onUnlink ? (
                <button
                  type="button"
                  onClick={onUnlink}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  style={{
                    borderBottom: onDelete && !isPeer ? '1px solid var(--border-soft)' : undefined,
                  }}
                >
                  <Unlink className="w-4 h-4 shrink-0" style={{ color: 'var(--amber)' }} />
                  <span className="text-[15px] font-semibold" style={{ color: 'var(--amber)' }}>
                    Unlink shared access
                  </span>
                </button>
              ) : null}
              {onDelete && !isPeer ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <Trash2 className="w-4 h-4 shrink-0" style={{ color: 'var(--rose)' }} />
                  <span className="text-[15px] font-semibold" style={{ color: 'var(--rose)' }}>
                    Delete contact
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
