'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, Users, TrendingUp, Target, Clock, Flame,
  ArrowUp, ArrowDown, DollarSign, Zap, Download, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalyticsData {
  contacts: { total: number; byStage: Record<string, number>; bySource: Record<string, number>; byScore: Record<string, number> };
  deals: { total: number; totalValue: number; byStage: Record<string, { count: number; value: number }> };
  activities: { total: number; byType: Record<string, number>; byDay: Array<{ date: string; count: number }> };
  conversions: { lead_to_contact: number; contact_to_customer: number; overall: number };
  forecast: { weighted_pipeline: number; expected_revenue: number };
  topContacts: Array<{ id: string; name: string; score: number; stage: string }>;
}

export function CrmAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/agency/crm/analytics')
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return <div className="p-4 sm:p-6 lg:p-8 text-center text-gray-400 animate-pulse">Loading analytics...</div>;
  if (error || !data) return <div className="p-4 sm:p-6 lg:p-8 text-center text-gray-500">Failed to load analytics.</div>;

  const stages = ['lead', 'contact', 'customer', 'churned'];
  const stageColors: Record<string, string> = { lead: '#6366f1', contact: '#8b5cf6', customer: '#22c55e', churned: '#9ca3af' };
  const dealStages = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const dealStageColors: Record<string, string> = {
    prospect: '#6366f1', qualified: '#3b82f6', proposal: '#8b5cf6',
    negotiation: '#f59e0b', won: '#22c55e', lost: '#9ca3af',
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" /> CRM Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Performance overview and insights</p>
        </div>
        <Button variant="outline" size="sm" onClick={async () => {
          const res = await fetch('/api/agency/crm/export?type=contacts');
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `crm-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 sm:gap-4">
        <KpiCard icon={<Users className="h-5 w-5 text-indigo-600" />} label="Total Contacts" value={data.contacts.total} />
        <KpiCard icon={<DollarSign className="h-5 w-5 text-green-600" />} label="Pipeline Value" value={`$${(data.deals.totalValue / 1000).toFixed(1)}K`} />
        <KpiCard icon={<TrendingUp className="h-5 w-5 text-purple-600" />} label="Forecast Revenue" value={`$${((data.forecast?.expected_revenue || 0) / 1000).toFixed(1)}K`} />
        <KpiCard icon={<Flame className="h-5 w-5 text-red-500" />} label="Hot Leads" value={data.contacts.byScore?.hot || 0} />
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-indigo-500" /> Conversion Funnel
        </h2>
        <ConversionFunnel
          stages={stages.filter(s => s !== 'churned')}
          values={stages.filter(s => s !== 'churned').map(s => data.contacts.byStage[s] || 0)}
          colors={stages.filter(s => s !== 'churned').map(s => stageColors[s])}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{((data.conversions?.lead_to_contact || 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Lead → Contact</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{((data.conversions?.contact_to_customer || 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Contact → Customer</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{((data.conversions?.overall || 0) * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Overall Conversion</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Deal Pipeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" /> Deal Pipeline
          </h2>
          <div className="space-y-3">
            {dealStages.map(stage => {
              const stageData = data.deals.byStage[stage] || { count: 0, value: 0 };
              const maxVal = Math.max(...dealStages.map(s => data.deals.byStage[s]?.value || 0), 1);
              const pct = (stageData.value / maxVal) * 100;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 capitalize">{stage}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: dealStageColors[stage] }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-20 text-right">
                    ${stageData.value.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400 w-12 text-right">
                    {stageData.count} deals
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Contact Sources
          </h2>
          <SourcePieChart sources={data.contacts.bySource} total={data.contacts.total} />
        </div>

        {/* Activity Trends */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" /> Activity (Last 14 Days)
          </h2>
          <ActivityChart days={data.activities.byDay || []} />
          <div className="flex gap-4 mt-3">
            {Object.entries(data.activities.byType || {}).slice(0, 5).map(([type, count]) => (
              <div key={type} className="text-center">
                <p className="text-lg font-bold text-gray-900">{count as number}</p>
                <p className="text-[10px] text-gray-500 capitalize">{type.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contacts */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" /> Top Contacts by Score
          </h2>
          {(data.topContacts || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No scored contacts yet</p>
          ) : (
            <div className="space-y-2">
              {data.topContacts.slice(0, 10).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{c.stage}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-900 w-8 text-right">{c.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">{icon}</div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ConversionFunnel({ stages, values, colors }: { stages: string[]; values: number[]; colors: string[] }) {
  const maxVal = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-2 h-32">
      {stages.map((stage, i) => {
        const pct = (values[i] / maxVal) * 100;
        return (
          <div key={stage} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-gray-900">{values[i]}</span>
            <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden" style={{ height: '100px' }}>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${Math.max(pct, 5)}%`,
                  backgroundColor: colors[i],
                  marginTop: `${100 - Math.max(pct, 5)}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-gray-500 capitalize">{stage}</span>
          </div>
        );
      })}
    </div>
  );
}

function SourcePieChart({ sources, total }: { sources: Record<string, number>; total: number }) {
  const entries = Object.entries(sources || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="text-sm text-gray-400 text-center py-4">No data</p>;

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#3b82f6', '#eab308', '#14b8a6'];

  // Simple horizontal bar chart instead of pie (more readable)
  return (
    <div className="space-y-3">
      {entries.map(([source, count], i) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={source} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-xs text-gray-600 w-20 capitalize">{source || 'unknown'}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: colors[i % colors.length] }}
              />
            </div>
            <span className="text-xs font-bold text-gray-900 w-8 text-right">{count}</span>
            <span className="text-[10px] text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityChart({ days }: { days: Array<{ date: string; count: number }> }) {
  if (days.length === 0) return <p className="text-sm text-gray-400 text-center py-4">No activity data</p>;

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const chartWidth = 400;
  const chartHeight = 80;
  const barWidth = Math.min((chartWidth / days.length) - 2, 24);

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} className="w-full h-24">
      {days.map((day, i) => {
        const barHeight = (day.count / maxCount) * chartHeight;
        const x = (i / days.length) * chartWidth + barWidth / 2;
        const y = chartHeight - barHeight;
        const label = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return (
          <g key={day.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill={day.count > 0 ? '#6366f1' : '#e5e7eb'}
              opacity={0.8}
            />
            {i % Math.ceil(days.length / 7) === 0 && (
              <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" className="text-[8px]" fill="#9ca3af">
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
