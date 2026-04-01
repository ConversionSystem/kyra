// ============================================================================
// Worker Performance Tracker — Phase 2: Modular Worker System
//
// Tracks per-worker, per-client performance metrics:
// - Conversation counts, reply rates, escalations
// - Simple keyword-based sentiment detection
// - Monthly aggregation with upsert
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConversationMetrics {
  /** Number of messages sent by the AI in this conversation */
  messagesSent?: number;
  /** Number of messages received from the customer */
  messagesReceived?: number;
  /** Whether the customer replied after AI's response */
  customerReplied?: boolean;
  /** Whether this was escalated to a human */
  escalated?: boolean;
  /** Whether a booking was made */
  bookingMade?: boolean;
  /** The customer's last message (for sentiment analysis) */
  customerMessage?: string;
  /** The AI's response (for sentiment analysis) */
  aiResponse?: string;
  /** Tokens used in this conversation */
  tokensUsed?: number;
  /** Credits used in this conversation */
  creditsUsed?: number;
}

export interface WorkerPerformanceRow {
  id: string;
  client_id: string;
  agency_id: string;
  worker_id: string;
  total_conversations: number;
  total_messages_sent: number;
  total_messages_received: number;
  conversations_with_reply: number;
  conversations_ghosted: number;
  escalations: number;
  bookings_made: number;
  positive_signals: number;
  negative_signals: number;
  total_tokens_used: number;
  total_credits_used: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerScorecard {
  workerId: string;
  workerName: string;
  totalConversations: number;
  replyRate: number; // 0-100
  escalationRate: number; // 0-100
  bookingsMade: number;
  positiveSignals: number;
  negativeSignals: number;
  sentimentScore: number; // -1 to 1
  totalCreditsUsed: number;
  trend: 'up' | 'down' | 'stable';
  trendDelta: number; // percentage change from previous period
}

// ── Sentiment Detection (keyword-based) ───────────────────────────────────────

const POSITIVE_KEYWORDS = [
  'thanks', 'thank you', 'thank u', 'thx', 'ty',
  'great', 'perfect', 'awesome', 'amazing', 'excellent',
  'appreciate', 'appreciated', 'helpful', 'love it',
  'wonderful', 'fantastic', 'brilliant', 'well done',
  'good job', 'nice', 'cool', '👍', '🙏', '❤️', '😊',
];

const NEGATIVE_KEYWORDS = [
  'wrong', 'incorrect', 'complaint', 'complain',
  'unhappy', 'terrible', 'worst', 'awful', 'horrible',
  'useless', 'waste', 'frustrated', 'frustrating',
  'disappointed', 'disappointing', 'angry', 'ridiculous',
  'unacceptable', 'pathetic', 'scam', '👎', '😡', '🤬',
];

const ESCALATION_KEYWORDS = [
  'speak to a human', 'talk to a person', 'real person',
  'transfer me', 'connect me', 'manager', 'supervisor',
  'human please', 'agent please', 'stop bot', 'not a bot',
];

/**
 * Detect sentiment from a message using keyword matching.
 * Returns: 'positive' | 'negative' | 'escalation' | 'neutral'
 */
export function detectSentiment(message: string): 'positive' | 'negative' | 'escalation' | 'neutral' {
  const lower = message.toLowerCase();

  // Check escalation first (takes priority)
  if (ESCALATION_KEYWORDS.some(kw => lower.includes(kw))) {
    return 'escalation';
  }

  let positiveCount = 0;
  let negativeCount = 0;

  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) positiveCount++;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) negativeCount++;
  }

  if (negativeCount > positiveCount) return 'negative';
  if (positiveCount > 0) return 'positive';
  return 'neutral';
}

// ── Period Helpers ─────────────────────────────────────────────────────────────

function getCurrentPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getPreviousPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// ── Core Functions ────────────────────────────────────────────────────────────

/**
 * Track a conversation's metrics for a specific worker.
 * Uses upsert to increment counters atomically.
 */
