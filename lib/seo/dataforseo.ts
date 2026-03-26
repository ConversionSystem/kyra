/**
 * DataForSEO API Client
 *
 * Provides keyword research, SERP analysis, and rank tracking via DataForSEO.
 * Falls back to mock data when DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are not set.
 */

const DATAFORSEO_API = 'https://api.dataforseo.com/v3';

// ── Types ────────────────────────────────────────────────────────────────

export interface KeywordResult {
  keyword: string;
  search_volume: number;
  competition: number;
  cpc: number;
  keyword_difficulty: number;
}

export interface KeywordVolumeResult {
  keyword: string;
  search_volume: number;
  competition: number;
  cpc: number;
}

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export interface RankResult {
  keyword: string;
  position: number | null;
  url: string | null;
}

export interface DataForSEOResponse<T> {
  mock: boolean;
  data: T;
  message?: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────

function getAuth(): string | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return Buffer.from(`${login}:${password}`).toString('base64');
}

function isConfigured(): boolean {
  return !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD;
}

async function apiFetch<T>(endpoint: string, body: unknown): Promise<T> {
  const auth = getAuth();
  if (!auth) throw new Error('DataForSEO not configured');

  const res = await fetch(`${DATAFORSEO_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([body]),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DataForSEO ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    tasks?: Array<{ result?: T[] }>;
  };

  return json.tasks?.[0]?.result?.[0] as T;
}

// ── Mock Data ────────────────────────────────────────────────────────────

function mockKeywords(seed: string): KeywordResult[] {
  const words = [seed, `${seed} near me`, `best ${seed}`, `${seed} cost`, `${seed} reviews`];
  return words.map((kw, i) => ({
    keyword: kw,
    search_volume: Math.floor(Math.random() * 5000) + 100,
    competition: +(Math.random() * 0.8 + 0.1).toFixed(2),
    cpc: +(Math.random() * 5 + 0.5).toFixed(2),
    keyword_difficulty: Math.floor(Math.random() * 60) + 20 + i,
  }));
}

function mockSerp(keyword: string): SerpResult[] {
  return Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    title: `${keyword} — Result ${i + 1}`,
    url: `https://example${i + 1}.com/${keyword.replace(/\s+/g, '-')}`,
    snippet: `This is a mock snippet for "${keyword}" at position ${i + 1}.`,
    domain: `example${i + 1}.com`,
  }));
}

// ── Public API ───────────────────────────────────────────────────────────

export async function searchKeywords(
  seed: string,
  options?: { location?: number; language?: string; limit?: number },
): Promise<DataForSEOResponse<KeywordResult[]>> {
  if (!isConfigured()) {
    return { mock: true, data: mockKeywords(seed), message: 'DataForSEO not configured. Using mock data.' };
  }

  const result = await apiFetch<{ items?: Array<Record<string, unknown>> }>(
    '/keywords_data/google_ads/keywords_for_keywords/live',
    {
      keywords: [seed],
      location_code: options?.location ?? 2840,
      language_code: options?.language ?? 'en',
      limit: options?.limit ?? 100,
    },
  );

  const items: KeywordResult[] = (result?.items ?? []).map((item) => ({
    keyword: (item.keyword as string) || '',
    search_volume: (item.search_volume as number) || 0,
    competition: (item.competition as number) || 0,
    cpc: (item.cpc as number) || 0,
    keyword_difficulty: (item.keyword_difficulty as number) || 0,
  }));

  return { mock: false, data: items };
}

export async function getKeywordVolume(
  keywords: string[],
): Promise<DataForSEOResponse<KeywordVolumeResult[]>> {
  if (!isConfigured()) {
    const data: KeywordVolumeResult[] = keywords.map((kw) => ({
      keyword: kw,
      search_volume: Math.floor(Math.random() * 3000) + 50,
      competition: +(Math.random() * 0.8).toFixed(2),
      cpc: +(Math.random() * 4 + 0.3).toFixed(2),
    }));
    return { mock: true, data, message: 'DataForSEO not configured. Using mock data.' };
  }

  const result = await apiFetch<{ items?: Array<Record<string, unknown>> }>(
    '/keywords_data/google_ads/search_volume/live',
    { keywords: keywords.slice(0, 1000) },
  );

  const items: KeywordVolumeResult[] = (result?.items ?? []).map((item) => ({
    keyword: (item.keyword as string) || '',
    search_volume: (item.search_volume as number) || 0,
    competition: (item.competition as number) || 0,
    cpc: (item.cpc as number) || 0,
  }));

  return { mock: false, data: items };
}

export async function getSerpResults(
  keyword: string,
): Promise<DataForSEOResponse<SerpResult[]>> {
  if (!isConfigured()) {
    return { mock: true, data: mockSerp(keyword), message: 'DataForSEO not configured. Using mock data.' };
  }

  const result = await apiFetch<{ items?: Array<Record<string, unknown>> }>(
    '/serp/google/organic/live/regular',
    {
      keyword,
      location_code: 2840,
      language_code: 'en',
      depth: 10,
    },
  );

  const items: SerpResult[] = (result?.items ?? [])
    .filter((item) => item.type === 'organic')
    .map((item) => ({
      position: (item.rank_absolute as number) || 0,
      title: (item.title as string) || '',
      url: (item.url as string) || '',
      snippet: (item.description as string) || '',
      domain: (item.domain as string) || '',
    }));

  return { mock: false, data: items };
}

export async function getRankings(
  domain: string,
  keywords: string[],
): Promise<DataForSEOResponse<RankResult[]>> {
  if (!isConfigured()) {
    const data: RankResult[] = keywords.map((kw) => ({
      keyword: kw,
      position: Math.random() > 0.3 ? Math.floor(Math.random() * 50) + 1 : null,
      url: Math.random() > 0.3 ? `https://${domain}/${kw.replace(/\s+/g, '-')}` : null,
    }));
    return { mock: true, data, message: 'DataForSEO not configured. Using mock data.' };
  }

  const results: RankResult[] = [];
  for (const keyword of keywords) {
    const serp = await getSerpResults(keyword);
    const match = serp.data.find((r) => r.domain.includes(domain));
    results.push({
      keyword,
      position: match?.position ?? null,
      url: match?.url ?? null,
    });
  }

  return { mock: false, data: results };
}

export async function getCompetitorKeywords(
  domain: string,
): Promise<DataForSEOResponse<KeywordResult[]>> {
  if (!isConfigured()) {
    return { mock: true, data: mockKeywords(domain), message: 'DataForSEO not configured. Using mock data.' };
  }

  const result = await apiFetch<{ items?: Array<Record<string, unknown>> }>(
    '/dataforseo_labs/google/ranked_keywords/live',
    { target: domain, location_code: 2840, language_code: 'en', limit: 100 },
  );

  const items: KeywordResult[] = (result?.items ?? []).map((item) => {
    const kwData = (item.keyword_data as Record<string, unknown>) || {};
    return {
      keyword: (kwData.keyword as string) || '',
      search_volume: (kwData.search_volume as number) || 0,
      competition: (kwData.competition as number) || 0,
      cpc: (kwData.cpc as number) || 0,
      keyword_difficulty: (kwData.keyword_difficulty as number) || 0,
    };
  });

  return { mock: false, data: items };
}
