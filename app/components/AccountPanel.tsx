'use client';

import type { ReactNode, RefObject } from 'react';
import { ChevronRight, LogOut, Smartphone } from 'lucide-react';
import BrandMark from '@/app/components/BrandMark';
import PersonAvatar from '@/app/components/PersonAvatar';
import { Switch } from '@/components/ui/switch';
import { SITE_CREATOR, SITE_NAME } from '@/lib/seo';
import type { ModeType } from './types';

type SecurityType = 'password' | 'pin' | 'answer';

type Props = {
  userName: string;
  userEmail: string;
  userPhone: string;
  userId?: string;
  avatarSeed?: string;
  contactCount: number;
  transactionCount: number;
  lastActivityLabel: string;
  theme: 'light' | 'dark';
  defaultTxMode: ModeType;
  showBalances: boolean;
  compactLedgerView: boolean;
  hasContacts: boolean;
  restoreInputRef: RefObject<HTMLInputElement | null>;
  onEditProfile: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  onSetDefaultTxMode: (mode: ModeType) => void;
  onToggleShowBalances: () => void;
  onToggleCompactLedger: () => void;
  onExportBackup: () => void;
  onExportCsv: () => void;
  onPrintPdf: () => void;
  onRestoreClick: () => void;
  onRestoreFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCopySummary: () => void;
  onOpenSecurity: (type: SecurityType) => void;
  hasSampleData: boolean;
  onClearSample: () => void;
  onWipeData: () => void;
};

function QuietList({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
    >
      {children}
    </div>
  );
}

