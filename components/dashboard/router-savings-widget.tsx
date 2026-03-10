'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface RouterStats {
  daily_cost: number;
  total_savings: number;
  tier_percentages: Record<string, number>;
  daily_queries: number;
  savings_ratio?: number;
}

export default function RouterSavingsWidget() {
  const [stats, setStats] = useState<RouterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agency/router-stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const freePct = stats
    ? Math.round((stats.tier_percentages?.['template'] ?? 0) + (stats.tier_percentages?.['local/free'] ?? 0))
    : null;

  const savedUsd = stats ? stats.total_savings.toFixed(4) : null;
  const queries = stats?.daily_queries ?? null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide">
        <Zap className="w-3.5 h-3.5 text-indigo-500" />
        AI Cost Savings
      </div>

      {loading ? (
        <div className="space-y-1.5">
          <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
          <div className="h-3.5 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-indigo-600">
            {freePct !== null ? `${freePct}%` : '—'}
          </div>
          <div className="text-xs text-gray-500">answered for free (no LLM call)</div>

          <div className="mt-1 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-semibold text-gray-800">${savedUsd ?? '—'}</span>
              <span className="text-gray-400 ml-1">saved today</span>
            </div>
            <div>
              <span className="font-semibold text-gray-800">{queries ?? '—'}</span>
              <span className="text-gray-400 ml-1">queries today</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
