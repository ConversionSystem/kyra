import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Service client that bypasses RLS using the service_role key.
 * 
 * IMPORTANT: Do NOT use createServerClient from @supabase/ssr here.
 * When cookies are present, @supabase/ssr extracts the user's JWT from cookies
 * and uses it for requests — even with the service_role key. This means RLS
 * still applies, which defeats the purpose.
 * 
 * Always use the plain @supabase/supabase-js client without cookies.
 */
export async function createServiceClient() {
  return createServiceClientWithoutCookies();
}

/**
 * Service client that doesn't require cookies (for webhooks, cron jobs, etc.)
 */
export function createServiceClientWithoutCookies() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
