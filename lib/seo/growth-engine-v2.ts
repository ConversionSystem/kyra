/**
 * Growth Engine v2 — Data-driven growth suggestions
 *
 * Replaces the LLM-hallucination approach in the original growth engine.
 * Generates actionable suggestions based on real data:
 * - GSC page metrics (quick wins at positions 11-30)
 * - GEO content gaps (queries with 0% citation)
 * - Keyword ranking drops
 * - Unresolved NAP issues
 * - Missing service × city combinations
 *
 * LLM is used only for framing suggestions, not generating them.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────

export interface GrowthSuggestion {
  type: 'quick_win' | 'content_gap' | 'ranking_drop' | 'nap_fix' | 'new_page' | 'missing_combo';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: Record<string, unknown>;
  action_url?: string;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Generate data-driven growth suggestions for a site.
 * Returns prioritized list of actionable items.
 */
export async function generateGrowthSuggestions(
  siteId: string,
): Promise<GrowthSuggestion[]> {
  const supabase = createServiceClientWithoutCookies();
  const suggestions: GrowthSuggestion[] = [];

  // Fetch all data sources in parallel
  const startDate28 = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

  const [
    pageMetrics,
    contentGaps,
    napAudits,
    siteData,
    existingPages,
  ] = await Promise.all([
    // GSC page metrics (last 28 days)
    supabase
      .from('seo_page_metrics')
      .select('page_slug, clicks, impressions, ctr, position')
      .eq('site_id', siteId)
      .gte('date', startDate28),

    // Unresolved content gaps
    supabase
      .from('seo_content_gaps')
      .select('*')
      .eq('site_id', siteId)
      .eq('resolved', false)
      .order('priority_score', { ascending: false })
      .limit(10),

    // Recent NAP audits with issues
    supabase
      .from('seo_nap_audits')
      .select('*')
      .eq('site_id', siteId)
      .in('status', ['mismatch', 'not_found'])
      .order('audited_at', { ascending: false })
      .limit(10),

    // Site config (services, cities)
    supabase
      .from('client_sites')
      .select('services, cities, industry, business_name')
      .eq('id', siteId)
      .single(),

    // Existing pages
    supabase
      .from('site_pages')
      .select('slug, page_type')
      .eq('site_id', siteId),
  ]);

  // 1. Quick Wins — pages at positions 11-30 with high impressions
  const quickWins = aggregatePageMetrics(pageMetrics.data || [])
    .filter(p => p.avgPosition >= 11 && p.avgPosition <= 30 && p.totalImpressions >= 50)
    .sort((a, b) => b.totalImpressions - a.totalImpressions)
    .slice(0, 5);

  for (const qw of quickWins) {
    suggestions.push({
      type: 'quick_win',
      title: `Optimize "${qw.slug}" — position ${qw.avgPosition.toFixed(1)}`,
      description: `This page has ${qw.totalImpressions} impressions but ranks at position ${qw.avgPosition.toFixed(1)}. Improving the title, meta description, and adding more relevant content could push it to page 1. Current CTR: ${(qw.avgCtr * 100).toFixed(1)}%.`,
      priority: qw.totalImpressions > 200 ? 'high' : 'medium',
      data: { slug: qw.slug, impressions: qw.totalImpressions, position: qw.avgPosition, ctr: qw.avgCtr },
    });
  }

  // 2. Content Gaps — queries where the business isn't cited by AI
  for (const gap of (contentGaps.data || []).slice(0, 5)) {
    suggestions.push({
      type: 'content_gap',
      title: `Create content targeting: "${gap.query}"`,
      description: `AI assistants don't mention your business for this query. Creating a dedicated page or blog post targeting this topic would improve GEO visibility.`,
      priority: gap.priority_score >= 4 ? 'high' : 'medium',
      data: { query: gap.query, gap_type: gap.gap_type, priority_score: gap.priority_score },
    });
  }

  // 3. NAP Issues — directories with mismatches
  const napIssues = (napAudits.data || []).slice(0, 3);
  if (napIssues.length > 0) {
    suggestions.push({
      type: 'nap_fix',
      title: `Fix NAP inconsistencies on ${napIssues.length} director${napIssues.length === 1 ? 'y' : 'ies'}`,
      description: `Your business information doesn't match on: ${napIssues.map(n => n.directory).join(', ')}. Inconsistent NAP hurts local search rankings. Update these directories to match your website.`,
      priority: 'high',
      data: {
        directories: napIssues.map(n => ({
          name: n.directory,
          status: n.status,
          issues: n.issues,
        })),
      },
    });
  }

  // 4. Missing Service × City Combos
  if (siteData.data) {
    const services = (siteData.data.services as Array<{ name: string; slug: string }>) || [];
    const cities = (siteData.data.cities as Array<{ name: string; slug: string }>) || [];
    const existingSlugs = new Set((existingPages.data || []).map(p => p.slug));

    const missingCombos: Array<{ service: string; city: string; slug: string }> = [];
    for (const city of cities) {
      for (const service of services) {
        const slug = `/${city.slug}/${service.slug}`;
        if (!existingSlugs.has(slug)) {
          missingCombos.push({ service: service.name, city: city.name, slug });
        }
      }
    }

    if (missingCombos.length > 0) {
      suggestions.push({
        type: 'missing_combo',
        title: `${missingCombos.length} missing city × service page${missingCombos.length === 1 ? '' : 's'}`,
        description: `You're missing pages for: ${missingCombos.slice(0, 3).map(c => `${c.service} in ${c.city}`).join(', ')}${missingCombos.length > 3 ? ` and ${missingCombos.length - 3} more` : ''}. Each page targets a unique local search query.`,
        priority: missingCombos.length > 5 ? 'high' : 'medium',
        data: { missing: missingCombos.slice(0, 10) },
      });
    }
  }

  // 5. Ranking Drops — pages losing position
  const rankingDrops = aggregatePageMetrics(pageMetrics.data || [])
    .filter(p => p.totalClicks > 0)
    .sort((a, b) => b.avgPosition - a.avgPosition)
    .slice(0, 3)
    .filter(p => p.avgPosition > 20);

  for (const drop of rankingDrops) {
    suggestions.push({
      type: 'ranking_drop',
      title: `"${drop.slug}" has dropped to position ${drop.avgPosition.toFixed(1)}`,
      description: `This page had ${drop.totalClicks} clicks but is now ranking at position ${drop.avgPosition.toFixed(1)}. Consider refreshing the content, adding more internal links, or building backlinks.`,
      priority: drop.totalClicks > 10 ? 'high' : 'low',
      data: { slug: drop.slug, clicks: drop.totalClicks, position: drop.avgPosition },
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

// ── Helpers ──────────────────────────────────────────────────────────────

interface AggregatedPage {
  slug: string;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  entries: number;
}

function aggregatePageMetrics(
  metrics: Array<{ page_slug: string; clicks: number; impressions: number; ctr: number; position: number }>,
): AggregatedPage[] {
  const map = new Map<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; count: number }>();

  for (const m of metrics) {
    const existing = map.get(m.page_slug) || { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0 };
    existing.clicks += m.clicks;
    existing.impressions += m.impressions;
    existing.ctrSum += m.ctr;
    existing.posSum += m.position;
    existing.count += 1;
    map.set(m.page_slug, existing);
  }

  return Array.from(map.entries()).map(([slug, data]) => ({
    slug,
    totalClicks: data.clicks,
    totalImpressions: data.impressions,
    avgCtr: data.count > 0 ? data.ctrSum / data.count : 0,
    avgPosition: data.count > 0 ? data.posSum / data.count : 0,
    entries: data.count,
  }));
}
