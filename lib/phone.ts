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

/**
 * Build a WhatsApp `phone` query value (digits with country code).
 * Returns null for empty / placeholder sample numbers.
 */
export function toWhatsAppPhone(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length < 10) return null;

  const last10 = digits.slice(-10);
  // Sample / placeholder numbers used in seeded demos
  if (last10.startsWith('00000')) return null;

  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 12 && digits.endsWith(last10)) {
    // Keep existing country code prefix when present
    return digits;
  }
  return `91${last10}`;
}
