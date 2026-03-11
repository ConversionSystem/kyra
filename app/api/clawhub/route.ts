/**
 * GET /api/clawhub?q=search_term&limit=20
 * GET /api/clawhub?id=skill-slug  (single skill detail)
 *
 * Live proxy to ClawHub registry API v1.
 * Caches results for 5 minutes to avoid rate limits.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLAWHUB_API = process.env.CLAWHUB_REGISTRY || 'https://clawhub.ai';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Types ───────────────────────────────────────────────────────────────

export interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  category: string;
  tags: string[];
  url: string;
  updatedAt: string;
}

// ── API v1: /api/v1/search?q=term ──────────────────────────────────────

async function searchClawHub(query: string, limit: number): Promise<ClawHubSkill[]> {
  const cacheKey = `search:${query}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached as ClawHubSkill[];

  try {
    const url = new URL('/api/v1/search', CLAWHUB_API);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json() as { results?: Array<Record<string, unknown>> };
    const skills = (data.results || []).map(normalizeSearchResult);
    setCache(cacheKey, skills);
    return skills;
  } catch {
    return [];
  }
}

// ── API v1: /api/v1/skills?sort=updated&limit=N ───────────────────────

async function getFeatured(limit: number): Promise<ClawHubSkill[]> {
  const cacheKey = `featured:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached as ClawHubSkill[];

  try {
    const url = new URL('/api/v1/skills', CLAWHUB_API);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('sort', 'updated');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json() as { items?: Array<Record<string, unknown>> };
    const skills = (data.items || []).map(normalizeListItem);
    setCache(cacheKey, skills);
    return skills;
  } catch {
    return [];
  }
}

// ── API v1: /api/v1/skills/:slug ───────────────────────────────────────

async function getSkillDetail(slug: string): Promise<ClawHubSkill | null> {
  const cacheKey = `detail:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached as ClawHubSkill;

  try {
    const res = await fetch(`${CLAWHUB_API}/api/v1/skills/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = await res.json() as Record<string, unknown>;
    const skill = normalizeDetailResult(data);
    if (skill) setCache(cacheKey, skill);
    return skill;
  } catch {
    return null;
  }
}

// ── Normalizers ─────────────────────────────────────────────────────────

function normalizeSearchResult(raw: Record<string, unknown>): ClawHubSkill {
  const slug = (raw.slug || '') as string;
  return {
    slug,
    name: (raw.displayName || raw.name || slug) as string,
    description: (raw.summary || raw.description || '') as string,
    version: (raw.version || '') as string,
    author: (raw.author || raw.publisher || '') as string,
    downloads: Number(raw.downloads || raw.installs || 0),
    category: (raw.category || 'General') as string,
    tags: Array.isArray(raw.tags)
      ? (raw.tags as string[])
      : typeof raw.tags === 'object' && raw.tags
        ? Object.keys(raw.tags as Record<string, unknown>)
        : [],
    url: `https://clawhub.ai/skills/${slug}`,
    updatedAt: raw.updatedAt ? new Date(Number(raw.updatedAt)).toISOString() : '',
  };
}

function normalizeListItem(raw: Record<string, unknown>): ClawHubSkill {
  const slug = (raw.slug || '') as string;
  return {
    slug,
    name: (raw.displayName || raw.name || slug) as string,
    description: (raw.summary || raw.description || '') as string,
    version: (raw.version || '') as string,
    author: (raw.author || '') as string,
    downloads: Number(raw.downloads || 0),
    category: (raw.category || 'General') as string,
    tags: Array.isArray(raw.tags)
      ? (raw.tags as string[])
      : typeof raw.tags === 'object' && raw.tags
        ? Object.keys(raw.tags as Record<string, unknown>)
        : [],
    url: `https://clawhub.ai/skills/${slug}`,
    updatedAt: raw.updatedAt ? new Date(Number(raw.updatedAt)).toISOString() : '',
  };
}

function normalizeDetailResult(raw: Record<string, unknown>): ClawHubSkill | null {
  const slug = (raw.slug || '') as string;
  if (!slug) return null;

  const latestVersion = raw.latestVersion as Record<string, unknown> | undefined;

  return {
    slug,
    name: (raw.displayName || raw.name || slug) as string,
    description: (raw.summary || raw.description || '') as string,
    version: (latestVersion?.version || raw.version || '') as string,
    author: (raw.author || raw.publisher || '') as string,
    downloads: Number(raw.downloads || raw.installs || 0),
    category: (raw.category || 'General') as string,
    tags: Array.isArray(raw.tags)
      ? (raw.tags as string[])
      : typeof raw.tags === 'object' && raw.tags
        ? Object.keys(raw.tags as Record<string, unknown>)
        : [],
    url: `https://clawhub.ai/skills/${slug}`,
    updatedAt: raw.updatedAt ? new Date(Number(raw.updatedAt)).toISOString() : '',
  };
}

// ── Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const skillId = searchParams.get('id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50);

  // Single skill detail
  if (skillId) {
    const skill = await getSkillDetail(skillId);
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    return NextResponse.json({ skill });
  }

  // Search or browse
  let skills: ClawHubSkill[];
  if (query && query.trim()) {
    skills = await searchClawHub(query.trim(), limit);
  } else {
    skills = await getFeatured(limit);
  }

  return NextResponse.json({
    skills,
    total: skills.length,
  });
}
