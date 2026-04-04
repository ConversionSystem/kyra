/**
 * Google Search Console API Client
 *
 * Provides performance data, quick-win keywords, and ranking drop detection.
 * Requires GOOGLE_SERVICE_ACCOUNT_JSON env var or per-client OAuth tokens.
 */

import { getGoogleServiceAccessToken } from '@/lib/seo/platform-provisioner';

// ── Types ────────────────────────────────────────────────────────────────

export interface GSCPerformanceRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface QuickWinKeyword {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface RankDrop {
  query: string;
  previous_position: number;
  current_position: number;
  drop: number;
  impressions: number;
}

export interface GSCResponse<T> {
  mock: boolean;
  data: T;
  message?: string;
}

// ── Config ───────────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
}

async function gscFetch<T>(siteUrl: string, body: Record<string, unknown>): Promise<T> {
  const token = await getGoogleServiceAccessToken(['https://www.googleapis.com/auth/webmasters.readonly']);
  const encoded = encodeURIComponent(siteUrl);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`GSC API ${res.status}: ${err.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

// ── Mock Data ────────────────────────────────────────────────────────────

function mockPerformance(): GSCPerformanceRow[] {
  const queries = ['dental marketing', 'dentist near me', 'best dentist', 'teeth whitening cost', 'emergency dentist'];
  return queries.map((q, i) => ({
    keys: [q],
    clicks: Math.floor(Math.random() * 200) + 10,
    impressions: Math.floor(Math.random() * 5000) + 100,
    ctr: +(Math.random() * 0.1).toFixed(3),
    position: +(Math.random() * 30 + 1).toFixed(1),
  }));
}

// ── Public API ───────────────────────────────────────────────────────────

export async function getPerformance(
  siteUrl: string,
  options: {
    startDate: string;
    endDate: string;
    dimensions?: ('query' | 'page' | 'country' | 'device')[];
    rowLimit?: number;
  },
): Promise<GSCResponse<GSCPerformanceRow[]>> {
  if (!isConfigured()) {
    return { mock: true, data: mockPerformance(), message: 'Google Search Console not configured. Using mock data.' };
  }

  const result = await gscFetch<{ rows?: GSCPerformanceRow[] }>(siteUrl, {
    startDate: options.startDate,
    endDate: options.endDate,
    dimensions: options.dimensions ?? ['query'],
    rowLimit: options.rowLimit ?? 100,
  });

  return { mock: false, data: result.rows ?? [] };
}

export async function getQuickWins(
  siteUrl: string,
): Promise<GSCResponse<QuickWinKeyword[]>> {
  if (!isConfigured()) {
    const data: QuickWinKeyword[] = [
      { query: 'affordable dental care', clicks: 5, impressions: 800, ctr: 0.006, position: 15.2 },
      { query: 'family dentist reviews', clicks: 3, impressions: 600, ctr: 0.005, position: 18.7 },
      { query: 'dental implants cost', clicks: 8, impressions: 1200, ctr: 0.007, position: 12.4 },
    ];
    return { mock: true, data, message: 'Google Search Console not configured. Using mock data.' };
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

  const result = await gscFetch<{ rows?: GSCPerformanceRow[] }>(siteUrl, {
    startDate,
    endDate,
    dimensions: ['query'],
    rowLimit: 500,
  });

  const quickWins: QuickWinKeyword[] = (result.rows ?? [])
    .filter((r) => r.position >= 11 && r.position <= 30 && r.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)
    .map((r) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));

  return { mock: false, data: quickWins };
}

export async function getRankingDrops(
  siteUrl: string,
  days?: number,
): Promise<GSCResponse<RankDrop[]>> {
  if (!isConfigured()) {
    const data: RankDrop[] = [
      { query: 'teeth cleaning near me', previous_position: 8, current_position: 19, drop: 11, impressions: 450 },
      { query: 'dental office hours', previous_position: 5, current_position: 12, drop: 7, impressions: 300 },
    ];
    return { mock: true, data, message: 'Google Search Console not configured. Using mock data.' };
  }

  const period = days ?? 7;
  const now = new Date();
  const currentEnd = now.toISOString().split('T')[0];
  const currentStart = new Date(now.getTime() - period * 86400000).toISOString().split('T')[0];
  const previousEnd = currentStart;
  const previousStart = new Date(now.getTime() - period * 2 * 86400000).toISOString().split('T')[0];

  const [current, previous] = await Promise.all([
    gscFetch<{ rows?: GSCPerformanceRow[] }>(siteUrl, {
      startDate: currentStart,
      endDate: currentEnd,
      dimensions: ['query'],
      rowLimit: 500,
    }),
    gscFetch<{ rows?: GSCPerformanceRow[] }>(siteUrl, {
      startDate: previousStart,
      endDate: previousEnd,
      dimensions: ['query'],
      rowLimit: 500,
    }),
  ]);

  const prevMap = new Map<string, number>();
  for (const row of previous.rows ?? []) {
    prevMap.set(row.keys[0], row.position);
  }

  const drops: RankDrop[] = [];
  for (const row of current.rows ?? []) {
    const query = row.keys[0];
    const prevPos = prevMap.get(query);
    if (prevPos !== undefined) {
      const drop = row.position - prevPos;
      if (drop > 5) {
        drops.push({
          query,
          previous_position: +prevPos.toFixed(1),
          current_position: +row.position.toFixed(1),
          drop: +drop.toFixed(1),
          impressions: row.impressions,
        });
      }
    }
  }

  drops.sort((a, b) => b.drop - a.drop);
  return { mock: false, data: drops.slice(0, 20) };
}

/**
 * Submit a sitemap URL to Google Search Console via the Webmasters API.
 * Uses service account auth. Non-fatal — callers should log but not fail on error.
 */
export async function submitSitemapToGSC(
  siteUrl: string,
  sitemapUrl: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    return { success: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' };
  }
  try {
    const token = await getGoogleServiceAccessToken(['https://www.googleapis.com/auth/webmasters']);
    const encodedSite = encodeURIComponent(siteUrl);
    const encodedSitemap = encodeURIComponent(sitemapUrl);
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedSitemap}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return { success: false, error: body.error?.message || `GSC API ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
