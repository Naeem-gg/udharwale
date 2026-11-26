'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type BoneProps = {
  className?: string;
  style?: CSSProperties;
};

/** Soft shimmer block that matches Udharwale surfaces. */
export function Bone({ className, style }: BoneProps) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden />;
}

export function FriendsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" aria-busy="true" aria-label="Loading friends">
      <div
        className="px-4 pt-3 pb-3 shrink-0 space-y-3"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-soft)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Bone className="h-11 w-11 rounded-full shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <Bone className="h-6 w-28 rounded-lg" />
              <Bone className="h-2.5 w-36 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Bone className="h-10 w-10 rounded-xl" />
            <Bone className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <Bone className="h-10 w-full rounded-xl" />
        <div className="flex gap-2 overflow-hidden">
          {[72, 64, 70, 58].map((w) => (
            <Bone key={w} className="h-8 rounded-full shrink-0" style={{ width: w }} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden py-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Bone className="w-11 h-11 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Bone className="h-3.5 rounded-full" style={{ width: `${48 + (i % 3) * 12}%` }} />
              <Bone className="h-2.5 rounded-full" style={{ width: `${34 + (i % 4) * 8}%` }} />
            </div>
            <div className="shrink-0 space-y-1.5 flex flex-col items-end">
              <Bone className="h-2 w-10 rounded-full" />
              <Bone className="h-3.5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TripsListSkeleton({
  rows = 4,
  includeHeader = false,
}: {
  rows?: number;
  includeHeader?: boolean;
}) {
  return (
    <div
      className={includeHeader ? 'flex-1 flex flex-col overflow-hidden' : 'space-y-2'}
      aria-busy="true"
      aria-label="Loading trips"
    >
      {includeHeader ? (
        <div className="px-4 pt-3 pb-3 shrink-0 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Bone className="h-6 w-24 rounded-lg" />
            <Bone className="h-2.5 w-36 rounded-full" />
          </div>
          <Bone className="h-9 w-24 rounded-xl" />
        </div>
      ) : null}
      <div className={includeHeader ? 'flex-1 px-4 py-3 space-y-2' : 'space-y-2'}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl px-3.5 py-3.5 flex items-center gap-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
          >
            <Bone className="w-11 h-11 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Bone className="h-3.5 rounded-full" style={{ width: `${52 + (i % 3) * 10}%` }} />
              <Bone className="h-2.5 rounded-full" style={{ width: `${40 + (i % 2) * 14}%` }} />
            </div>
            <Bone className="h-3 w-12 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityFeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 pt-1" aria-busy="true" aria-label="Loading activity">
      <div className="flex gap-2 mb-2">
        {[56, 64, 52, 70].map((w) => (
          <Bone key={w} className="h-9 rounded-xl shrink-0" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl px-3.5 py-3.5 flex items-center gap-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          <Bone className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Bone className="h-3 rounded-full" style={{ width: `${55 + (i % 3) * 12}%` }} />
            <Bone className="h-2.5 rounded-full" style={{ width: `${30 + (i % 4) * 8}%` }} />
          </div>
          <Bone className="h-3.5 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function AccountPanelSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 pt-8 pb-10 space-y-6" aria-busy="true" aria-label="Loading account">
      <div className="flex flex-col items-center text-center space-y-3">
        <Bone className="w-20 h-20 rounded-full" />
        <Bone className="h-6 w-40 rounded-lg" />
        <Bone className="h-3 w-48 rounded-full" />
        <Bone className="h-3 w-32 rounded-full" />
        <div className="flex w-full max-w-xs gap-2 pt-2">
          <Bone className="h-11 flex-1 rounded-full" />
          <Bone className="h-11 flex-1 rounded-full" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)' }}
        >
          <Bone className="h-3 w-24 rounded-full" />
          <Bone className="h-10 w-full rounded-xl" />
          <Bone className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
