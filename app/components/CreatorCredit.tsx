import { SITE_CREATOR, SITE_NAME } from '@/lib/seo';
import { cn } from '@/lib/utils';

type CreatorCreditProps = {
  /** compact = single muted line; hero = teal uppercase eyebrow */
  variant?: 'compact' | 'hero' | 'inline';
  className?: string;
  /** Show product name before creator */
  withProduct?: boolean;
};

/** Consistent “Naeem Navjivan” credit across marketing + app chrome. */
export default function CreatorCredit({
  variant = 'compact',
  className,
  withProduct = false,
}: CreatorCreditProps) {
  if (variant === 'hero') {
    return (
      <p
        className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary',
          className
        )}
      >
        By {SITE_CREATOR}
      </p>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn('font-semibold', className)}>
        {withProduct ? `${SITE_NAME} · ` : ''}
        {SITE_CREATOR}
      </span>
    );
  }

  return (
    <p className={cn('text-[11px] text-center text-muted-foreground', className)}>
      {withProduct ? (
        <>
          {SITE_NAME} by <span className="font-semibold text-primary">{SITE_CREATOR}</span>
        </>
      ) : (
        <>
          Built by <span className="font-semibold text-primary">{SITE_CREATOR}</span>
        </>
      )}
    </p>
  );
}
