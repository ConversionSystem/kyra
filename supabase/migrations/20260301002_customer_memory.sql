-- Customer Memory — Kyra Knowledge Graph
-- Stores structured knowledge about each customer across conversations.
-- The AI worker uses this to personalize every interaction.

CREATE TABLE IF NOT EXISTS customer_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,           -- agency_client_id or agencyId for solo
  contact_id TEXT NOT NULL,          -- GHL contact ID or phone/email
  name TEXT,
  phone TEXT,
  email TEXT,
  first_contact TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_contact TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_interactions INTEGER NOT NULL DEFAULT 1,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  appointments JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment TEXT DEFAULT 'unknown',
  lifetime_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(client_id, contact_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_memory_client ON customer_memory(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_memory_contact ON customer_memory(contact_id);
CREATE INDEX IF NOT EXISTS idx_customer_memory_last_contact ON customer_memory(last_contact DESC);
CREATE INDEX IF NOT EXISTS idx_customer_memory_tags ON customer_memory USING GIN (tags);

-- RLS policies
ALTER TABLE customer_memory ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API routes)
CREATE POLICY "service_all" ON customer_memory
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE customer_memory IS 'Structured customer knowledge graph. Built automatically from conversations. Used to personalize AI responses.';
