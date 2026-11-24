'use client';

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
import PersonAvatar from '@/app/components/PersonAvatar';
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
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[4.5rem]"
    >
      <span
        className="h-12 w-12 rounded-full inline-flex items-center justify-center"
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-soft)',
          color,
        }}
      >
        <Icon className="w-5 h-5" />
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
}: {
  label: string;
  value: string;
  onClick?: () => void;
  hint?: string;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="w-full text-left px-4 py-3.5"
      style={{ borderBottom: '1px solid var(--border-soft)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
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
  const since = contact.createdAt
    ? new Date(contact.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const balanceLabel =
    balance === 0
      ? 'Settled'
      : balance > 0
        ? `Owes you ₹${Math.abs(balance).toLocaleString('en-IN')}`
        : `You owe ₹${Math.abs(balance).toLocaleString('en-IN')}`;

  const balanceColor =
    balance === 0 ? 'var(--text-muted)' : balance > 0 ? 'var(--emerald)' : 'var(--rose)';

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col animate-fade-slide-up"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      role="dialog"
      aria-label={`${contact.name} profile`}
    >
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full inline-flex items-center justify-center"
          style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)' }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-bold">Contact info</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Hero */}
        <div
          className="px-5 pt-8 pb-6 flex flex-col items-center text-center"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--primary) 12%, var(--bg-surface)) 0%, var(--bg-base) 100%)',
          }}
        >
          <PersonAvatar
            name={contact.name}
            seed={contact.avatarSeed || contact.id}
            size="hero"
            className="shadow-lg"
          />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{contact.name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {contact.isSample ? (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(180,83,9,0.14)',
                  color: '#b45309',
                  border: '1px dashed rgba(180,83,9,0.4)',
                }}
              >
                Sample
              </span>
            ) : null}
            {(contact.role === 'peer' || contact.peerLinked) && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee' }}
              >
                {contact.role === 'peer' ? 'Linked ledger' : 'Shared'}
              </span>
            )}
          </div>
          {contact.isSample ? (
            <p className="mt-2 text-xs max-w-xs" style={{ color: '#b45309' }}>
              Practice example — not a real person
            </p>
          ) : null}
          <p className="mt-3 text-sm font-bold tabular-nums" style={{ color: balanceColor }}>
            {showBalances || balance === 0 ? balanceLabel : 'Balance hidden'}
          </p>
          {since ? (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Friend since {since} · {txCount} payment{txCount === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>

        {/* Quick actions */}
        <div className="px-4 py-4 flex justify-center gap-5 flex-wrap">
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

        {/* Details */}
        <div className="px-4 pb-3">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            {contact.phone ? (
              <InfoRow
                label="Phone"
                value={contact.phone}
                onClick={onCall || onCopyPhone}
                hint={contact.isSample ? 'Fake sample number' : onCall ? 'Tap to call' : 'Tap to copy'}
              />
            ) : (
              <InfoRow label="Phone" value="Not added" />
            )}
            {contact.email ? (
              <InfoRow
                label="Email"
                value={contact.email}
                hint={contact.isSample ? 'Fake sample email' : undefined}
              />
            ) : null}
            {contact.dueDate ? (
              <InfoRow
                label="Balance due"
                value={new Date(`${contact.dueDate}T00:00:00`).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              />
            ) : null}
            {isPeer && contact.ownerName ? (
              <InfoRow label="Shared by" value={contact.ownerName} hint="Both can edit this ledger" />
            ) : null}
            {!contact.phone && !contact.email && !contact.dueDate && !isPeer ? (
              <div className="px-4 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                No contact details yet — edit to add phone or email.
              </div>
            ) : null}
          </div>
        </div>

        {/* Money actions */}
        {balance !== 0 && (onSettleFull || onSettlePartial) ? (
          <div className="px-4 pb-3 space-y-2">
            <p className="text-xs font-bold px-1" style={{ color: 'var(--text-muted)' }}>
              Settle
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
            >
              {onSettleFull ? (
                <button
                  type="button"
                  onClick={onSettleFull}
                  className="w-full text-left px-4 py-3.5 text-[15px] font-semibold"
                  style={{ color: 'var(--emerald)', borderBottom: onSettlePartial ? '1px solid var(--border-soft)' : undefined }}
                >
                  Settle in full
                </button>
              ) : null}
              {onSettlePartial ? (
                <button
                  type="button"
                  onClick={onSettlePartial}
                  className="w-full text-left px-4 py-3.5 text-[15px] font-semibold"
                  style={{ color: '#0e7490' }}
                >
                  Settle partly
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* More */}
        <div className="px-4 pb-8 space-y-2">
          <p className="text-xs font-bold px-1" style={{ color: 'var(--text-muted)' }}>
            More
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            {onCopyChatLink && !isPeer ? (
              <button
                type="button"
                onClick={onCopyChatLink}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                style={{ borderBottom: '1px solid var(--border-soft)' }}
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
                style={{ borderBottom: onDelete ? '1px solid var(--border-soft)' : undefined }}
              >
                <Unlink className="w-4 h-4 shrink-0" style={{ color: '#b45309' }} />
                <span className="text-[15px] font-semibold" style={{ color: '#b45309' }}>
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
      </div>
    </div>
  );
}
