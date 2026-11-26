'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/** Muted ink accents — soft wash backgrounds, never cartoon faces. */
const ACCENTS = [
  '#0f766e',
  '#115e59',
  '#0e7490',
  '#1e3a5f',
  '#3d4f47',
  '#5c4033',
  '#4a5568',
  '#7c4a3a',
  '#365314',
  '#334155',
  '#0f4c5c',
  '#4c1d3d',
  '#3f3f46',
  '#064e3b',
  '#1e293b',
  '#78350f',
] as const;

function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickAccent(seed: string) {
  return ACCENTS[hashSeed(seed.toLowerCase()) % ACCENTS.length];
}

function initialsFrom(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (name.trim().slice(0, 2) || '?').toUpperCase();
}

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

const SIZE_PX: Record<Size, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 80,
  hero: 112,
};

const SIZE_TEXT: Record<Size, string> = {
  xs: 'text-[10px] tracking-wide',
  sm: 'text-[11px] tracking-wide',
  md: 'text-[13px] tracking-wide',
  lg: 'text-base tracking-wide',
  xl: 'text-2xl tracking-tight',
  hero: 'text-[2.35rem] tracking-tight',
};

type Props = {
  name: string;
  /** Stable id preferred so renames keep the same tone */
  seed?: string;
  size?: Size;
  className?: string;
  /** @deprecated All avatars are initials now — kept for call-site compatibility */
  initialsOnly?: boolean;
  ring?: boolean;
  title?: string;
};

/**
 * Deterministic initials avatar from name/seed — muted wash, no network.
 */
export default function PersonAvatar({
  name,
  seed,
  size = 'md',
  className,
  ring = false,
  title,
}: Props) {
  const key = (seed || name || '?').trim() || '?';
  const px = SIZE_PX[size];
  const accent = useMemo(() => pickAccent(key), [key]);
  const initials = initialsFrom(name);

  return (
    <div
      className={cn(
        'rounded-full shrink-0 flex items-center justify-center font-semibold select-none',
        SIZE_TEXT[size],
        className
      )}
      style={{
        width: px,
        height: px,
        color: accent,
        background: `radial-gradient(circle at 32% 28%, color-mix(in srgb, ${accent} 10%, var(--bg-surface)) 0%, color-mix(in srgb, ${accent} 18%, var(--bg-raised)) 100%)`,
        boxShadow: ring
          ? `0 0 0 2px var(--bg-base), 0 0 0 3.5px var(--primary)`
          : `inset 0 0 0 1px color-mix(in srgb, ${accent} 22%, transparent)`,
      }}
      title={title || name}
      aria-label={name}
    >
      <span style={{ fontFeatureSettings: '"ss01"' }}>{initials}</span>
    </div>
  );
}

export function avatarToneClass(name: string) {
  const tones = [
    'bg-[#0f766e]',
    'bg-[#115e59]',
    'bg-[#134e4a]',
    'bg-[#1e3a36]',
    'bg-[#0e7490]',
    'bg-[#155e75]',
    'bg-[#3d4f47]',
  ];
  return tones[hashSeed(name || '?') % tones.length];
}

export function getAvatarAccent(seed: string) {
  return pickAccent((seed || '?').trim() || '?');
}

export function getInitials(name: string) {
  return initialsFrom(name);
}
