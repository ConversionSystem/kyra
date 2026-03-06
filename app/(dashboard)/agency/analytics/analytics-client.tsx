'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  MessageSquare,
  Users,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Smartphone,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalMessages: number;
    today: number;
    thisWeek: number;
    aiHandled: number;
    avgResponseTimeMs: number;
    avgResponseTimeSec: number;
    medianResponseTimeMs: number;
    estimatedCostCents: number;
    estimatedCostFormatted: string;
  };
  dailyMessages: Array<{ date: string; count: number }>;
  channelBreakdown: Record<string, number>;
  clientBreakdown: Array<{ id: string; name: string; messages: number }>;
  topContacts: Array<{ id: string; name: string; phone: string | null; count: number; lastAt: string }>;
  hourlyDistribution: number[];
  period: { days: number; since: string };
}

const channelIcons: Record<string, any> = {
  SMS: Smartphone,
  Email: Mail,
  WhatsApp: MessageCircle,
  'Live Chat': Globe,
  'Web Chat': Globe,
  Phone: Phone,
};

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Simple bar chart using divs
function MiniBarChart({ data, maxBars = 30 }: { data: Array<{ date: string; count: number }>; maxBars?: number }) {
  const sliced = data.slice(-maxBars);
  const max = Math.max(...sliced.map(d => d.count), 1);

  return (
    <div className="flex items-end gap-[2px] h-32">
      {sliced.map((d, i) => {
        const height = Math.max((d.count / max) * 100, d.count > 0 ? 4 : 1);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center group relative">
            <div
              className={`w-full rounded-t transition-colors ${
                d.count > 0 ? 'bg-blue-500 hover:bg-indigo-600' : 'bg-gray-200'
              }`}
              style={{ height: `${height}%`, minHeight: '2px' }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {d.count} messages
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal bar for breakdowns
function HorizontalBar({ label, value, max, color = 'bg-blue-500' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-28 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-900 w-10 text-right">{value}</span>
    </div>
  );
}

// Hourly heatmap
function HourlyHeatmap({ hours }: { hours: number[] | Record<string, number> }) {
  const hourArray = Array.isArray(hours) ? hours : Array.from({ length: 24 }, (_, i) => (hours as Record<string, number>)?.[String(i)] ?? 0);
  const max = Math.max(...hourArray, 1);
  return (
    <div className="flex items-end gap-[2px] h-16">
      {hourArray.map((count, h) => {
        const intensity = count / max;
        const bg = intensity === 0 ? 'bg-gray-100' :
          intensity < 0.25 ? 'bg-amber-100' :
          intensity < 0.5 ? 'bg-amber-300' :
          intensity < 0.75 ? 'bg-amber-500' : 'bg-amber-600';
        return (
          <div key={h} className="flex-1 flex flex-col items-center group relative">
            <div className={`w-full h-8 rounded-sm ${bg}`} />
            {h % 6 === 0 && (
              <span className="text-[10px] text-gray-400 mt-1">{h}:00</span>
            )}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {h}:00 — {count} messages
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/analytics?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600 font-medium">Failed to load analytics</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button onClick={handleRefresh} className="mt-3 text-sm text-red-600 hover:underline">Try again</button>
      </div>
    );
  }

  if (!data) return null;
  const { dailyMessages, channelBreakdown, clientBreakdown, topContacts, hourlyDistribution } = data;
  const summary = data.summary ?? { totalMessages: 0, today: 0, thisWeek: 0, avgPerDay: 0, responseRate: 0, avgResponseTime: 0 };
  const safeClientBreakdown = clientBreakdown ?? [];
  const safeChannelBreakdown = channelBreakdown ?? {};
  const safeDailyMessages = dailyMessages ?? [];
  const safeTopContacts = topContacts ?? [];
  const safeHourlyDistribution = hourlyDistribution ?? {};
  const maxClient = safeClientBreakdown.length > 0 ? Math.max(...safeClientBreakdown.map((c: any) => c.messages), 1) : 1;
  const maxChannel = Object.values(safeChannelBreakdown).length > 0 ? Math.max(...Object.values(safeChannelBreakdown) as number[], 1) : 1;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {[7, 14, 30, 60].map(d => (
            <button
              key={d}
              onClick={() => { setDays(d); setLoading(true); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Total Messages</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.totalMessages.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.today} today · {summary.thisWeek} this week
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">AI Handled</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {summary.totalMessages > 0
              ? `${Math.round((summary.aiHandled / summary.totalMessages) * 100)}%`
              : '—'
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary.aiHandled} conversations</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-gray-500 font-medium">Avg Response</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {summary.avgResponseTimeMs > 0 ? formatTime(summary.avgResponseTimeMs) : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Median: {summary.medianResponseTimeMs > 0 ? formatTime(summary.medianResponseTimeMs) : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-gray-500 font-medium">Est. AI Cost</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.estimatedCostFormatted}</p>
          <p className="text-xs text-gray-500 mt-1">
            {(summary.totalMessages > 0 ? (summary.estimatedCostCents / summary.totalMessages).toFixed(1) : '0')}¢ per message
          </p>
        </div>
      </div>

      {/* Message Volume Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Message Volume — Last {days} Days</h3>
        {safeDailyMessages.some(d => d.count > 0) ? (
          <MiniBarChart data={safeDailyMessages} maxBars={days} />
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
            No messages in this period
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{safeDailyMessages[0]?.date ? new Date(safeDailyMessages[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>Today</span>
        </div>
      </div>

      {/* Two-column: Channels + Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">By Channel</h3>
          {Object.keys(safeChannelBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(safeChannelBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([channel, count]) => (
                  <HorizontalBar
                    key={channel}
                    label={channel}
                    value={count}
                    max={maxChannel}
                    color={
                      channel === 'SMS' ? 'bg-blue-500' :
                      channel === 'Email' ? 'bg-purple-500' :
                      channel === 'WhatsApp' ? 'bg-green-500' :
                      'bg-amber-500'
                    }
                  />
                ))
              }
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No channel data</p>
          )}
        </div>

        {/* Client Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">By Client</h3>
          {safeClientBreakdown.length > 0 ? (
            <div className="space-y-3">
              {safeClientBreakdown.map((client: any) => (
                <HorizontalBar
                  key={client.id}
                  label={client.name}
                  value={client.messages}
                  max={maxClient}
                  color="bg-indigo-500"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No client data</p>
          )}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Peak Hours</h3>
        <HourlyHeatmap hours={safeHourlyDistribution} />
      </div>

      {/* Top Contacts */}
      {safeTopContacts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Most Active Contacts</h3>
          <div className="divide-y divide-gray-100">
            {safeTopContacts.map((contact: any, i: number) => (
              <div key={contact.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400 w-5">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                    {contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{contact.count}</p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(contact.lastAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
