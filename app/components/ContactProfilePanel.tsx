'use client';

import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Copy,
  Link2,
  MessageCircle,
  Pencil,
  Phone,
  Share2,
  Trash2,
  Unlink,
} from 'lucide-react';
import PersonAvatar, { getAvatarAccent } from '@/app/components/PersonAvatar';
import type { Contact } from './types';

type Props = {
  contact: Contact;
  balance: number;
  showBalances: boolean;
  onClose: () => void;
  onMessage: () => void;
  onEdit?: () => void;
  onCopyPhone?: () => void;
  onCall?: () => void;
  onShareChat?: () => void;
  onCopyChatLink?: () => void;
  onSettleFull?: () => void;
  onSettlePartial?: () => void;
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
  tone?: 'default' | 'danger' | 'accent';
}) {
  const color =
    tone === 'danger' ? 'var(--rose)' : tone === 'accent' ? 'var(--primary)' : 'var(--text-secondary)';
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 min-w-[4.25rem]">
      <span
        className="h-11 w-11 rounded-full inline-flex items-center justify-center transition-transform active:scale-95"
        style={{
          background:
            tone === 'accent'
              ? 'color-mix(in srgb, var(--primary) 14%, var(--bg-surface))'
              : 'var(--bg-surface)',
          border: `1px solid ${
            tone === 'accent' ? 'color-mix(in srgb, var(--primary) 28%, transparent)' : 'var(--border-soft)'
          }`,
          color,
        }}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={2.1} />
      </span>
      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
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
      className="w-full text-left px-4 py-3.5"
      style={{ borderBottom: last ? undefined : '1px solid var(--border-soft)' }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>
      <p className="text-[15px] font-semibold mt-1 break-all" style={{ color: 'var(--text-primary)' }}>
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
  onClose,
  onMessage,
  onEdit,
  onCopyPhone,
  onCall,
  onShareChat,
  onCopyChatLink,
  onSettleFull,
  onSettlePartial,
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

  const balanceLabel =
    balance === 0
      ? 'Settled up'
      : balance > 0
        ? `Owes you ₹${Math.abs(balance).toLocaleString('en-IN')}`
        : `You owe ₹${Math.abs(balance).toLocaleString('en-IN')}`;

  const balanceColor =
    balance === 0 ? 'var(--text-muted)' : balance > 0 ? 'var(--emerald)' : 'var(--rose)';

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

  const hasEmptyDetails = !contact.phone && !contact.email && !contact.dueDate && !isPeer;

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col animate-fade-slide-up"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      role="dialog"
      aria-label={`${contact.name} profile`}
    >
      <div
        className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2"
        style={{ background: 'var(--bg-base)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full inline-flex items-center justify-center"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            color: 'var(--text-primary)',
          }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Contact
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="relative px-5 pt-6 pb-5 flex flex-col items-center text-center overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-8 h-48"
            style={{
              background: `radial-gradient(ellipse 70% 80% at 50% 0%, color-mix(in srgb, ${accent} 16%, transparent) 0%, transparent 72%)`,
            }}
          />
          <PersonAvatar
            name={contact.name}
            seed={contact.avatarSeed || contact.id}
            size="hero"
          />
          <h1
            className="relative mt-4 text-[1.65rem] font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {contact.name}
          </h1>

          <div className="relative mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
            {contact.isSample ? (
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md"
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
                className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md"
                style={{
                  background: 'color-mix(in srgb, var(--cyan) 12%, transparent)',
                  color: 'var(--cyan)',
                }}
              >
                {contact.role === 'peer' ? 'Linked ledger' : 'Shared'}
              </span>
            )}
          </div>

          {contact.isSample ? (
            <p className="relative mt-2 text-xs max-w-xs" style={{ color: 'var(--amber)' }}>
              Practice example — not a real person
            </p>
          ) : null}

          <div
            className="relative mt-4 w-full max-w-sm rounded-2xl px-4 py-3.5"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Balance
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums" style={{ color: balanceColor }}>
              {showBalances || balance === 0 ? balanceLabel : 'Balance hidden'}
            </p>
            {since ? (
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                Since {since}
                {txCount > 0 ? ` · ${txCount} payment${txCount === 1 ? '' : 's'}` : ''}
              </p>
            ) : null}
          </div>
        </div>

        <div className="px-4 pb-4 flex justify-center gap-4 flex-wrap">
          <ActionChip label="Message" icon={MessageCircle} onClick={onMessage} tone="accent" />
          {onCall && contact.phone && !contact.isSample ? (
            <ActionChip label="Call" icon={Phone} onClick={onCall} />
          ) : null}
          {onCopyPhone && contact.phone ? (
            <ActionChip label="Copy" icon={Copy} onClick={onCopyPhone} />
          ) : null}
          {onEdit && !isPeer ? <ActionChip label="Edit" icon={Pencil} onClick={onEdit} /> : null}
          {onShareChat && !isPeer ? (
            <ActionChip label="Share" icon={Share2} onClick={onShareChat} />
          ) : null}
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

        {balance !== 0 && (onSettleFull || onSettlePartial) ? (
          <div className="px-4 pb-3">
            <SectionLabel>Settle</SectionLabel>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
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
