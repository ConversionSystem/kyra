/**
 * Client Knowledge Engine — Extraction Service
 *
 * Extracts structured knowledge from AI conversations and stores it
 * in the client_knowledge table. Uses GPT-4o-mini for cheap extraction.
 *
 * The knowledge loop:
 * 1. Conversation happens → extractKnowledge() pulls out facts
 * 2. Next conversation → getClientKnowledge() injects those facts into the prompt
 * 3. AI gives better, more consistent answers every time
 *
 * This is how AI workers get smarter with every conversation.
 */

import { createHash } from 'crypto';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export type KnowledgeCategory =
  | 'business_fact'
  | 'customer_pattern'
  | 'conversation_outcome'
  | 'contact_preference'
  | 'product_knowledge'
  | 'correction';

export interface KnowledgeEntry {
  id: string;
  client_id: string;
  agency_id: string;
  category: KnowledgeCategory;
  key: string;
  value: string;
  confidence: number;
  source_type: string;
  hash: string;
  first_seen_at: string;
  last_confirmed_at: string;
  times_confirmed: number;
  created_at: string;
  updated_at: string;
}

interface ExtractedKnowledge {
  category: KnowledgeCategory;
  key: string;
  value: string;
  confidence: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_CATEGORIES: KnowledgeCategory[] = [
  'business_fact',
  'customer_pattern',
  'conversation_outcome',
  'contact_preference',
  'product_knowledge',
  'correction',
];

const EXTRACTION_MODEL = 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const EXTRACTION_PROMPT = `You are a knowledge extraction engine. Analyze the following conversation between an AI worker and a customer, and extract factual knowledge about the business and its customers.

Return a JSON array of extracted knowledge items. Each item must have:
- "category": one of the categories listed below
- "key": a short snake_case identifier (e.g. "saturday_hours", "parking_info")
- "value": the actual knowledge in a clear, concise sentence
- "confidence": 0.0 to 1.0 indicating how certain this fact is

Categories:
- business_fact: Confirmed facts about the business (hours, pricing, policies, services, location details)
- customer_pattern: Patterns in customer behavior (common questions, peak inquiry times, communication preferences)
- conversation_outcome: What responses worked well or caused issues (successful booking, caused confusion)
- contact_preference: Specific customer preferences learned (preferred times, communication method)
- product_knowledge: Product/service details learned from conversations
- correction: Things the AI got wrong that were corrected by the customer or business owner

Rules:
- Only extract FACTUAL knowledge confirmed or implied in the conversation
- Do not speculate or make assumptions
- Skip greetings, small talk, and generic responses
- Prefer specific facts over vague observations
- If no knowledge can be extracted, return an empty array []
- Corrections (things the AI said wrong) are high-value — always capture them

Return ONLY valid JSON. No markdown, no explanation, just the array.`;

// ── Hash Helper ───────────────────────────────────────────────────────────────

function computeHash(category: string, key: string): string {
  return createHash('sha256').update(`${category}:${key}`).digest('hex');
}

// ── Extract Knowledge from Conversation ───────────────────────────────────────

/**
 * Analyze a conversation and extract structured knowledge.
 * Uses GPT-4o-mini for cheap, fast extraction.
 * Upserts into client_knowledge table (increments times_confirmed on duplicates).
 */
export async function extractKnowledge(
  clientId: string,
  agencyId: string,
  conversationMessages: ConversationMessage[],
): Promise<{ extracted: number; upserted: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[knowledge] No OPENAI_API_KEY — skipping extraction');
    return { extracted: 0, upserted: 0 };
  }

