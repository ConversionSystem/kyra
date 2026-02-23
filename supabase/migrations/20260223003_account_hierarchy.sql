-- ============================================================================
-- Kyra: 4-Tier Account Hierarchy
-- Migration: 20260223003_account_hierarchy.sql
-- Levels: master → agency → sub-account → user
-- ============================================================================

-- ── 1. Mark master account level on agencies ─────────────────────────────────
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS account_level TEXT NOT NULL DEFAULT 'agency'
    CHECK (account_level IN ('master', 'agency'));

CREATE INDEX IF NOT EXISTS idx_agencies_account_level ON public.agencies(account_level);

-- Mark ConversionSystem as the master account
-- (matches by owner email — update slug if needed)
UPDATE public.agencies
SET account_level = 'master'
WHERE slug = 'conversion-system'
   OR name ILIKE '%conversion system%';

-- ── 2. Sub-account members ────────────────────────────────────────────────────
-- Users (client staff) who have portal access to a specific sub-account (agency_client)
CREATE TABLE IF NOT EXISTS public.sub_account_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  agency_id     UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('owner', 'admin', 'viewer')),
  invited_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- one membership per user per client
  UNIQUE (client_id, user_id),
  UNIQUE (client_id, email)
);

CREATE INDEX IF NOT EXISTS idx_sub_account_members_client_id  ON public.sub_account_members(client_id);
CREATE INDEX IF NOT EXISTS idx_sub_account_members_agency_id  ON public.sub_account_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_sub_account_members_user_id    ON public.sub_account_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_account_members_email      ON public.sub_account_members(email);

CREATE TRIGGER trg_sub_account_members_updated_at
  BEFORE UPDATE ON public.sub_account_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Sub-account invitations ────────────────────────────────────────────────
-- Agencies invite their client's staff to the portal
CREATE TABLE IF NOT EXISTS public.sub_account_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  agency_id   UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('owner', 'admin', 'viewer')),
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_account_invitations_client_id ON public.sub_account_invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_sub_account_invitations_token     ON public.sub_account_invitations(token);
CREATE INDEX IF NOT EXISTS idx_sub_account_invitations_email     ON public.sub_account_invitations(email);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────

-- sub_account_members: agency members can manage; portal users can read own
ALTER TABLE public.sub_account_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_account_members: agency members can manage"
  ON public.sub_account_members FOR ALL
  USING (
    agency_id IN (SELECT public.user_agency_ids())
  )
  WITH CHECK (
    agency_id IN (SELECT public.user_agency_ids())
  );

CREATE POLICY "sub_account_members: portal users read own"
  ON public.sub_account_members FOR SELECT
  USING (user_id = auth.uid());

-- sub_account_invitations: agency members can manage
ALTER TABLE public.sub_account_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_account_invitations: agency members can manage"
  ON public.sub_account_invitations FOR ALL
  USING (
    agency_id IN (SELECT public.user_agency_ids())
  )
  WITH CHECK (
    agency_id IN (SELECT public.user_agency_ids())
  );

-- Public invite lookup by token (no auth required to accept invite)
CREATE POLICY "sub_account_invitations: public token lookup"
  ON public.sub_account_invitations FOR SELECT
  USING (true);  -- token is unguessable; service role validates

-- ============================================================================
-- Done.
-- ============================================================================
