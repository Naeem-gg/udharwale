'use client';

import { AVATAR_PRESETS, type AvatarPresetId } from '@/lib/avatar-presets';
import PersonAvatar from '@/app/components/PersonAvatar';

type Props = {
  name: string;
  value: string;
  onChange: (seed: AvatarPresetId) => void;
  columns?: 4 | 5 | 8;
  size?: 'sm' | 'md';
  label?: string;
  hint?: string;
};

export default function AvatarPicker({
  name,
  value,
  onChange,
  columns = 4,
  size = 'md',
  label = 'Choose colour',
  hint,
}: Props) {
  const grid =
    columns === 8 ? 'grid-cols-4 sm:grid-cols-8' : columns === 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      ) : null}
      {hint ? (
        <p className="text-[11px] leading-snug" style={{ color: 'var(--text-faint)' }}>
          {hint}
        </p>
      ) : null}
      <div className={`grid ${grid} gap-2.5`}>
        {AVATAR_PRESETS.map((preset) => {
          const selected = value === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className="rounded-full p-0.5 transition-transform active:scale-95"
              style={{
                boxShadow: selected
                  ? '0 0 0 2px var(--primary)'
                  : '0 0 0 1px var(--border-soft)',
                background: selected
                  ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                  : 'transparent',
              }}
              aria-label={`Colour ${preset}`}
              aria-pressed={selected}
            >
              <PersonAvatar name={name || 'You'} seed={preset} size={size} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
