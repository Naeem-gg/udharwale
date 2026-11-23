'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { SITE_ICON, SITE_NAME } from '@/lib/seo';
import { cn } from '@/lib/utils';

type Props = {
  size?: number;
  className?: string;
  /** Show product name beside the mark */
  withName?: boolean;
  /** Optional subtitle under the name (e.g. creator line) */
  subtitle?: ReactNode;
  priority?: boolean;
};

export default function BrandMark({
  size = 36,
  className,
  withName = false,
  subtitle,
  priority = false,
}: Props) {
  const mark = (
    <Image
      src={SITE_ICON}
      alt={SITE_NAME}
      width={size}
      height={size}
      priority={priority}
      className="rounded-[22%] shadow-sm"
      style={{ width: size, height: size }}
    />
  );

  if (!withName) {
    return <span className={cn('inline-flex shrink-0', className)}>{mark}</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-2.5 min-w-0', className)}>
      {mark}
      <span className="min-w-0">
        <span className="font-branding text-lg text-[var(--text-primary)] block leading-none">
          {SITE_NAME}
        </span>
        {subtitle ? <span className="block mt-1">{subtitle}</span> : null}
      </span>
    </span>
  );
}
