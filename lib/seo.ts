export const SITE_URL = 'https://udharwaale.vercel.app';
export const SITE_NAME = 'Udharwale';
export const SITE_CREATOR = 'Naeem Navjivan';
export const SITE_CREDIT_LINE = `${SITE_NAME} by ${SITE_CREATOR}`;
export const SITE_BUILT_BY = `Built by ${SITE_CREATOR}`;

export const DEFAULT_DESCRIPTION =
  `Free personal khata book by ${SITE_CREATOR} — track money you gave, money you got, settlements, and WhatsApp reminders. Private and simple.`;

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized === '/' ? '' : normalized}`;
}
