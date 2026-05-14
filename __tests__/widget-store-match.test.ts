import { describe, it, expect } from 'vitest';
import { matchStoreByText } from '@/lib/widget/store-match';

const STORES = [
  { id: 'sj-downtown', name: 'Downtown San Jose',   address: '752 Commercial Street, San Jose, CA 95112' },
  { id: 'sj-westside', name: 'Westside San Jose',   address: '66 West Santa Clara Street, San Jose, CA 95113' },
  { id: 'oakland',     name: 'Oakland',             address: '4444 Broadway Avenue, Oakland, CA 94611' },
];

describe('matchStoreByText', () => {
  it('returns null for empty inputs', () => {
    expect(matchStoreByText('', STORES)).toBeNull();
    expect(matchStoreByText('752 Commercial', [])).toBeNull();
    expect(matchStoreByText('   ', STORES)).toBeNull();
  });

  it('returns null when needle is too short', () => {
    expect(matchStoreByText('ab', STORES)).toBeNull();
  });

  it('matches the visible "752 Commercial St…" truncation from the picker', () => {
    // This is exactly what the user reported — the header picker shows a
    // truncated address with an ellipsis.
    expect(matchStoreByText('752 Commercial St...', STORES)).toBe('sj-downtown');
    expect(matchStoreByText('752 Commercial St', STORES)).toBe('sj-downtown');
  });

  it('matches "66 West Santa Clara…" truncation', () => {
    expect(matchStoreByText('66 West Santa Clar...', STORES)).toBe('sj-westside');
    expect(matchStoreByText('66 West Santa Clara Street', STORES)).toBe('sj-westside');
  });

  it('matches by store name', () => {
    expect(matchStoreByText('Downtown San Jose', STORES)).toBe('sj-downtown');
    expect(matchStoreByText('Oakland', STORES)).toBe('oakland');
  });

  it('is case- and punctuation-insensitive', () => {
    expect(matchStoreByText('752 commercial street', STORES)).toBe('sj-downtown');
    expect(matchStoreByText('"752" Commercial Street.', STORES)).toBe('sj-downtown');
  });

  it('falls back to token overlap when neither substring matches cleanly', () => {
    // "Commercial Street downtown" shares "commercial" + "street" with the
    // SJ-downtown address — token overlap should pick it.
    expect(matchStoreByText('Commercial Street downtown', STORES)).toBe('sj-downtown');
  });

  it('returns null when nothing matches', () => {
    expect(matchStoreByText('999 Random Lane, Nowhere', STORES)).toBeNull();
    expect(matchStoreByText('xyz', STORES)).toBeNull();
  });

  it('does not over-match a generic word', () => {
    // "Street" alone shouldn't pick a winner — but we still expect null
    // because no single token pass requires 2+ overlaps.
    expect(matchStoreByText('Street', STORES)).toBeNull();
  });

  it('handles a store entry with no address gracefully', () => {
    const stores = [{ id: 'a', name: 'Acme' }];
    expect(matchStoreByText('Acme', stores)).toBe('a');
    expect(matchStoreByText('Random', stores)).toBeNull();
  });
});
