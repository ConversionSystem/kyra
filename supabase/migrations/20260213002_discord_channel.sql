-- Add Discord as a supported channel type
ALTER TABLE user_channels DROP CONSTRAINT IF EXISTS user_channels_channel_type_check;
ALTER TABLE user_channels ADD CONSTRAINT user_channels_channel_type_check
  CHECK (channel_type IN ('telegram', 'whatsapp', 'slack', 'email', 'discord'));