function LinkRow({
  label,
  hint,
  onClick,
  danger = false,
  last = false,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border-soft)' }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-[15px] font-semibold leading-none"
          style={{ color: danger ? 'var(--rose)' : 'var(--text-primary)' }}
        >
          {label}
        </p>
        {hint ? (
          <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className="w-4 h-4 shrink-0"
        style={{ color: danger ? 'var(--rose)' : 'var(--text-faint)' }}
      />
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  last = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border-soft)' }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {hint ? (
          <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export default function AccountPanel({
  userName,
  userEmail,
  userPhone,
  userId,
  avatarSeed,
  contactCount,
  transactionCount,
  lastActivityLabel,
  theme,
  defaultTxMode,
  showBalances,
  compactLedgerView,
  hasContacts,
  restoreInputRef,
  onEditProfile,
  onLogout,
  onToggleTheme,
  onSetDefaultTxMode,
  onToggleShowBalances,
  onToggleCompactLedger,
  onExportBackup,
  onExportCsv,
  onPrintPdf,
  onRestoreClick,
  onRestoreFile,
  onCopySummary,
  onOpenSecurity,
  hasSampleData,
  onClearSample,
  onWipeData,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-10 space-y-8">
        {/* Identity */}
        <header className="flex flex-col items-center text-center pt-2">
          <PersonAvatar
            name={userName || 'You'}
            seed={avatarSeed || userId || userName || 'you'}
            size="xl"
          />
          <h1
            className="mt-4 text-2xl font-extrabold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {userName || 'Your account'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {userEmail || 'No email on file'}
          </p>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {userPhone || 'No phone on file'}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            <span>{contactCount} friends</span>
            <span style={{ color: 'var(--border-soft)' }}>·</span>
            <span>{transactionCount} entries</span>
            <span style={{ color: 'var(--border-soft)' }}>·</span>
            <span>Active {lastActivityLabel}</span>
          </div>

          <div className="mt-5 flex w-full max-w-xs gap-2">
            <button
              type="button"
              onClick={onEditProfile}
              className="flex-1 h-11 rounded-full text-sm font-bold text-white"
              style={{ background: 'var(--primary)' }}
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="h-11 px-4 rounded-full text-sm font-bold inline-flex items-center gap-1.5"
              style={{
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-soft)',
              }}
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Look & feel */}
        <section className="space-y-2.5">
          <p className="text-xs font-bold px-1" style={{ color: 'var(--text-muted)' }}>
            Appearance
          </p>
          <QuietList>
            <ToggleRow
              label="Dark mode"
              hint={theme === 'dark' ? 'Using night theme' : 'Using light theme'}
              checked={theme === 'dark'}
              onChange={onToggleTheme}
            />
            <ToggleRow
              label="Show balances"
              hint="Reveal amounts by default"
              checked={showBalances}
              onChange={onToggleShowBalances}
            />
            <ToggleRow
              label="Compact ledger"
              hint="Tighter transaction rows"
              checked={compactLedgerView}
              onChange={onToggleCompactLedger}
              last
            />
          </QuietList>
        </section>

        {/* Defaults */}
        <section className="space-y-2.5">
          <p className="text-xs font-bold px-1" style={{ color: 'var(--text-muted)' }}>
            Defaults
          </p>
          <QuietList>
            <div className="px-4 py-3.5">
              <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Payment mode
              </p>
              <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-muted)' }}>
                Pre-selected when you add money
              </p>
              <div className="flex gap-2">
                {([
                  { mode: 'Cash' as const, label: 'Cash' },
                  { mode: 'Online Transfer' as const, label: 'UPI / Online' },
                ]).map(({ mode, label }) => {
                  const active = defaultTxMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSetDefaultTxMode(mode)}
                      className="flex-1 h-10 rounded-full text-sm font-semibold"
                      style={{
                        background: active ? 'var(--primary)' : 'var(--bg-raised)',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        border: active ? 'none' : '1px solid var(--border-soft)',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </QuietList>
        </section>

        {/* Security */}
        <section className="space-y-2.5">
          <p className="text-xs font-bold px-1" style={{ color: 'var(--text-muted)' }}>
            Security
          </p>
          <QuietList>
            <LinkRow
              label="Change password"
              hint="Requires your current password"
              onClick={() => onOpenSecurity('password')}
            />
            <LinkRow
              label="Recovery PIN"
              hint="4-digit backup PIN"
              onClick={() => onOpenSecurity('pin')}
            />
            <LinkRow
              label="Recovery answer"
              hint="Private identity check"
              onClick={() => onOpenSecurity('answer')}
              last
            />
          </QuietList>
        </section>

        {/* Data */}
        <section className="space-y-2.5">
          <p className="text-xs font-bold px-1" style={{ color: 'var(--text-muted)' }}>
            Your data
          </p>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onRestoreFile}
          />
          <QuietList>
            <LinkRow
              label="Download JSON backup"
              onClick={onExportBackup}
            />
            <LinkRow label="Export CSV" onClick={onExportCsv} />
            <LinkRow label="Print / PDF" onClick={onPrintPdf} />
            <LinkRow label="Restore from JSON" onClick={onRestoreClick} />
            <LinkRow label="Copy ledger summary" onClick={onCopySummary} last />
          </QuietList>
          {!hasContacts ? (
            <p className="text-[11px] px-1" style={{ color: 'var(--text-faint)' }}>
              Add a friend before exporting a backup.
            </p>
          ) : null}
        </section>

        {/* More */}
        <section className="space-y-2.5">
          <p className="text-xs font-bold px-1" style={{ color: 'var(--text-muted)' }}>
            More
          </p>
          <QuietList>
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <div className="flex items-start gap-3">
                <Smartphone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Install on home screen
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Use the install banner or your browser’s Add to Home Screen for the app shell.
                  </p>
                </div>
              </div>
            </div>
            {hasSampleData ? (
              <LinkRow
                label="Remove sample examples"
                hint="Clears practice friends & trip only"
                onClick={onClearSample}
              />
            ) : null}
            <LinkRow
              label="Wipe all data"
              hint="Deletes every contact and transaction"
              onClick={onWipeData}
              danger
              last
            />
          </QuietList>
        </section>

        <footer className="pt-4 pb-2 flex flex-col items-center gap-2 text-center">
          <BrandMark size={40} />
          <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
            {SITE_NAME}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            by {SITE_CREATOR}
          </p>
        </footer>
      </div>
    </div>
  );
}
