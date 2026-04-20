// Database types matching Supabase schema.
//
// The canonical source of truth for PLAN names is lib/billing/plans.ts.
// This alias exists for legacy per-user (pre-agency) schema shapes
// (`public.users.plan`) — agency plans should be imported directly from
// lib/billing/plans via PLANS / PlanId. Phase 0.13 aligned this union to
// the real values shipped in production.
export type Plan = 'free' | 'solo_pro' | 'starter' | 'pro' | 'scale' | 'beta';
export type Channel = 'web' | 'slack' | 'whatsapp' | 'email';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MemoryType = 'fact' | 'person' | 'decision' | 'event' | 'preference';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url?: string | null;
  timezone: string;
  plan: Plan;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  usage_this_month: number;
  usage_reset_at?: string | null;
  created_at: string;
  updated_at: string;
  settings: UserSettings;
}

export type ModelPreference = 'auto' | 'claude-sonnet-4' | 'claude-haiku' | 'gpt-4o';

export interface UserSettings {
  theme?: 'dark' | 'light';
  notifications?: boolean;
  preferred_model?: ModelPreference;
  tone?: 'casual' | 'professional' | 'balanced';
  role?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  channel: Channel;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata;
  created_at: string;
}

export interface MessageMetadata {
  tokens_used?: number;
  model?: string;
  memories_referenced?: string[];
  image_url?: string;
  files?: UserFile[];
}

export interface Memory {
  id: string;
  user_id: string;
  type: MemoryType;
  content: string;
  metadata: MemoryMetadata;
  embedding_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryMetadata {
  source?: string;
  confidence?: number;
  related_conversations?: string[];
}

export interface UserFile {
  id: string;
  user_id: string;
  name: string;
  size_bytes: number | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
}

// API Request/Response types
export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  message: Message;
  conversation: Conversation;
  memories_saved?: Memory[];
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Component Props types
export interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}
