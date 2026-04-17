import type { MetadataRoute } from 'next';
import { INDUSTRY_TEMPLATES } from '@/lib/templates/industry-templates';
import { POSTS } from '@/lib/blog/posts';

const BASE = 'https://kyra.conversionsystem.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Core pages
  const corePages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/solo`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/ai-for`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/workers`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/launch`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/tools/ai-readiness`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/llms.txt`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/llms-full.txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Blog posts — index for SEO and GEO (AI citation surfacing)
  const blogPages: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.date,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // 50 industry pages — high SEO value
  const industryPages: MetadataRoute.Sitemap = INDUSTRY_TEMPLATES.map((t) => ({
    url: `${BASE}/ai-for/${t.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Demo pages
  const demoSlugs = ['dental', 'cannabis', 'realestate', 'auto', 'restaurant', 'medspa'];
  const demoPages: MetadataRoute.Sitemap = demoSlugs.map((slug) => ({
    url: `${BASE}/demo/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Try pages
  const tryPages: MetadataRoute.Sitemap = demoSlugs.map((slug) => ({
    url: `${BASE}/try/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...corePages, ...blogPages, ...industryPages, ...demoPages, ...tryPages];
}
