'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, MessageSquare, Calendar, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface WorkerScorecard {
  workerId: string;
  workerName: string;
  totalConversations: number;
  replyRate: number;
  escalationRate: number;
  bookingsMade: number;
  positiveSignals: number;
  negativeSignals: number;
  sentimentScore: number;
  totalCreditsUsed: number;
  trend: 'up' | 'down' | 'stable';
  trendDelta: number;
}

interface WorkerPerformanceCardProps {
  clientId: string;
}

function getReplyRateColor(rate: number): string {
  if (rate >= 70) return 'text-green-600 bg-green-50';
  if (rate >= 50) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

function getReplyRateBorder(rate: number): string {
  if (rate >= 70) return 'border-green-200';
  if (rate >= 50) return 'border-yellow-200';
  return 'border-red-200';
}

function TrendIcon({ trend, delta }: { trend: string; delta: number }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

export default function WorkerPerformanceCard({ clientId }: WorkerPerformanceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [scorecard, setScorecard] = useState<WorkerScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPerformance() {
      try {
        const res = await fetch(`/api/agency/worker-performance?clientId=${clientId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setScorecard(data.scorecard ?? []);
      } catch (err) {
        setError('Could not load performance data');
      } finally {
        setLoading(false);
      }
    }
    fetchPerformance();
  }, [clientId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-64" />
      </div>
    );
  }

  if (error || scorecard.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-semibold text-gray-900">Worker Performance</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {error || 'No performance data yet. Metrics will appear after the AI handles conversations.'}
        </p>
      </div>
    );
  }

  // Summary stats
  const totalConvs = scorecard.reduce((sum, s) => sum + s.totalConversations, 0);
  const avgReplyRate = scorecard.length > 0
    ? Math.round(scorecard.reduce((sum, s) => sum + s.replyRate, 0) / scorecard.length)
    : 0;
  const totalBookings = scorecard.reduce((sum, s) => sum + s.bookingsMade, 0);
  const totalEscalations = scorecard.reduce((sum, s) => sum + Math.round(s.escalationRate * s.totalConversations / 100), 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📊</span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">Worker Performance</h3>
            <p className="text-xs text-gray-500">
              {totalConvs} conversations · {avgReplyRate}% reply rate · {totalBookings} bookings
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Summary pills — always visible */}
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          <MessageSquare className="w-3 h-3" />
          {totalConvs} convos
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getReplyRateColor(avgReplyRate)}`}>
          {avgReplyRate}% replies
        </span>
        {totalBookings > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
            <Calendar className="w-3 h-3" />
            {totalBookings} booked
          </span>
        )}
        {totalEscalations > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
            <AlertTriangle className="w-3 h-3" />
            {totalEscalations} escalated
          </span>
        )}
      </div>

      {/* Expanded: per-worker breakdown */}
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="divide-y divide-gray-50">
            {scorecard.map((worker) => (
              <div
                key={worker.workerId}
                className={`px-4 py-3 flex items-center justify-between ${getReplyRateBorder(worker.replyRate)} border-l-2`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {worker.workerName}
                    </span>
                    <TrendIcon trend={worker.trend} delta={worker.trendDelta} />
                    {worker.trendDelta !== 0 && (
                      <span className={`text-xs ${worker.trend === 'up' ? 'text-green-600' : worker.trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
                        {worker.trendDelta > 0 ? '+' : ''}{worker.trendDelta}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{worker.totalConversations} convos</span>
                    <span className={`font-medium ${worker.replyRate >= 70 ? 'text-green-600' : worker.replyRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {worker.replyRate}% reply rate
                    </span>
                    {worker.escalationRate > 0 && (
                      <span className="text-orange-600">{worker.escalationRate}% escalated</span>
                    )}
                    {worker.bookingsMade > 0 && (
                      <span className="text-indigo-600">{worker.bookingsMade} booked</span>
                    )}
                  </div>
                </div>

                {/* Sentiment indicators */}
                <div className="flex items-center gap-2 ml-3">
                  {worker.positiveSignals > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                      <ThumbsUp className="w-3 h-3" />
                      {worker.positiveSignals}
                    </span>
                  )}
                  {worker.negativeSignals > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-red-600">
                      <ThumbsDown className="w-3 h-3" />
                      {worker.negativeSignals}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {worker.totalCreditsUsed} cr
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
