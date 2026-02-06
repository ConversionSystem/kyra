// Global store that persists across requests in development
import { User, Conversation, Message, Memory } from '@/types';

// Use globalThis to persist data across hot reloads
declare global {
  var kyraStore: {
    conversations: Map<string, Conversation>;
    messages: Map<string, Message[]>;
    memories: Memory[];
    initialized: boolean;
  } | undefined;
}

// Initialize store
if (!global.kyraStore) {
  global.kyraStore = {
    conversations: new Map(),
    messages: new Map(),
    memories: [],
    initialized: false,
  };
}

export const store = global.kyraStore;

// Demo user
export const mockUser: User = {
  id: 'demo-user-123',
  email: 'demo@kyra.ai',
  name: 'Demo User',
  timezone: 'UTC',
  plan: 'free',
  usage_this_month: 0,
  usage_reset_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  settings: {},
};

// Helper to generate IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize with welcome data if not already done
export function initializeStore() {
  if (store.initialized) return;
  
  const welcomeConvId = generateId();
  store.conversations.set(welcomeConvId, {
    id: welcomeConvId,
    user_id: mockUser.id,
    title: 'Welcome to Kyra!',
    channel: 'web',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  
  store.messages.set(welcomeConvId, [
    {
      id: generateId(),
      conversation_id: welcomeConvId,
      role: 'assistant',
      content: "Hi! I'm Kyra, your personal AI assistant. I can remember things about you across our conversations. Try saying something like \"Remember that I prefer morning meetings\" and I'll store that for future reference!\n\nWhat can I help you with today?",
      metadata: {},
      created_at: new Date().toISOString(),
    },
  ]);
  
  store.initialized = true;
}

// Initialize on import
initializeStore();

// Export accessors
export const conversations = store.conversations;
export const messages = store.messages;
export const memories = store.memories;
