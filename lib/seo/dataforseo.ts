/**
 * DataForSEO API Client
 *
 * Endpoints used:
 * - keywords_for_keywords/live  → result[] is flat keyword array
 * - search_volume/live          → result[] is flat keyword array
 * - serp/google/organic         → result[0].items[] contains organic results
 * - dataforseo_labs/ranked_keywords → result[0].items[].keyword_data (nested)
 */

const DATAFORSEO_API = 'https://api.dataforseo.com/v3';

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

function getAuth(creds?: { login: string; password: string }): string | null {
  const login = creds?.login || process.env.DATAFORSEO_LOGIN;
  const password = creds?.password || process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return Buffer.from(`${login}:${password}`).toString('base64');
}

function isConfigured(creds?: { login: string; password: string }): boolean {
  return !!(creds?.login || process.env.DATAFORSEO_LOGIN) &&
         !!(creds?.password || process.env.DATAFORSEO_PASSWORD);
}

interface DFSEOTaskResult {
  status_code?: number;
  status_message?: string;
  result?: Array<Record<string, unknown>>;
}

async function apiFetch(
  endpoint: string,
  body: unknown,
  creds?: { login: string; password: string },
): Promise<Array<Record<string, unknown>>> {
  const auth = getAuth(creds);
  if (!auth) throw new Error('DataForSEO not configured');

  const res = await fetch(`${DATAFORSEO_API}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([body]),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DataForSEO ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json() as { tasks?: DFSEOTaskResult[] };
  const task = json.tasks?.[0];

  if (!task) throw new Error('DataForSEO: no task in response');
  if (task.status_code && task.status_code !== 20000) {
    throw new Error(`DataForSEO error ${task.status_code}: ${task.status_message}`);
  }

  return task.result ?? [];
}

// ── Mock Data ────────────────────────────────────────────────────────────────

function mockKeywords(seed: string): KeywordResult[] {
  const words = [seed, `${seed} near me`, `best ${seed}`, `${seed} cost`, `${seed} reviews`,
    `${seed} services`, `${seed} pricing`, `${seed} agency`, `affordable ${seed}`, `top ${seed}`];
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
    snippet: `Result ${i + 1} for "${keyword}". This is estimated data — configure DataForSEO for real SERP data.`,
    domain: `example${i + 1}.com`,
  }));
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function searchKeywords(
  seed: string,
  options?: { location?: number; language?: string; limit?: number },
  credentials?: { login: string; password: string },
): Promise<DataForSEOResponse<KeywordResult[]>> {
  if (!isConfigured(credentials)) {
    return { mock: true, data: mockKeywords(seed), message: 'DataForSEO not configured.' };
  }

  const results = await apiFetch(
    '/keywords_data/google_ads/keywords_for_keywords/live',
    {
      keywords: [seed],
      location_code: options?.location ?? 2840,
      language_code: options?.language ?? 'en',
      limit: options?.limit ?? 50,
    },
    credentials,
  );

  // result[] IS the flat keyword array — each element is a keyword object
  const data: KeywordResult[] = results
    .filter(item => item.keyword)
    .map(item => ({
      keyword: String(item.keyword ?? ''),
      search_volume: Number(item.search_volume ?? 0),
      competition: Number(item.competition_index ?? item.competition ?? 0),
      cpc: Number(item.cpc ?? 0),
      keyword_difficulty: Number(item.keyword_difficulty ?? 0),
    }));

  return { mock: false, data };
}

export async function getKeywordVolume(
  keywords: string[],
  credentials?: { login: string; password: string },
): Promise<DataForSEOResponse<KeywordVolumeResult[]>> {
  if (!isConfigured(credentials)) {
    const data: KeywordVolumeResult[] = keywords.map(kw => ({
      keyword: kw,
      search_volume: Math.floor(Math.random() * 3000) + 50,
      competition: +(Math.random() * 0.8).toFixed(2),
      cpc: +(Math.random() * 4 + 0.3).toFixed(2),
    }));
    return { mock: true, data };
  }

  const results = await apiFetch(
    '/keywords_data/google_ads/search_volume/live',
    { keywords: keywords.slice(0, 700), location_code: 2840, language_code: 'en' },
    credentials,
  );

  // result[] IS the flat keyword array
  const data: KeywordVolumeResult[] = results.map(item => ({
    keyword: String(item.keyword ?? ''),
    search_volume: Number(item.search_volume ?? 0),
    competition: Number(item.competition_index ?? item.competition ?? 0),
    cpc: Number(item.cpc ?? 0),
  }));

  return { mock: false, data };
}

export async function getSerpResults(
  keyword: string,
  credentials?: { login: string; password: string },
): Promise<DataForSEOResponse<SerpResult[]>> {
  if (!isConfigured(credentials)) {
    return { mock: true, data: mockSerp(keyword) };
  }

  const results = await apiFetch(
    '/serp/google/organic/live/regular',
    { keyword, location_code: 2840, language_code: 'en', depth: 10 },
    credentials,
  );

  // result[0].items[] contains organic results
  const firstResult = results[0] ?? {};
  const items = (firstResult.items as Array<Record<string, unknown>>) ?? [];
  const data: SerpResult[] = items
    .filter(item => item.type === 'organic')
    .map(item => ({
      position: Number(item.rank_absolute ?? item.rank_group ?? 0),
      title: String(item.title ?? ''),
      url: String(item.url ?? ''),
      snippet: String(item.description ?? item.snippet ?? ''),
      domain: String(item.domain ?? ''),
    }));

  return { mock: false, data };
}

export async function getRankings(
  domain: string,
  keywords: string[],
  credentials?: { login: string; password: string },
): Promise<DataForSEOResponse<RankResult[]>> {
  if (!isConfigured(credentials)) {
    const data: RankResult[] = keywords.map(kw => ({
      keyword: kw,
      position: Math.random() > 0.3 ? Math.floor(Math.random() * 50) + 1 : null,
      url: Math.random() > 0.3 ? `https://${domain}/${kw.replace(/\s+/g, '-')}` : null,
    }));
    return { mock: true, data };
  }

  const results: RankResult[] = [];
  for (const keyword of keywords) {
    const serp = await getSerpResults(keyword, credentials);
    const match = serp.data.find(r => r.domain.includes(domain));
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
  credentials?: { login: string; password: string },
): Promise<DataForSEOResponse<KeywordResult[]>> {
  if (!isConfigured(credentials)) {
    return { mock: true, data: mockKeywords(domain) };
  }

  const results = await apiFetch(
    '/dataforseo_labs/google/ranked_keywords/live',
    { target: domain, location_code: 2840, language_code: 'en', limit: 50 },
    credentials,
  );

  // result[0].items[].keyword_data (nested structure)
  const firstResult = results[0] ?? {};
  const items = (firstResult.items as Array<Record<string, unknown>>) ?? [];
  const data: KeywordResult[] = items
    .map(item => {
      const kd = (item.keyword_data as Record<string, unknown>) ?? {};
      const ki = (kd.keyword_info as Record<string, unknown>) ?? {};
      const kp = (kd.keyword_properties as Record<string, unknown>) ?? {};
      return {
        keyword: String(kd.keyword ?? ''),
        search_volume: Number(ki.search_volume ?? kp.search_volume ?? 0),
        competition: Number(ki.competition ?? ki.competition_index ?? 0),
        cpc: Number(ki.cpc ?? 0),
        keyword_difficulty: Number(kp.keyword_difficulty ?? 0),
      };
    })
    .filter(k => k.keyword);

  return { mock: false, data };
}
