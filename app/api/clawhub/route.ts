/**
 * GET /api/clawhub?q=search_term&category=category&page=1&limit=20
 * GET /api/clawhub?id=skill-slug  (single skill detail)
 *
 * Live proxy to ClawHub registry API.
 * Caches results for 5 minutes to avoid rate limits.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLAWHUB_REGISTRY = process.env.CLAWHUB_REGISTRY || 'https://clawhub.com';
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
  // Keep cache small — max 200 entries
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// ClawHub search API: GET /api/skills/search?q=term
async function searchClawHub(query: string): Promise<ClawHubSkill[]> {
  const cacheKey = `search:${query}`;
  const cached = getCached(cacheKey);
  if (cached) return cached as ClawHubSkill[];

  try {
    const res = await fetch(`${CLAWHUB_REGISTRY}/api/skills/search?q=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Fallback: try the registry search endpoint
      const fallbackRes = await fetch(`${CLAWHUB_REGISTRY}/api/registry/search?q=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!fallbackRes.ok) return [];
      const data = await fallbackRes.json();
      const skills = normalizeSkills(data);
      setCache(cacheKey, skills);
      return skills;
    }

    const data = await res.json();
    const skills = normalizeSkills(data);
    setCache(cacheKey, skills);
    return skills;
  } catch {
    return [];
  }
}

// ClawHub featured/popular: GET /api/skills/featured or /api/skills?sort=popular
async function getFeatured(): Promise<ClawHubSkill[]> {
  const cacheKey = 'featured';
  const cached = getCached(cacheKey);
  if (cached) return cached as ClawHubSkill[];

  try {
    // Try featured endpoint first
    const res = await fetch(`${CLAWHUB_REGISTRY}/api/skills/featured`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      const skills = normalizeSkills(data);
      setCache(cacheKey, skills);
      return skills;
    }

    // Fallback: popular sort
    const fallbackRes = await fetch(`${CLAWHUB_REGISTRY}/api/skills?sort=popular&limit=50`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!fallbackRes.ok) return [];
    const data = await fallbackRes.json();
    const skills = normalizeSkills(data);
    setCache(cacheKey, skills);
    return skills;
  } catch {
    return [];
  }
}

// Get single skill detail
async function getSkillDetail(slug: string): Promise<ClawHubSkill | null> {
  const cacheKey = `detail:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached as ClawHubSkill;

  try {
    const res = await fetch(`${CLAWHUB_REGISTRY}/api/skills/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const skill = normalizeSingleSkill(data);
    if (skill) setCache(cacheKey, skill);
    return skill;
  } catch {
    return null;
  }
}

interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  category: string;
  tags: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeSingleSkill(raw: Record<string, unknown>): ClawHubSkill | null {
  // Handle various API response shapes
  const skill = (raw.skill || raw.data || raw) as Record<string, unknown>;
  if (!skill || typeof skill !== 'object') return null;

  const slug = (skill.slug || skill.id || skill.name || '') as string;
  if (!slug) return null;

  return {
    slug,
    name: (skill.name || skill.title || slug) as string,
    description: (skill.description || skill.desc || '') as string,
    version: (skill.version || skill.latest_version || '1.0.0') as string,
    author: (skill.author || skill.publisher || skill.owner || '') as string,
    downloads: Number(skill.downloads || skill.installs || skill.download_count || 0),
    category: (skill.category || skill.type || 'General') as string,
    tags: Array.isArray(skill.tags) ? skill.tags as string[] : [],
    url: `${CLAWHUB_REGISTRY}/skills/${slug}`,
    createdAt: (skill.createdAt || skill.created_at || '') as string,
    updatedAt: (skill.updatedAt || skill.updated_at || '') as string,
  };
}

function normalizeSkills(raw: unknown): ClawHubSkill[] {
  // Handle: { skills: [...] }, { data: [...] }, { results: [...] }, or just [...]
  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    items = (obj.skills || obj.data || obj.results || obj.items || []) as unknown[];
    if (!Array.isArray(items)) items = [];
  } else {
    return [];
  }

  return items
    .map((item) => normalizeSingleSkill(item as Record<string, unknown>))
    .filter((s): s is ClawHubSkill => s !== null);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const skillId = searchParams.get('id');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

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
    skills = await searchClawHub(query.trim());
  } else {
    skills = await getFeatured();
  }

  // Paginate
  const total = skills.length;
  const start = (page - 1) * limit;
  const pageSkills = skills.slice(start, start + limit);

  return NextResponse.json({
    skills: pageSkills,
    total,
    page,
    limit,
    hasMore: start + limit < total,
  });
}
