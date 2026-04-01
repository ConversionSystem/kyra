'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain,
  MessageSquare,
  CalendarCheck,
  Reply,
  SmilePlus,
  BookOpen,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  Target,
  PartyPopper,
  BarChart3,
  Clock,
  Trophy,
  Users,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  Moon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  AgencyOverview,
  ClientHealthScore,
  CrossClientPatterns,
  SmartRecommendation,
} from '@/lib/intelligence/agency-analytics';

// ── Types for API response ──

interface IntelligenceData {
  overview: AgencyOverview;
  healthScores: ClientHealthScore[];
  patterns: CrossClientPatterns;
  recommendations: SmartRecommendation[];
}

// ── Health Score Color Helpers ──

function getScoreColor(score: number) {
  if (score >= 80) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' };
  if (score >= 50) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
  return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
}

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up': return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    case 'down': return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    default: return <Minus className="h-3.5 w-3.5 text-gray-400" />;
  }
}

function getRecommendationStyle(type: string) {
  switch (type) {
    case 'warning': return { bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> };
    case 'action': return { bg: 'bg-blue-50 border-blue-200', icon: <Lightbulb className="h-4 w-4 text-blue-500" /> };
    case 'celebration': return { bg: 'bg-green-50 border-green-200', icon: <PartyPopper className="h-4 w-4 text-green-500" /> };
    case 'insight': return { bg: 'bg-purple-50 border-purple-200', icon: <Target className="h-4 w-4 text-purple-500" /> };
    default: return { bg: 'bg-gray-50 border-gray-200', icon: <Lightbulb className="h-4 w-4 text-gray-500" /> };
  }
}

function formatHour(hour: number) {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

// ── Stat Card ──

function StatCard({ label, value, icon, subtext }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
          </div>
          <div className="p-2 rounded-lg bg-gray-100">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ──

export function IntelligenceClient() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/agency/intelligence');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to load (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intelligence data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-gray-500">Analyzing your portfolio…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
            <p className="text-gray-700 font-medium">{error}</p>
            <Button onClick={() => fetchData()} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { overview, healthScores, patterns, recommendations } = data;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Agency Intelligence</h1>
            <p className="text-sm text-gray-500">Cross-client insights and recommendations</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Conversations"
          value={overview.totalActiveConversations.toLocaleString()}
          icon={<MessageSquare className="h-5 w-5 text-indigo-500" />}
          subtext="last 7 days"
        />
        <StatCard
          label="Bookings"
          value={overview.totalBookings.toLocaleString()}
          icon={<CalendarCheck className="h-5 w-5 text-green-500" />}
          subtext="this period"
        />
        <StatCard
          label="Reply Rate"
          value={`${overview.averageReplyRate}%`}
          icon={<Reply className="h-5 w-5 text-blue-500" />}
          subtext="avg across clients"
        />
        <StatCard
          label="Sentiment"
          value={overview.averageSentimentScore.toFixed(1)}
          icon={<SmilePlus className="h-5 w-5 text-amber-500" />}
          subtext="out of 5.0"
        />
        <StatCard
          label="Knowledge"
          value={overview.totalKnowledgeEntries.toLocaleString()}
          icon={<BookOpen className="h-5 w-5 text-purple-500" />}
          subtext="entries extracted"
        />
        <StatCard
          label="Tasks Run"
          value={overview.totalTasksRun.toLocaleString()}
          icon={<Zap className="h-5 w-5 text-orange-500" />}
          subtext="automated actions"
        />
      </div>

      {/* Main Grid: Health + Recommendations */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Client Health Scores — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                Client Health
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {healthScores.length} client{healthScores.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {healthScores.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No clients yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {healthScores.map((client) => {
                  const colors = getScoreColor(client.score);
                  return (
                    <Link
                      key={client.clientId}
                      href={`/agency/clients/${client.clientId}`}
                      className="flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors -mx-1 group"
                    >
                      {/* Score dot */}
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors.dot}`} />

                      {/* Client info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {client.clientName}
                          </span>
                          {client.flags.includes('inactive') && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-300 text-gray-500">
                              <Moon className="h-2.5 w-2.5 mr-0.5" />inactive
                            </Badge>
                          )}
                          {client.flags.includes('declining') && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600">
                              declining
                            </Badge>
                          )}
                        </div>
                        {client.industry && (
                          <span className="text-xs text-gray-400">{client.industry}</span>
                        )}
                      </div>

                      {/* Conversations */}
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {client.conversationCount} convos
                      </span>

                      {/* Trend */}
                      <div className="flex items-center gap-1">
                        {getTrendIcon(client.trend)}
                        {client.trendDelta !== 0 && (
                          <span className={`text-xs font-medium ${
                            client.trend === 'up' ? 'text-green-600' : client.trend === 'down' ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {client.trendDelta > 0 ? '+' : ''}{client.trendDelta}
                          </span>
                        )}
                      </div>

                      {/* Score badge */}
                      <div className={`px-2.5 py-1 rounded-lg text-sm font-bold ${colors.bg} ${colors.text}`}>
                        {client.score}
                      </div>

                      <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Smart Recommendations — 1/3 width */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Smart Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recommendations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                All looking good! 🎉
              </p>
            ) : (
              <div className="space-y-2.5">
                {recommendations.slice(0, 8).map((rec, i) => {
                  const style = getRecommendationStyle(rec.type);
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 ${style.bg} transition-colors`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg shrink-0 mt-0.5">{rec.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 leading-snug">
                            {rec.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {rec.description}
                          </p>
                          {rec.clientId && (
                            <Link
                              href={`/agency/clients/${rec.clientId}`}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1.5 inline-block"
                            >
                              View client →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patterns Section */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Questions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Top Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {patterns.topQuestions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Not enough cross-client data yet
              </p>
            ) : (
              <div className="space-y-2.5">
                {patterns.topQuestions.slice(0, 5).map((q, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-300 mt-0.5 shrink-0 w-4">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 leading-snug line-clamp-2">
                        {q.question}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {q.clientCount} client{q.clientCount > 1 ? 's' : ''} · {q.totalOccurrences} times
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Busiest Times */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Busiest Times
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {patterns.busiestHours.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Not enough conversation data yet
              </p>
            ) : (
              <div className="space-y-2">
                {patterns.busiestHours.slice(0, 5).map((slot, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 shrink-0 w-4">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        {slot.dayName} {formatHour(slot.hour)}–{formatHour(slot.hour + 1)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs tabular-nums">
                      {slot.count} convos
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best Workers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Best Workers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {patterns.bestWorkerTypes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Not enough worker data yet
              </p>
            ) : (
              <div className="space-y-2.5">
                {patterns.bestWorkerTypes.slice(0, 5).map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 shrink-0 w-4">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{w.workerType}</p>
                      <p className="text-xs text-gray-400">{w.totalConversations} conversations</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-bold ${
                        w.avgReplyRate >= 80 ? 'text-green-600' :
                        w.avgReplyRate >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {w.avgReplyRate}%
                      </span>
                      <p className="text-[10px] text-gray-400">reply rate</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
