/**
 * Agency Intelligence — Cross-Client Analytics Engine
 * Phase 4: Agency Intelligence Layer
 *
 * Pure data analysis + rule-based recommendations.
 * No LLM calls — everything is computed from existing tables.
 *
 * Data sources:
 * - worker_performance (Phase 2) — reply rates, sentiment, escalations
 * - client_knowledge (Phase 1) — knowledge entries
 * - client_conversations — conversation volume
 * - worker_tasks / worker_task_runs (Phase 3) — task execution
 * - agency_clients — client metadata
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgencyOverview {
  totalActiveConversations: number;   // last 7 days
  totalBookings: number;              // from worker_performance current period
  averageReplyRate: number;           // 0-100
  averageSentimentScore: number;      // 0-5 scale (friendly for UI)
  totalKnowledgeEntries: number;
  totalTasksRun: number;
  activeClients: number;
  totalClients: number;
}

export interface ClientHealthScore {
  clientId: string;
  clientName: string;
  clientSlug: string;
  industry: string;
  score: number;                      // 0-100
  previousScore: number | null;       // previous period score for trend
  trend: 'up' | 'down' | 'stable';
  trendDelta: number;                 // points changed
  conversationCount: number;          // last 30 days
  flags: ('declining' | 'inactive')[]; // special flags
  breakdown: {
    replyScore: number;
    sentimentScore: number;
    escalationScore: number;
    volumeScore: number;
    knowledgeScore: number;
  };
}

export interface CrossClientPatterns {
  topQuestions: { question: string; clientCount: number; totalOccurrences: number }[];
  busiestHours: { hour: number; dayOfWeek: number; dayName: string; count: number }[];
  bestWorkerTypes: { workerType: string; avgReplyRate: number; totalConversations: number }[];
  commonEscalationReasons: { reason: string; count: number }[];
}

export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationType = 'action' | 'warning' | 'insight' | 'celebration';

export interface SmartRecommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  icon: string;                       // emoji
  title: string;
  description: string;
  clientId?: string;
  clientName?: string;
}

// ── Internal helper types ─────────────────────────────────────────────────────

interface ClientPerformanceData {
  clientId: string;
  clientName: string;
  clientSlug: string;
  industry: string;
  status: string;
  totalConversations: number;
  conversationsWithReply: number;
  escalations: number;
  bookingsMade: number;
  positiveSignals: number;
  negativeSignals: number;
  knowledgeEntries: number;
  tasksRun: number;
  conversationsLast7Days: number;
  conversationsLast14Days: number;
  conversationsThisWeek: number;
  conversationsPrevWeek: number;
  ghlConnected: boolean;
  hasWorkerDeployed: boolean;
  gatewayStatus: string | null;
  workerIds: string[];
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

/**
 * Gather all per-client data needed for intelligence calculations.
 * Single entry point — batched queries to minimize DB round trips.
 */
