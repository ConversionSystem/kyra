'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Bot, Clock, TrendingUp, Loader2,
  Users, Zap, DollarSign, ExternalLink, BarChart3,
} from 'lucide-react';
import { SectionNav } from '@/components/dashboard/section-nav';
import { AnalyticsRevenueTab } from './analytics-revenue-tab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Types ──

interface HeroMetrics {
  totalConversations: number;
  totalMessages: number;
  activeWorkers: number;
  totalWorkers: number;
}

interface TrendDay {
  date: string;
  total: number;
  byClient: Record<string, number>;
}

interface TopWorker {
  id: string;
  name: string;
  industry: string | null;
  status: string;
  conversations: number;
  messages: number;
}

interface RecentConvo {
  id: string;
  client_id: string;
  client_name: string;
  channel: string;
  preview: string;
  created_at: string;
}

interface IntelligenceData {
  days: number;
  hero: HeroMetrics;
  trend: TrendDay[];
  topWorkers: TopWorker[];
  recent: RecentConvo[];
  roi: { hoursSaved: number; laborCostSaved: number };
  crm?: { pipelineValue: number; openDealCount: number };
  voice?: { callCount: number };
  clientNames: Record<string, string>;
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS', telegram: 'Telegram', whatsapp: 'WhatsApp',
  test_chat: 'Chat', web_chat: 'Web', voice: 'Voice',
};

// ── Main Component ──

