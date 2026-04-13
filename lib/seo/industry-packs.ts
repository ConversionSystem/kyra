/**
 * Industry Packs — per-industry SEO configuration
 *
 * Each pack contains GEO test queries, NAP directories, audience data,
 * pain points, seasonality, and content patterns for a specific industry.
 * Stored in seo_industry_packs table, seeded via admin API.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────

export interface IndustryPack {
  id: string;
  industry_slug: string;
  display_name: string;
  services: string[];
  geo_queries: GeoQueryTemplate[];
  nap_directories: NapDirectory[];
  competitor_signals: Record<string, unknown>;
  audience: AudienceProfile;
  pain_points: string[];
  seasonality: SeasonalityConfig;
  content_patterns: string[];
  created_at: string;
  updated_at: string;
}

export interface GeoQueryTemplate {
  template: string;      // "Best {{SERVICE}} in {{CITY}}, {{STATE}}"
  category: string;      // "recommendation", "comparison", "emergency"
  priority: number;       // 1-5 (higher = more important)
}

export interface NapDirectory {
  name: string;           // "Yelp", "Google Maps", "BBB"
  url_template: string;   // "https://www.yelp.com/search?find_desc={{SERVICE}}&find_loc={{CITY}}"
  priority: number;
}

export interface AudienceProfile {
  primary: string;               // "Homeowners 35-65, median income $70K+"
  triggers: string[];             // ["AC failure in summer", "furnace failure in winter"]
  objections: string[];           // ["too expensive", "don't trust contractors"]
  search_intent: string[];        // ["emergency", "comparison", "cost"]
}

export interface SeasonalityConfig {
  peak_months: number[];           // [5, 6, 7, 8] for HVAC summer
  content_pivots: Record<string, string[]>; // "summer": ["AC Repair", "Emergency Service"]
  seasonal_notes: string;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Get an industry pack by slug. Returns null if not found.
 */
export async function getIndustryPack(slug: string): Promise<IndustryPack | null> {
  const supabase = createServiceClientWithoutCookies();
  const normalized = slug.toLowerCase().replace(/\s+/g, '-');

  const { data, error } = await supabase
    .from('seo_industry_packs')
    .select('*')
    .eq('industry_slug', normalized)
    .single();

  if (error || !data) return null;
  return data as unknown as IndustryPack;
}

/**
 * List all available industry packs.
 */
export async function listIndustryPacks(): Promise<IndustryPack[]> {
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('seo_industry_packs')
    .select('*')
    .order('display_name');

  if (error || !data) return [];
  return data as unknown as IndustryPack[];
}

/**
 * Upsert an industry pack. Used by the admin seed endpoint.
 */
export async function seedIndustryPack(
  slug: string,
  pack: Omit<IndustryPack, 'id' | 'industry_slug' | 'created_at' | 'updated_at'>,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createServiceClientWithoutCookies();
  const normalized = slug.toLowerCase().replace(/\s+/g, '-');

  const { data, error } = await supabase
    .from('seo_industry_packs')
    .upsert(
      {
        industry_slug: normalized,
        display_name: pack.display_name,
        services: pack.services,
        geo_queries: pack.geo_queries,
        nap_directories: pack.nap_directories,
        competitor_signals: pack.competitor_signals,
        audience: pack.audience,
        pain_points: pack.pain_points,
        seasonality: pack.seasonality,
        content_patterns: pack.content_patterns,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'industry_slug' },
    )
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data?.id };
}

/**
 * Delete an industry pack by slug.
 */
export async function deleteIndustryPack(slug: string): Promise<boolean> {
  const supabase = createServiceClientWithoutCookies();
  const { error } = await supabase
    .from('seo_industry_packs')
    .delete()
    .eq('industry_slug', slug.toLowerCase().replace(/\s+/g, '-'));
  return !error;
}
