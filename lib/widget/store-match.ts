// ============================================================================
// Fuzzy store-matching for the chat widget.
//
// When the widget script can't read the selected store ID from cookies /
// localStorage / __NEXT_DATA__ / Apollo cache — which happens on Jane Roots
// builds that keep the store in React state — we fall back to scraping the
// visible store text from the page header. That text is whatever the
// visitor SEES in the location picker, e.g. "752 Commercial St" or
// "Downtown San Jose". This helper matches that scraped text against the
// store list configured in the container_config.jane_stores.
//
// Match precedence:
//   1. address substring (either direction)
//   2. name substring (either direction)
//   3. shared-token overlap on address (≥ 2 tokens ≥ 4 chars each)
//
// Returns the matched store ID, or null if no store passes any pass.
// ============================================================================

export interface StoreEntry {
  id: string;
  name?: string;
  address?: string;
}

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[.,#'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchStoreByText(text: string, stores: StoreEntry[]): string | null {
  if (!text || stores.length === 0) return null;
  const needle = norm(text);
  if (!needle || needle.length < 3) return null;

  // Substring passes require a strong needle — at least 8 chars OR
  // containing a digit (e.g. "752 Commercial"). Without this guard a
  // generic "Street" would substring-match every address.
  const strongNeedle = needle.length >= 8 || /\d/.test(needle);

  if (strongNeedle) {
    // Pass 1: full-address substring (most specific).
    for (const s of stores) {
      if (s.address) {
        const a = norm(s.address);
        if (a.includes(needle) || needle.includes(a)) return s.id;
      }
    }

    // Pass 2: store-name substring.
    for (const s of stores) {
      if (s.name) {
        const n = norm(s.name);
        if (n.includes(needle) || needle.includes(n)) return s.id;
      }
    }
  } else {
    // Weak needle (single short word): only match exact name equality.
    for (const s of stores) {
      if (s.name && norm(s.name) === needle) return s.id;
    }
  }

  // Pass 3: token-overlap on address (≥ 2 tokens, each ≥ 4 chars).
  // Catches "752 Commercial St" vs "752 Commercial Street, San Jose CA".
  for (const s of stores) {
    if (!s.address) continue;
    const addrTokens = new Set(norm(s.address).split(' ').filter(t => t.length >= 4));
    const needleTokens = new Set(needle.split(' ').filter(t => t.length >= 4));
    let overlap = 0;
    for (const t of needleTokens) if (addrTokens.has(t)) overlap++;
    if (overlap >= 2) return s.id;
  }

  return null;
}
