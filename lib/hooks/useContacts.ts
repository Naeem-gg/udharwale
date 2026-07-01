import useSWR from 'swr';
import { Contact } from '../../app/components/types';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('API session load failed');
  return res.json();
});

export function useContacts() {
  const { data, error, isLoading, mutate } = useSWR<Contact[]>('/api/contacts', fetcher, {
    revalidateOnFocus: true,
  });

  return {
    contacts: data || [],
    isLoading,
    isError: error,
    mutateContacts: mutate,
  };
}
