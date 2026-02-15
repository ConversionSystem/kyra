-- ============================================================================
-- Kyra Phase 2: GHL Integration Columns + Webhook Log Table
-- Migration: 20260214_ghl_phase2.sql
-- ============================================================================

-- 1. Add GHL OAuth tracking columns to agency_clients
alter table public.agency_clients
  add column if not exists ghl_connected_at timestamptz,
  add column if not exists ghl_connected_by uuid references auth.users(id);

-- Index for location-based lookups (webhook routing)
create index if not exists idx_agency_clients_ghl_location
  on public.agency_clients(ghl_location_id)
  where ghl_location_id is not null;

-- 2. GHL Webhook Logs — audit trail for all inbound webhooks
create table if not exists public.ghl_webhook_logs (
  id             uuid primary key default gen_random_uuid(),
  location_id    text not null,
  event_type     text not null,
  client_id      uuid references public.agency_clients(id) on delete set null,
  status         text not null check (status in ('processed', 'unrouted', 'skipped_inactive', 'error')),
  error_message  text,
  duration_ms    int,
  payload_json   jsonb,  -- optional: store raw payload for debugging
  created_at     timestamptz not null default now()
);

comment on table public.ghl_webhook_logs is 'Audit log for all GHL webhook events received by Kyra.';

-- Indexes for webhook log queries
create index idx_ghl_webhook_logs_client_id  on public.ghl_webhook_logs(client_id);
create index idx_ghl_webhook_logs_location   on public.ghl_webhook_logs(location_id);
create index idx_ghl_webhook_logs_created_at on public.ghl_webhook_logs(created_at desc);
create index idx_ghl_webhook_logs_status     on public.ghl_webhook_logs(status) where status = 'error';

-- RLS for webhook logs — agency members can view logs for their clients
alter table public.ghl_webhook_logs enable row level security;

create policy "Webhook logs: members can view via client"
  on public.ghl_webhook_logs for select
  using (
    client_id in (
      select id from public.agency_clients
      where agency_id in (select public.user_agency_ids())
    )
  );

-- Service role can insert (from webhook handler)
create policy "Webhook logs: service role can insert"
  on public.ghl_webhook_logs for insert
  with check (true);

-- ============================================================================
-- Done. Phase 2 GHL schema additions applied.
-- ============================================================================
