-- Deep Memory Graph: Entities and Relationships

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- person, company, project, goal, place, topic, event
  name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  confidence REAL NOT NULL DEFAULT 0.8,
  source_memory_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entities_user ON entities(user_id);
CREATE INDEX idx_entities_user_type ON entities(user_id, type);
CREATE INDEX idx_entities_name ON entities(user_id, lower(name));

CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- knows, works_at, works_on, wants, etc.
  properties JSONB DEFAULT '{}',
  confidence REAL NOT NULL DEFAULT 0.8,
  source_memory_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationships_user ON relationships(user_id);
CREATE INDEX idx_relationships_from ON relationships(from_entity_id);
CREATE INDEX idx_relationships_to ON relationships(to_entity_id);

-- RLS
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entities" ON entities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage entities" ON entities FOR ALL WITH CHECK (true);
CREATE POLICY "Users can read own relationships" ON relationships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage relationships" ON relationships FOR ALL WITH CHECK (true);
