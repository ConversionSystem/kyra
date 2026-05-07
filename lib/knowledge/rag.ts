// ============================================================================
// Knowledge RAG — Retrieve & inject relevant knowledge into AI prompts
//
// Fetches knowledge documents from Supabase for a given client/agency,
// and builds a knowledge context string to inject into the system prompt.
// This makes the AI actually USE the trained knowledge base.
//
// Strategies:
// 1. Keyword matching against document titles + content
// 2. Full knowledge injection (for small knowledge bases < 4000 chars total)
// 3. Relevance scoring with top-K selection for larger bases
// ============================================================================

import { createClient as createSupabase } from '@supabase/supabase-js';

// Max chars of knowledge to inject into the system prompt.
//
// Bumped 2026-05-05 from 6000 → 40000 after a Purple Lotus audit:
// the dispensary's 26K-char training doc (covering senior/veteran/student
// discounts, return policy specifics, escalation phone, brand list,
// magical-moment phrases) was being silently truncated to ~6K chars,
// dropping everything past section 9. With Sonnet 4.6's 200K context
// window, ~10K tokens of KB is a non-issue cost-wise (~$0.03/request)
// and it lets agencies upload comprehensive concierge docs without
// having to chunk them by hand. Truly huge KBs (>40K) still fall to
// the scoring path below.
const MAX_KNOWLEDGE_CHARS = 40000;

// Window of each doc's content used by the relevance scorer. Was 2000,
// then 10000 — bumped to 20000 (2026-05-06) after a Purple Lotus audit
// found the return-policy section sits at position ~10,982 in the PDF,
// just outside the 10K window, so "return policy on cartridges?"
// scored low and lost the budget race to URL-scrape docs. 20K covers
// the bulk of even comprehensive 25K-char concierge docs.
const SCORING_CONTENT_WINDOW = 20000;

const MIN_RELEVANCE_SCORE = 0.1;

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  source_type: string;
  source_url: string | null;
  char_count: number;
  client_id: string | null;
}

interface KnowledgeContext {
  text: string;
  docCount: number;
  totalChars: number;
  sources: string[];
}

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Retrieve relevant knowledge for a client/agency and user message.
 * Returns a formatted context string ready to inject into system prompt.
 */
export async function getKnowledgeContext(
  agencyId: string,
  clientId: string | null,
  userMessage: string,
): Promise<KnowledgeContext> {
  const empty: KnowledgeContext = { text: '', docCount: 0, totalChars: 0, sources: [] };

  const supabase = getSupabase();

  // Fetch all enabled knowledge docs for this agency
  // Include agency-wide docs + client-specific docs
  let query = supabase
    .from('knowledge_documents')
    .select('id, title, content, source_type, source_url, char_count, client_id')
    .eq('agency_id', agencyId)
    .eq('enabled', true)
    .order('created_at', { ascending: true });

  if (clientId) {
    // Get agency-wide docs + client-specific docs
    query = query.or(`client_id.eq.${clientId},client_id.is.null`);
  } else {
    // Agency-level only
    query = query.is('client_id', null);
  }

  const { data: documents, error } = await query;

  if (error || !documents?.length) {
    return empty;
  }

  // ── Doc partitioning: file-priority RAG ─────────────────────────────────
  // User-uploaded training docs (source_type='file') are the canonical,
  // hand-curated source — they should ALWAYS be included in full when
  // there's any budget at all, even if a competing URL scrape happens
  // to score higher on a given query. URL scrapes (auto-train) are
  // auxiliary; they fill the remainder of the budget.
  //
  // This was added 2026-05-06 after a Purple Lotus audit: the agency's
  // 26K-char training PDF was getting truncated below its return-policy
  // section because URL-scrape duplicates of the same brand site were
  // eating the budget when total exceeded 40K. File-priority fixes
  // it without forcing agencies to manually delete every URL scrape.
  const fileDocs = documents.filter(d => d.source_type === 'file');
  const urlDocs = documents.filter(d => d.source_type !== 'file');
  const fileTotalSize = fileDocs.reduce((sum, d) => sum + (d.char_count || d.content.length), 0);
  const totalSize = documents.reduce((sum, d) => sum + (d.char_count || d.content.length), 0);

  let selectedDocs: KnowledgeDoc[];

  if (totalSize <= MAX_KNOWLEDGE_CHARS) {
    // Small knowledge base — inject everything in original order.
    selectedDocs = documents;
  } else if (fileTotalSize >= MAX_KNOWLEDGE_CHARS) {
    // File docs alone exceed budget — score among files only and pick
    // top matches. Skip URL docs entirely (rare path, very large training
    // sets only).
    selectedDocs = scoreAndSelect(fileDocs, userMessage);
  } else {
    // Hybrid: include all file docs first, then score URL docs into the
    // remaining budget. This guarantees the canonical training doc is
    // never truncated below 100% as long as it fits under the budget.
    const remainingBudget = MAX_KNOWLEDGE_CHARS - fileTotalSize;
    const urlSelection = scoreAndSelectWithBudget(urlDocs, userMessage, remainingBudget);
    selectedDocs = [...fileDocs, ...urlSelection];
  }

  if (selectedDocs.length === 0) return empty;

  // Build context string
  const sections: string[] = [];
  let charCount = 0;

  for (const doc of selectedDocs) {
    const section = `### ${doc.title}\n${doc.content}`;
    if (charCount + section.length > MAX_KNOWLEDGE_CHARS) {
      // Truncate last doc if needed
      const remaining = MAX_KNOWLEDGE_CHARS - charCount;
      if (remaining > 200) {
        sections.push(`### ${doc.title}\n${doc.content.slice(0, remaining - doc.title.length - 10)}...`);
      }
      break;
    }
    sections.push(section);
    charCount += section.length;
  }

  const text = [
    '## Business Knowledge Base',
    'Use the following information to answer questions accurately. If the answer is in your knowledge base, use it. If not, say you\'ll connect them with the team.',
    '',
    ...sections,
  ].join('\n');

  return {
    text,
    docCount: selectedDocs.length,
    totalChars: charCount,
    sources: selectedDocs
      .filter(d => d.source_url)
      .map(d => d.source_url!),
  };
}

