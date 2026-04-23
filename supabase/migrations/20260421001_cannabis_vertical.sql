-- ────────────────────────────────────────────────────────────────────────────
-- Cannabis Vertical — Dispatch Agents + Jane Generalization + TCPA Audit
--
-- Adds four things:
-- 1. dispatch_briefings — Dispatcher Copilot output with recommendation state
-- 2. agent_invocations — unified audit log for all 4 dispatch agents
--                        (Dispatch Brain, SMS Writer, Copilot, Inbound Customer)
-- 3. sms_consent + sms_opt_out — TCPA audit trail (compliance moat)
-- 4. Backfill Purple Lotus container_config with Jane Algolia keys
--    (removes hardcoded credentials from lib/integrations/jane.ts)
--
-- Idempotent — safe to re-run. Uses CREATE TABLE IF NOT EXISTS throughout.
-- RLS enabled on every new tenant table from day 1.
--
-- ⚠ POST-SHIP CORRECTION (2026-04-23)
-- Section 5 below (the Purple Lotus backfill) hardcoded the WRONG client UUID.
-- f91b28a1-2911-477e-b228-9a21cdbb1dca is the Kyra internal marketing client
-- ("Kyra" / industry: Market Intelligence) in the ConversionSystem agency,
-- NOT Purple Lotus. The real Purple Lotus (industry: Cannabis Dispensary) is
-- 968cae23-e978-46bd-8f4f-23ed2e82d7be.
--
-- When this migration ran it polluted the internal Kyra client with Jane
-- Algolia keys, 41 cannabis brands, industry=cannabis, website_url=plpcsanjose,
-- and dispatch_agent_* config. A follow-up migration
-- (20260423001_fix_wrong_pl_uuid.sql) reverses the pollution and re-applies
-- the correct backfill against 968cae23.
--
-- DO NOT REVERT THIS FILE — it has already run in production. The fix-up
-- migration handles the correction cleanly. This header is kept as a
-- permanent breadcrumb so anyone grepping for "f91b28a1" understands the
-- history.
-- ────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. dispatch_briefings — Copilot output streamed to dispatcher dashboard
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.dispatch_briefings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  agency_id           UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  summary             TEXT NOT NULL,                        -- "3 active routes, 2 at risk..."
  recommendations     JSONB NOT NULL DEFAULT '[]'::JSONB,   -- [{id, text, action, taskId, approved, rejected, approved_at}]
  active_route_count  INTEGER,
  at_risk_count       INTEGER,
  prevented_breaches  INTEGER,
  time_window_start   TIMESTAMPTZ NOT NULL,
  time_window_end     TIMESTAMPTZ NOT NULL,
  model               TEXT NOT NULL,                         -- 'claude-sonnet-4-20250514'
  tokens_in           INTEGER,
  tokens_out          INTEGER,
  cost_cents          INTEGER,                               -- displayable cost for budget monitoring
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_dispatch_briefings_client_time
  ON public.dispatch_briefings(client_id, created_at DESC);
-- Plain composite index (no partial WHERE). Postgres rejects NOW() in an index
-- predicate because it's STABLE, not IMMUTABLE. Readers filter expires_at
-- themselves; this index still supports those range scans.
CREATE INDEX IF NOT EXISTS idx_dispatch_briefings_expires
  ON public.dispatch_briefings(client_id, expires_at DESC);

ALTER TABLE public.dispatch_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY dispatch_briefings_agency_member
  ON public.dispatch_briefings
  FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

-- Service-role writes (agent runner inserts briefings).
CREATE POLICY dispatch_briefings_service_all
  ON public.dispatch_briefings
  FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. agent_invocations — unified audit log across all 4 dispatch agents
