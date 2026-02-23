import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/agency/',
          '/admin/',
          '/portal/',
          '/(auth)/',
          '/signup/',
          '/login',
        ],
      },
    ],
    sitemap: 'https://kyra.conversionsystem.com/sitemap.xml',
    host: 'https://kyra.conversionsystem.com',
  };
}
