import { digitsOnly } from '@/lib/phone';

/** Normalize a UPI VPA for storage / compare. */
export function normalizeUpiId(value: string): string {
  return String(value || '').trim().toLowerCase();
}

/** Basic VPA shape: local@psp (e.g. name@oksbi). */
export function isValidUpiId(value: string): boolean {
  const v = normalizeUpiId(value);
  if (!v || v.length > 120) return false;
  return /^[a-z0-9._-]{2,64}@[a-z][a-z0-9.-]{1,48}$/i.test(v);
}

/**
 * Indian mobile → UPI payee address (`9876543210@upi`).
 * Most UPI apps resolve a linked mobile via NPCI's UPI number mapping.
 * Returns null for short / sample / placeholder numbers.
 */
export function phoneToUpiPa(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length < 10) return null;

  const last10 = digits.slice(-10);
  // Sample / placeholder numbers used in seeded demos
  if (last10.startsWith('00000')) return null;
  // Reject obviously invalid leading digit for IN mobiles
  if (!/^[6-9]/.test(last10)) return null;

  return `${last10}@upi`;
}

/**
 * Prefer mobile `@upi`; fall back to an explicit VPA if one was saved.
 */
export function resolveUpiPayee(options: {
  phone?: string | null;
  upiId?: string | null;
}): string | null {
  const fromPhone = phoneToUpiPa(options.phone || '');
  if (fromPhone) return fromPhone;

  const vpa = normalizeUpiId(options.upiId || '');
  if (vpa && isValidUpiId(vpa)) return vpa;
  return null;
}

export type UpiPayParams = {
  /** Payee VPA or mobile@upi */
  pa: string;
  /** Amount in INR */
  am: number;
  /** Payee display name */
  pn?: string;
  /** Transaction note */
  tn?: string;
  cu?: string;
};

/**
 * Build a `upi://pay` deep link for GPay / PhonePe / Paytm / BHIM.
 * Returns null when payee or amount is invalid.
 */
export function buildUpiPayUrl(params: UpiPayParams): string | null {
  const pa = normalizeUpiId(params.pa);
  // Allow classic VPAs and mobile@upi
  const okPa = isValidUpiId(pa) || /^[6-9]\d{9}@upi$/i.test(pa);
  if (!okPa) return null;

  const amount = Math.round(Number(params.am) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const q = new URLSearchParams();
  q.set('pa', pa);
  q.set('am', amount.toFixed(2));
  q.set('cu', params.cu || 'INR');
  if (params.pn?.trim()) q.set('pn', params.pn.trim().slice(0, 50));
  if (params.tn?.trim()) q.set('tn', params.tn.trim().slice(0, 80));

  return `upi://pay?${q.toString()}`;
}
