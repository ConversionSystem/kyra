// ============================================================================
// lib/widget/agent-messages — helpers for the agent-takeover loop
//
// Three call sites:
//   - Inbox /reply endpoint    → recordAgentMessage()
//   - Widget /chat takeover    → getRecentAgentMessage()
//   - Widget /poll endpoint    → fetchAgentMessagesSince()
//
// Single source of truth so all three stay consistent (and so the
// "AI paused for N minutes" window is defined in exactly one place).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * How long an agent reply pauses the AI for the same session. Reset
 * every time a new agent message lands. 15 min is long enough to cover
 * a slow-typed back-and-forth without leaving the AI silent forever.
 */
export const AI_PAUSE_WINDOW_MS = 15 * 60 * 1000;

export interface WidgetAgentMessage {
  id: string;
  session_id: string;
  message: string;
  agent_name: string | null;
  agent_user_id: string | null;
  created_at: string;
}

/**
 * Insert an agent reply for a widget session.
 * Returns the inserted row (id + created_at populated by Postgres) or null
 * on insert failure (caller should propagate as 500).
 */
export async function recordAgentMessage(
  supabase: SupabaseClient,
  args: {
    clientId: string;
    agencyId: string;
    sessionId: string;
    message: string;
    agentUserId?: string | null;
    agentName?: string | null;
  },
): Promise<WidgetAgentMessage | null> {
  const { data, error } = await supabase
    .from('widget_agent_messages')
    .insert({
      client_id: args.clientId,
      agency_id: args.agencyId,
      session_id: args.sessionId,
      message: args.message.trim(),
      agent_user_id: args.agentUserId ?? null,
      agent_name: args.agentName?.trim() || null,
    })
    .select('id, session_id, message, agent_name, agent_user_id, created_at')
    .single();
  if (error) {
    console.error('[widget/agent-messages] insert failed:', error.message);
    return null;
  }
  return data as WidgetAgentMessage;
}

/**
 * Returns the latest agent message for this session within AI_PAUSE_WINDOW_MS,
 * or null if no recent agent activity. Used by the chat route to decide
 * whether to bypass the LLM and send the holding message.
 */
export async function getRecentAgentMessage(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<WidgetAgentMessage | null> {
  if (!sessionId) return null;
  const sinceIso = new Date(Date.now() - AI_PAUSE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('widget_agent_messages')
    .select('id, session_id, message, agent_name, agent_user_id, created_at')
    .eq('session_id', sessionId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Fail open — a DB hiccup shouldn't black-hole the AI.
    console.warn('[widget/agent-messages] takeover check failed (failing open):', error.message);
    return null;
  }
  return (data as WidgetAgentMessage | null) ?? null;
}

/**
 * Returns agent messages for this session since `sinceIso` (exclusive),
 * ordered oldest-first. Used by the widget poll endpoint to deliver new
 * agent replies to the visitor's open panel.
 *
 * Hard-caps at 25 messages per call so a stuck poll cursor can't hammer
 * the database with multi-thousand-row pulls.
 */
export async function fetchAgentMessagesSince(
  supabase: SupabaseClient,
  args: {
    clientId: string;
    sessionId: string;
    sinceIso: string;
  },
): Promise<WidgetAgentMessage[]> {
  const { data, error } = await supabase
    .from('widget_agent_messages')
    .select('id, session_id, message, agent_name, agent_user_id, created_at')
    .eq('client_id', args.clientId)
    .eq('session_id', args.sessionId)
    .gt('created_at', args.sinceIso)
    .order('created_at', { ascending: true })
    .limit(25);
  if (error) {
    console.warn('[widget/agent-messages] poll query failed:', error.message);
    return [];
  }
  return (data as WidgetAgentMessage[]) ?? [];
}