export async function trackConversation(
  clientId: string,
  agencyId: string,
  workerId: string,
  metrics: ConversationMetrics,
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  const period = getCurrentPeriod();

  // Detect sentiment from customer message if provided
  let sentimentResult: 'positive' | 'negative' | 'escalation' | 'neutral' = 'neutral';
  if (metrics.customerMessage) {
    sentimentResult = detectSentiment(metrics.customerMessage);
  }

  // Check for escalation in AI response too
  const aiEscalated = metrics.escalated ||
    (metrics.aiResponse && /connect you with|team member will follow up|escalat/i.test(metrics.aiResponse));

  // Try to get existing row for this period
  const { data: existing } = await supabase
    .from('worker_performance')
    .select('*')
    .eq('client_id', clientId)
    .eq('worker_id', workerId)
    .eq('period_start', period.start)
    .single();

  if (existing) {
    // Increment existing row
    const updates: Record<string, unknown> = {
      total_conversations: (existing.total_conversations ?? 0) + 1,
      total_messages_sent: (existing.total_messages_sent ?? 0) + (metrics.messagesSent ?? 1),
      total_messages_received: (existing.total_messages_received ?? 0) + (metrics.messagesReceived ?? 1),
      updated_at: new Date().toISOString(),
    };

    if (metrics.customerReplied) {
      updates.conversations_with_reply = (existing.conversations_with_reply ?? 0) + 1;
    }
    if (metrics.customerReplied === false) {
      updates.conversations_ghosted = (existing.conversations_ghosted ?? 0) + 1;
    }
    if (aiEscalated) {
      updates.escalations = (existing.escalations ?? 0) + 1;
    }
    if (metrics.bookingMade) {
      updates.bookings_made = (existing.bookings_made ?? 0) + 1;
    }
    if (sentimentResult === 'positive') {
      updates.positive_signals = (existing.positive_signals ?? 0) + 1;
    }
    if (sentimentResult === 'negative' || sentimentResult === 'escalation') {
      updates.negative_signals = (existing.negative_signals ?? 0) + 1;
    }
    if (metrics.tokensUsed) {
      updates.total_tokens_used = (existing.total_tokens_used ?? 0) + metrics.tokensUsed;
    }
    if (metrics.creditsUsed) {
      updates.total_credits_used = (existing.total_credits_used ?? 0) + metrics.creditsUsed;
    }

    await supabase
      .from('worker_performance')
      .update(updates)
      .eq('id', existing.id);
  } else {
    // Insert new row for this period
    await supabase
      .from('worker_performance')
      .insert({
        client_id: clientId,
        agency_id: agencyId,
        worker_id: workerId,
        total_conversations: 1,
        total_messages_sent: metrics.messagesSent ?? 1,
        total_messages_received: metrics.messagesReceived ?? 1,
        conversations_with_reply: metrics.customerReplied ? 1 : 0,
        conversations_ghosted: metrics.customerReplied === false ? 1 : 0,
        escalations: aiEscalated ? 1 : 0,
        bookings_made: metrics.bookingMade ? 1 : 0,
        positive_signals: sentimentResult === 'positive' ? 1 : 0,
        negative_signals: (sentimentResult === 'negative' || sentimentResult === 'escalation') ? 1 : 0,
        total_tokens_used: metrics.tokensUsed ?? 0,
        total_credits_used: metrics.creditsUsed ?? 0,
        period_start: period.start,
        period_end: period.end,
      });
  }
}

/**
 * Get worker performance data for a client.
 * Optionally filter by worker ID and/or period.
 */
export async function getWorkerPerformance(
  clientId: string,
  workerId?: string,
  periodStart?: string,
): Promise<WorkerPerformanceRow[]> {
  const supabase = createServiceClientWithoutCookies();

  let query = supabase
    .from('worker_performance')
    .select('*')
    .eq('client_id', clientId)
    .order('period_start', { ascending: false });

  if (workerId) {
    query = query.eq('worker_id', workerId);
  }

  if (periodStart) {
    query = query.eq('period_start', periodStart);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[performance-tracker] Failed to get performance:', error);
    return [];
  }

  return (data ?? []) as WorkerPerformanceRow[];
}

/**
 * Get a formatted scorecard for all workers of a client.
 * Includes current period metrics and trend vs previous period.
 */
export async function getWorkerScorecard(clientId: string): Promise<WorkerScorecard[]> {
  const supabase = createServiceClientWithoutCookies();
  const currentPeriod = getCurrentPeriod();
  const previousPeriod = getPreviousPeriod();

  // Fetch current and previous period data in parallel
  const [{ data: currentData }, { data: previousData }] = await Promise.all([
    supabase
      .from('worker_performance')
      .select('*')
      .eq('client_id', clientId)
      .eq('period_start', currentPeriod.start),
    supabase
      .from('worker_performance')
      .select('*')
      .eq('client_id', clientId)
      .eq('period_start', previousPeriod.start),
  ]);

  const currentRows = (currentData ?? []) as WorkerPerformanceRow[];
  const previousMap = new Map<string, WorkerPerformanceRow>();
  for (const row of (previousData ?? []) as WorkerPerformanceRow[]) {
    previousMap.set(row.worker_id, row);
  }

  // Import worker names
  const { ROLE_WORKERS } = await import('./role-workers');

  return currentRows.map((row) => {
    const worker = ROLE_WORKERS.find(w => w.id === row.worker_id);
    const prev = previousMap.get(row.worker_id);

    const totalConvs = row.total_conversations || 1;
    const replyRate = totalConvs > 0
      ? Math.round((row.conversations_with_reply / totalConvs) * 100)
      : 0;
    const escalationRate = totalConvs > 0
      ? Math.round((row.escalations / totalConvs) * 100)
      : 0;

    // Sentiment score: -1 (all negative) to 1 (all positive)
    const totalSignals = row.positive_signals + row.negative_signals;
    const sentimentScore = totalSignals > 0
      ? (row.positive_signals - row.negative_signals) / totalSignals
      : 0;

    // Trend: compare current reply rate with previous period
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendDelta = 0;

    if (prev && prev.total_conversations > 0) {
      const prevReplyRate = Math.round((prev.conversations_with_reply / prev.total_conversations) * 100);
      trendDelta = replyRate - prevReplyRate;
      if (trendDelta > 5) trend = 'up';
      else if (trendDelta < -5) trend = 'down';
    }

    return {
      workerId: row.worker_id,
      workerName: worker ? `${worker.emoji} ${worker.name}` : row.worker_id,
      totalConversations: row.total_conversations,
      replyRate,
      escalationRate,
      bookingsMade: row.bookings_made,
      positiveSignals: row.positive_signals,
      negativeSignals: row.negative_signals,
      sentimentScore: Math.round(sentimentScore * 100) / 100,
      totalCreditsUsed: row.total_credits_used,
      trend,
      trendDelta,
    };
  });
}