async function gatherClientData(agencyId: string): Promise<ClientPerformanceData[]> {
  const supabase = createServiceClientWithoutCookies();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get current period boundaries (month)
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  // Week boundaries for trend
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const prevWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Parallel fetch everything
  const [
    clientsResult,
    perfResult,
    knowledgeResult,
    convos7dResult,
    convos14dResult,
    convos30dResult,
    convosThisWeekResult,
    convosPrevWeekResult,
    tasksResult,
  ] = await Promise.all([
    // All clients
    supabase
      .from('agency_clients')
      .select('id, name, slug, industry, status, ghl_location_id, ghl_access_token, ghl_private_token, gateway_status, container_config')
      .eq('agency_id', agencyId),

    // Worker performance (current period)
    supabase
      .from('worker_performance')
      .select('client_id, worker_id, total_conversations, conversations_with_reply, escalations, bookings_made, positive_signals, negative_signals')
      .eq('agency_id', agencyId)
      .eq('period_start', periodStart),

    // Knowledge entries per client
    supabase
      .from('client_knowledge')
      .select('client_id')
      .eq('agency_id', agencyId),

    // Conversations last 7 days
    supabase
      .from('client_conversations')
      .select('client_id')
      .eq('agency_id', agencyId)
      .gte('created_at', sevenDaysAgo),

    // Conversations last 14 days
    supabase
      .from('client_conversations')
      .select('client_id')
      .eq('agency_id', agencyId)
      .gte('created_at', fourteenDaysAgo),

    // Conversations last 30 days
    supabase
      .from('client_conversations')
      .select('client_id')
      .eq('agency_id', agencyId)
      .gte('created_at', thirtyDaysAgo),

    // Conversations this week
    supabase
      .from('client_conversations')
      .select('client_id')
      .eq('agency_id', agencyId)
      .gte('created_at', thisWeekStart.toISOString()),

    // Conversations previous week
    supabase
      .from('client_conversations')
      .select('client_id')
      .eq('agency_id', agencyId)
      .gte('created_at', prevWeekStart.toISOString())
      .lt('created_at', thisWeekStart.toISOString()),

    // Task runs
    supabase
      .from('worker_task_runs')
      .select('task_id, worker_tasks!inner(client_id)')
      .eq('worker_tasks.agency_id', agencyId),
  ]);

  const clients = clientsResult.data ?? [];
  const perfRows = perfResult.data ?? [];
  const knowledgeRows = knowledgeResult.data ?? [];
  const convos7d = convos7dResult.data ?? [];
  const convos14d = convos14dResult.data ?? [];
  const convos30d = convos30dResult.data ?? [];
  const convosThisWeek = convosThisWeekResult.data ?? [];
  const convosPrevWeek = convosPrevWeekResult.data ?? [];
  const taskRuns = tasksResult.data ?? [];

  // Build lookup maps
  const countByClient = (rows: { client_id: string }[]) => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.client_id, (map.get(r.client_id) ?? 0) + 1);
    }
    return map;
  };

  const knowledge7dMap = countByClient(knowledgeRows);
  const convos7dMap = countByClient(convos7d);
  const convos14dMap = countByClient(convos14d);
  const convos30dMap = countByClient(convos30d);
  const convosThisWeekMap = countByClient(convosThisWeek);
  const convosPrevWeekMap = countByClient(convosPrevWeek);

  // Task runs per client
  const taskRunsMap = new Map<string, number>();
  for (const tr of taskRuns) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientId = (tr as any).worker_tasks?.client_id;
    if (clientId) {
      taskRunsMap.set(clientId, (taskRunsMap.get(clientId) ?? 0) + 1);
    }
  }

  // Performance data per client (aggregate across workers)
  const perfMap = new Map<string, {
    totalConversations: number;
    conversationsWithReply: number;
    escalations: number;
    bookingsMade: number;
    positiveSignals: number;
    negativeSignals: number;
    workerIds: string[];
  }>();

  for (const row of perfRows) {
    const existing = perfMap.get(row.client_id) ?? {
      totalConversations: 0,
      conversationsWithReply: 0,
      escalations: 0,
      bookingsMade: 0,
      positiveSignals: 0,
      negativeSignals: 0,
      workerIds: [],
    };
    existing.totalConversations += row.total_conversations ?? 0;
    existing.conversationsWithReply += row.conversations_with_reply ?? 0;
    existing.escalations += row.escalations ?? 0;
    existing.bookingsMade += row.bookings_made ?? 0;
    existing.positiveSignals += row.positive_signals ?? 0;
    existing.negativeSignals += row.negative_signals ?? 0;
    if (row.worker_id) existing.workerIds.push(row.worker_id);
    perfMap.set(row.client_id, existing);
  }

  return clients.map((c) => {
    const perf = perfMap.get(c.id);
    const ghlConnected = !!(c.ghl_location_id || c.ghl_access_token || c.ghl_private_token);

    return {
      clientId: c.id,
      clientName: c.name,
      clientSlug: c.slug,
      industry: c.industry ?? '',
      status: c.status,
      totalConversations: perf?.totalConversations ?? 0,
      conversationsWithReply: perf?.conversationsWithReply ?? 0,
      escalations: perf?.escalations ?? 0,
      bookingsMade: perf?.bookingsMade ?? 0,
      positiveSignals: perf?.positiveSignals ?? 0,
      negativeSignals: perf?.negativeSignals ?? 0,
      knowledgeEntries: knowledge7dMap.get(c.id) ?? 0,
      tasksRun: taskRunsMap.get(c.id) ?? 0,
      conversationsLast7Days: convos7dMap.get(c.id) ?? 0,
      conversationsLast14Days: convos14dMap.get(c.id) ?? 0,
      conversationsThisWeek: convosThisWeekMap.get(c.id) ?? 0,
      conversationsPrevWeek: convosPrevWeekMap.get(c.id) ?? 0,
      ghlConnected,
      hasWorkerDeployed: c.gateway_status === 'running',
      gatewayStatus: c.gateway_status,
      workerIds: perf?.workerIds ?? [],
    };
  });
}


