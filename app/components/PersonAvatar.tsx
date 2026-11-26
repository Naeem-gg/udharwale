'use client';

import { useMemo } from 'react';
import Avatar from 'boring-avatars';
import { cn } from '@/lib/utils';

/** Brand-aligned palettes — tiny SVG via boring-avatars (~20KB). */
const PALETTES = [
  ['#0f766e', '#14b8a6', '#99f6e4', '#134e4a', '#f4f1ec'],
  ['#115e59', '#2dd4bf', '#ccfbf1', '#0f3d3a', '#ebe6df'],
  ['#0e7490', '#22d3ee', '#cffafe', '#164e63', '#f4f1ec'],
  ['#3d4f47', '#5f6f68', '#dce8e4', '#14201c', '#fffcf7'],
  ['#1e3a5f', '#3b82f6', '#bfdbfe', '#0f172a', '#f1f5f9'],
  ['#5c4033', '#a16207', '#fde68a', '#292524', '#faf7f2'],
  ['#064e3b', '#059669', '#a7f3d0', '#022c22', '#f0fdf4'],
  ['#334155', '#64748b', '#e2e8f0', '#0f172a', '#f8fafc'],
] as const;

const VARIANTS = ['beam', 'marble', 'ring', 'pixel', 'bauhaus', 'sunset'] as const;

function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
  /** Stable id preferred so renames keep the same look */
  seed?: string;
  size?: Size;
  className?: string;
  /** Force initials-only circle */
  initialsOnly?: boolean;
  ring?: boolean;
  title?: string;
};

function lookFromSeed(key: string) {
  const h = hashSeed(key.toLowerCase());
  return {
    palette: PALETTES[h % PALETTES.length],
    variant: VARIANTS[(h >>> 3) % VARIANTS.length],
    accent: PALETTES[h % PALETTES.length][0],
  };
}

/**
 * Lightweight deterministic avatar (boring-avatars) from name/seed.
 */
export default function PersonAvatar({
  name,
  seed,
  size = 'md',
  className,
  initialsOnly = false,
  ring = false,
  title,
}: Props) {
  const key = (seed || name || '?').trim() || '?';
  const px = SIZE_PX[size];
  const look = useMemo(() => lookFromSeed(key), [key]);

  if (initialsOnly) {
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
          color: look.accent,
          background: `color-mix(in srgb, ${look.accent} 16%, var(--bg-raised))`,
          boxShadow: ring
            ? `0 0 0 2px var(--bg-base), 0 0 0 3.5px var(--primary)`
            : `inset 0 0 0 1px color-mix(in srgb, ${look.accent} 22%, transparent)`,
        }}
        title={title || name}
        aria-label={name}
      >
        {initialsFrom(name)}
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-full shrink-0 overflow-hidden leading-none', className)}
      style={{
        width: px,
        height: px,
        boxShadow: ring
          ? `0 0 0 2px var(--bg-base), 0 0 0 3.5px var(--primary)`
          : undefined,
      }}
      title={title || name}
      aria-label={name}
    >
      <Avatar
        size={px}
        name={key}
        variant={look.variant}
        colors={[...look.palette]}
        title={false}
      />
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
  return lookFromSeed((seed || '?').trim() || '?').accent;
}

export function getInitials(name: string) {
  return initialsFrom(name);
}