  // Filter to only user/assistant messages (skip system prompts)
  const transcript = conversationMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `${m.role === 'user' ? 'Customer' : 'AI Worker'}: ${m.content}`)
    .join('\n');

  if (!transcript.trim()) {
    return { extracted: 0, upserted: 0 };
  }

  // Call GPT-4o-mini for extraction
  let items: ExtractedKnowledge[];
  try {
    const res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EXTRACTION_MODEL,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: transcript },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`OpenAI returned ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '[]';

    // Parse response — handle both raw array and { items: [...] } formats
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (Array.isArray(parsed.items)) {
      items = parsed.items;
    } else if (Array.isArray(parsed.knowledge)) {
      items = parsed.knowledge;
    } else {
      items = [];
    }
  } catch (err) {
    console.error('[knowledge] LLM extraction failed:', err);
    return { extracted: 0, upserted: 0 };
  }

  // Validate and filter
  const validItems = items.filter((item) => {
    if (!item.category || !item.key || !item.value) return false;
    if (!VALID_CATEGORIES.includes(item.category)) return false;
    if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) {
      item.confidence = 0.7;
    }
    return true;
  });

  if (validItems.length === 0) {
    return { extracted: 0, upserted: 0 };
  }

  // Upsert into database
  const supabase = createServiceClientWithoutCookies();
  let upserted = 0;

  for (const item of validItems) {
    const hash = computeHash(item.category, item.key);

    // Check if exists
    const { data: existing } = await supabase
      .from('client_knowledge')
      .select('id, times_confirmed, confidence')
      .eq('client_id', clientId)
      .eq('hash', hash)
      .single();

    if (existing) {
      // Update: bump confirmation count, update confidence (average), refresh timestamp
      const newConfidence = Math.min(
        1.0,
        (existing.confidence * existing.times_confirmed + item.confidence) /
          (existing.times_confirmed + 1),
      );

      const { error } = await supabase
        .from('client_knowledge')
        .update({
          value: item.value,
          confidence: Math.round(newConfidence * 100) / 100,
          times_confirmed: existing.times_confirmed + 1,
          last_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (!error) upserted++;
    } else {
      // Insert new knowledge entry
      const { error } = await supabase.from('client_knowledge').insert({
        client_id: clientId,
        agency_id: agencyId,
        category: item.category,
        key: item.key,
        value: item.value,
        confidence: Math.round(item.confidence * 100) / 100,
        source_type: 'conversation',
        hash,
      });

      if (!error) upserted++;
    }
  }

  console.log(
    `[knowledge] Extracted ${validItems.length} items, upserted ${upserted} for client ${clientId}`,
  );

  return { extracted: validItems.length, upserted };
}

// ── Get Knowledge for a Client ────────────────────────────────────────────────

/**
 * Fetch all knowledge for a client, optionally filtered by category.
 * Returns formatted string ready for prompt injection.
 * Sorted by (confidence × times_confirmed) — most reliable facts first.
 */
export async function getClientKnowledge(
  clientId: string,
  categories?: KnowledgeCategory[],
): Promise<string | null> {
  const supabase = createServiceClientWithoutCookies();

  let query = supabase
    .from('client_knowledge')
    .select('*')
    .eq('client_id', clientId)
    .order('confidence', { ascending: false });

  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return null;
  }

  // Sort by reliability score (confidence × log(times_confirmed + 1))
  const sorted = (data as KnowledgeEntry[]).sort((a, b) => {
    const scoreA = a.confidence * Math.log2(a.times_confirmed + 1);
    const scoreB = b.confidence * Math.log2(b.times_confirmed + 1);
    return scoreB - scoreA;
  });

  return formatKnowledgeForPrompt(sorted);
}

// ── Get Raw Knowledge Entries (for API/dashboard) ─────────────────────────────

/**
 * Fetch raw knowledge entries for a client (paginated).
 * Used by the API and dashboard, not for prompt injection.
 */
export async function getClientKnowledgeEntries(
  clientId: string,
  agencyId: string,
  options?: { limit?: number; offset?: number; category?: KnowledgeCategory },
): Promise<{ entries: KnowledgeEntry[]; total: number }> {
  const supabase = createServiceClientWithoutCookies();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let countQuery = supabase
    .from('client_knowledge')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('agency_id', agencyId);

  let dataQuery = supabase
    .from('client_knowledge')
    .select('*')
    .eq('client_id', clientId)
    .eq('agency_id', agencyId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.category) {
    countQuery = countQuery.eq('category', options.category);
    dataQuery = dataQuery.eq('category', options.category);
  }

  const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

  if (error) {
    throw new Error(`Failed to fetch knowledge: ${error.message}`);
  }

  return {
    entries: (data || []) as KnowledgeEntry[],
    total: count ?? 0,
  };
}

// ── Delete Knowledge Entry ────────────────────────────────────────────────────

export async function deleteKnowledgeEntry(
  entryId: string,
  clientId: string,
  agencyId: string,
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  const { error } = await supabase
    .from('client_knowledge')
    .delete()
    .eq('id', entryId)
    .eq('client_id', clientId)
    .eq('agency_id', agencyId);

  if (error) {
    throw new Error(`Failed to delete knowledge entry: ${error.message}`);
  }
}

// ── Format Knowledge for Prompt Injection ─────────────────────────────────────

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  business_fact: '📋 Business Facts',
  customer_pattern: '📊 Customer Patterns',
  conversation_outcome: '💬 Conversation Insights',
  contact_preference: '👤 Contact Preferences',
  product_knowledge: '📦 Product/Service Details',
  correction: '✏️ Corrections (Previously Wrong)',
};

/**
 * Format knowledge entries into a clean prompt section.
 * Groups by category, limits total size to ~2000 tokens (~8000 chars).
 */
export function formatKnowledgeForPrompt(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return '';

  const MAX_CHARS = 8000; // ~2000 tokens
  const grouped = new Map<KnowledgeCategory, KnowledgeEntry[]>();

  for (const entry of entries) {
    const existing = grouped.get(entry.category) || [];
    existing.push(entry);
    grouped.set(entry.category, existing);
  }

  const sections: string[] = [];
  let totalChars = 0;

  // Process categories in priority order (corrections first — most valuable)
  const categoryOrder: KnowledgeCategory[] = [
    'correction',
    'business_fact',
    'product_knowledge',
    'customer_pattern',
    'contact_preference',
    'conversation_outcome',
  ];

  for (const category of categoryOrder) {
    const items = grouped.get(category);
    if (!items || items.length === 0) continue;

    const label = CATEGORY_LABELS[category];
    const lines: string[] = [`### ${label}`];

    for (const item of items) {
      const line = `- ${item.value}`;
      if (totalChars + line.length > MAX_CHARS) break;
      lines.push(line);
      totalChars += line.length;
    }

    if (lines.length > 1) {
      sections.push(lines.join('\n'));
    }

    if (totalChars >= MAX_CHARS) break;
  }

  return sections.join('\n\n');
}
