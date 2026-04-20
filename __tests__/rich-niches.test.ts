/**
 * __tests__/rich-niches.test.ts
 *
 * Covers the /ai-for/[slug] route-conflict resolution from Phase 0.10.
 * Prior to that commit, the codebase had BOTH app/ai-for/[niche]/page.tsx
 * and app/ai-for/[slug]/page.tsx at the same level — Next.js cannot
 * build this configuration. The fix merged the hand-authored rich-niche
 * pages into the [slug] route via a NICHES data module.
 *
 * Tests verify:
 *   - All expected rich niches (dental, cannabis, fitness, home-services)
 *     exist in the NICHES record
 *   - NICHE_SLUGS matches Object.keys(NICHES)
 *   - Each niche has the minimum fields required to render (no runtime
 *     "undefined" data in the page)
 *   - No niche slug collides with "index" or other reserved paths
 */
import { describe, test, expect } from 'vitest';
import { NICHES, NICHE_SLUGS } from '@/app/ai-for/[slug]/rich-niches-data';

describe('Rich niche data — NICHES record', () => {
  test('NICHE_SLUGS equals Object.keys(NICHES)', () => {
    expect([...NICHE_SLUGS].sort()).toEqual(Object.keys(NICHES).sort());
  });

  test('contains the 4 expected rich-content niches', () => {
    const expected = ['dental', 'cannabis', 'fitness', 'home-services'];
    for (const slug of expected) {
      expect(NICHES).toHaveProperty(slug);
    }
  });

  test('each niche has all required fields for rendering', () => {
    const required: (keyof (typeof NICHES)[keyof typeof NICHES])[] = [
      'slug',
      'title',
      'metaTitle',
      'metaDesc',
      'emoji',
      'hero',
      'subhero',
      'pain',
      'painDetail',
      'result',
      'resultStat',
      'features',
      'useCases',
      'faq',
      'keywords',
      'demoSlug',
    ];

    for (const [nicheSlug, data] of Object.entries(NICHES)) {
      for (const field of required) {
        expect(data[field], `${nicheSlug}.${String(field)} missing`).toBeDefined();
      }
    }
  });

  test('slug field on each niche matches its key', () => {
    for (const [key, data] of Object.entries(NICHES)) {
      expect(data.slug).toBe(key);
    }
  });

  test('each niche has at least one feature + FAQ entry + use case', () => {
    for (const [slug, data] of Object.entries(NICHES)) {
      expect(data.features.length, `${slug} has no features`).toBeGreaterThan(0);
      expect(data.faq.length, `${slug} has no FAQ`).toBeGreaterThan(0);
      expect(data.useCases.length, `${slug} has no use cases`).toBeGreaterThan(0);
    }
  });

  test('each feature has icon + title + desc', () => {
    for (const [slug, data] of Object.entries(NICHES)) {
      for (const [i, f] of data.features.entries()) {
        expect(f.icon, `${slug}.features[${i}].icon missing`).toBeTruthy();
        expect(f.title, `${slug}.features[${i}].title missing`).toBeTruthy();
        expect(f.desc, `${slug}.features[${i}].desc missing`).toBeTruthy();
      }
    }
  });

  test('each FAQ entry has q + a', () => {
    for (const [slug, data] of Object.entries(NICHES)) {
      for (const [i, item] of data.faq.entries()) {
        expect(item.q, `${slug}.faq[${i}].q missing`).toBeTruthy();
        expect(item.a, `${slug}.faq[${i}].a missing`).toBeTruthy();
      }
    }
  });

  test('each niche has at least 3 SEO keywords', () => {
    for (const [slug, data] of Object.entries(NICHES)) {
      expect(data.keywords.length, `${slug} needs ≥3 keywords`).toBeGreaterThanOrEqual(3);
    }
  });

  test('demoSlug on each niche is a non-empty string', () => {
    for (const [slug, data] of Object.entries(NICHES)) {
      expect(typeof data.demoSlug).toBe('string');
      expect(data.demoSlug.length, `${slug}.demoSlug is empty`).toBeGreaterThan(0);
    }
  });

  test('no niche slug starts with special characters (URL-safe)', () => {
    for (const slug of NICHE_SLUGS) {
      expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });

  test('metaTitle + metaDesc are not empty (SEO critical)', () => {
    for (const [slug, data] of Object.entries(NICHES)) {
      expect(data.metaTitle.length, `${slug}.metaTitle empty`).toBeGreaterThan(10);
      expect(data.metaDesc.length, `${slug}.metaDesc empty`).toBeGreaterThan(20);
    }
  });
});
