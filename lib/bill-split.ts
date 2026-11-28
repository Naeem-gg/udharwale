/** Equal bill split + the fewest payments that settle it. */

export type BillPerson = {
  id: string;
  name: string;
  paid: number;
};

export type BillDraft = {
  title: string;
  total: number;
  people: BillPerson[];
};

export type SettledPerson = {
  id: string;
  name: string;
  paid: number;
  share: number;
  /** paid − share. Positive means they are owed money. */
  net: number;
};

export type BillTransfer = {
  fromId: string;
  from: string;
  toId: string;
  to: string;
  amount: number;
};

export type BillResult = {
  people: SettledPerson[];
  transfers: BillTransfer[];
  total: number;
  paidTotal: number;
  /** True when every share is the same rupee amount. */
  evenSplit: boolean;
  /** Typical share, or the average when paisa remainder makes shares differ by ₹0.01. */
  perHead: number;
  balanced: boolean;
  /** paidTotal − bill. Negative means the payments are short. */
  gap: number;
};

const MAX_PEOPLE = 16;
const MAX_MONEY = 10_000_000;

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100 + (value >= 0 ? 1e-8 : -1e-8)) / 100;
}

/** A stable text value for money inputs, without binary float tails. */
export function moneyInputValue(amount: number): string {
  const cents = Math.round(roundMoney(amount) * 100);
  if (!cents) return '';
  const rupees = Math.floor(Math.abs(cents) / 100);
  const paise = Math.abs(cents) % 100;
  const text = paise ? `${rupees}.${String(paise).padStart(2, '0')}` : String(rupees);
  return cents < 0 ? `-${text}` : text;
}

export function formatInr(amount: number): string {
  const rounded = roundMoney(amount);
  const hasPaise = Math.round(Math.abs(rounded) * 100) % 100 !== 0;
  return rounded.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Split a rupee total into `count` shares that add back up exactly. */
export function equalShares(total: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(roundMoney(total) * 100);
  const base = Math.floor(cents / count);
  let remainder = cents - base * count;
  return Array.from({ length: count }, () => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return (base + extra) / 100;
  });
}

function uniqueLabels(people: BillPerson[]): string[] {
  const cleaned = people.map((person, index) => person.name.trim() || `Person ${index + 1}`);
  const totals = new Map<string, number>();
  cleaned.forEach((name) => totals.set(name, (totals.get(name) || 0) + 1));
  const seen = new Map<string, number>();
  return cleaned.map((name) => {
    if ((totals.get(name) || 0) < 2) return name;
    const next = (seen.get(name) || 0) + 1;
    seen.set(name, next);
    return `${name} (${next})`;
  });
}

/**
 * Greedy settlement: largest debtor pays the largest creditor until both sides are clear.
 * For the dinner example (A 700, B 300, C 500, D 0, E 0 on ₹1,500) this is
 * D→A 300, E→A 100, E→C 200.
 */
