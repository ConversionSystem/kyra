/**
 * AI Relationship Memory
 *
 * Each contact has persistent AI memory — not just activity logs.
 * The AI remembers personal details, preferences, objections, interests
 * and uses them in follow-ups naturally.
 *
 * Memory is stored in crm_contacts.enrichment_data.ai_memory (JSONB array).
 * Each memory: { type, content, source, confidence, created_at }
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface MemoryEntry {
  id: string;
  type: 'personal' | 'preference' | 'objection' | 'interest' | 'decision' | 'context' | 'relationship';
  content: string;
  source: string;       // "conversation", "email", "ai_analysis", "manual"
  confidence: number;   // 0-1
  created_at: string;
}

/**
 * Extract relationship memories from a conversation using GPT-4o.
 * Called after every meaningful interaction.
 */
export async function extractMemories(
  text: string,
  existingMemories: MemoryEntry[],
): Promise<MemoryEntry[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const existingSummary = existingMemories.length > 0
    ? `Known memories:\n${existingMemories.map(m => `- [${m.type}] ${m.content}`).join('\n')}`
    : 'No existing memories.';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You extract relationship memories from sales conversations. Return JSON array only.
Each memory: {"type": "personal|preference|objection|interest|decision|context|relationship", "content": "brief fact", "confidence": 0.0-1.0}

Types:
- personal: "Has a daughter who plays soccer", "Based in Austin TX"
- preference: "Prefers email over phone", "Best time: mornings"
- objection: "Concerned about pricing", "Wants to see case study first"
- interest: "Interested in Pro plan", "Wants AI for customer support"
- decision: "Budget approved", "Needs board sign-off"
- context: "Company is growing fast", "Just hired 5 new reps"
- relationship: "Reports to VP Sales", "Referred by Mike at Zenith"

Only extract NEW facts not already in existing memories. Return [] if nothing new.`,
          },
          {
            role: 'user',
            content: `${existingSummary}\n\nNew conversation:\n${text.slice(0, 2000)}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const memories = (parsed.memories || parsed) as Array<{ type: string; content: string; confidence: number }>;

    if (!Array.isArray(memories)) return [];

    return memories.map(m => ({
      id: crypto.randomUUID(),
      type: m.type as MemoryEntry['type'],
      content: m.content,
      source: 'ai_analysis',
      confidence: m.confidence || 0.7,
      created_at: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Add memories to a contact's enrichment_data.ai_memory
 */
export async function addMemories(
  agencyId: string,
  contactId: string,
  newMemories: MemoryEntry[],
): Promise<void> {
  if (!newMemories.length) return;

  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('crm_contacts')
    .select('enrichment_data')
    .eq('id', contactId)
    .eq('agency_id', agencyId)
    .single();

  const enrichment = (data?.enrichment_data || {}) as Record<string, unknown>;
  const existing = (enrichment.ai_memory || []) as MemoryEntry[];

  // Deduplicate by content similarity (simple check)
  const existingContents = new Set(existing.map(m => m.content.toLowerCase()));
  const unique = newMemories.filter(m => !existingContents.has(m.content.toLowerCase()));

  if (!unique.length) return;

  // Keep max 50 memories per contact (oldest dropped)
  const combined = [...existing, ...unique].slice(-50);

  await svc
    .from('crm_contacts')
    .update({
      enrichment_data: { ...enrichment, ai_memory: combined },
    })
    .eq('id', contactId)
    .eq('agency_id', agencyId);
}

/**
 * Get memories for a contact, optionally filtered by type
 */
export async function getMemories(
  agencyId: string,
  contactId: string,
  type?: MemoryEntry['type'],
): Promise<MemoryEntry[]> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc
    .from('crm_contacts')
    .select('enrichment_data')
    .eq('id', contactId)
    .eq('agency_id', agencyId)
    .single();

  const enrichment = (data?.enrichment_data || {}) as Record<string, unknown>;
  const memories = (enrichment.ai_memory || []) as MemoryEntry[];

  if (type) return memories.filter(m => m.type === type);
  return memories;
}

/**
 * Generate a personalized context string for AI follow-ups
 */
export function buildMemoryContext(memories: MemoryEntry[]): string {
  if (!memories.length) return '';

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.type]) grouped[m.type] = [];
    grouped[m.type].push(m.content);
  }

  const sections: string[] = [];
  if (grouped.personal?.length) sections.push(`Personal: ${grouped.personal.join('. ')}`);
  if (grouped.preference?.length) sections.push(`Preferences: ${grouped.preference.join('. ')}`);
  if (grouped.objection?.length) sections.push(`Objections: ${grouped.objection.join('. ')}`);
  if (grouped.interest?.length) sections.push(`Interests: ${grouped.interest.join('. ')}`);
  if (grouped.decision?.length) sections.push(`Decisions: ${grouped.decision.join('. ')}`);
  if (grouped.context?.length) sections.push(`Context: ${grouped.context.join('. ')}`);
  if (grouped.relationship?.length) sections.push(`Relationships: ${grouped.relationship.join('. ')}`);

  return sections.join('\n');
}
