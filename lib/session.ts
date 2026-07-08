import { auth } from '@/auth';

export async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
