/**
 * Internal Linker
 *
 * Finds relevant internal linking opportunities by comparing new content
 * against existing posts using text similarity.
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface InternalLinkSuggestion {
  anchor: string;
  url: string;
  relevance: number;
}

interface ExistingPost {
  url: string;
  title: string;
  content: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function extractKeyPhrases(text: string): string[] {
  const clean = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase();

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'it', 'its', 'not', 'no', 'from', 'as', 'if', 'your', 'you', 'we',
    'our', 'their', 'they', 'he', 'she', 'his', 'her', 'who', 'what',
    'when', 'where', 'how', 'which', 'all', 'each', 'every', 'both',
    'more', 'most', 'other', 'some', 'such', 'than', 'very', 'just',
    'also', 'about', 'up', 'out', 'so', 'into', 'over', 'after',
  ]);

  const words = clean.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));

  // Extract 2-3 word phrases
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  return phrases;
}

function calculateRelevance(newPhrases: Set<string>, postPhrases: Set<string>): number {
  let matches = 0;
  for (const phrase of newPhrases) {
    if (postPhrases.has(phrase)) matches++;
  }
  const maxPossible = Math.min(newPhrases.size, postPhrases.size);
  return maxPossible > 0 ? +(matches / maxPossible).toFixed(3) : 0;
}

function findBestAnchor(newContent: string, postTitle: string, postPhrases: Set<string>): string {
  // Prefer the post title as anchor if it appears (or is similar) in new content
  const cleanContent = newContent.replace(/<[^>]+>/g, ' ').toLowerCase();
  const cleanTitle = postTitle.toLowerCase();

  if (cleanContent.includes(cleanTitle)) return postTitle;

  // Find a shared phrase to use as anchor
  const newPhrases = extractKeyPhrases(newContent);
  for (const phrase of newPhrases) {
    if (postPhrases.has(phrase)) return phrase;
  }

  // Fall back to a shortened title
  return postTitle.split(/\s+/).slice(0, 5).join(' ');
}

// ── Public API ───────────────────────────────────────────────────────────

export async function findInternalLinks(
  newContent: string,
  existingPosts: ExistingPost[],
): Promise<InternalLinkSuggestion[]> {
  if (!newContent || existingPosts.length === 0) return [];

  const newPhrases = new Set(extractKeyPhrases(newContent));
  const suggestions: InternalLinkSuggestion[] = [];

  for (const post of existingPosts) {
    const postPhrases = new Set(extractKeyPhrases(post.content + ' ' + post.title));
    const relevance = calculateRelevance(newPhrases, postPhrases);

    if (relevance > 0.01) {
      suggestions.push({
        anchor: findBestAnchor(newContent, post.title, postPhrases),
        url: post.url,
        relevance,
      });
    }
  }

  suggestions.sort((a, b) => b.relevance - a.relevance);
  return suggestions.slice(0, 10);
}
