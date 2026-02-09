-- Multi-Channel: Link users to external messaging platforms

CREATE TABLE IF NOT EXISTS user_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,      -- whatsapp, telegram, voice, email, slack
  channel_user_id TEXT NOT NULL,   -- Platform-specific user identifier
  display_name TEXT,               -- Platform display name
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(channel_type, channel_user_id)
);

CREATE INDEX idx_user_channels_user ON user_channels(user_id);
CREATE INDEX idx_user_channels_lookup ON user_channels(channel_type, channel_user_id);

ALTER TABLE user_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own channels" ON user_channels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own channels" ON user_channels
  FOR ALL USING (auth.uid() = user_id);

-- Note: Service role bypasses RLS automatically in Supabase