// ── 1. Agency Overview ────────────────────────────────────────────────────────

export async function getAgencyOverview(agencyId: string): Promise<AgencyOverview> {
  const clientData = await gatherClientData(agencyId);
  const activeClients = clientData.filter(c => c.status === 'active');

  const totalActiveConversations = clientData.reduce((sum, c) => sum + c.conversationsLast7Days, 0);
  const totalBookings = clientData.reduce((sum, c) => sum + c.bookingsMade, 0);

  // Average reply rate across clients that have conversations
  const clientsWithConvos = clientData.filter(c => c.totalConversations > 0);
  const averageReplyRate = clientsWithConvos.length > 0
    ? Math.round(
        clientsWithConvos.reduce((sum, c) => {
          return sum + (c.conversationsWithReply / c.totalConversations) * 100;
        }, 0) / clientsWithConvos.length
      )
    : 0;

  // Average sentiment: scale to 0-5 for UI friendliness
  // Raw: (positive - negative) / (positive + negative) → [-1, 1]
  // Mapped to 0-5 scale
  const totalPositive = clientData.reduce((sum, c) => sum + c.positiveSignals, 0);
  const totalNegative = clientData.reduce((sum, c) => sum + c.negativeSignals, 0);
  const totalSignals = totalPositive + totalNegative;
  const rawSentiment = totalSignals > 0
    ? (totalPositive - totalNegative) / totalSignals  // -1 to 1
    : 0;
  const averageSentimentScore = Math.round(((rawSentiment + 1) / 2) * 50) / 10; // 0.0 to 5.0

  const totalKnowledgeEntries = clientData.reduce((sum, c) => sum + c.knowledgeEntries, 0);
  const totalTasksRun = clientData.reduce((sum, c) => sum + c.tasksRun, 0);

  return {
    totalActiveConversations,
    totalBookings,
    averageReplyRate,
    averageSentimentScore,
    totalKnowledgeEntries,
    totalTasksRun,
    activeClients: activeClients.length,
    totalClients: clientData.length,
  };
}


// ── 2. Client Health Scores ───────────────────────────────────────────────────

function computeClientHealthScore(client: ClientPerformanceData): Omit<ClientHealthScore, 'previousScore' | 'trend' | 'trendDelta'> {
  const tc = client.totalConversations || 0;

  // Reply score: 30 points
  const replyScore = tc > 0
    ? Math.round((client.conversationsWithReply / tc) * 30)
    : 0;

  // Sentiment score: 20 points
  const totalSignals = client.positiveSignals + client.negativeSignals;
  const sentimentScore = totalSignals > 0
    ? Math.round((client.positiveSignals / totalSignals) * 20)
    : 10; // neutral default

  // Escalation score: 20 points (lower escalations = higher score)
  const escalationScore = tc > 0
    ? Math.round((1 - client.escalations / tc) * 20)
    : 15; // neutral default

  // Volume score: 15 points (caps at 50 conversations)
  const volumeScore = Math.round(Math.min(tc / 50, 1) * 15);

  // Knowledge score: 15 points (caps at 20 entries)
  const knowledgeScore = Math.round(Math.min(client.knowledgeEntries / 20, 1) * 15);

  const score = Math.min(100, Math.max(0,
    replyScore + sentimentScore + escalationScore + volumeScore + knowledgeScore
  ));

  // Flags
  const flags: ('declining' | 'inactive')[] = [];
  if (client.conversationsLast14Days === 0) {
    flags.push('inactive');
  }

  return {
    clientId: client.clientId,
    clientName: client.clientName,
    clientSlug: client.clientSlug,
    industry: client.industry,
    score,
    conversationCount: tc,
    flags,
    breakdown: {
      replyScore,
      sentimentScore,
      escalationScore,
      volumeScore,
      knowledgeScore,
    },
  };
}

export async function getClientHealthScores(agencyId: string): Promise<ClientHealthScore[]> {
  const clientData = await gatherClientData(agencyId);

  // Compute current scores
  const scores = clientData.map(c => {
    const base = computeClientHealthScore(c);

    // Compute a pseudo "previous score" using prev week data for trend
    // Simplified: compare this week vs last week conversation velocity
    const thisWeek = c.conversationsThisWeek;
    const prevWeek = c.conversationsPrevWeek;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendDelta = 0;

    if (prevWeek > 0) {
      const velocityChange = ((thisWeek - prevWeek) / prevWeek) * 100;
      // Translate velocity change to approximate score delta
      trendDelta = Math.round(velocityChange / 10); // rough mapping
      if (trendDelta > 3) trend = 'up';
      else if (trendDelta < -3) trend = 'down';
    }

    // Check for "declining" flag (score dropped >10 points equivalent)
    if (trend === 'down' && Math.abs(trendDelta) > 10) {
      if (!base.flags.includes('declining')) {
        base.flags.push('declining');
      }
    }

    return {
      ...base,
      previousScore: prevWeek > 0 ? Math.max(0, base.score - trendDelta) : null,
      trend,
      trendDelta,
    } satisfies ClientHealthScore;
  });

  // Sort: healthiest to most at-risk
  scores.sort((a, b) => b.score - a.score);

  return scores;
}


// ── 3. Cross-Client Patterns ──────────────────────────────────────────────────

export async function getCrossClientPatterns(agencyId: string): Promise<CrossClientPatterns> {
  const supabase = createServiceClientWithoutCookies();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel queries
  const [knowledgeResult, conversationsResult, perfResult] = await Promise.all([
    // Knowledge entries for common questions (customer_pattern category)
    supabase
      .from('client_knowledge')
      .select('client_id, category, key, value, times_confirmed')
      .eq('agency_id', agencyId)
      .in('category', ['customer_pattern', 'product_knowledge']),

    // Conversations for time patterns
    supabase
      .from('client_conversations')
      .select('created_at, client_id')
      .eq('agency_id', agencyId)
      .gte('created_at', thirtyDaysAgo),

    // Worker performance for worker type analysis
    supabase
      .from('worker_performance')
      .select('worker_id, total_conversations, conversations_with_reply, escalations')
      .eq('agency_id', agencyId),
  ]);

  // ── Top questions across clients ──
  const questionMap = new Map<string, { question: string; clients: Set<string>; total: number }>();
  for (const entry of (knowledgeResult.data ?? [])) {
    const normalizedKey = entry.key.toLowerCase().replace(/_/g, ' ');
    const existing = questionMap.get(normalizedKey);
    if (existing) {
      existing.clients.add(entry.client_id);
      existing.total += entry.times_confirmed ?? 1;
    } else {
      questionMap.set(normalizedKey, {
        question: entry.value,
        clients: new Set([entry.client_id]),
        total: entry.times_confirmed ?? 1,
      });
    }
  }

  const topQuestions = Array.from(questionMap.values())
    .filter(q => q.clients.size >= 2) // Must appear in 2+ clients
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(q => ({
      question: q.question.length > 100 ? q.question.slice(0, 100) + '…' : q.question,
      clientCount: q.clients.size,
      totalOccurrences: q.total,
    }));

  // ── Busiest hours/days ──
  const hourDayMap = new Map<string, number>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const conv of (conversationsResult.data ?? [])) {
    const d = new Date(conv.created_at);
    const key = `${d.getDay()}-${d.getHours()}`;
    hourDayMap.set(key, (hourDayMap.get(key) ?? 0) + 1);
  }

  const busiestHours = Array.from(hourDayMap.entries())
    .map(([key, count]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return { hour, dayOfWeek, dayName: dayNames[dayOfWeek], count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── Best-performing worker types ──
  const workerTypeMap = new Map<string, { totalConvos: number; totalReplies: number }>();
  for (const row of (perfResult.data ?? [])) {
    // Worker type = the base ID before any suffix (e.g., 'appointment-setter-abc' → 'appointment-setter')
    const workerType = row.worker_id?.replace(/-[a-f0-9]{8,}$/, '') ?? row.worker_id ?? 'unknown';
    const existing = workerTypeMap.get(workerType) ?? { totalConvos: 0, totalReplies: 0 };
    existing.totalConvos += row.total_conversations ?? 0;
    existing.totalReplies += row.conversations_with_reply ?? 0;
    workerTypeMap.set(workerType, existing);
  }

  const bestWorkerTypes = Array.from(workerTypeMap.entries())
    .filter(([, data]) => data.totalConvos >= 5) // minimum conversations
    .map(([type, data]) => ({
      workerType: type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      avgReplyRate: data.totalConvos > 0
        ? Math.round((data.totalReplies / data.totalConvos) * 100)
        : 0,
      totalConversations: data.totalConvos,
    }))
    .sort((a, b) => b.avgReplyRate - a.avgReplyRate)
    .slice(0, 5);

  // ── Common escalation reasons ──
  // We don't have structured escalation reasons, so we use a simplified approach:
  // Group by worker type to show which areas escalate most
  const escalationMap = new Map<string, number>();
  for (const row of (perfResult.data ?? [])) {
    if ((row.escalations ?? 0) > 0) {
      const workerType = row.worker_id?.replace(/-[a-f0-9]{8,}$/, '') ?? 'general';
      const label = workerType.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      escalationMap.set(label, (escalationMap.get(label) ?? 0) + (row.escalations ?? 0));
    }
  }

  const commonEscalationReasons = Array.from(escalationMap.entries())
    .map(([reason, count]) => ({ reason: `${reason} conversations`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    topQuestions,
    busiestHours,
    bestWorkerTypes,
    commonEscalationReasons,
  };
}


// ── 4. Smart Recommendations ──────────────────────────────────────────────────

export async function getSmartRecommendations(agencyId: string): Promise<SmartRecommendation[]> {
  const clientData = await gatherClientData(agencyId);
  const recommendations: SmartRecommendation[] = [];

  for (const client of clientData) {
    if (client.status !== 'active' && client.status !== 'setup') continue;

    // No worker deployed + has GHL → "Deploy an AI worker"
    if (!client.hasWorkerDeployed && client.ghlConnected) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        icon: '🚀',
        title: `Deploy AI worker for ${client.clientName}`,
        description: `${client.clientName} has GHL connected but no active AI worker. Deploy one to start handling conversations automatically.`,
        clientId: client.clientId,
        clientName: client.clientName,
      });
    }

    // Reply rate < 50% → "Review AI training"
    if (client.totalConversations >= 5) {
      const replyRate = (client.conversationsWithReply / client.totalConversations) * 100;
      if (replyRate < 50) {
        recommendations.push({
          type: 'warning',
          priority: 'high',
          icon: '⚠️',
          title: `Review AI training for ${client.clientName}`,
          description: `Reply rate is only ${Math.round(replyRate)}% — customers aren't engaging with AI responses. Review the personality and training.`,
          clientId: client.clientId,
          clientName: client.clientName,
        });
      }
    }

    // No knowledge entries → "AI hasn't learned yet"
    if (client.knowledgeEntries === 0 && client.totalConversations > 0) {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        icon: '📚',
        title: `${client.clientName} AI hasn't learned yet`,
        description: `No knowledge entries extracted despite ${client.totalConversations} conversations. The knowledge engine may need attention.`,
        clientId: client.clientId,
        clientName: client.clientName,
      });
    }

    // 50+ knowledge entries → "AI is learning fast"
    if (client.knowledgeEntries >= 50) {
      recommendations.push({
        type: 'celebration',
        priority: 'low',
        icon: '🎉',
        title: `${client.clientName} AI is learning fast`,
        description: `${client.knowledgeEntries} knowledge entries extracted — the AI is building deep understanding of this business.`,
        clientId: client.clientId,
        clientName: client.clientName,
      });
    }

    // No GHL connected → "Connect GHL"
    if (!client.ghlConnected && client.status === 'active') {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        icon: '🔗',
        title: `Connect GHL for ${client.clientName}`,
        description: `No GHL integration — the AI can't receive or respond to SMS. Connect GHL to go live.`,
        clientId: client.clientId,
        clientName: client.clientName,
      });
    }

    // Task engine available but no tasks run
    if (client.tasksRun === 0 && client.hasWorkerDeployed) {
      recommendations.push({
        type: 'action',
        priority: 'low',
        icon: '⚡',
        title: `Set up automated tasks for ${client.clientName}`,
        description: `AI worker is deployed but no automated tasks configured. Tasks can handle follow-ups, reminders, and more.`,
        clientId: client.clientId,
        clientName: client.clientName,
      });
    }

    // Conversations declining week over week
    if (client.conversationsPrevWeek > 5 && client.conversationsThisWeek > 0) {
      const decline = ((client.conversationsPrevWeek - client.conversationsThisWeek) / client.conversationsPrevWeek) * 100;
      if (decline >= 30) {
        recommendations.push({
          type: 'warning',
          priority: 'medium',
          icon: '📉',
          title: `${client.clientName} engagement dropping`,
          description: `Conversations down ${Math.round(decline)}% this week vs last week. Check if lead sources or campaigns changed.`,
          clientId: client.clientId,
          clientName: client.clientName,
        });
      }
    }

    // Inactive for 14+ days
    if (client.conversationsLast14Days === 0 && client.hasWorkerDeployed) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        icon: '💤',
        title: `${client.clientName} has been inactive for 14+ days`,
        description: `No conversations in the last 2 weeks despite having an active worker. Check if the GHL integration is working.`,
        clientId: client.clientId,
        clientName: client.clientName,
      });
    }
  }

  // Cross-client patterns
  const knowledgeRichClients = clientData.filter(c => c.knowledgeEntries >= 20);
  if (knowledgeRichClients.length >= 3) {
    recommendations.push({
      type: 'insight',
      priority: 'low',
      icon: '🧠',
      title: `${knowledgeRichClients.length} clients building strong knowledge bases`,
      description: `These clients have 20+ knowledge entries each. Consider reviewing extracted knowledge for cross-client insights.`,
    });
  }

  // Sort by priority: high → medium → low
  const priorityOrder: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}


// ── Convenience: Get all intelligence data at once ────────────────────────────

export interface AgencyIntelligenceData {
  overview: AgencyOverview;
  healthScores: ClientHealthScore[];
  patterns: CrossClientPatterns;
  recommendations: SmartRecommendation[];
}

/**
 * Fetch all intelligence data for the agency.
 * Called by the API route and cached for 5 minutes.
 */
export async function getAgencyIntelligence(agencyId: string): Promise<AgencyIntelligenceData> {
  const [overview, healthScores, patterns, recommendations] = await Promise.all([
    getAgencyOverview(agencyId),
    getClientHealthScores(agencyId),
    getCrossClientPatterns(agencyId),
    getSmartRecommendations(agencyId),
  ]);

  return { overview, healthScores, patterns, recommendations };
}
