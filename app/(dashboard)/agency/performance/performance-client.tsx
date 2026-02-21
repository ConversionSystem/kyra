'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart3, Users, MessageSquare, Activity,
  TrendingUp, Mail, Info,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/types';

function performanceScore(usage: number): { label: string; color: string } {
  if (usage > 20) return { label: 'Excellent', color: 'border-green-200 bg-green-50 text-green-700' };
  if (usage >= 10) return { label: 'Good', color: 'border-blue-200 bg-blue-50 text-blue-700' };
  if (usage >= 1) return { label: 'Low', color: 'border-yellow-200 bg-yellow-50 text-yellow-700' };
  return { label: 'Inactive', color: 'border-gray-200 bg-gray-50 text-gray-500' };
}

function statusLabel(client: AgencyClient): { label: string; color: string } {
  if (!client.gateway_status || client.gateway_status === 'error') {
    return { label: 'Offline', color: 'border-red-200 bg-red-50 text-red-700' };
  }
  if (client.gateway_status === 'running') {
    return { label: 'Running', color: 'border-green-200 bg-green-50 text-green-700' };
  }
  return { label: client.gateway_status, color: 'border-yellow-200 bg-yellow-50 text-yellow-700' };
}

interface PerformanceClientProps {
  clients: AgencyClient[];
  agencyId: string;
  agencySettings: Record<string, unknown>;
}

export function PerformanceClient({ clients, agencyId, agencySettings }: PerformanceClientProps) {
  const totalClients = clients.length;
  const activeThisMonth = clients.filter(c => c.usage_this_month > 0).length;
  const totalConversations = clients.reduce((sum, c) => sum + c.usage_this_month, 0);
  const avgConversations = totalClients > 0 ? Math.round(totalConversations / totalClients) : 0;

  const [weeklyEnabled, setWeeklyEnabled] = useState(!!agencySettings.weekly_report_enabled);
  const [reportEmail, setReportEmail] = useState((agencySettings.weekly_report_email as string) || '');
  const [savingReport, setSavingReport] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);

  const handleSaveReport = async () => {
    setSavingReport(true);
    try {
      await fetch('/api/agency/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            weekly_report_enabled: weeklyEnabled,
            weekly_report_email: reportEmail || null,
          },
        }),
      });
      setReportSaved(true);
      setTimeout(() => setReportSaved(false), 2000);
    } catch { /* silent */ }
    setSavingReport(false);
  };

  const topStats = [
    { label: 'Total Clients', value: totalClients, icon: Users, color: 'text-gray-600 bg-gray-50' },
    { label: 'Active This Month', value: activeThisMonth, icon: Activity, color: 'text-green-600 bg-green-50' },
    { label: 'Total Conversations', value: totalConversations, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
    { label: 'Avg / Client', value: avgConversations, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
  ];

  // Date range for report preview
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-500" />
          Performance
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Weekly insights across all your AI employees
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {topStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance table */}
      {clients.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-200">
                  <th className="p-4 font-medium">Client</th>
                  <th className="p-4 font-medium">Conversations</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Performance</th>
                  <th className="p-4 font-medium">North Star</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const perf = performanceScore(client.usage_this_month);
                  const st = statusLabel(client);
                  const settings = (client.settings ?? {}) as Record<string, unknown>;
                  return (
                    <tr key={client.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{client.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700">{client.usage_this_month.toLocaleString()}</td>
                      <td className="p-4"><Badge className={st.color}>{st.label}</Badge></td>
                      <td className="p-4"><Badge className={perf.color}>{perf.label}</Badge></td>
                      <td className="p-4 text-gray-500 text-xs max-w-[200px] truncate">
                        {(settings.north_star as string) || <span className="text-gray-300 italic">Not set</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weekly Report toggle */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <Mail className="h-5 w-5 text-gray-400" />
            Weekly Report
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Reports include conversations handled, active clients, and top performers.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setWeeklyEnabled(!weeklyEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${weeklyEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${weeklyEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-700">
              Send weekly performance report every Monday at 9am
            </span>
          </div>

          {weeklyEnabled && (
            <div className="flex items-end gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Report email</label>
                <Input
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  placeholder="you@agency.com"
                  className="h-9 w-64"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveReport}
                disabled={savingReport}
              >
                {reportSaved ? 'Saved!' : 'Save'}
              </Button>
            </div>
          )}

          {!weeklyEnabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveReport}
              disabled={savingReport}
              className="mt-1"
            >
              {reportSaved ? 'Saved!' : 'Save Preference'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Preview Report */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview Report</h2>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-4">
            {/* Mock email header */}
            <div className="border-b border-gray-200 pb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Weekly Performance Report</p>
              <p className="text-sm text-gray-500">{fmt(weekStart)} — {fmt(now)}</p>
            </div>

            {/* Report summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {topStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Top performers */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Top Performers</p>
              <div className="space-y-1.5">
                {clients
                  .sort((a, b) => b.usage_this_month - a.usage_this_month)
                  .slice(0, 5)
                  .map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        <span className="text-gray-400 mr-2">#{i + 1}</span>
                        {c.name}
                      </span>
                      <span className="text-gray-500">{c.usage_this_month} conversations</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Needs attention */}
            {clients.filter(c => c.usage_this_month === 0 && c.gateway_status === 'running').length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Needs Attention
                </p>
                <p className="text-xs text-gray-500">
                  {clients.filter(c => c.usage_this_month === 0 && c.gateway_status === 'running').map(c => c.name).join(', ')}
                  {' '}&mdash; running but zero conversations this month
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200 text-center">
              <p className="text-[10px] text-gray-400">Powered by Kyra &middot; AI Agency Platform</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
