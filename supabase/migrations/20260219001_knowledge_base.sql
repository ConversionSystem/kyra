-- ============================================================================
-- Knowledge Base — Per-client knowledge documents
-- Stores documents that get synced to the client's AI memory/context
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES agency_clients(id) ON DELETE CASCADE, -- NULL = agency-wide
  title text NOT NULL,
  content text NOT NULL, -- raw text content
  source_type text NOT NULL DEFAULT 'text'
    CHECK (source_type IN ('text', 'url', 'file')),
  source_url text, -- original URL if crawled
  file_name text, -- original filename if uploaded
  mime_type text,
  char_count integer NOT NULL DEFAULT 0,
  synced_at timestamptz, -- when last synced to gateway
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_agency ON knowledge_documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_client ON knowledge_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_enabled ON knowledge_documents(agency_id, enabled);

-- Updated_at trigger
CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage knowledge docs" ON knowledge_documents
  FOR ALL USING (
    agency_id IN (
      SELECT am.agency_id FROM agency_members am
      WHERE am.user_id = auth.uid()
    )
  );
