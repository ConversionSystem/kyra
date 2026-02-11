-- User channel connections for Telegram, WhatsApp, etc.
CREATE TABLE IF NOT EXISTS user_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('telegram', 'whatsapp', 'slack', 'email')),
  channel_user_id TEXT,           -- Platform-specific user ID (set after verification)
  connection_token TEXT,           -- Unique token for linking (e.g. sent to Telegram bot)
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  connected_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, channel_type),
  UNIQUE(channel_type, channel_user_id)
);

CREATE INDEX idx_user_channels_token ON user_channels(connection_token) WHERE connection_token IS NOT NULL;
CREATE INDEX idx_user_channels_lookup ON user_channels(channel_type, channel_user_id) WHERE verified = true;
