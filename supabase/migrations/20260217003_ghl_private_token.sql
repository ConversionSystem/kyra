-- ============================================================================
-- Add ghl_private_token column to agency_clients
-- Allows connecting GHL sub-accounts via Private Integration tokens
-- without requiring GHL Marketplace approval.
-- ============================================================================

alter table public.agency_clients
  add column if not exists ghl_private_token text;

comment on column public.agency_clients.ghl_private_token is
  'GHL Private Integration token (static Bearer token, no refresh needed). Takes priority over OAuth tokens when present.';
