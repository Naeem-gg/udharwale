import type { MetadataRoute } from 'next';
import { DEFAULT_DESCRIPTION, SITE_CREATOR, SITE_ICON, SITE_ICON_192, SITE_NAME } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} by ${SITE_CREATOR}`,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f4f1ec',
    theme_color: '#0f766e',
    categories: ['finance', 'productivity'],
    icons: [
      {
        src: SITE_ICON_192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: SITE_ICON,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: SITE_ICON,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
