-- ============================================================================
-- Kyra Phase 1: Agency Core Schema
-- Migration: 20260213_agency_schema.sql
-- Description: Creates the foundational tables for the AI agency platform
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";  -- for gen_random_uuid()

-- ============================================================================
-- 1. HELPER: updated_at trigger function
-- Automatically sets updated_at = now() on any row modification.
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 2. TABLE: agencies
-- Top-level account representing an AI agency on the platform.
-- Each agency has an owner, a billing plan, optional Stripe & GHL integrations,
-- and a JSONB settings column for white-label configuration.
-- ============================================================================
create table public.agencies (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null references auth.users(id) on delete cascade,
  name                     text not null,
  slug                     text not null unique,  -- URL-safe identifier (e.g. acme-ai)
  plan                     text not null default 'starter'
                             check (plan in ('starter', 'pro', 'scale')),
  stripe_customer_id       text,           -- Stripe customer for billing the agency
  stripe_connect_account_id text,          -- Stripe Connect account for client payouts
  ghl_agency_id            text,           -- GoHighLevel agency-level ID
  settings                 jsonb not null default '{}'::jsonb,
    -- Expected keys: logo_url, primary_color, accent_color,
    -- custom_domain, company_name, support_email, etc.
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table  public.agencies is 'Agency accounts — the top-level tenant in Kyra.';
comment on column public.agencies.settings is 'White-label config: logo_url, colors, custom_domain, etc.';

-- updated_at trigger
create trigger trg_agencies_updated_at
  before update on public.agencies
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_agencies_owner_id on public.agencies(owner_id);
create index idx_agencies_slug     on public.agencies(slug);

-- ============================================================================
-- 3. TABLE: agency_members
-- Maps users to agencies with a role. The owner is always a member too,
-- which simplifies permission checks via a single table.
-- ============================================================================
create table public.agency_members (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member'
               check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),

  -- A user can only belong to an agency once
  unique (agency_id, user_id)
);

comment on table public.agency_members is 'Team membership linking users to agencies with roles.';

-- Indexes (unique constraint already covers agency_id, user_id)
create index idx_agency_members_user_id on public.agency_members(user_id);

-- ============================================================================
-- 4. TABLE: agency_templates
-- Reusable client configurations. Built-in templates have agency_id = NULL.
-- Agencies can create their own private templates or mark them public.
-- ============================================================================
create table public.agency_templates (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid references public.agencies(id) on delete cascade,  -- NULL = built-in
  name           text not null,
  description    text not null default '',
  industry       text not null default '',
  soul_template  text not null default '',  -- SOUL.md template with {{variable}} placeholders
  skills         text[] not null default '{}',  -- skill IDs to enable
  cron_config    jsonb not null default '[]'::jsonb,  -- default scheduled jobs
  is_public      boolean not null default false,
  created_at     timestamptz not null default now()
);

comment on table  public.agency_templates is 'Reusable client configurations (built-in or agency-owned).';
comment on column public.agency_templates.soul_template is 'SOUL.md Jinja-style template with {{variables}} for client customisation.';
comment on column public.agency_templates.skills is 'Array of skill identifiers to enable on the client container.';

-- Indexes
create index idx_agency_templates_agency_id on public.agency_templates(agency_id);
create index idx_agency_templates_public    on public.agency_templates(is_public) where is_public = true;

-- ============================================================================
-- 5. TABLE: agency_clients
-- Each row is a client AI instance managed by the agency.
-- Contains GHL sub-account credentials (should be encrypted at rest via
-- Supabase Vault or column-level encryption in production).
-- ============================================================================
create table public.agency_clients (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references public.agencies(id) on delete cascade,
  name                text not null,       -- client business name
  slug                text not null,       -- URL-safe identifier within the agency
  industry            text not null default '',
  status              text not null default 'setup'
                        check (status in ('active', 'paused', 'setup')),
  ghl_location_id     text,               -- GoHighLevel sub-account / location ID
  ghl_access_token    text,               -- encrypted at rest — GHL OAuth token
  ghl_refresh_token   text,               -- encrypted at rest — GHL refresh token
  container_config    jsonb not null default '{}'::jsonb,
    -- Expected keys: soul_md, model, skills, voice_config, etc.
  template_id         uuid references public.agency_templates(id) on delete set null,
  billing_amount_cents int not null default 0,  -- monthly amount agency charges this client
  usage_this_month    int not null default 0,   -- rolling usage counter (credits / messages)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Slugs must be unique within an agency
  unique (agency_id, slug)
);

