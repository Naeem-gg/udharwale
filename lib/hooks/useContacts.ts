import useSWR from 'swr';
import { Contact } from '../../app/components/types';
import {
  readContactsCache,
  readSessionCache,
  writeContactsCache,
} from '@/lib/client-cache';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error('API session load failed');
    return res.json();
  });

function cachedContactsFallback(): Contact[] {
  const session = readSessionCache();
  if (!session) return [];
  return readContactsCache<Contact>(session.userKey) || [];
}

/** Optional SWR helper — Dashboard uses its own cache path for richer mutations. */
export function useContacts() {
  const fallback = cachedContactsFallback();
  const { data, error, isLoading, isValidating, mutate } = useSWR<Contact[]>(
    '/api/contacts',
    fetcher,
    {
      fallbackData: fallback.length ? fallback : undefined,
      revalidateOnFocus: true,
      keepPreviousData: true,
      onSuccess: (contacts) => {
        const session = readSessionCache();
        if (session?.userKey && Array.isArray(contacts)) {
          writeContactsCache(session.userKey, contacts);
        }
      },
    }
  );

  return {
    contacts: data || fallback,
    isLoading: isLoading && !fallback.length,
    isRefreshing: isValidating,
    isError: error,
    mutateContacts: mutate,
  };
}
