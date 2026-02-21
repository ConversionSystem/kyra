-- Add settings JSONB column to agency_clients for per-client config
-- (north_star, monthly_budget, model_preference, etc.)
alter table public.agency_clients
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.agency_clients.settings is 'Per-client settings: north_star, monthly_budget, model_preference, etc.';
