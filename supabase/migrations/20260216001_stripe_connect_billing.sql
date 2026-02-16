-- ============================================================================
-- Kyra Phase 3: Stripe Connect Billing for Agencies
-- Migration: 20260216001_stripe_connect_billing.sql
-- Description: Adds per-client billing fields and agency onboarding status
-- ============================================================================

-- 1. Add Stripe Connect onboarding status to agencies
alter table public.agencies
  add column if not exists stripe_onboarding_complete boolean not null default false;

-- 2. Add per-client billing fields to agency_clients
alter table public.agency_clients
  add column if not exists stripe_customer_id text,        -- customer ID on the connected account
  add column if not exists stripe_subscription_id text,    -- subscription on the connected account
  add column if not exists billing_status text not null default 'none'
    check (billing_status in ('none', 'active', 'past_due', 'canceled', 'trialing'));

-- 3. Add default per-client pricing to agencies
alter table public.agencies
  add column if not exists default_client_price_cents int not null default 2900; -- $29/mo default

-- 4. Index for subscription lookups
create index if not exists idx_agency_clients_stripe_subscription
  on public.agency_clients(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_agency_clients_billing_status
  on public.agency_clients(billing_status)
  where billing_status != 'none';

-- ============================================================================
-- Done. Phase 3 billing schema additions applied.
-- ============================================================================