export function settleBill(draft: BillDraft): BillResult {
  const total = roundMoney(Math.max(0, draft.total));
  const labels = uniqueLabels(draft.people);
  const shares = equalShares(total, draft.people.length);

  const people: SettledPerson[] = draft.people.map((person, index) => {
    const paid = roundMoney(Math.max(0, person.paid));
    const share = shares[index] ?? 0;
    return {
      id: person.id,
      name: labels[index] || `Person ${index + 1}`,
      paid,
      share,
      net: roundMoney(paid - share),
    };
  });

  const paidTotal = roundMoney(people.reduce((sum, person) => sum + person.paid, 0));
  const gap = roundMoney(paidTotal - total);
  const balanced = Math.abs(gap) <= 0.009 && total > 0 && people.length >= 2;
  const uniqueShareCount = new Set(people.map((person) => person.share)).size;
  const perHead = people.length ? roundMoney(total / people.length) : 0;

  const debtors = people
    .filter((person) => person.net < -0.009)
    .map((person) => ({ id: person.id, name: person.name, balance: roundMoney(-person.net) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = people
    .filter((person) => person.net > 0.009)
    .map((person) => ({ id: person.id, name: person.name, balance: roundMoney(person.net) }))
    .sort((a, b) => b.balance - a.balance);

  const transfers: BillTransfer[] = [];
  if (balanced) {
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = roundMoney(Math.min(debtor.balance, creditor.balance));
      if (amount > 0.009) {
        transfers.push({
          fromId: debtor.id,
          from: debtor.name,
          toId: creditor.id,
          to: creditor.name,
          amount,
        });
      }
      debtor.balance = roundMoney(debtor.balance - amount);
      creditor.balance = roundMoney(creditor.balance - amount);
      if (debtor.balance <= 0.009) debtorIndex += 1;
      if (creditor.balance <= 0.009) creditorIndex += 1;
    }
  }

  return {
    people,
    transfers,
    total,
    paidTotal,
    evenSplit: uniqueShareCount <= 1,
    perHead,
    balanced,
    gap,
  };
}

export function formatBillShareText(draft: BillDraft, url?: string): string {
  const result = settleBill(draft);
  const title = draft.title.trim() || 'Bill';
  let text = `🍽️ *${title}* — ₹${formatInr(result.total)}\n`;
  text += `👥 ${result.people.length} people`;
  text += result.evenSplit
    ? ` · ₹${formatInr(result.perHead)} each\n`
    : ` · about ₹${formatInr(result.perHead)} each\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `*Who paid*\n`;
  result.people.forEach((person) => {
    text += `• ${person.name}: ₹${formatInr(person.paid)} (share ₹${formatInr(person.share)})\n`;
  });
  text += `\n*Who owes whom*\n`;
  if (!result.balanced) {
    const short = result.gap < 0;
    text += short
      ? `Payments are short by ₹${formatInr(Math.abs(result.gap))}.\n`
      : `Payments are over by ₹${formatInr(result.gap)}.\n`;
  } else if (result.transfers.length === 0) {
    text += `Everyone already paid their share.\n`;
  } else {
    result.transfers.forEach((transfer) => {
      text += `• *${transfer.from}* pays *${transfer.to}* ₹${formatInr(transfer.amount)}\n`;
    });
  }
  if (url) text += `\n${url}\n`;
  text += `\nSettled with Udharwale`;
  return text;
}

type EncodedBill = {
  t: string;
  b: number;
  p: [string, number][];
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeBill(draft: BillDraft): string {
  const payload: EncodedBill = {
    t: (draft.title || 'Bill').trim().slice(0, 40) || 'Bill',
    b: roundMoney(draft.total),
    p: draft.people.slice(0, MAX_PEOPLE).map((person, index) => [
      (person.name.trim() || `Person ${index + 1}`).slice(0, 24),
      roundMoney(Math.max(0, person.paid)),
    ]),
  };
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeBill(code: string): BillDraft | null {
  try {
    const clean = String(code || '').trim();
    if (!clean || clean.length > 4000) return null;
    const json = new TextDecoder().decode(base64UrlToBytes(clean));
    const data = JSON.parse(json) as Partial<EncodedBill>;
    if (!data || typeof data.b !== 'number' || !Array.isArray(data.p)) return null;
    if (data.p.length < 2 || data.p.length > MAX_PEOPLE) return null;
    const total = roundMoney(data.b);
    if (total <= 0 || total > MAX_MONEY) return null;

    const people: BillPerson[] = data.p.map((row, index) => {
      if (!Array.isArray(row) || row.length < 2) throw new Error('bad person');
      const paid = Number(row[1]);
      if (!Number.isFinite(paid) || paid < 0 || paid > MAX_MONEY) throw new Error('bad amount');
      return {
        id: `p${index + 1}`,
        name: String(row[0] ?? '').slice(0, 24),
        paid: roundMoney(paid),
      };
    });

    return {
      title: String(data.t || 'Bill').slice(0, 40) || 'Bill',
      total,
      people,
    };
  } catch {
    return null;
  }
}

export function billSharePath(code: string): string {
  return `/split?b=${code}`;
}

export const BILL_SPLIT_LIMITS = {
  minPeople: 2,
  maxPeople: MAX_PEOPLE,
  maxMoney: MAX_MONEY,
};
