/** Browser localStorage cache for stale-while-revalidate UI warm starts. */

export const CONTACTS_CACHE_KEY = 'udharwale-contacts-v1';
export const SESSION_CACHE_KEY = 'udharwale-session-v1';
export const TRIPS_CACHE_KEY = 'udharwale-trips-v1';

type CacheEnvelope<T> = {
  userKey: string;
  updatedAt: number;
  data: T;
};

export type CachedSession = {
  name: string;
  email: string;
  phone: string;
  avatarSeed?: string;
  upiId?: string;
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readEnvelope<T>(key: string): CacheEnvelope<T> | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed !== 'object' || !parsed.userKey || parsed.data === undefined) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeEnvelope<T>(key: string, userKey: string, data: T) {
  if (!canUseStorage() || !userKey) return;
  try {
    const payload: CacheEnvelope<T> = {
      userKey,
      updatedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore
  }
}

function removeKey(key: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function sessionUserKey(email?: string | null, phone?: string | null, name?: string | null) {
  return (email || phone || name || '').trim().toLowerCase();
}

export function readSessionCache(): (CachedSession & { userKey: string }) | null {
  const envelope = readEnvelope<CachedSession>(SESSION_CACHE_KEY);
  if (!envelope?.data) return null;
  return { userKey: envelope.userKey, ...envelope.data };
}

export function writeSessionCache(userKey: string, session: CachedSession) {
  writeEnvelope(SESSION_CACHE_KEY, userKey, session);
}

export function readContactsCache<T = unknown>(userKey?: string | null): T[] | null {
  const envelope = readEnvelope<T[]>(CONTACTS_CACHE_KEY);
  if (!envelope || !Array.isArray(envelope.data)) return null;
  if (userKey && envelope.userKey !== userKey) return null;
  return envelope.data;
}

export function writeContactsCache<T>(userKey: string, contacts: T[]) {
  writeEnvelope(CONTACTS_CACHE_KEY, userKey, contacts);
}

/** Legacy trips cache was a bare array — support both shapes. */
export function readTripsCache<T = unknown>(userKey?: string | null): T[] | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(TRIPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.data) &&
      (!userKey || parsed.userKey === userKey)
    ) {
      return parsed.data as T[];
    }
    return null;
  } catch {
    return null;
  }
}

export function writeTripsCache<T>(userKey: string, trips: T[]) {
  writeEnvelope(TRIPS_CACHE_KEY, userKey, trips);
}

export function clearClientCaches() {
  removeKey(CONTACTS_CACHE_KEY);
  removeKey(SESSION_CACHE_KEY);
  removeKey(TRIPS_CACHE_KEY);
}
