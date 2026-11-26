'use client';

import { Button } from '@/components/ui/button';

export type ConfirmExtraAction = {
  label: string;
  onClick: () => void;
};

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'default';
  extraActions?: ConfirmExtraAction[];
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'default',
  extraActions,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-scale-in"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{
              background: tone === 'danger' ? 'rgba(244,63,94,0.12)' : 'rgba(15,118,110,0.12)',
              color: tone === 'danger' ? '#f43f5e' : 'var(--primary)',
            }}
          >
            {tone === 'danger' ? '!' : 'i'}
          </div>
          <div className="min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
          </div>
        </div>

        {extraActions && extraActions.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
              Save a local copy first
            </p>
            <div className="grid grid-cols-1 gap-2">
              {extraActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="w-full h-10 rounded-xl text-sm font-semibold text-left px-3.5"
                  style={{
                    background: 'var(--bg-raised)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
