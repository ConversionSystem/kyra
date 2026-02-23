'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import type { HealthScoreResult } from '@/lib/ai-health-score';

interface Props {
  clientId: string;
  showDetails?: boolean;
}

export default function HealthScoreBadge({ clientId, showDetails = false }: Props) {
  const [health, setHealth] = useState<HealthScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agency/clients/${clientId}/health-score`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setHealth(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId]);

  if (loading) return <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300" />;
  if (!health) return null;

  const Icon = health.score >= 75 ? CheckCircle2 : health.score >= 40 ? AlertCircle : XCircle;

  if (!showDetails) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${health.bgColor} ${health.color}`}>
        {health.grade} · {health.score}
      </span>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 ${health.bgColor} border-current/10`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${health.color}`} />
          <span className={`font-bold ${health.color}`}>AI Health Score</span>
        </div>
        <div className={`text-3xl font-black ${health.color}`}>
          {health.score}<span className="text-lg opacity-50">/100</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 ${health.color}`} />
        <span className={`font-semibold text-sm ${health.color}`}>{health.label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 font-bold ${health.color}`}>
          Grade {health.grade}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-white/40 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            health.score >= 75 ? 'bg-green-500' : health.score >= 55 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${health.score}%` }}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {health.wins.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1.5">✅ What&apos;s working</p>
            <ul className="space-y-1">
              {health.wins.map(w => (
                <li key={w} className="text-xs text-green-800 flex items-start gap-1.5">
                  <span className="shrink-0 mt-0.5">•</span>{w}
                </li>
              ))}
            </ul>
          </div>
        )}
        {health.issues.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-1.5">⚠️ Needs attention</p>
            <ul className="space-y-1">
              {health.issues.map(i => (
                <li key={i} className="text-xs text-amber-900 flex items-start gap-1.5">
                  <span className="shrink-0 mt-0.5">•</span>{i}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
