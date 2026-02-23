import type { MetadataRoute } from 'next';
import { POSTS } from '@/lib/blog/posts';

const BASE = 'https://kyra.conversionsystem.com';

const INDUSTRIES = ['dental', 'realestate', 'auto', 'cannabis', 'restaurant', 'medspa', 'law', 'fitness'];
const BLOG_SLUGS = POSTS.map(p => p.slug);
const FOR_INDUSTRIES = ['dental', 'cannabis', 'realestate', 'auto', 'restaurant', 'medspa'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                        lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/pricing`,           lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/pitch`,             lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/vs`,                lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/changelog`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/help`,              lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/get-demo`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/roi`,               lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/privacy`,           lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms`,             lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/signup/agency`,     lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/login`,             lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const demoPages: MetadataRoute.Sitemap = INDUSTRIES.map(slug => ({
    url: `${BASE}/demo/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const tryPages: MetadataRoute.Sitemap = INDUSTRIES.map(slug => ({
    url: `${BASE}/try/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  const forPages: MetadataRoute.Sitemap = FOR_INDUSTRIES.map(slug => ({
    url: `${BASE}/for/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = BLOG_SLUGS.map(slug => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...demoPages, ...tryPages, ...forPages, ...blogPages];
}
