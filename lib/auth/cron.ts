import { NextResponse } from 'next/server';

type CronAuthInput = {
  authHeader: string | null;
  queryToken?: string | null;
};

type CronAuthResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Validates a cron request against CRON_SECRET.
 *
 * Fails closed: if CRON_SECRET is unset, every call is rejected. This
 * prevents the prior fail-open behavior where a missing env var silently
 * disabled auth.
 *
 * Accepts either:
 *   - Authorization: Bearer <secret>  (Vercel cron sends this automatically)
 *   - ?secret=<secret>                 (legacy query-param form)
 */
export function checkCronAuth(input: CronAuthInput, extraSecrets: string[] = []): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;
  const accepted = [cronSecret, ...extraSecrets].filter(
    (s): s is string => typeof s === 'string' && s.length > 0,
  );

  if (accepted.length === 0) {
    return { ok: false, status: 500, error: 'CRON_SECRET not configured' };
  }

  const presented =
    (input.authHeader && input.authHeader.startsWith('Bearer ')
      ? input.authHeader.slice('Bearer '.length)
      : null) ?? input.queryToken ?? null;

  if (!presented || !accepted.includes(presented)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

/**
 * Convenience wrapper for Next.js route handlers.
 * Returns a 401/500 Response on failure, or null on success.
 */
export function requireCron(
  req: { headers: { get: (name: string) => string | null }; nextUrl?: { searchParams: URLSearchParams } },
  opts: { extraSecretEnvVars?: string[] } = {},
): NextResponse | null {
  const extraSecrets = (opts.extraSecretEnvVars ?? [])
    .map((name) => process.env[name])
    .filter((v): v is string => typeof v === 'string' && v.length > 0);

  const result = checkCronAuth(
    {
      authHeader: req.headers.get('authorization'),
      queryToken: req.nextUrl?.searchParams.get('secret') ?? null,
    },
    extraSecrets,
  );

  if (result.ok) return null;
  return NextResponse.json({ error: result.error }, { status: result.status });
}
