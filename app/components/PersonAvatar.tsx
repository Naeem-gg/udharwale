'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const SKINS = ['#f3c6a5', '#e8b98a', '#d4a574', '#c68642', '#a8724a', '#8d5524'];
const HAIRS = ['#1c1917', '#292524', '#44403c', '#78350f', '#0f766e', '#155e75', '#b45309'];
const TOPS = ['#0f766e', '#115e59', '#0e7490', '#047857', '#b45309', '#be123c', '#334155', '#5f6f68'];
const BG = ['#ccfbf1', '#cffafe', '#d1fae5', '#fef3c7', '#ffe4e6', '#e0e7ff', '#f1f5f9'];

function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], n: number) {
  return arr[n % arr.length];
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
  hero: 128,
};

const SIZE_TEXT: Record<Size, string> = {
  xs: 'text-[9px]',
  sm: 'text-[10px]',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-2xl',
  hero: 'text-4xl',
};

type Props = {
  name: string;
  /** Stable id preferred so renames keep the same face */
  seed?: string;
  size?: Size;
  className?: string;
  /** Force initials-only circle (e.g. sample dashed ring handled by parent) */
  initialsOnly?: boolean;
  ring?: boolean;
  title?: string;
};

/**
 * Deterministic illustrated avatar from name/seed — no network, works offline.
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
  const face = useMemo(() => {
    const h = hashSeed(key.toLowerCase());
    return {
      skin: pick(SKINS, h),
      hair: pick(HAIRS, h >>> 3),
      top: pick(TOPS, h >>> 6),
      bg: pick(BG, h >>> 9),
      hairStyle: h % 4,
      eyes: (h >>> 2) % 3,
      mouth: (h >>> 5) % 3,
      accessory: (h >>> 8) % 5 === 0,
    };
  }, [key]);

  if (initialsOnly) {
    const tone = pick(TOPS, hashSeed(key));
    return (
      <div
        className={cn(
          'rounded-full shrink-0 flex items-center justify-center font-bold text-white',
          SIZE_TEXT[size],
          className
        )}
        style={{
          width: px,
          height: px,
          background: tone,
          boxShadow: ring ? `0 0 0 2px var(--primary)` : undefined,
        }}
        title={title || name}
        aria-hidden={!title}
      >
        {initialsFrom(name)}
      </div>
    );
  }

  const uid = `a${hashSeed(key).toString(36)}`;

  return (
    <div
      className={cn('rounded-full shrink-0 overflow-hidden', className)}
      style={{
        width: px,
        height: px,
        boxShadow: ring ? `0 0 0 2px var(--primary)` : undefined,
      }}
      title={title || name}
      aria-label={name}
    >
      <svg viewBox="0 0 80 80" width={px} height={px} xmlns="http://www.w3.org/2000/svg" role="img">
        <title>{name}</title>
        <rect width="80" height="80" fill={face.bg} />
        {/* shoulders / top */}
        <ellipse cx="40" cy="78" rx="28" ry="16" fill={face.top} />
        {/* neck */}
        <rect x="34" y="52" width="12" height="12" rx="3" fill={face.skin} />
        {/* head */}
        <circle cx="40" cy="36" r="18" fill={face.skin} />
        {/* hair */}
        {face.hairStyle === 0 && (
          <path d="M22 36c0-12 8-20 18-20s18 8 18 20c0-2-2-10-8-14-4-3-10-4-14-3-8 2-14 9-14 17z" fill={face.hair} />
        )}
        {face.hairStyle === 1 && (
          <path d="M23 34c1-14 10-20 17-20 8 0 16 7 17 20-3-8-8-12-17-12s-14 4-17 12z" fill={face.hair} />
        )}
        {face.hairStyle === 2 && (
          <>
            <path d="M22 38c0-14 9-22 18-22s18 8 18 22c-1-10-7-16-18-16S23 28 22 38z" fill={face.hair} />
            <path d="M20 40c2-6 4-10 6-12 0 6-1 12-2 16-2-1-4-2-4-4z" fill={face.hair} />
            <path d="M60 40c-2-6-4-10-6-12 0 6 1 12 2 16 2-1 4-2 4-4z" fill={face.hair} />
          </>
        )}
        {face.hairStyle === 3 && (
          <path d="M24 30c2-10 10-16 16-16 7 0 14 5 16 16-4-6-10-9-16-9s-12 3-16 9z" fill={face.hair} />
        )}
        {/* eyes */}
        {face.eyes === 0 && (
          <>
            <circle cx="33" cy="36" r="2.2" fill="#1c1917" />
            <circle cx="47" cy="36" r="2.2" fill="#1c1917" />
          </>
        )}
        {face.eyes === 1 && (
          <>
            <ellipse cx="33" cy="36" rx="2.6" ry="2.2" fill="#1c1917" />
            <ellipse cx="47" cy="36" rx="2.6" ry="2.2" fill="#1c1917" />
            <circle cx="33.6" cy="35.4" r="0.7" fill="#fff" />
            <circle cx="47.6" cy="35.4" r="0.7" fill="#fff" />
          </>
        )}
        {face.eyes === 2 && (
          <>
            <path d="M30 36h6" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
            <path d="M44 36h6" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {/* mouth */}
        {face.mouth === 0 && (
          <path d="M34 46c2.5 3 9.5 3 12 0" fill="none" stroke="#9a5b4a" strokeWidth="2" strokeLinecap="round" />
        )}
        {face.mouth === 1 && <circle cx="40" cy="46" r="1.6" fill="#9a5b4a" />}
        {face.mouth === 2 && (
          <path d="M34 47c3-2 9-2 12 0" fill="none" stroke="#9a5b4a" strokeWidth="2" strokeLinecap="round" />
        )}
        {/* tiny glasses accessory */}
        {face.accessory && (
          <g stroke="#1c1917" strokeWidth="1.4" fill="none" opacity="0.75">
            <circle cx="33" cy="36" r="4.2" />
            <circle cx="47" cy="36" r="4.2" />
            <path d="M37.2 36h5.6" />
          </g>
        )}
        {/* soft vignette */}
        <defs>
          <radialGradient id={`${uid}-v`} cx="50%" cy="40%" r="60%">
            <stop offset="70%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.06" />
          </radialGradient>
        </defs>
        <rect width="80" height="80" fill={`url(#${uid}-v)`} />
      </svg>
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
  return pick(tones, hashSeed(name || '?'));
}

export function getInitials(name: string) {
  return initialsFrom(name);
}
