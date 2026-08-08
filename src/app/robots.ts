import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/loginmaster', '/api/'],
      },
    ],
    sitemap: 'https://tiadesigns.it/sitemap.xml',
  };
}
