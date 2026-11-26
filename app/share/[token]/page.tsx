import { redirect } from 'next/navigation';
import { chatSharePath } from '@/lib/share-slug';

type PageProps = {
  params: Promise<{ token: string }>;
};

/** Legacy `/share/{token}` → short `/c/{token}` */
export default async function LegacySharedChatRedirect({ params }: PageProps) {
  const { token } = await params;
  redirect(chatSharePath(token));
}
