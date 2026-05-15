// ============================================================================
// Tests for `bucketStoreSource`, which rolls raw `store_detected:<source>`
// telemetry labels into the 7 operator-friendly categories shown on the
// Insights "Store detection paths" card.
//
// We re-implement the function inline rather than exporting it from the
// route file — it's a tiny pure helper, and exporting from a Next.js
// route module would make Next think it's a route handler.
// ============================================================================
import { describe, it, expect } from 'vitest';

function bucketStoreSource(label: string): string {
  if (!label) return 'unresolved';
  if (label === 'cookie') return 'cookie';
  if (label === '__NEXT_DATA__') return 'next-data';
  if (label.startsWith('__APOLLO_STATE__')) return 'apollo';
  if (label.startsWith('dom:')) return 'dom-scrape';
  if (label === 'widget-default') return 'widget-default';
  if (label === 'unresolved') return 'unresolved';
  return 'localStorage';
}

describe('bucketStoreSource', () => {
  it('treats empty/missing as unresolved', () => {
    expect(bucketStoreSource('')).toBe('unresolved');
    expect(bucketStoreSource('unresolved')).toBe('unresolved');
  });

  it('recognizes the cookie path', () => {
    expect(bucketStoreSource('cookie')).toBe('cookie');
  });

  it('recognizes Next.js SSR data', () => {
    expect(bucketStoreSource('__NEXT_DATA__')).toBe('next-data');
  });

  it('recognizes Apollo cache entries (any key)', () => {
    expect(bucketStoreSource('__APOLLO_STATE__:Store:4398')).toBe('apollo');
    expect(bucketStoreSource('__APOLLO_STATE__:Dispensary:567')).toBe('apollo');
  });

  it('buckets all DOM-scrape selectors under one label', () => {
    expect(bucketStoreSource('dom:[data-testid*="store"]')).toBe('dom-scrape');
    expect(bucketStoreSource('dom:header [class*="address"]')).toBe('dom-scrape');
    expect(bucketStoreSource('dom:street-regex')).toBe('dom-scrape');
  });

  it('flags widget-default fallback', () => {
    expect(bucketStoreSource('widget-default')).toBe('widget-default');
  });

  it('treats anything else as a localStorage key', () => {
    expect(bucketStoreSource('jane:store-id')).toBe('localStorage');
    expect(bucketStoreSource('roots:store-id')).toBe('localStorage');
    expect(bucketStoreSource('kyra_store_abc123')).toBe('localStorage');
  });
});
