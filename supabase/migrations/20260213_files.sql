-- User Files table for Kyra file upload feature
-- Run this in Supabase SQL editor

-- ══════════════════════════════════════════════
-- User Files (uploaded files per user)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_bytes BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_files_user ON user_files(user_id);

-- RLS policies
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files" ON user_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own files" ON user_files
  FOR ALL USING (auth.uid() = user_id);

-- Grant service role access (for API routes)
GRANT ALL ON user_files TO service_role;
