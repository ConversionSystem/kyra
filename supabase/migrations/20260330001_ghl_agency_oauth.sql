-- ============================================================================
-- GHL Agency-Level OAuth Tokens
-- Migration: 20260330001_ghl_agency_oauth.sql
--
-- Adds agency-level GHL OAuth token storage so Kyra can create sub-accounts
-- on behalf of the agency owner. Separate from per-client tokens which live
-- on agency_clients.
-- ============================================================================

alter table public.agencies
  add column if not exists ghl_access_token      text,
  add column if not exists ghl_refresh_token     text,
  add column if not exists ghl_token_expires_at  timestamptz,
  add column if not exists ghl_company_id        text,
  add column if not exists ghl_connected_at      timestamptz,
  add column if not exists ghl_connected_by      uuid references auth.users(id);

comment on column public.agencies.ghl_access_token     is 'GHL company-level OAuth access token — used to create sub-accounts.';
comment on column public.agencies.ghl_refresh_token    is 'GHL company-level OAuth refresh token.';
comment on column public.agencies.ghl_token_expires_at is 'When the access token expires — auto-refreshed before use.';
comment on column public.agencies.ghl_company_id       is 'GHL Company ID returned during agency-level OAuth.';
comment on column public.agencies.ghl_connected_at     is 'When the agency owner connected their GHL account.';
comment on column public.agencies.ghl_connected_by     is 'User ID of the agency member who connected GHL.';
