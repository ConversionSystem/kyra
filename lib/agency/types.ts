// ============================================================================
// Agency Types — Phase 1
// ============================================================================

export interface Agency {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  plan: AgencyPlan;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_onboarding_complete: boolean;
  default_client_price_cents: number;
  ghl_agency_id: string | null;
  settings: AgencySettings;
  created_at: string;
  updated_at: string;
}

export type AgencyPlan = 'starter' | 'pro' | 'scale';

export interface AgencySettings {
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  custom_domain?: string;
  company_name?: string;
  support_email?: string;
  [key: string]: unknown;
}

export interface AgencyMember {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyRole;
  created_at: string;
}

export type AgencyRole = 'owner' | 'admin' | 'member';

export type BillingStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';

export interface AgencyClient {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  industry: string;
  status: ClientStatus;
  ghl_location_id: string | null;
  ghl_access_token: string | null;
  ghl_refresh_token: string | null;
  container_config: Record<string, unknown>;
  template_id: string | null;
  billing_amount_cents: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_status: BillingStatus;
  usage_this_month: number;
  created_at: string;
  updated_at: string;
}

export type ClientStatus = 'active' | 'paused' | 'setup';

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

export interface AgencyBilling {
  id: string;
  agency_id: string;
  client_id: string | null;
  type: 'subscription' | 'client_fee' | 'credit_topup' | 'payout';
  amount_cents: number;
  stripe_invoice_id: string | null;
  created_at: string;
}

// ---------- API request/response shapes ----------

export interface CreateAgencyRequest {
  name: string;
  slug: string;
  plan: AgencyPlan;
}

export interface CreateClientRequest {
  name: string;
  slug: string;
  industry?: string;
  template_id?: string;
}

export interface UpdateClientRequest {
  name?: string;
  industry?: string;
  status?: ClientStatus;
  container_config?: Record<string, unknown>;
}

export interface AgencyWithCounts extends Agency {
  member_count: number;
  client_count: number;
}
