import crypto from 'crypto';

const RESERVED = new Set([
  'share',
  'trip',
  'trips',
  'api',
  'login',
  'signup',
  'dashboard',
  'c',
  't',
  'you',
  'me',
  'admin',
]);

/** Turn a person/trip name into a URL-safe slug fragment. */
export function slugifyShareName(name: string, maxLen = 18): string {
  const base = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, maxLen)
    .replace(/-+$/g, '');

  if (!base || RESERVED.has(base) || /^\d+$/.test(base)) return 'chat';
  return base;
}

/** Short random suffix (base36) — ~6 chars ≈ 31 bits. */
export function shortShareSuffix(bytes = 4): string {
  return crypto.randomBytes(bytes).toString('hex').slice(0, 6);
}

/**
 * Meaningful share token: `rahul-a3f2c1`
 * Unique enough with sparse index + retry on collision.
 */
export function buildShareToken(name: string, prefix?: string): string {
  const slug = slugifyShareName(name);
  const suffix = shortShareSuffix();
  if (prefix) return `${prefix}-${slug}-${suffix}`;
  return `${slug}-${suffix}`;
}

/** Old hex / trip_ tokens from earlier versions. */
export function isLegacyShareToken(token: string): boolean {
  const t = String(token || '');
  if (/^[a-f0-9]{32}$/i.test(t)) return true;
  if (/^trip_[a-f0-9]{24}$/i.test(t)) return true;
  return false;
}

export function isValidShareTokenFormat(token: string): boolean {
  const t = String(token || '').trim();
  if (t.length < 6 || t.length > 80) return false;
  // Allow legacy hex, trip_*, and slug-suffix forms
  return /^[a-z0-9][a-z0-9_-]*$/i.test(t);
}

/** Public chat path — short `/c/...` */
export function chatSharePath(token: string): string {
  return `/c/${token}`;
}

/** Public trip path — short `/t/...` */
export function tripSharePath(token: string): string {
  return `/t/${token}`;
}
