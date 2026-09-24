import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // order-tracking pages are per-customer and carry a phone number
      disallow: ['/store/*/order/'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
