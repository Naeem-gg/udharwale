import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/signup', '/split', '/privacy-policy', '/terms-of-service', '/share/', '/c/', '/t/'],
        disallow: ['/dashboard', '/login', '/forgot-password', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
