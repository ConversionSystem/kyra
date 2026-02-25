'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, CheckCircle2, AlertTriangle, Users, TrendingUp, Loader2 } from 'lucide-react';

interface Overview {
  conversations_today: number;
  conversations_week: number;
  escalations_week: number;
  active_clients: number;
  busiest_client: { name: string; count: number } | null;
  resolution_rate_week: number;
}

export default function AgencyAnalyticsStrip() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch('/api/agency/analytics/overview')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
      </div>
    );
  }

  const stats = [
    {
      icon: MessageSquare,
      label: 'Conversations Today',
      value: data.conversations_today.toLocaleString(),
      sub: `${data.conversations_week.toLocaleString()} this week`,
      color: 'text-indigo-600', bg: 'bg-indigo-50',
    },
    {
      icon: CheckCircle2,
      label: 'Resolution Rate',
      value: `${data.resolution_rate_week}%`,
      sub: 'Handled without escalation',
      color: 'text-green-600', bg: 'bg-green-50',
    },
    {
      icon: AlertTriangle,
      label: 'Escalations This Week',
      value: data.escalations_week.toLocaleString(),
      sub: data.escalations_week === 0 ? '✅ All clean' : 'Review in Conversations',
      color: data.escalations_week > 0 ? 'text-amber-600' : 'text-green-600',
      bg: data.escalations_week > 0 ? 'bg-amber-50' : 'bg-green-50',
    },
    {
      icon: Users,
      label: 'Active AI Workers',
      value: data.active_clients.toLocaleString(),
      sub: 'Running 24/7',
      color: 'text-blue-600', bg: 'bg-blue-50',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {data.busiest_client && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <TrendingUp className="h-4 w-4 text-indigo-500 shrink-0" />
          <p className="text-sm text-indigo-800">
            <span className="font-semibold">{data.busiest_client.name}</span> is your busiest AI worker this week with{' '}
            <span className="font-semibold">{data.busiest_client.count} conversations</span>.
          </p>
        </div>
      )}
    </div>
  );
}