--
-- Every LLM call runs through lib/ai/agent-runner.ts which writes one row
-- here per invocation. Drives: cost dashboards, debugging, fallback-rate
-- alerting, per-agent latency SLOs.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_invocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  agency_id           UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent               TEXT NOT NULL
                      CHECK (agent IN (
                        'dispatch_brain',
                        'sms_writer',
                        'copilot',
                        'inbound_customer'
                      )),
  trigger_type        TEXT NOT NULL
                      CHECK (trigger_type IN (
                        'onfleet_webhook',
                        'cron',
                        'inbound_sms',
                        'manual'
                      )),
  trigger_ref         TEXT,                         -- onfleet task id, sms conversation id, etc.
  model               TEXT NOT NULL,
  input_tokens        INTEGER,
  output_tokens       INTEGER,
  cost_cents          INTEGER,
  tool_calls          JSONB NOT NULL DEFAULT '[]'::JSONB,  -- [{name, input, output, latency_ms, error}]
  outcome             TEXT NOT NULL
                      CHECK (outcome IN ('success', 'fallback', 'error', 'blocked', 'budget_exceeded')),
  error_detail        TEXT,
  latency_ms          INTEGER,
  reasoning_summary   TEXT,                          -- short LLM-generated "why" for debugging
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_invocations_client_time
  ON public.agent_invocations(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_agent_time
  ON public.agent_invocations(agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_outcome
  ON public.agent_invocations(client_id, outcome)
  WHERE outcome IN ('fallback', 'error', 'blocked');

ALTER TABLE public.agent_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_invocations_agency_member
  ON public.agent_invocations
  FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY agent_invocations_service_all
  ON public.agent_invocations
  FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. sms_consent — TCPA audit trail (timestamped proof-of-consent)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sms_consent (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  agency_id           UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  phone_e164          TEXT NOT NULL,
  contact_name        TEXT,
  consent_text        TEXT NOT NULL,        -- the actual language the customer agreed to
  consent_source      TEXT NOT NULL
                      CHECK (consent_source IN (
                        'pos_signup', 'online_order', 'web_form',
                        'kiosk', 'import', 'manual', 'widget_chat'
                      )),
  consent_ip          TEXT,
  consent_user_agent  TEXT,
  consented_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sms_consent_phone
  ON public.sms_consent(client_id, phone_e164)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sms_consent_agency
  ON public.sms_consent(agency_id, consented_at DESC);

ALTER TABLE public.sms_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_consent_agency_member
  ON public.sms_consent
  FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY sms_consent_service_all
  ON public.sms_consent
  FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. sms_opt_out — STOP/UNSUBSCRIBE recipients. Blocks all future SMS.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sms_opt_out (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  agency_id           UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  phone_e164          TEXT NOT NULL,
  opted_out_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source              TEXT NOT NULL DEFAULT 'stop_reply'
                      CHECK (source IN (
                        'stop_reply', 'self_service', 'complaint',
                        'manual', 'unsubscribe_link'
                      )),
  notes               TEXT,
  UNIQUE(client_id, phone_e164)
);

CREATE INDEX IF NOT EXISTS idx_sms_opt_out_phone
  ON public.sms_opt_out(client_id, phone_e164);

ALTER TABLE public.sms_opt_out ENABLE ROW LEVEL SECURITY;

CREATE POLICY sms_opt_out_agency_member
  ON public.sms_opt_out
  FOR SELECT
  USING (
    agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY sms_opt_out_service_all
  ON public.sms_opt_out
  FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Backfill Purple Lotus Jane Algolia config into container_config
--
-- Removes the hardcoded credentials from lib/integrations/jane.ts by moving
-- them into Purple Lotus's client config. Next cannabis customer supplies
-- their own keys via widget-builder-embedded.tsx.
--
-- Purple Lotus client ID: f91b28a1-2911-477e-b228-9a21cdbb1dca
-- (referenced in scripts/fix-marketing-data.mjs)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  pl_client_id CONSTANT UUID := 'f91b28a1-2911-477e-b228-9a21cdbb1dca';
  current_config JSONB;
BEGIN
  SELECT container_config INTO current_config
  FROM public.agency_clients
  WHERE id = pl_client_id;

  IF current_config IS NULL THEN
    RAISE NOTICE '[migration] Purple Lotus client not found — skipping backfill';
    RETURN;
  END IF;

  -- Only backfill Jane config if not already present
  IF current_config ? 'jane_algolia_app_id' THEN
    RAISE NOTICE '[migration] Purple Lotus already has jane_algolia_app_id — skipping';
    RETURN;
  END IF;

  UPDATE public.agency_clients
  SET container_config = container_config || jsonb_build_object(
    'jane_algolia_app_id', 'VFM4X0N23A',
    'jane_algolia_search_key', '8bd39f3c1d26dd060940b682f024757c',
    'jane_algolia_index', 'menu-products-production',
    'jane_default_store_id', COALESCE(current_config->>'jane_default_store_id', 'san-jose'),
    'jane_stores', COALESCE(
      current_config->'jane_stores',
      '[
        {"id": "san-jose", "name": "San Jose", "algoliaStoreId": 4398, "baseUrl": "https://plpcsanjose.com"},
        {"id": "117", "name": "San Jose", "algoliaStoreId": 4398, "baseUrl": "https://plpcsanjose.com"},
        {"id": "downtown", "name": "Downtown", "algoliaStoreId": 5981, "baseUrl": "https://plpcsanjose.com"}
      ]'::JSONB
    ),
    'website_url', COALESCE(current_config->>'website_url', 'https://plpcsanjose.com'),
    'jane_known_brands', to_jsonb(ARRAY[
      'Alien Labs', 'Connected', 'Wyld', 'Stiiizy', 'Raw Garden', 'Jetty',
      'Pax', 'Select', 'Kiva', 'Camino', 'PLUS', 'Wana', 'Heavy Hitters',
      'Bloom Farms', 'Cookies', 'Jungle Boys', 'Fig Farms', 'CBX', 'Coldfire',
      'Blue Chip', 'Froot', 'Upnorth', 'Caviar Gold', 'Purple Lotus',
      'Garcia Hand Picked', 'Lowell', 'Old Pal', 'Pacific Stone', 'Glass House',
      'Almora', 'CRU', 'Dablogic', 'West Coast Cure', 'Claybourne', 'Ember Valley',
      'Lost Farm', 'Kikoko', 'Terra', 'Defonce', 'Korova', 'Binske'
    ]),
    'industry', COALESCE(current_config->>'industry', 'cannabis'),
    'dispatch_agent_enabled', FALSE,     -- flip to TRUE when agents ship
    'dispatch_agent_config', jsonb_build_object(
      'daily_cost_cap_cents', 1500,      -- $15/day budget before fallback
      'auto_execute_risk_levels', jsonb_build_array('low', 'medium'),
      'propose_for_approval_risk_levels', jsonb_build_array('high'),
      'copilot_interval_minutes', 15,
      'inbound_customer_enabled', FALSE
    )
  )
  WHERE id = pl_client_id;

  RAISE NOTICE '[migration] Purple Lotus Jane config backfilled';
END $$;
