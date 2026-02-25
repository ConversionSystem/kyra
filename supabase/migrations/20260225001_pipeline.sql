-- AI Sales Pipeline for Kyra Agencies
-- Enables: Find Leads → Research → Personalize → Launch → Track

-- ─────────────────────────────────────────────
-- Table: pipeline_campaigns
-- ─────────────────────────────────────────────
create table if not exists pipeline_campaigns (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references agencies(id) on delete cascade,
  name                text not null,
  target_industry     text,
  target_role         text,
  target_company_size text,
  target_location     text,
  target_pain_points  text,
  value_prop          text,
  status              text not null default 'active' check (status in ('active','paused','archived')),
  leads_found         int  not null default 0,
  leads_messaged      int  not null default 0,
  leads_replied       int  not null default 0,
  leads_booked        int  not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Table: pipeline_leads
-- ─────────────────────────────────────────────
create table if not exists pipeline_leads (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null references pipeline_campaigns(id) on delete cascade,
  agency_id             uuid not null references agencies(id) on delete cascade,
  first_name            text,
  last_name             text,
  full_name             text,
  title                 text,
  company               text,
  industry              text,
  company_size          text,
  location              text,
  email                 text,
  phone                 text,
  linkedin_url          text,
  website               text,
  enrichment_data       jsonb not null default '{}',
  personalized_subject  text,
  personalized_email    text,
  personalized_opener   text,
  stage                 text not null default 'found' check (
    stage in ('found','researched','approved','messaged','replied','interested','booked','closed','skipped')
  ),
  ghl_contact_id        text,
  messaged_at           timestamptz,
  replied_at            timestamptz,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists pipeline_campaigns_agency_id_idx on pipeline_campaigns(agency_id);
create index if not exists pipeline_leads_campaign_id_idx   on pipeline_leads(campaign_id);
create index if not exists pipeline_leads_agency_id_idx     on pipeline_leads(agency_id);
create index if not exists pipeline_leads_stage_idx         on pipeline_leads(stage);
create index if not exists pipeline_leads_email_idx         on pipeline_leads(email);

-- ─────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pipeline_campaigns_updated_at on pipeline_campaigns;
create trigger pipeline_campaigns_updated_at
  before update on pipeline_campaigns
  for each row execute function update_updated_at_column();

drop trigger if exists pipeline_leads_updated_at on pipeline_leads;
create trigger pipeline_leads_updated_at
  before update on pipeline_leads
  for each row execute function update_updated_at_column();

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table pipeline_campaigns enable row level security;
alter table pipeline_leads     enable row level security;

-- Campaigns: agency members can manage their own campaigns
create policy "Agency members can manage pipeline_campaigns"
  on pipeline_campaigns for all
  using (
    agency_id in (
      select agency_id from agency_members where user_id = auth.uid()
    )
  );

-- Leads: agency members can manage leads in their campaigns
create policy "Agency members can manage pipeline_leads"
  on pipeline_leads for all
  using (
    agency_id in (
      select agency_id from agency_members where user_id = auth.uid()
    )
  );
