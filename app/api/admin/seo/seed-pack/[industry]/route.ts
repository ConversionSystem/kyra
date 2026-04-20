// ============================================================================
// POST /api/admin/seo/seed-pack/[industry]
//
// Admin-only endpoint. Calls Claude to generate an industry pack (GEO queries,
// NAP directories, audience profile, pain points, seasonality, content patterns)
// for the given industry, then inserts/updates it in seo_industry_packs.
//
// Auth: KYRA_API_SECRET bearer token OR master email (admin-only).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';
import { seedIndustryPack, getIndustryPack } from '@/lib/seo/industry-packs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
const API_URL = process.env.OPENROUTER_API_KEY
  ? 'https://openrouter.ai/api/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENROUTER_API_KEY
  ? 'anthropic/claude-sonnet-4-6'
  : 'gpt-4o';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ industry: string }> },
) {
  const { industry } = await params;

  // Auth check: bearer token or master email
  const authHeader = request.headers.get('authorization');
  const isSecretAuth = authHeader === `Bearer ${process.env.KYRA_API_SECRET}`;

  if (!isSecretAuth) {
    const auth = await requireMaster();
    if (!auth.ok) return auth.response;
  }

  const slug = industry.toLowerCase().replace(/\s+/g, '-');

  // Check if pack already exists
  const existing = await getIndustryPack(slug);
  if (existing) {
    return NextResponse.json({
      message: `Industry pack "${slug}" already exists. Use PUT to update.`,
      pack: existing,
    });
  }

  // Generate pack via LLM
  if (!OPENROUTER_KEY) {
    return NextResponse.json({ error: 'No API key configured for LLM' }, { status: 500 });
  }

  const displayName = industry
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const prompt = `You are an SEO strategist specializing in local business SEO.
Generate a complete industry pack for "${displayName}" businesses.

Return a JSON object with these exact fields:

{
  "display_name": "${displayName}",
  "services": ["array of 10-15 core services for this industry"],
  "geo_queries": [
    {
      "template": "Best {{SERVICE}} in {{CITY}}, {{STATE}}",
      "category": "recommendation | comparison | emergency | cost | review",
      "priority": 1-5
    }
    // Generate 20-25 query templates. Use {{CITY}}, {{STATE}}, {{SERVICE}}, {{BUSINESS_NAME}} as variables.
    // Cover: recommendations, comparisons, emergency queries, cost queries, review queries.
  ],
  "nap_directories": [
    {
      "name": "Directory Name",
      "url_template": "https://example.com/search?q={{BUSINESS_NAME}}&loc={{CITY}}",
      "priority": 1-5
    }
    // 15-20 directories relevant to this industry.
    // Include: Google Maps, Yelp, BBB, industry-specific directories.
  ],
  "competitor_signals": {
    "common_domains": ["competitor pattern domains"],
    "review_platforms": ["where customers leave reviews"]
  },
  "audience": {
    "primary": "Primary audience description (age, income, situation)",
    "triggers": ["5-8 buying triggers that cause someone to search"],
    "objections": ["5-8 common objections or hesitations"],
    "search_intent": ["3-5 intent categories: emergency, comparison, cost, etc."]
  },
  "pain_points": ["8-10 customer frustrations specific to this industry"],
  "seasonality": {
    "peak_months": [array of month numbers 1-12],
    "content_pivots": {
      "winter": ["services to emphasize in winter"],
      "spring": ["services to emphasize in spring"],
      "summer": ["services to emphasize in summer"],
      "fall": ["services to emphasize in fall"]
    },
    "seasonal_notes": "Brief note on seasonal patterns"
  },
  "content_patterns": [
    "5-8 proven content patterns that rank for this industry",
    "e.g.: '[service] near me cost', 'best [service] in [city]', 'emergency [service] [city]'"
  ]
}

Be specific and actionable. Use real directory names and URLs. The GEO queries should be exactly what someone would ask ChatGPT or Perplexity.

Return ONLY the JSON object, no markdown fences or explanations.`;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kyra.conversionsystem.com',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: `LLM API error: ${res.status}`, details: errText.slice(0, 200) }, { status: 500 });
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response (strip markdown fences if present)
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse LLM response as JSON', raw: raw.slice(0, 500) }, { status: 500 });
    }

    const packData = JSON.parse(jsonMatch[0]);

    // Seed into DB
    const result = await seedIndustryPack(slug, {
      display_name: packData.display_name || displayName,
      services: packData.services || [],
      geo_queries: packData.geo_queries || [],
      nap_directories: packData.nap_directories || [],
      competitor_signals: packData.competitor_signals || {},
      audience: packData.audience || {},
      pain_points: packData.pain_points || [],
      seasonality: packData.seasonality || {},
      content_patterns: packData.content_patterns || [],
    });

    if (!result.success) {
      return NextResponse.json({ error: `DB error: ${result.error}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      industry: slug,
      message: `Industry pack "${displayName}" seeded successfully`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Seed failed: ${message}` }, { status: 500 });
  }
}
