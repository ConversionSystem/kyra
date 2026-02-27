'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, Target, Flame, Bot, Coins,
  ArrowRight, DollarSign, Zap, Download, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttributionDeal {
  deal_name: string;
  value: number;
  source: string;
  contact_id: string | null;
  stages: string[];
  created_at: string;
}

interface Analytics {
  revenue_by_source: Record<string, { total: number; won: number; pipeline: number; count: number }>;
  funnel: {
    total_contacts: number;
    leads: number;
    contacts: number;
    customers: number;
    deals: number;
    won_deals: number;
    won_value: number;
  };
  ai_stats: { actions_30d: number; crm_credits_used_30d: number };
  score_distribution: Record<string, number>;
  attribution_chain: AttributionDeal[];
  last_autopilot_digest: { body: string; metadata: Record<string, unknown>; created_at: string } | null;
}

export function CrmAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    fetch('/api/agency/crm/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const runScoring = async () => {
    setScoring(true);
    await fetch('/api/agency/crm/score', { method: 'POST' });
    // Refresh analytics
    const r = await fetch('/api/agency/crm/analytics');
    if (r.ok) setData(await r.json());
    setScoring(false);
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [['Source', 'Deals', 'Pipeline Value', 'Won Value', 'Total Value']];
    for (const [src, info] of Object.entries(data.revenue_by_source)) {
      rows.push([src, String(info.count), `$${info.pipeline}`, `$${info.won}`, `$${info.total}`]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `crm-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-gray-500">Failed to load analytics.</div>;
  }

  const { funnel, ai_stats, score_distribution, revenue_by_source, attribution_chain, last_autopilot_digest } = data;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" /> CRM Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue attribution, conversion funnel, AI ROI</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runScoring} disabled={scoring}>
            <RefreshCw className={`h-4 w-4 mr-1 ${scoring ? 'animate-spin' : ''}`} />
            {scoring ? 'Scoring...' : 'Run AI Scoring'}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={<Users className="h-5 w-5 text-indigo-600" />} label="Total Contacts" value={funnel.total_contacts} bg="bg-indigo-50" />
        <KpiCard icon={<Target className="h-5 w-5 text-purple-600" />} label="Active Deals" value={funnel.deals} bg="bg-purple-50" />
        <KpiCard icon={<DollarSign className="h-5 w-5 text-green-600" />} label="Won Revenue" value={`$${funnel.won_value.toLocaleString()}`} bg="bg-green-50" />
        <KpiCard icon={<Bot className="h-5 w-5 text-indigo-600" />} label="AI Actions (30d)" value={ai_stats.actions_30d} bg="bg-indigo-50" />
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" /> CONVERSION FUNNEL
        </h2>
        <div className="flex items-center justify-between gap-2">
          <FunnelStep label="Leads" count={funnel.leads} total={funnel.total_contacts} color="bg-indigo-500" />
          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
          <FunnelStep label="Contacts" count={funnel.contacts} total={funnel.total_contacts} color="bg-purple-500" />
          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
          <FunnelStep label="Customers" count={funnel.customers} total={funnel.total_contacts} color="bg-green-500" />
          <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
          <FunnelStep label="Won Deals" count={funnel.won_deals} total={funnel.deals || 1} color="bg-emerald-500" />
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue by Source */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" /> REVENUE BY SOURCE
          </h2>
          {Object.keys(revenue_by_source).length === 0 ? (
            <p className="text-sm text-gray-400">No deals yet. Create deals to see attribution.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(revenue_by_source).map(([src, info]) => (
                <div key={src}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">{src.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-bold text-gray-900">${info.total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (info.won / Math.max(1, info.total)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {info.count} deals · ${info.won.toLocaleString()} won
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" /> LEAD SCORING
          </h2>
          <div className="space-y-3">
            <ScoreBar label="🔥 Hot" count={score_distribution.hot || 0} total={funnel.total_contacts} color="bg-red-500" />
            <ScoreBar label="Warm" count={score_distribution.warm || 0} total={funnel.total_contacts} color="bg-amber-500" />
            <ScoreBar label="Cold" count={score_distribution.cold || 0} total={funnel.total_contacts} color="bg-blue-500" />
            <ScoreBar label="New" count={score_distribution.new || 0} total={funnel.total_contacts} color="bg-gray-300" />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" /> Credits used (30d)
              </span>
              <span className="font-bold text-gray-900">{ai_stats.crm_credits_used_30d}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI ROI */}
      {funnel.won_value > 0 && ai_stats.crm_credits_used_30d > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 text-center">
          <Zap className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
          <p className="text-lg font-bold text-gray-900">
            AI ROI: {Math.round(funnel.won_value / (ai_stats.crm_credits_used_30d * 0.01))}x
          </p>
          <p className="text-sm text-gray-600 mt-1">
            ${funnel.won_value.toLocaleString()} revenue from {ai_stats.crm_credits_used_30d} credits
            (${(ai_stats.crm_credits_used_30d * 0.01).toFixed(2)} cost)
          </p>
        </div>
      )}

      {/* Revenue Attribution Chain */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" /> REVENUE ATTRIBUTION CHAIN
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Source → AI Outreach → Customer Reply → Meeting → Deal Won — the complete journey for every dollar earned.
        </p>
        {attribution_chain.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No won deals yet. Close your first deal to see the full attribution chain.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {attribution_chain.map((deal, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 hover:border-indigo-200 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">{deal.deal_name}</span>
                  <span className="text-lg font-bold text-green-600">${deal.value.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {deal.stages.map((stage, j) => (
                    <span key={j} className="flex items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        stage === 'Deal Won' ? 'bg-green-100 text-green-700' :
                        stage === 'Customer Replied' ? 'bg-blue-100 text-blue-700' :
                        stage === 'Meeting Held' ? 'bg-purple-100 text-purple-700' :
                        stage.startsWith('AI') ? 'bg-indigo-100 text-indigo-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {stage}
                      </span>
                      {j < deal.stages.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-gray-300 mx-1 shrink-0" />
                      )}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {new Date(deal.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last Autopilot Digest */}
      {last_autopilot_digest && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-500" /> LAST AI AUTOPILOT RUN
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
            {last_autopilot_digest.body}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            {new Date(last_autopilot_digest.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number | string; bg: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function FunnelStep({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex-1 text-center">
      <div className="h-16 flex items-end justify-center mb-2">
        <div className={`w-full ${color} rounded-t-lg`} style={{ height: `${Math.max(8, pct)}%` }} />
      </div>
      <p className="text-xl font-bold text-gray-900">{count}</p>
      <p className="text-[10px] text-gray-500">{label} ({pct}%)</p>
    </div>
  );
}

function ScoreBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
