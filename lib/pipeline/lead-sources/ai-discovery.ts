/**
 * AI Discovery Lead Source — GPT-4o generates business profiles
 *
 * This is the LEGACY lead source. It asks an LLM to imagine businesses
 * based on training data. Leads may not be real — websites are verified
 * via HTTP but company names, emails, and phones can be hallucinated.
 *
 * Still useful as a free fallback when no Outscraper key is available,
 * or for brainstorming target profiles before real prospecting.
 *
 * Now supports configurable models (GPT-4o, GPT-4o-mini, Claude, etc.)
 */

import type { RawLead, LeadSourceResult, StreamCallback } from './types';

const DEFAULT_MODEL = 'gpt-4o';

interface AiDiscoveryOptions {
  industry: string;
  location: string;
  role?: string;
  companySize?: string;
  limit?: number;
  model?: string;       // LLM model to use
  apiKey?: string;       // OpenAI API key
  onLead?: StreamCallback;
}

export async function searchAiDiscovery(opts: AiDiscoveryOptions): Promise<LeadSourceResult> {
  const {
    industry, location, role = 'Owner', companySize = '11-50',
    limit = 10, model = DEFAULT_MODEL, apiKey, onLead,
  } = opts;

  if (!apiKey) {
    return {
      source: 'ai_discovery',
      leads: [],
      total: 0,
      warning: 'OpenAI API key not configured.',
    };
  }

  // Determine API endpoint based on model
  const { endpoint, headers, modelId } = resolveModelConfig(model, apiKey);

  const searchPrompt = `Find exactly ${Math.min((limit || 10) * 2, 50)} real ${industry || 'businesses'} in ${location || 'the United States'}.
These must be REAL companies that exist on Google Maps, Yelp, Clutch, or industry directories.
Target: ${role || 'Owner/CEO'} at companies with ${companySize || '11-50'} employees.

Return JSON array: [{"company":"...","website":"...","industry":"...","location":"...","company_size":"..."}]
RULES:
- company: EXACT legal business name
- website: REAL domain (e.g. "sweetflower.com") — NO made-up domains
- Only include businesses you are confident actually exist
- NO LinkedIn URLs, NO people names (we discover those from websites)`;

  try {
    onLead?.('step', { label: `AI discovering ${industry} in ${location}...`, status: 'running' });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        temperature: 0.4,
        max_tokens: 4000,
        messages: [{ role: 'user', content: searchPrompt }],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        source: 'ai_discovery',
        leads: [],
        total: 0,
        warning: `AI model error (${res.status}): ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content || '{}';

    let candidates: Array<Record<string, string>> = [];
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        candidates = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        for (const val of Object.values(parsed)) {
          if (Array.isArray(val) && val.length > 0) {
            candidates = val as Array<Record<string, string>>;
            break;
          }
        }
      }
    } catch { candidates = []; }

    // Verify websites exist
    const leads: RawLead[] = [];
    for (const c of candidates) {
      if (leads.length >= limit) break;
      if (!c.website) continue;

      const url = c.website.startsWith('http') ? c.website : `https://${c.website}`;
      let verified = false;

      try {
        const verifyRes = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KyraBot/1.0)' },
          signal: AbortSignal.timeout(5_000),
          redirect: 'follow',
        });
        verified = verifyRes.ok || [403, 405, 406].includes(verifyRes.status);
      } catch {
        try {
          const headRes = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3_000), redirect: 'follow' });
          verified = headRes.ok || headRes.status === 403;
        } catch { /* unreachable */ }
      }

      if (!verified) continue;

      const lead: RawLead = {
        company: c.company || 'Unknown',
        website: c.website || null,
        phone: null, // AI can't reliably provide these
        email: null,
        industry: c.industry || industry,
        location: c.location || location,
        full_address: null,
        company_size: c.company_size || companySize,
        rating: null,
        reviews_count: null,
        description: null,
        social_links: null,
      };

      leads.push(lead);

      onLead?.('lead_found', {
        current: leads.length,
        total: limit,
        company: lead.company,
        website: lead.website,
        location: lead.location,
      });
    }

    return {
      source: 'ai_discovery',
      leads,
      total: leads.length,
      warning: leads.length > 0
        ? '⚠️ AI-discovered leads are based on training data and may not be current. Verify before sending outreach.'
        : 'AI could not find verifiable businesses. Try Google Maps search instead.',
    };
  } catch (err) {
    return {
      source: 'ai_discovery',
      leads: [],
      total: 0,
      warning: `AI discovery failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

// ─── Model Configuration ──────────────────────────────────────────────────────

function resolveModelConfig(model: string, apiKey: string): {
  endpoint: string;
  headers: Record<string, string>;
  modelId: string;
} {
  // OpenRouter models (anthropic/claude-*, google/gemini-*, etc.)
  if (model.includes('/') && !model.startsWith('gpt-') && !model.startsWith('o1')) {
    return {
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kyra.conversionsystem.com',
      },
      modelId: model,
    };
  }

  // Direct OpenAI models
  return {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    modelId: model,
  };
}

/**
 * Available models for the agency model selector.
 */
export const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Best quality (default)', cost: '$$' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Faster, cheaper', cost: '$' },
  { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet', provider: 'Anthropic (via OpenRouter)', description: 'Strong reasoning', cost: '$$' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google (via OpenRouter)', description: 'Fast, cost-effective', cost: '$' },
] as const;
