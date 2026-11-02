/** Strip to digits only. */
export function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Normalize phone for storage/lookup.
 * Prefers last 10 digits for Indian-style numbers; otherwise full digit string.
 */
export function normalizePhone(value: string): string {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}

export function looksLikePhone(identifier: string): boolean {
  const trimmed = String(identifier || '').trim();
  if (trimmed.includes('@')) return false;
  const digits = digitsOnly(trimmed);
  return digits.length >= 8;
}