/**
 * Score URL docs and select up to a custom budget (used by the file-priority
 * path so that file docs claim the bulk of MAX_KNOWLEDGE_CHARS first and URL
 * docs fill the remainder). Same scoring algorithm as scoreAndSelect.
 */
function scoreAndSelectWithBudget(
  documents: KnowledgeDoc[],
  userMessage: string,
  budget: number,
): KnowledgeDoc[] {
  if (documents.length === 0 || budget <= 0) return [];
  const ranked = rankDocsByRelevance(documents, userMessage);
  const selected: KnowledgeDoc[] = [];
  let charsUsed = 0;
  for (const doc of ranked) {
    if (charsUsed + doc.content.length > budget) {
      // Try to fit one more if there's room (mirrors the original heuristic)
      if (charsUsed < budget * 0.7) selected.push(doc);
      break;
    }
    selected.push(doc);
    charsUsed += doc.content.length;
  }
  return selected;
}

/**
 * Rank documents by relevance to the user's message. Returns docs ordered
 * by descending score, filtered by MIN_RELEVANCE_SCORE. Shared by both
 * scoreAndSelect (full-budget path) and scoreAndSelectWithBudget
 * (file-priority remainder path) so scoring stays consistent.
 */
function rankDocsByRelevance(documents: KnowledgeDoc[], userMessage: string): KnowledgeDoc[] {
  const messageLower = userMessage.toLowerCase();
  const messageWords = extractKeywords(messageLower);
  const phrases = extractPhrases(messageLower);

  const scored = documents.map(doc => {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase().slice(0, SCORING_CONTENT_WINDOW);
    let score = 0;

    for (const word of messageWords) {
      if (titleLower.includes(word)) score += 3;
      if (contentLower.includes(word)) score += 1;
    }
    for (const phrase of phrases) {
      if (contentLower.includes(phrase)) score += 5;
    }

    if (doc.client_id) score *= 1.2;
    score = score / Math.max(messageWords.length, 1);

    return { doc, score };
  });

  return scored
    .filter(s => s.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score)
    .map(s => s.doc);
}

/**
 * Score documents by relevance to the user's message and select top-K.
 */
function scoreAndSelect(documents: KnowledgeDoc[], userMessage: string): KnowledgeDoc[] {
  const ranked = rankDocsByRelevance(documents, userMessage);

  // Select top docs that fit within character budget
  const selected: KnowledgeDoc[] = [];
  let totalChars = 0;

  for (const doc of ranked) {
    if (totalChars + doc.content.length > MAX_KNOWLEDGE_CHARS) {
      // Try to fit one more if there's room
      if (totalChars < MAX_KNOWLEDGE_CHARS * 0.7) {
        selected.push(doc);
      }
      break;
    }
    selected.push(doc);
    totalChars += doc.content.length;
  }

  // If no relevant docs found, include the most general docs (homepage, about)
  if (selected.length === 0) {
    const generalDocs = documents.filter(d =>
      /home|about|overview|general|welcome|intro/i.test(d.title),
    );
    if (generalDocs.length > 0) {
      let chars = 0;
      for (const doc of generalDocs) {
        if (chars + doc.content.length > MAX_KNOWLEDGE_CHARS) break;
        selected.push(doc);
        chars += doc.content.length;
      }
    }
  }

  return selected;
}

/**
 * Extract meaningful keywords from a message (skip stop words).
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'over',
    'after', 'and', 'but', 'or', 'nor', 'not', 'no', 'so', 'if', 'then',
    'than', 'too', 'very', 'just', 'that', 'this', 'what', 'which',
    'who', 'how', 'when', 'where', 'why', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
    'own', 'same', 'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you',
    'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their',
    'hi', 'hello', 'hey', 'thanks', 'thank', 'please', 'ok', 'okay',
  ]);

  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Extract 2-3 word phrases from the message.
 */
function extractPhrases(text: string): string[] {
  const words = text.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const phrases: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  return phrases;
}
