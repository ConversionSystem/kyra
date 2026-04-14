/**
 * Google Search Console OAuth Integration
 *
 * Handles OAuth flow for GSC, token management, and metric fetching.
 * Uses the same GOOGLE_CLIENT_ID/SECRET as Calendar integration.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI =
  (process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com') +
  '/api/auth/gsc/callback';

const GSC_SCOPES = 'https://www.googleapis.com/auth/webmasters.readonly';

// ── OAuth ────────────────────────────────────────────────────────────────

export function getGSCAuthUrl(siteId: string): string {
  const state = Buffer.from(
    JSON.stringify({ siteId, type: 'gsc' }),
  ).toString('base64');

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GSC_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGSCCode(
  code: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function refreshGSCToken(
  refreshToken: string,
): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.access_token;
}

// ── GSC API ──────────────────────────────────────────────────────────────

export async function getGSCSites(
  accessToken: string,
): Promise<string[]> {
  const res = await fetch(
    'https://www.googleapis.com/webmasters/v3/sites',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.siteEntry || []).map(
    (s: { siteUrl: string }) => s.siteUrl,
  );
}

export interface GSCMetrics {
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  page_count: number;
  top_pages: Array<{
    slug: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  quick_wins: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  ranking_drops: Array<{
    query: string;
    previous_position: number;
    current_position: number;
    drop: number;
    impressions: number;
  }>;
  synced_at: string;
}

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function fetchGSCMetrics(
  accessToken: string,
  siteUrl: string,
  days = 90,
): Promise<GSCMetrics> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 86400000)
    .toISOString()
    .split('T')[0];

  const [pageRes, queryRes] = await Promise.all([
    fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 100,
        }),
      },
    ),
    fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 100,
        }),
      },
    ),
  ]);

  const pageData = pageRes.ok ? await pageRes.json() : { rows: [] };
  const queryData = queryRes.ok ? await queryRes.json() : { rows: [] };

  const pageRows: GSCRow[] = pageData.rows || [];
  const queryRows: GSCRow[] = queryData.rows || [];

  let totalClicks = 0;
  let totalImpressions = 0;
  let totalPosition = 0;

  const topPages = pageRows.map((r) => {
    totalClicks += r.clicks;
    totalImpressions += r.impressions;
    totalPosition += r.position;
    const slug = r.keys[0].replace(siteUrl, '') || '/';
    return {
      slug,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    };
  });

  const quickWins = queryRows
    .filter((r) => r.position >= 4 && r.position <= 20 && r.impressions > 20)
    .map((r) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }))
    .slice(0, 10);

  return {
    total_clicks: totalClicks,
    total_impressions: totalImpressions,
    avg_ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    avg_position:
      pageRows.length > 0 ? totalPosition / pageRows.length : 0,
    page_count: pageRows.length,
    top_pages: topPages.slice(0, 10),
    quick_wins: quickWins,
    ranking_drops: [],
    synced_at: new Date().toISOString(),
  };
}

// ── Token Management ─────────────────────────────────────────────────────

/**
 * Get a valid access token for GSC, refreshing if needed.
 * Returns null if no token is stored or refresh fails.
 */
export async function getValidGSCToken(
  siteId: string,
): Promise<string | null> {
  const supabase = createServiceClientWithoutCookies();

  try {
    const { data: site } = await supabase
      .from('client_sites')
      .select('gsc_access_token, gsc_refresh_token, gsc_token_expires_at')
      .eq('id', siteId)
      .single();

    if (!site?.gsc_access_token) return null;

    const expiresAt = site.gsc_token_expires_at
      ? new Date(site.gsc_token_expires_at)
      : new Date(0);

    // Refresh if token expires within 5 minutes
    if (
      expiresAt.getTime() - Date.now() < 5 * 60 * 1000 &&
      site.gsc_refresh_token
    ) {
      try {
        const newToken = await refreshGSCToken(site.gsc_refresh_token);
        await supabase
          .from('client_sites')
          .update({
            gsc_access_token: newToken,
            gsc_token_expires_at: new Date(
              Date.now() + 3600000,
            ).toISOString(),
          })
          .eq('id', siteId);
        return newToken;
      } catch {
        return null;
      }
    }

    return site.gsc_access_token;
  } catch {
    // Columns may not exist yet — gracefully return null
    return null;
  }
}
