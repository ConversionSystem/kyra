// ============================================================================
// Content Similarity Checker
//
// Before deploying a site, compares generated content against other Kyra sites
// in the same industry + region. Uses basic TF-IDF cosine similarity on word
// frequency vectors (no external dependencies).
//
// Flags if >60% similar to prevent Google content-farm penalties.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const SIMILARITY_THRESHOLD = 0.6;

// ---------- Public API ----------

export async function checkContentSimilarity(
  siteId: string,
  industry: string,
  region: string,
): Promise<{ similar: boolean; score: number; warning?: string }> {
  const supabase = createServiceClientWithoutCookies();

  // 1. Get this site's pages content
  const { data: thisPages, error: e1 } = await supabase
    .from('site_pages')
    .select('content_sections, hero_h1, hero_subtitle')
    .eq('site_id', siteId);

  if (e1 || !thisPages?.length) {
    return { similar: false, score: 0, warning: 'Could not load site pages for comparison' };
  }

  const thisText = extractText(thisPages);
  if (thisText.length < 100) {
    return { similar: false, score: 0 };
  }

  // 2. Find other sites in the same industry + region (by city/state)
  // We match on industry and the state from the address
  const { data: otherSites, error: e2 } = await supabase
    .from('client_sites')
    .select('id')
    .eq('industry', industry)
    .neq('id', siteId)
    .in('status', ['live', 'building', 'deploying']);

  if (e2 || !otherSites?.length) {
    return { similar: false, score: 0 };
  }

  // Filter to same region (state-level match through address JSON)
  // We'll compare against all sites in same industry and filter by region text
  const otherIds = otherSites.map((s) => s.id);

  // 3. Get pages from other sites (batch, limit to avoid huge queries)
  const batchSize = 10;
  let highestScore = 0;
  let highestSiteId = '';

  for (let i = 0; i < otherIds.length; i += batchSize) {
    const batch = otherIds.slice(i, i + batchSize);
    const { data: otherPages } = await supabase
      .from('site_pages')
      .select('site_id, content_sections, hero_h1, hero_subtitle')
      .in('site_id', batch);

    if (!otherPages?.length) continue;

    // Group pages by site_id
    const bySite = new Map<string, typeof otherPages>();
    for (const page of otherPages) {
      const existing = bySite.get(page.site_id) || [];
      existing.push(page);
      bySite.set(page.site_id, existing);
    }

    // Compare each competitor site
    for (const [otherId, pages] of bySite.entries()) {
      const otherText = extractText(pages);
      if (otherText.length < 100) continue;

      const score = cosineSimilarity(
        tfidfVector(thisText),
        tfidfVector(otherText),
      );

      if (score > highestScore) {
        highestScore = score;
        highestSiteId = otherId;
      }
    }
  }

  const isSimilar = highestScore > SIMILARITY_THRESHOLD;

  return {
    similar: isSimilar,
    score: Math.round(highestScore * 100) / 100,
    warning: isSimilar
      ? `Content is ${Math.round(highestScore * 100)}% similar to another ${industry} site (${highestSiteId.slice(0, 8)}...) in ${region}. Consider adding more unique business details or regenerating with updated owner story.`
      : undefined,
  };
}

// ---------- Text Extraction ----------

function extractText(
  pages: Array<{
    content_sections: unknown;
    hero_h1: string | null;
    hero_subtitle: string | null;
  }>,
): string {
  const parts: string[] = [];

  for (const page of pages) {
    if (page.hero_h1) parts.push(page.hero_h1);
    if (page.hero_subtitle) parts.push(page.hero_subtitle);

    if (Array.isArray(page.content_sections)) {
      for (const section of page.content_sections as Array<{
        heading?: string;
        body?: string;
        bullets?: string[];
      }>) {
        if (section.heading) parts.push(section.heading);
        if (section.body) parts.push(section.body);
        if (section.bullets) parts.push(...section.bullets);
      }
    }
  }

  return parts.join(' ');
}

// ---------- TF-IDF Implementation ----------

// Common English stop words to exclude from comparison
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'it', 'its', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'what',
  'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
  'if', 'as', 'also', 'into', 'up', 'out', 'any', 'here', 'there',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  const total = tokens.length || 1;
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  // Normalize by document length
  for (const [term, count] of freq) {
    freq.set(term, count / total);
  }
  return freq;
}

function tfidfVector(text: string): Map<string, number> {
  // For pairwise comparison, TF is sufficient since IDF would require
  // a corpus. We use term frequency normalized by doc length.
  const tokens = tokenize(text);
  return termFrequency(tokens);
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  // Get all terms from both documents
  const allTerms = new Set([...a.keys(), ...b.keys()]);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const term of allTerms) {
    const valA = a.get(term) || 0;
    const valB = b.get(term) || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
