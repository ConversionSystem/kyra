import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface Agency {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'pro' | 'scale';
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_onboarding_complete: boolean;
  default_client_price_cents: number;
  ghl_agency_id: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgencyMember {
  id: string;
  agency_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface AgencyClient {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  industry: string;
  status: 'active' | 'paused' | 'setup';
  ghl_location_id: string | null;
  ghl_access_token: string | null;
  ghl_refresh_token: string | null;
  ghl_private_token: string | null;
  ghl_connected_at: string | null;
  ghl_connected_by: string | null;
  container_config: Record<string, unknown>;
  template_id: string | null;
  billing_amount_cents: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_status: 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';
  usage_this_month: number;
  created_at: string;
  updated_at: string;
  // Gateway / OVH container
  gateway_url: string | null;
  gateway_token: string | null;
  gateway_container_id: string | null;
  gateway_status: 'running' | 'starting' | 'provisioning' | 'error' | null;
  gateway_error: string | null;
  gateway_provisioned_at: string | null;
  settings: Record<string, unknown>;
  template?: AgencyTemplate | null;
}

export interface SuggestedSkill {
  id: string;
  name: string;
  description: string;
}

export interface SampleResponse {
  question: string;
  answer: string;
}

export interface GhlTemplateConfig {
  pipeline_stages?: string[];
  custom_fields?: string[];
  workflow_triggers?: Record<string, string>;
}

export interface AgencyTemplate {
  id: string;
  agency_id: string | null;
  name: string;
  description: string;
  industry: string;
  icon: string;
  soul_template: string;
  system_prompt_prefix: string;
  skills: string[];
  suggested_skills: SuggestedSkill[];
  sample_responses: SampleResponse[];
  ghl_config: GhlTemplateConfig;
  cron_config: unknown[];
  is_public: boolean;
  created_at: string;
}

// ============================================================================
// Agency queries
// ============================================================================

/**
 * Get the agency the current user belongs to (via agency_members).
 * Returns the agency + the user's role, or null if no agency found.
 */
export async function getAgencyForUser(userId: string) {
  const supabase = await createClient();

  const { data: membership, error: memberError } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', userId)
    .single();

  if (memberError || !membership) return null;

  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', membership.agency_id)
    .single();

  if (agencyError || !agency) return null;

  // Get member count
  const { count } = await supabase
    .from('agency_members')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agency.id);

  return {
    agency: agency as Agency,
    role: membership.role as AgencyMember['role'],
    memberCount: count ?? 0,
  };
}

// ============================================================================
// Client queries
// ============================================================================

/**
 * List all clients for an agency, ordered by creation date (newest first).
 */
export async function getAgencyClients(agencyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('agency_clients')
    .select('*, template:agency_templates(*)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
  return (data ?? []) as AgencyClient[];
}

/**
 * Get a single client by ID.
 */
export async function getAgencyClient(clientId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('agency_clients')
    .select('*, template:agency_templates(*)')
    .eq('id', clientId)
    .single();

  if (error) return null;
  return data as AgencyClient;
}

/**
 * Create a new agency client.
 */
export async function createAgencyClient(
  agencyId: string,
  data: {
    name: string;
    slug: string;
    industry: string;
    template_id?: string | null;
  }
) {
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .insert({
      agency_id: agencyId,
      name: data.name,
      slug: data.slug,
      industry: data.industry,
      template_id: data.template_id ?? null,
      status: 'setup',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create client: ${error.message}`);
  return client as AgencyClient;
}

/**
 * Update an existing client.
 */
export async function updateAgencyClient(
  clientId: string,
  data: Partial<Pick<AgencyClient, 'name' | 'industry' | 'status'>>
) {
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .update(data)
    .eq('id', clientId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update client: ${error.message}`);
  return client as AgencyClient;
}

/**
 * Delete a client by ID.
 */
export async function deleteAgencyClient(clientId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('agency_clients')
    .delete()
    .eq('id', clientId);

  if (error) throw new Error(`Failed to delete client: ${error.message}`);
}

// ============================================================================
// Template queries
// ============================================================================

/**
 * Get all templates available to an agency:
 * - Built-in templates (agency_id IS NULL)
 * - The agency's own templates
 */
export async function getAgencyTemplates(agencyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('agency_templates')
    .select('*')
    .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
  return (data ?? []) as AgencyTemplate[];
}
