export const SITE_URL = 'https://udharwaale.vercel.app';
export const SITE_NAME = 'Udharwale';
export const SITE_CREATOR = 'Naeem Navjivan';

export const DEFAULT_DESCRIPTION =
  'Free personal khata book to track money you gave, money you got, settlements, and WhatsApp reminders — private and simple.';

export function absoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized === '/' ? '' : normalized}`;
}
