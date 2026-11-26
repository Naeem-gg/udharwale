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

export type UpiPayParams = {
  /** Payee VPA */
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
 * Returns null when VPA or amount is invalid.
 */
export function buildUpiPayUrl(params: UpiPayParams): string | null {
  const pa = normalizeUpiId(params.pa);
  if (!isValidUpiId(pa)) return null;

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