comment on table  public.agency_clients is 'Client AI instances managed by an agency.';
comment on column public.agency_clients.container_config is 'Runtime config: SOUL.md content, model preference, enabled skills.';
comment on column public.agency_clients.ghl_access_token is 'GHL OAuth access token — encrypt at rest via Vault in production.';

-- updated_at trigger
create trigger trg_agency_clients_updated_at
  before update on public.agency_clients
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_agency_clients_agency_id   on public.agency_clients(agency_id);
create index idx_agency_clients_template_id on public.agency_clients(template_id);
create index idx_agency_clients_status      on public.agency_clients(status);

-- ============================================================================
-- 6. TABLE: agency_billing
-- Immutable ledger of billing events: subscriptions, client fees, top-ups,
-- and payouts. Linked optionally to a specific client.
-- ============================================================================
create table public.agency_billing (
  id                uuid primary key default gen_random_uuid(),
  agency_id         uuid not null references public.agencies(id) on delete cascade,
  client_id         uuid references public.agency_clients(id) on delete set null,
  type              text not null
                      check (type in ('subscription', 'client_fee', 'credit_topup', 'payout')),
  amount_cents      int not null,           -- positive = charge/income, negative = payout
  stripe_invoice_id text,                   -- Stripe invoice or payment intent ID
  created_at        timestamptz not null default now()
);

comment on table public.agency_billing is 'Immutable billing event ledger for agencies and their clients.';

-- Indexes
create index idx_agency_billing_agency_id  on public.agency_billing(agency_id);
create index idx_agency_billing_client_id  on public.agency_billing(client_id);
create index idx_agency_billing_type       on public.agency_billing(type);
create index idx_agency_billing_created_at on public.agency_billing(created_at desc);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- Core principle: users can only access data belonging to agencies they are
-- a member of. Built-in templates (agency_id IS NULL) are readable by all.
-- ============================================================================

-- Helper: returns all agency IDs the current user belongs to.
-- Used by every RLS policy below.
create or replace function public.user_agency_ids()
returns setof uuid as $$
  select agency_id
  from public.agency_members
  where user_id = auth.uid();
$$ language sql security definer stable;

-- ----- agencies -----
alter table public.agencies enable row level security;

create policy "Agencies: members can view their agency"
  on public.agencies for select
  using (id in (select public.user_agency_ids()));

create policy "Agencies: owner can insert"
  on public.agencies for insert
  with check (owner_id = auth.uid());

