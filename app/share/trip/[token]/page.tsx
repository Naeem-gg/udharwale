import { redirect } from 'next/navigation';
import { tripSharePath } from '@/lib/share-slug';

type PageProps = {
  params: Promise<{ token: string }>;
};

/** Legacy `/share/trip/{token}` → short `/t/{token}` */
export default async function LegacySharedTripRedirect({ params }: PageProps) {
  const { token } = await params;
  redirect(tripSharePath(token));
}
