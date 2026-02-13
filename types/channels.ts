/**
 * Multi-Channel Types
 * 
 * Kyra is the same everywhere — web, WhatsApp, Telegram, voice.
 * Channel adapters normalize inbound/outbound messages.
 */

export type ChannelType = 'web' | 'whatsapp' | 'telegram' | 'discord' | 'voice' | 'email' | 'slack';

export interface ChannelMessage {
  channelType: ChannelType;
  channelUserId: string;     // Platform-specific user ID
  channelMessageId?: string; // Platform-specific message ID
  text: string;
  attachments?: ChannelAttachment[];
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ChannelAttachment {
  type: 'image' | 'audio' | 'video' | 'document';
  url?: string;
  mimeType?: string;
  filename?: string;
}

export interface ChannelResponse {
  text: string;
  attachments?: ChannelAttachment[];
  buttons?: ChannelButton[];    // Quick-reply buttons (WhatsApp/Telegram)
  voice?: {
    audioUrl: string;           // TTS audio URL for voice responses
    duration: number;
  };
}

export interface ChannelButton {
  label: string;
  action: string; // payload sent back when clicked
}

export interface ChannelConfig {
  type: ChannelType;
  enabled: boolean;
  webhook_secret?: string;
  api_key?: string;
  settings: Record<string, any>;
}

export interface UserChannelLink {
  user_id: string;
  channel_type: ChannelType;
  channel_user_id: string;
  verified: boolean;
  created_at: string;
}