create policy "Agencies: owner/admin can update"
  on public.agencies for update
  using (
    id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Agencies: owner can delete"
  on public.agencies for delete
  using (owner_id = auth.uid());

-- ----- agency_members -----
alter table public.agency_members enable row level security;

create policy "Members: can view co-members in their agencies"
  on public.agency_members for select
  using (agency_id in (select public.user_agency_ids()));

create policy "Members: owner/admin can insert"
  on public.agency_members for insert
  with check (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Members: owner/admin can update roles"
  on public.agency_members for update
  using (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Members: owner/admin can remove members"
  on public.agency_members for delete
  using (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ----- agency_templates -----
alter table public.agency_templates enable row level security;

-- Built-in templates (agency_id IS NULL) are readable by everyone.
-- Agency-owned templates are only visible to that agency's members.
create policy "Templates: view own or built-in or public"
  on public.agency_templates for select
  using (
    agency_id is null                              -- built-in
    or is_public = true                            -- public community templates
    or agency_id in (select public.user_agency_ids())  -- own agency
  );

create policy "Templates: agency owner/admin can insert"
  on public.agency_templates for insert
  with check (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Templates: agency owner/admin can update"
  on public.agency_templates for update
  using (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Templates: agency owner/admin can delete"
  on public.agency_templates for delete
  using (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ----- agency_clients -----
alter table public.agency_clients enable row level security;

create policy "Clients: members can view"
  on public.agency_clients for select
  using (agency_id in (select public.user_agency_ids()));

create policy "Clients: owner/admin can insert"
  on public.agency_clients for insert
  with check (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Clients: owner/admin can update"
  on public.agency_clients for update
  using (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Clients: owner can delete"
  on public.agency_clients for delete
  using (
    agency_id in (
      select agency_id from public.agency_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ----- agency_billing -----
alter table public.agency_billing enable row level security;

create policy "Billing: members can view"
  on public.agency_billing for select
  using (agency_id in (select public.user_agency_ids()));

-- Billing rows are inserted by server-side functions (service role),
-- not directly by end users. No INSERT/UPDATE/DELETE policies for users.
create policy "Billing: service role can insert"
  on public.agency_billing for insert
  with check (true);  -- relies on service_role key server-side

-- ============================================================================
-- 8. SEED DATA: Built-in Templates
-- These ship with the platform. agency_id = NULL marks them as built-in.
-- ============================================================================

insert into public.agency_templates (id, agency_id, name, description, industry, soul_template, skills, cron_config, is_public)
values
  -- 1. LeadPilot — General lead qualification
  (
    gen_random_uuid(),
    null,
    'LeadPilot',
    'AI-powered lead qualification and nurturing. Engages inbound leads via SMS/chat, qualifies them with smart questions, and books appointments automatically.',
    'General',
    E'# {{business_name}} — Lead Qualification Assistant\n\nYou are the AI assistant for **{{business_name}}**.\n\n## Your Role\nYou qualify inbound leads by asking smart questions, understanding their needs, and booking appointments when they''re ready.\n\n## Personality\n- Professional yet friendly\n- Curious — ask follow-up questions\n- Action-oriented — always move toward booking\n\n## Qualification Criteria\n{{qualification_criteria}}\n\n## Booking Rules\n- Available hours: {{available_hours}}\n- Calendar link: {{calendar_link}}\n- Always confirm timezone',
    array['lead-capture', 'appointment-booking', 'sms-reply', 'email-reply'],
    '[{"schedule": "0 9 * * 1-5", "action": "follow_up_stale_leads", "description": "Follow up on leads with no response in 24h"}]'::jsonb,
    false
  ),

  -- 2. DentalAssist — Dental / Medical scheduling
  (
    gen_random_uuid(),
    null,
    'DentalAssist',
    'Specialised for dental and medical practices. Handles appointment scheduling, reminders, insurance pre-qualification, and post-visit follow-ups.',
    'Dental / Medical',
    E'# {{practice_name}} — Dental Assistant AI\n\nYou are the virtual front desk assistant for **{{practice_name}}**.\n\n## Your Role\nHelp patients schedule appointments, answer common questions about procedures, and handle insurance pre-qualification.\n\n## Personality\n- Warm and reassuring (many patients have dental anxiety)\n- Clear and informative\n- HIPAA-aware — never discuss other patients\n\n## Services Offered\n{{services_list}}\n\n## Insurance\nAccepted providers: {{insurance_providers}}\n\n## Scheduling\n- Office hours: {{office_hours}}\n- Emergency line: {{emergency_phone}}\n- New patient forms: {{forms_link}}',
    array['appointment-booking', 'sms-reply', 'reminder-send', 'insurance-check'],
    '[{"schedule": "0 8 * * 1-5", "action": "send_appointment_reminders", "description": "Send reminders for tomorrow''s appointments"}, {"schedule": "0 17 * * 1-5", "action": "post_visit_followup", "description": "Follow up with patients seen today"}]'::jsonb,
    false
  ),

  -- 3. PropertyPro — Real Estate
  (
    gen_random_uuid(),
    null,
    'PropertyPro',
    'Real estate AI assistant for agents and brokerages. Qualifies buyer/seller leads, answers property questions, and schedules showings.',
    'Real Estate',
    E'# {{brokerage_name}} — Real Estate AI\n\nYou are the AI assistant for **{{agent_name}}** at **{{brokerage_name}}**.\n\n## Your Role\nEngage property leads, qualify buyers and sellers, answer listing questions, and schedule showings.\n\n## Personality\n- Knowledgeable and enthusiastic about properties\n- Patient with first-time buyers\n- Always professional\n\n## Active Listings\n{{listings_summary}}\n\n## Qualification Questions (Buyers)\n1. Pre-approved? Budget range?\n2. Timeline — when do they need to move?\n3. Must-haves vs nice-to-haves\n4. Preferred areas\n\n## Showing Availability\n{{showing_hours}}\n\n## Contact\nAgent direct: {{agent_phone}}',
    array['lead-capture', 'appointment-booking', 'sms-reply', 'email-reply', 'listing-search'],
    '[{"schedule": "0 10 * * *", "action": "new_listing_alerts", "description": "Notify leads about new listings matching their criteria"}, {"schedule": "0 9 * * 1", "action": "weekly_market_update", "description": "Send weekly market update to active leads"}]'::jsonb,
    false
  ),

  -- 4. ServicePro — Home Services
  (
    gen_random_uuid(),
    null,
    'ServicePro',
    'Built for home service businesses (HVAC, plumbing, electrical, cleaning). Handles service inquiries, quotes, scheduling, and dispatch.',
    'Home Services',
    E'# {{company_name}} — Service Assistant AI\n\nYou are the AI assistant for **{{company_name}}**, a {{service_type}} company.\n\n## Your Role\nHandle inbound service requests, provide estimates when possible, schedule service calls, and manage emergency dispatch.\n\n## Personality\n- Helpful and efficient\n- Empathetic to urgent situations (broken AC in summer, burst pipe, etc.)\n- Clear about pricing and timelines\n\n## Services & Pricing\n{{services_and_pricing}}\n\n## Service Area\n{{service_area}}\n\n## Scheduling\n- Business hours: {{business_hours}}\n- Emergency service: {{emergency_available}}\n- Typical lead time: {{lead_time}}\n\n## Important\n- Always collect: name, address, phone, description of issue\n- For emergencies, escalate to: {{dispatch_phone}}',
    array['lead-capture', 'appointment-booking', 'sms-reply', 'quote-calculator', 'dispatch-notify'],
    '[{"schedule": "0 8 * * *", "action": "daily_schedule_summary", "description": "Send today''s job schedule to the team"}, {"schedule": "0 18 * * *", "action": "job_completion_followup", "description": "Follow up on completed jobs for reviews"}]'::jsonb,
    false
  ),

  -- 5. RetailAssist — Retail / E-commerce
  (
    gen_random_uuid(),
    null,
    'RetailAssist',
    'AI shopping assistant for retail and e-commerce businesses. Handles product questions, order status, returns, and personalised recommendations.',
    'Retail / E-commerce',
    E'# {{store_name}} — Shopping Assistant AI\n\nYou are the AI shopping assistant for **{{store_name}}**.\n\n## Your Role\nHelp customers find products, answer questions, check order status, process returns, and make personalised recommendations.\n\n## Personality\n- Enthusiastic about the products\n- Helpful without being pushy\n- Quick and efficient\n\n## Product Categories\n{{product_categories}}\n\n## Policies\n- Returns: {{return_policy}}\n- Shipping: {{shipping_info}}\n- Price matching: {{price_match_policy}}\n\n## Current Promotions\n{{current_promotions}}\n\n## Escalation\nFor complex issues, transfer to: {{support_email}}\nPhone support: {{support_phone}}',
    array['product-search', 'order-lookup', 'sms-reply', 'email-reply', 'review-request'],
    '[{"schedule": "0 10 * * *", "action": "abandoned_cart_followup", "description": "Follow up on abandoned carts from yesterday"}, {"schedule": "0 9 * * 1", "action": "weekly_promo_blast", "description": "Send weekly deals to opted-in customers"}]'::jsonb,
    false
  );

-- ============================================================================
-- Done. Schema ready for Phase 1.
-- ============================================================================
