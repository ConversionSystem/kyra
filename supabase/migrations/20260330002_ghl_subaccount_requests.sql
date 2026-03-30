-- ============================================================================
-- GHL Sub-Account Requests
-- Migration: 20260330002_ghl_subaccount_requests.sql
--
-- Stores manual sub-account creation requests submitted by Kyra agencies.
-- Angel reviews and creates these manually in GHL until Marketplace app
-- is approved.
-- ============================================================================

create table if not exists public.ghl_subaccount_requests (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references public.agencies(id) on delete cascade,
  client_id       uuid references public.agency_clients(id) on delete set null,
  -- Contact info for the sub-account
  business_name   text not null,
  contact_name    text not null,
  contact_email   text not null,
  contact_phone   text,
  business_address text,
  city            text,
  state           text,
  country         text not null default 'US',
  timezone        text not null default 'America/New_York',
  -- Metadata
  status          text not null default 'pending'
                    check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  notes           text,           -- internal notes from Angel
  ghl_location_id text,           -- filled in once Angel creates the sub-account
  requested_by    uuid references auth.users(id),
  completed_by    uuid references auth.users(id),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.ghl_subaccount_requests is
  'Manual GHL sub-account creation requests — reviewed by platform admin until GHL Marketplace app is approved.';

-- Trigger: updated_at
create trigger trg_ghl_subaccount_requests_updated_at
  before update on public.ghl_subaccount_requests
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_ghl_subaccount_requests_agency  on public.ghl_subaccount_requests(agency_id);
create index idx_ghl_subaccount_requests_client  on public.ghl_subaccount_requests(client_id);
create index idx_ghl_subaccount_requests_status  on public.ghl_subaccount_requests(status);
create index idx_ghl_subaccount_requests_created on public.ghl_subaccount_requests(created_at desc);

-- RLS: Agency members can view and insert their own requests
alter table public.ghl_subaccount_requests enable row level security;

create policy "GHL requests: members can view own agency requests"
  on public.ghl_subaccount_requests for select
  using (
    agency_id in (select public.user_agency_ids())
  );

create policy "GHL requests: members can insert for own agency"
  on public.ghl_subaccount_requests for insert
  with check (
    agency_id in (select public.user_agency_ids())
  );

-- Service role can do everything (for admin/email operations)
create policy "GHL requests: service role full access"
  on public.ghl_subaccount_requests for all
  using (true)
  with check (true);
