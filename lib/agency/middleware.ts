// ============================================================================
// Agency Auth Middleware Helpers
// Verify agency membership and roles for API route handlers.
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import { Agency, AgencyMember } from './types';
import { User } from '@supabase/supabase-js';

interface AgencyContext {
  user: User;
  agency: Agency;
  membership: AgencyMember;
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
