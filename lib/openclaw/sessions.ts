/**
 * OpenClaw Session Manager
 * 
 * Manages per-user OpenClaw sessions with context injection,
 * timeout handling, and session reuse.
 */

import { chatSend as gwChatSend, gatewayHealthCheck } from './gateway-ws';

interface SessionInfo {
  sessionKey: string;
  userId: string;
  createdAt: number;
  lastActiveAt: number;
  contextInjected: boolean;
}

/** In-memory session tracker. Resets on server restart (stateless-friendly). */
const activeSessions = new Map<string, SessionInfo>();

/** Session timeout: 30 minutes of inactivity */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Get the session key for a user. Format: kyra-user-{userId}
 */
export function getSessionKey(userId: string): string {
  return `kyra-user-${userId}`;
}

/**
 * Get or create a session for a user.
 * Returns session info and whether context needs to be injected.
 */
export function getOrCreateSession(userId: string): {
  session: SessionInfo;
  needsContext: boolean;
} {
  const sessionKey = getSessionKey(userId);
  const existing = activeSessions.get(sessionKey);
  const now = Date.now();

  // Session exists and is still active
  if (existing && (now - existing.lastActiveAt) < SESSION_TIMEOUT_MS) {
    existing.lastActiveAt = now;
    return { session: existing, needsContext: false };
  }

  // Create new session (or replace expired one)
  const session: SessionInfo = {
    sessionKey,
    userId,
    createdAt: now,
    lastActiveAt: now,
    contextInjected: false,
  };
  activeSessions.set(sessionKey, session);

  return { session, needsContext: true };
}

/**
 * Mark a session as having received its context injection.
 */
export function markContextInjected(userId: string): void {
  const session = activeSessions.get(getSessionKey(userId));
  if (session) {
    session.contextInjected = true;
  }
}

/**
 * Remove a user's session (e.g., on logout or error).
 */
export function destroySession(userId: string): void {
  activeSessions.delete(getSessionKey(userId));
}

/**
 * Get all active session keys (for monitoring).
 */
export function getActiveSessions(): SessionInfo[] {
  const now = Date.now();
  const active: SessionInfo[] = [];
  
  const keys = Array.from(activeSessions.keys());
  for (const key of keys) {
    const session = activeSessions.get(key)!;
    if (now - session.lastActiveAt < SESSION_TIMEOUT_MS) {
      active.push(session);
    } else {
      activeSessions.delete(key);
    }
  }
  
  return active;
}

/**
 * Build user context string for session injection.
 * This is prepended to the first message in a new session.
 */
export function buildUserContext(params: {
  userName?: string;
  timezone?: string;
  memories: { type: string; content: string }[];
  reminders: { content: string; due_at: string }[];
  calendarEvents: { summary: string; start: Date; end: Date; location?: string }[];
}): string {
  const { userName, timezone, memories, reminders, calendarEvents } = params;

  const parts: string[] = [];

  if (userName) {
    parts.push(`User: ${userName}${timezone ? ` (timezone: ${timezone})` : ''}`);
  }

  if (memories.length > 0) {
    parts.push(
      'User memories:\n' +
      memories.map(m => `- [${m.type}] ${m.content}`).join('\n')
    );
  }

  if (reminders.length > 0) {
    parts.push(
      'Pending reminders:\n' +
      reminders.map(r => `- "${r.content}" due ${r.due_at}`).join('\n')
    );
  }

  if (calendarEvents.length > 0) {
    parts.push(
      "Today's calendar:\n" +
      calendarEvents.map(e => {
        const start = e.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const end = e.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `- ${start}–${end}: ${e.summary}${e.location ? ` (${e.location})` : ''}`;
      }).join('\n')
    );
  }

  return parts.length > 0
    ? `[USER CONTEXT]\n${parts.join('\n\n')}\n[/USER CONTEXT]`
    : '';
}

/**
 * Send a message to OpenClaw Gateway via WebSocket RPC (chat.send).
 * Returns the full response text (non-streaming).
 */
export async function sessionsSend(
  sessionKey: string,
  message: string,
  timeoutSeconds = 120,
): Promise<{ success: boolean; content?: string; error?: string }> {
  return gwChatSend(sessionKey, message, timeoutSeconds * 1000);
}

/**
 * Check if OpenClaw Gateway is available.
 * Cached for 30 seconds to avoid hammering.
 */
let lastHealthCheck = 0;
let lastHealthResult = false;

export async function isOpenClawAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now - lastHealthCheck < 30_000) {
    return lastHealthResult;
  }

  lastHealthResult = await gatewayHealthCheck();
  lastHealthCheck = now;
  return lastHealthResult;
}