export function AnalyticsClient({ agencyPlan, clients }: { agencyPlan: string; clients?: Array<{ id: string; name: string; status: string; monthlyRate: number }> }) {
  const [activeTab, setActiveTab] = useState<'performance' | 'revenue'>('performance');
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agency/analytics/intelligence?days=${days}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  // Tab nav — always rendered
  const tabNav = (
    <div className="flex gap-1 border-b border-gray-200 px-4 sm:px-6 md:px-8">
      {([
        { id: 'performance', label: 'Performance', icon: BarChart3 },
        { id: 'revenue', label: 'Revenue', icon: TrendingUp },
      ] as const).map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === t.id
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <t.icon className="w-4 h-4" />
          {t.label}
        </button>
      ))}
    </div>
  );

  if (activeTab === 'revenue') {
    return (
      <div className="space-y-0">
        <SectionNav currentHref="/agency/analytics" />
        {tabNav}
        <AnalyticsRevenueTab clients={clients || []} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-0">
        <SectionNav currentHref="/agency/analytics" />
        {tabNav}
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-0">
        <SectionNav currentHref="/agency/analytics" />
        {tabNav}
        <div className="p-8 text-center text-gray-500">Failed to load analytics data.</div>
      </div>
    );
  }

  const { hero, trend, topWorkers, recent, roi } = data;

  // Monthly cost estimate by plan
  const planCosts: Record<string, number> = {
    free: 0, solo_pro: 97, starter: 297, pro: 497, scale: 997,
  };
  const monthlyCost = planCosts[agencyPlan] ?? 0;
  const roiPercent = monthlyCost > 0
    ? Math.round(((roi.laborCostSaved - monthlyCost) / monthlyCost) * 100)
    : roi.laborCostSaved > 0 ? Infinity : 0;

  return (
    <div className="space-y-0">
      <SectionNav currentHref="/agency/analytics" />
      {tabNav}
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
              Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              AI worker metrics and ROI across all your clients
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {[7, 30, 60].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  days === d
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Section 1: Hero Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeroCard
            label="Total Conversations"
            value={fmt(hero.totalConversations)}
            sub={`last ${days} days`}
            icon={MessageSquare}
            color="text-indigo-600 bg-indigo-50 border-indigo-200"
          />
          <HeroCard
            label="Messages Handled"
            value={fmt(hero.totalMessages)}
            sub={`last ${days} days`}
            icon={Zap}
            color="text-blue-600 bg-blue-50 border-blue-200"
          />
          <HeroCard
            label="Avg Response Time"
            value="~14s"
            sub="vs 45 min human"
            icon={Clock}
            color="text-emerald-600 bg-emerald-50 border-emerald-200"
          />
          <HeroCard
            label="Active AI Workers"
            value={String(hero.activeWorkers)}
            sub={`of ${hero.totalWorkers} total`}
            icon={Bot}
            color="text-purple-600 bg-purple-50 border-purple-200"
          />
        </div>

        {/* CRM + Voice Strip — only shown when data exists */}
        {((data.crm && data.crm.openDealCount > 0) || (data.voice && data.voice.callCount > 0)) && (
          <div className={`grid gap-3 ${[data.crm?.openDealCount, data.voice?.callCount].filter(Boolean).length >= 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {data.crm && data.crm.openDealCount > 0 && (
              <HeroCard
                label="Open Pipeline Value"
                value={`$${data.crm.pipelineValue >= 1000 ? `${(data.crm.pipelineValue / 1000).toFixed(1)}K` : data.crm.pipelineValue}`}
                sub="from CRM deals"
                icon={DollarSign}
                color="text-emerald-600 bg-emerald-50 border-emerald-200"
              />
            )}
            {data.crm && data.crm.openDealCount > 0 && (
              <HeroCard
                label="Open Deals"
                value={String(data.crm.openDealCount)}
                sub="active in pipeline"
                icon={Users}
                color="text-amber-600 bg-amber-50 border-amber-200"
              />
            )}
            {data.voice && data.voice.callCount > 0 && (
              <HeroCard
                label="Voice Calls"
                value={String(data.voice.callCount)}
                sub={`last ${days} days`}
                icon={MessageSquare}
                color="text-blue-600 bg-blue-50 border-blue-200"
              />
            )}
          </div>
        )}

        {/* Section 2: Conversation Trend Chart */}
        <TrendChart trend={trend} clientNames={data.clientNames} />

        {/* Section 3: Top Performing Workers */}
        {topWorkers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-600" />
                Top Performing AI Workers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Worker</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Industry</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Conversations</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Messages</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topWorkers.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <Link
                            href={`/agency/clients/${w.id}`}
                            className="flex items-center gap-2 group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                              <Bot className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition truncate max-w-[200px]">
                              {w.name}
                            </span>
                            <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-indigo-400 shrink-0" />
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-gray-500 hidden sm:table-cell">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                            {w.industry ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-900">{fmt(w.conversations)}</td>
                        <td className="px-3 py-3 text-right text-gray-600 hidden md:table-cell">{fmt(w.messages)}</td>
                        <td className="px-3 py-3 text-center">
                          <WorkerStatus status={w.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Recent Conversations */}
        {recent.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                Recent Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {recent.map(c => (
                  <Link
                    key={c.id}
                    href={`/agency/clients/${c.client_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{c.client_name}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full uppercase">
                          {CHANNEL_LABELS[c.channel] ?? c.channel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{c.preview || 'No preview'}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
                      {timeAgo(c.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 5: ROI Calculator */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">ROI Calculator</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RoiStat
                label="Hours Saved"
                value={`${fmt(roi.hoursSaved)} hrs`}
                detail={`${fmt(hero.totalMessages)} messages x 3 min each`}
              />
              <RoiStat
                label="Labor Cost Saved"
                value={`$${fmt(roi.laborCostSaved)}`}
                detail="at $50/hr industry avg"
              />
              <RoiStat
                label="Your Kyra Cost"
                value={monthlyCost > 0 ? `$${fmt(monthlyCost)}/mo` : 'Free'}
                detail={agencyPlan}
              />
              <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 mb-1">ROI</p>
                <p className="text-3xl font-black text-emerald-600">
                  {roiPercent === Infinity ? '∞' : `${roiPercent}%`}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">return on investment</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// ── Sub-components ──

function HeroCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-black">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}

function WorkerStatus({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
      {status}
    </span>
  );
}

function RoiStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-white rounded-xl border border-emerald-100 p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{detail}</p>
    </div>
  );
}

// ── SVG Trend Chart (inspired by growth-chart.tsx pattern) ──

function TrendChart({ trend, clientNames }: { trend: TrendDay[]; clientNames: Record<string, string> }) {
  const maxVal = useMemo(() => Math.max(...trend.map(d => d.total), 1), [trend]);

  // Top clients by total volume for multi-line view
  const topClientIds = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of trend) {
      for (const [cid, count] of Object.entries(day.byClient)) {
        totals[cid] = (totals[cid] ?? 0) + count;
      }
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
  }, [trend]);

  const COLORS = ['rgb(99,102,241)', 'rgb(59,130,246)', 'rgb(16,185,129)', 'rgb(245,158,11)', 'rgb(239,68,68)'];

  // SVG dimensions
  const W = 600;
  const H = 180;
  const PAD_T = 10;
  const PAD_B = 25;
  const plotH = H - PAD_T - PAD_B;

  // Total line points
  const totalPoints = trend.map((d, i) => {
    const x = (i / Math.max(trend.length - 1, 1)) * W;
    const y = PAD_T + plotH - (d.total / maxVal) * plotH;
    return { x, y, ...d };
  });

  const totalPath = totalPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = totalPoints.length > 0
    ? `${totalPath} L${totalPoints[totalPoints.length - 1].x.toFixed(1)},${PAD_T + plotH} L${totalPoints[0].x.toFixed(1)},${PAD_T + plotH} Z`
    : '';

  // X-axis labels
  const xLabels = trend
    .filter((_, i) => i % Math.max(Math.floor(trend.length / 6), 1) === 0 || i === trend.length - 1)
    .map(d => {
      const idx = trend.indexOf(d);
      const x = (idx / Math.max(trend.length - 1, 1)) * W;
      return { x, label: shortDate(d.date) };
    });

  const totalConvos = trend.reduce((s, d) => s + d.total, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            Conversation Trend
          </CardTitle>
          <span className="text-xs text-gray-500">{fmt(totalConvos)} total</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(pct => {
            const y = PAD_T + plotH - pct * plotH;
            return (
              <line key={pct} x1={0} y1={y} x2={W} y2={y}
                stroke="rgb(229,231,235)" strokeWidth="0.5" strokeDasharray="4,4" />
            );
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#trendGrad)" opacity="0.3" />}

          {/* Total line */}
          {totalPath && (
            <path d={totalPath} fill="none" stroke="rgb(99,102,241)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Daily bars */}
          {trend.map((d, i) => {
            if (d.total === 0) return null;
            const x = (i / Math.max(trend.length - 1, 1)) * W;
            const barH = Math.max(2, (d.total / maxVal) * (plotH * 0.25));
            return (
              <rect key={i} x={x - 3} y={PAD_T + plotH - barH} width={6} height={barH}
                rx={1.5} fill="rgb(99,102,241)" opacity="0.2" />
            );
          })}

          {/* Endpoint dot */}
          {totalPoints.length > 0 && (
            <circle
              cx={totalPoints[totalPoints.length - 1].x}
              cy={totalPoints[totalPoints.length - 1].y}
              r="3.5" fill="rgb(99,102,241)" stroke="white" strokeWidth="2"
            />
          )}

          {/* X labels */}
          {xLabels.map(({ x, label }) => (
            <text key={`${x}-${label}`} x={x} y={H - 4} textAnchor="middle"
              className="fill-gray-400" style={{ fontSize: '9px' }}>
              {label}
            </text>
          ))}

          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(99,102,241)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend */}
        {topClientIds.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3 px-1">
            {topClientIds.map((cid, i) => (
              <div key={cid} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {clientNames[cid] ?? cid.slice(0, 8)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
