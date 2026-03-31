-- Client Knowledge Engine
-- Stores structured insights extracted from AI conversations
-- AI workers use this to get smarter over time

CREATE TABLE IF NOT EXISTS client_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  
  -- Knowledge categories
  category TEXT NOT NULL CHECK (category IN (
    'business_fact',        -- Hours, services, pricing, policies confirmed in conversation
    'customer_pattern',     -- Common questions, peak times, communication preferences
    'conversation_outcome', -- What worked well, what caused escalations
    'contact_preference',   -- Specific customer preferences learned
    'product_knowledge',    -- Details about products/services learned from owner
    'correction'            -- Things the AI got wrong that were corrected
  )),
  
  -- The actual knowledge
  key TEXT NOT NULL,             -- Short identifier e.g. "business_hours_saturday"
  value TEXT NOT NULL,           -- The knowledge e.g. "Open 9am-6pm, closed for lunch 12-1pm"
  confidence REAL DEFAULT 0.8,  -- 0-1, higher = more certain
  source_type TEXT DEFAULT 'conversation', -- conversation, manual, import
  
  -- Deduplication
  hash TEXT NOT NULL,            -- SHA256 of category+key for upsert dedup
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_confirmed_at TIMESTAMPTZ DEFAULT now(),
  times_confirmed INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint for upsert
  UNIQUE(client_id, hash)
);

-- Index for fast lookup by client
CREATE INDEX IF NOT EXISTS idx_client_knowledge_client ON client_knowledge(client_id, category);
CREATE INDEX IF NOT EXISTS idx_client_knowledge_agency ON client_knowledge(agency_id);

-- Enable RLS
ALTER TABLE client_knowledge ENABLE ROW LEVEL SECURITY;

-- Policy: agency members can read/write their own knowledge
CREATE POLICY "Agency members can manage knowledge" ON client_knowledge
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );
