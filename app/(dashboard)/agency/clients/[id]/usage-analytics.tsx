'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  MessageSquare,
  Zap,
  Clock,
  MessagesSquare,
  Mail,
  Phone,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface UsageData {
  messages: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  tokens: {
    estimatedInput: number;
    estimatedOutput: number;
    estimatedTotalCostCents: number;
    estimatedTotalCostFormatted: string;
  };
  performance: {
    avgResponseTimeMs: number;
    avgResponseTimeSec: number;
  };
  dailyBreakdown: Array<{
    date: string;
    messages: number;
    estimatedCostCents: number;
  }>;
  channelBreakdown: Record<string, number>;
}

interface MessageLog {
  id: string;
  conversation_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  inbound_message: string;
  ai_response: string;
  message_type: string;
  response_time_ms: number | null;
  created_at: string;
}

interface UsageAnalyticsProps {
  clientId: string;
  creditLimit?: number; // monthly credit limit, if known
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function channelIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'sms':
      return <Phone className="h-3.5 w-3.5" />;
    case 'email':
      return <Mail className="h-3.5 w-3.5" />;
    case 'chat':
    case 'live_chat':
    case 'webchat':
      return <MessageCircle className="h-3.5 w-3.5" />;
    default:
      return <MessageSquare className="h-3.5 w-3.5" />;
  }
}

function channelColor(type: string): string {
  switch (type?.toLowerCase()) {
    case 'sms':
      return 'border-green-200 bg-green-50 text-green-600';
    case 'email':
      return 'border-blue-200 bg-blue-50 text-blue-600';
    case 'chat':
    case 'live_chat':
    case 'webchat':
      return 'border-purple-200 bg-purple-50 text-purple-600';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-600';
  }
}

// Fill missing days in the last 30 days with zero values
function fillDailyData(
  breakdown: UsageData['dailyBreakdown']
): Array<{ date: string; messages: number; estimatedCostCents: number }> {
  const map = new Map(breakdown.map((d) => [d.date, d]));
  const result: Array<{ date: string; messages: number; estimatedCostCents: number }> = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push(map.get(key) || { date: key, messages: 0, estimatedCostCents: 0 });
  }

  return result;
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  subValue,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  progress?: number; // 0-100
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
      {progress !== undefined && (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-yellow-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{Math.round(progress)}% used</p>
        </div>
      )}
    </div>
  );
}

// ── Bar Chart (pure SVG) ───────────────────────────────────────────────────

function UsageBarChart({
  data,
}: {
  data: Array<{ date: string; messages: number; estimatedCostCents: number }>;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxMessages = Math.max(...data.map((d) => d.messages), 1);

  const chartWidth = 600;
  const chartHeight = 200;
  const barGap = 2;
  const barWidth = (chartWidth - barGap * (data.length - 1)) / data.length;
  const yPadding = 20;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[500px] relative">
        {/* Y-axis labels */}
        <div className="flex justify-between text-[10px] text-gray-400 mb-1 px-1">
          <span>{maxMessages}</span>
          <span>{Math.round(maxMessages / 2)}</span>
          <span>0</span>
        </div>

        {/* SVG chart */}
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + yPadding}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1="0"
              y1={chartHeight * (1 - frac)}
              x2={chartWidth}
              y2={chartHeight * (1 - frac)}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const barHeight = (d.messages / maxMessages) * chartHeight;
            const x = i * (barWidth + barGap);
            const y = chartHeight - barHeight;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Invisible hit area (wider for easier hover) */}
                <rect
                  x={x - 1}
                  y={0}
                  width={barWidth + 2}
                  height={chartHeight + yPadding}
                  fill="transparent"
                />
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={Math.max(barWidth, 1)}
                  height={Math.max(barHeight, 0)}
                  rx={barWidth > 4 ? 2 : 1}
                  fill={isHovered ? '#4338ca' : '#6366f1'}
                  className="transition-colors duration-150"
                />
                {/* X-axis labels (every 5th day) */}
                {i % 5 === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + yPadding - 2}
                    textAnchor="middle"
                    className="fill-gray-400"
                    fontSize="9"
                  >
                    {formatDate(d.date)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Tooltip */}
          {hoveredIdx !== null && (() => {
            const d = data[hoveredIdx];
            const x = hoveredIdx * (barWidth + barGap) + barWidth / 2;
            const barHeight = (d.messages / maxMessages) * chartHeight;
            const tooltipY = Math.max(chartHeight - barHeight - 35, 5);
            // Clamp tooltip x so it doesn't overflow
            const tooltipX = Math.max(60, Math.min(x, chartWidth - 60));

            return (
              <g>
                <rect
                  x={tooltipX - 55}
                  y={tooltipY}
                  width={110}
                  height={30}
                  rx={6}
                  fill="#1f2937"
                  opacity={0.95}
                />
                <text
                  x={tooltipX}
                  y={tooltipY + 13}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="600"
                >
                  {d.messages} message{d.messages !== 1 ? 's' : ''}
                </text>
                <text
                  x={tooltipX}
                  y={tooltipY + 24}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="9"
                >
                  {formatDate(d.date)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

// ── Activity Feed ──────────────────────────────────────────────────────────

function ActivityFeed({ messages }: { messages: MessageLog[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 group"
        >
          {/* Avatar */}
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500">
            {(msg.contact_name || 'U').charAt(0).toUpperCase()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium text-gray-900 truncate">
                {msg.contact_name || 'Unknown'}
              </span>
              <Badge
                className={`text-[10px] px-1.5 py-0 gap-1 ${channelColor(msg.message_type)}`}
              >
                {channelIcon(msg.message_type)}
                {msg.message_type || 'Unknown'}
              </Badge>
              <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">
                {formatTimestamp(msg.created_at)}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              <span className="text-gray-400">→</span>{' '}
              {msg.inbound_message.length > 80
                ? msg.inbound_message.slice(0, 80) + '…'
                : msg.inbound_message}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              <span className="text-indigo-400">←</span>{' '}
              {msg.ai_response.length > 80
                ? msg.ai_response.slice(0, 80) + '…'
                : msg.ai_response}
            </p>
          </div>

          {/* Link to conversation (if we have conversation_id) */}
          {msg.conversation_id && (
            <a
              href={`https://app.gohighlevel.com/conversations/${msg.conversation_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-indigo-500"
              title="Open in GHL"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function UsageAnalytics({ clientId, creditLimit = 1000 }: UsageAnalyticsProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [recentMessages, setRecentMessages] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usageRes, messagesRes] = await Promise.all([
        fetch(`/api/agency/clients/${clientId}/usage`),
        fetch(`/api/agency/clients/${clientId}/messages?limit=10`),
      ]);

      if (!usageRes.ok) throw new Error('Failed to load usage data');
      if (!messagesRes.ok) throw new Error('Failed to load messages');

      const [usageData, messagesData] = await Promise.all([
        usageRes.json(),
        messagesRes.json(),
      ]);

      setUsage(usageData);
      setRecentMessages(messagesData.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
              <span className="text-sm">Loading analytics...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const dailyData = fillDailyData(usage.dailyBreakdown);
  const creditUsagePercent = creditLimit > 0
    ? (usage.messages.thisMonth / creditLimit) * 100
    : 0;

  // Unique contacts this month (from recent messages as a rough proxy)
  const uniqueContacts = new Set(recentMessages.map((m) => m.contact_id)).size;

  return (
    <div className="space-y-6 mb-6">
      {/* ── Stats Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Messages"
          value={usage.messages.thisMonth.toLocaleString()}
          subValue={`${usage.messages.today} today · ${usage.messages.thisWeek} this week`}
        />
        <StatCard
          icon={<Zap className="h-4 w-4" />}
          label="Credits"
          value={usage.tokens.estimatedTotalCostFormatted}
          subValue={`~${Math.round((usage.tokens.estimatedInput + usage.tokens.estimatedOutput) / 1000)}k tokens`}
          progress={creditUsagePercent}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg Response"
          value={
            usage.performance.avgResponseTimeSec > 0
              ? `${usage.performance.avgResponseTimeSec}s`
              : '—'
          }
          subValue={
            usage.performance.avgResponseTimeMs > 0
              ? `${usage.performance.avgResponseTimeMs}ms`
              : 'No data yet'
          }
        />
        <StatCard
          icon={<MessagesSquare className="h-4 w-4" />}
          label="Contacts"
          value={uniqueContacts > 0 ? uniqueContacts : '—'}
          subValue="Unique this month"
        />
      </div>

      {/* ── Usage Chart ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Daily Messages
          </CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageBarChart data={dailyData} />

          {/* Channel breakdown */}
          {Object.keys(usage.channelBreakdown).length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">Channels:</span>
              {Object.entries(usage.channelBreakdown).map(([channel, count]) => (
                <Badge
                  key={channel}
                  className={`text-[10px] gap-1 ${channelColor(channel)}`}
                >
                  {channelIcon(channel)}
                  {channel}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity Feed ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed messages={recentMessages} />
        </CardContent>
      </Card>
    </div>
  );
}
