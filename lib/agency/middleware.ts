// ============================================================================
// Agency Auth Middleware Helpers
// Verify agency membership and roles for API route handlers.
// ============================================================================

import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { Agency, AgencyMember } from './types';
import { User } from '@supabase/supabase-js';

interface AgencyContext {
  user: User;
  agency: Agency;
  membership: AgencyMember;
}

/** Same shape as AgencyContext but with the specific client the caller is
 *  targeting. Returned by `requireClientAccess()`. */
export interface ClientAccessContext extends AgencyContext {
  client: {
    id: string;
    agency_id: string;
    name: string | null;
  };
}

/**
 * Verify the current user is authenticated and a member of an agency.
 * Returns the user, their agency, and membership record.
 */
export async function requireAgencyMember(): Promise<
  { data: AgencyContext; error: null } | { data: null; error: { message: string; status: number } }
> {
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', status: 401 } };
  }

  // 2. Find their agency membership
  const { data: membership, error: memberError } = await supabase
    .from('agency_members')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (memberError || !membership) {
    return { data: null, error: { message: 'No agency membership found', status: 403 } };
  }

  // 3. Fetch agency
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', membership.agency_id)
    .single();

  if (agencyError || !agency) {
    return { data: null, error: { message: 'Agency not found', status: 404 } };
  }

  return {
    data: {
      user,
      agency: agency as Agency,
      membership: membership as AgencyMember,
    },
    error: null,
  };
}

/**
 * Verify the current user is an owner or admin of their agency.
 */
export async function requireAgencyAdmin(): Promise<
  { data: AgencyContext; error: null } | { data: null; error: { message: string; status: number } }
> {
  const result = await requireAgencyMember();
  if (result.error) return result;

  const { membership } = result.data;
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { data: null, error: { message: 'Admin access required', status: 403 } };
  }

  return result;
}

/**
 * Verify the current user is the owner of their agency.
 */
export async function requireAgencyOwner(): Promise<
  { data: AgencyContext; error: null } | { data: null; error: { message: string; status: number } }
> {
  const result = await requireAgencyMember();
  if (result.error) return result;

  const { membership } = result.data;
  if (membership.role !== 'owner') {
    return { data: null, error: { message: 'Owner access required', status: 403 } };
  }

  return result;
}

/**
 * Verify the caller is an agency member AND the target `clientId` belongs to
 * their agency. Returns the client row plus the full agency context.
 *
 * This is the canonical guard for every `/api/agency/clients/[id]/**` route.
 * Previously many of those routes either used raw `supabase.auth.getUser()`
 * (no agency scoping) or `requireAgencyMember()` without verifying the
 * clientId in the URL actually belonged to the caller — a cross-tenant
 * abuse vector (chainable with the public /api/public/workers endpoint
 * which exposes client UUIDs).
 *
 * Usage:
 *   const auth = await requireClientAccess(clientId);
 *   if (auth.error) return NextResponse.json(
 *     { error: auth.error.message }, { status: auth.error.status }
 *   );
 *   const { user, agency, membership, client } = auth.data;
 *
 * Error shape matches the other `require*` helpers so route code stays
 * uniform. Not found → 404. Cross-tenant access → 403. Unauthenticated → 401.
 *
 * The client lookup uses the service role client (bypassing RLS) so the
 * caller's membership check is the sole authority — RLS on `agency_clients`
 * would otherwise return null rows and the caller would see a 404 for
 * clients they ARE allowed to access but happen to have unusual RLS policies.
 */
export async function requireClientAccess(
  clientId: string | null | undefined,
): Promise<
  { data: ClientAccessContext; error: null } | { data: null; error: { message: string; status: number } }
> {
  if (!clientId || typeof clientId !== 'string') {
    return { data: null, error: { message: 'clientId is required', status: 400 } };
  }

  const auth = await requireAgencyMember();
  if (auth.error) return auth;

  const svc = createServiceClientWithoutCookies();
  const { data: client, error: clientErr } = await svc
    .from('agency_clients')
    .select('id, agency_id, name')
    .eq('id', clientId)
    .maybeSingle();

  if (clientErr || !client) {
    return { data: null, error: { message: 'Client not found', status: 404 } };
  }

  if (client.agency_id !== auth.data.agency.id) {
    return {
      data: null,
      error: { message: 'You do not have access to this client', status: 403 },
    };
  }

  return {
    data: {
      ...auth.data,
      client: {
        id: client.id,
        agency_id: client.agency_id,
        name: client.name,
      },
    },
    error: null,
  };
}

/**
 * Verify the current user is an admin+ of their agency AND their agency is in
 * the ADVANCED_TABS allowlist (Marketing / Voice-SMS / SEO-GEO / IT Ops).
 *
 * Previously the allowlist was checked UI-side only — any authenticated
 * admin who knew the endpoint URL could hit the underlying routes
 * regardless of entitlement. This closes that gap server-side.
 */
export async function requireAdvancedTabsAgency(): Promise<
  { data: AgencyContext; error: null } | { data: null; error: { message: string; status: number } }
> {
  // Lazy import to avoid a circular-ish dependency with lib/agency/constants
  // (constants is leaf; middleware is higher — import is fine, but doing it
  // inline keeps the common case snappy).
  const { hasAdvancedTabs } = await import('./constants');

  const result = await requireAgencyAdmin();
  if (result.error) return result;

  if (!hasAdvancedTabs(result.data.agency.id)) {
    return {
      data: null,
      error: {
        message: 'This feature is not enabled on your plan. Contact Kyra support to request access.',
        status: 403,
      },
    };
  }

  return result;
}

/**
 * Verify the current user is a member of their agency AND their agency is in
 * the DISPATCH allowlist (Onfleet integration).
 *
 * Matches the role level used by the existing dispatch routes
 * (`requireAgencyMember`). Promoting to admin would regress for agencies
 * whose dispatch operators have `member` role.
 */
export async function requireDispatchAgency(): Promise<
  { data: AgencyContext; error: null } | { data: null; error: { message: string; status: number } }
> {
  const { hasDispatchTab } = await import('./constants');

  const result = await requireAgencyMember();
  if (result.error) return result;

  if (!hasDispatchTab(result.data.agency.id)) {
    return {
      data: null,
      error: {
        message: 'Dispatch is not enabled on your account. Contact Kyra support to request access.',
        status: 403,
      },
    };
  }

  return result;
}
