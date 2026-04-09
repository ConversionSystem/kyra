// ============================================================================
// Serverless-safe rate limiter using Supabase
//
// The in-memory Map approach resets on every Vercel cold start, making it
// effectively useless. This module persists rate limit state in Supabase
// via a lightweight `rate_limit_hits` table (or falls back to in-memory).
//
// Table schema (create if not exists):
//   rate_limit_hits(key text, ts timestamptz default now())
//   Index on (key, ts) for fast window queries.
//
// If the table doesn't exist, falls back to in-memory (same as before).
// ============================================================================

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// In-memory fallback (still useful as first-line defense within a single instance)
const memoryMap = new Map<string, { count: number; resetAt: number }>();

function checkMemoryLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryMap.get(key);
  if (!entry || now > entry.resetAt) {
    memoryMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

/**
 * Check rate limit for a given key (e.g., IP address).
 *
 * Uses Supabase `rate_limit_hits` table for persistence across cold starts.
 * Falls back to in-memory if the DB call fails.
 *
 * @returns true if the request should be BLOCKED (over limit)
 */
export async function isRateLimited(
  key: string,
  limit: number = 30,
  windowMs: number = 60_000,
): Promise<boolean> {
  // Quick in-memory check first (avoids DB round-trip for repeat offenders)
  if (checkMemoryLimit(key, limit, windowMs)) {
    return true;
  }

  try {
    const supabase = getSupabase();
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    // Count hits in window FIRST (avoids race where insert inflates count)
    const { count, error } = await supabase
      .from('rate_limit_hits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('ts', windowStart);

    if (error) {
      // Table might not exist — fall back to in-memory only
      return false;
    }

    if ((count ?? 0) >= limit) {
      return true;
    }

    // Only insert if under limit
    await supabase.from('rate_limit_hits').insert({ key });

    // Probabilistic cleanup: 1% chance per request to prune old rows
    if (Math.random() < 0.01) {
      const cutoff = new Date(Date.now() - 3600000).toISOString();
      await supabase.from('rate_limit_hits').delete().lt('ts', cutoff).then(() => {}, () => {});
    }

    return false;
  } catch {
    // DB unavailable — rely on in-memory check (already done above)
    return false;
  }
}
