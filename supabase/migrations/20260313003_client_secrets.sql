-- ==========================================================================
-- Client Secrets Vault
-- Encrypted key/value storage per agency client
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.client_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_secrets_client_key_unique UNIQUE (client_id, key_name)
);

CREATE INDEX IF NOT EXISTS idx_client_secrets_agency_id ON public.client_secrets(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_secrets_client_id ON public.client_secrets(client_id);
CREATE INDEX IF NOT EXISTS idx_client_secrets_key_name ON public.client_secrets(key_name);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS trg_client_secrets_updated_at ON public.client_secrets;
CREATE TRIGGER trg_client_secrets_updated_at
  BEFORE UPDATE ON public.client_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.client_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members can view client secrets" ON public.client_secrets;
CREATE POLICY "Agency members can view client secrets"
  ON public.client_secrets
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id
      FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agency members can insert client secrets" ON public.client_secrets;
CREATE POLICY "Agency members can insert client secrets"
  ON public.client_secrets
  FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id
      FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agency members can update client secrets" ON public.client_secrets;
CREATE POLICY "Agency members can update client secrets"
  ON public.client_secrets
  FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id
      FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id
      FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agency members can delete client secrets" ON public.client_secrets;
CREATE POLICY "Agency members can delete client secrets"
  ON public.client_secrets
  FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id
      FROM public.agency_members
      WHERE user_id = auth.uid()
    )
  );
