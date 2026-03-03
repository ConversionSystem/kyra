'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart3, Users, MessageSquare, Activity,
  TrendingUp, Mail, Info, X, ChevronRight, Copy, Check,
  Download, Share2,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/types';

const DISMISS_KEY = 'kyra_resend_dismissed';

function ResendSetupBanner() {
  const [dismissed, setDismissed] = useState(true); // start hidden, check localStorage
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (dismissed) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = [
    {
      title: 'Get your free Resend API key',
      desc: (
        <>
          Go to <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">resend.com</a> → Sign up free → API Keys → Create API Key
        </>
      ),
      copyText: 'RESEND_API_KEY',
    },
    {
      title: 'Add it to Vercel',
      desc: (
        <>
          Open your <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Vercel dashboard</a> → kyra project → Settings → Environment Variables → Add New
          <span className="block mt-1.5 text-xs text-indigo-500">
            Name: <code className="bg-indigo-100 px-1 rounded">RESEND_API_KEY</code> · Value: (paste your key) · Click Save, then redeploy
          </span>
        </>
      ),
    },
    {
      title: 'Turn on reports here',
      desc: 'Use the toggle below to enable weekly reports for your agency. Reports fire every Monday at 9am.',
    },
  ];

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5 relative">
      <button
        onClick={() => { localStorage.setItem(DISMISS_KEY, '1'); setDismissed(true); }}
        className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="text-sm font-semibold text-indigo-800">📧 Activate Weekly Performance Reports</p>
      <p className="text-xs text-indigo-600 mt-0.5">
        Get an automated email every Monday with your agency&apos;s stats. Takes 2 minutes.
      </p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs font-medium text-indigo-700 hover:text-indigo-900 flex items-center gap-1 transition-colors"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        {expanded ? 'Hide steps' : 'Show me how →'}
      </button>

      {expanded && (
        <ol className="mt-4 space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 h-6 w-6 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <div className="text-xs text-indigo-700">
                <p className="font-semibold">{step.title}</p>
                <p className="mt-0.5 leading-relaxed">{step.desc}</p>
                {step.copyText && (
                  <button
                    onClick={() => handleCopy(step.copyText!)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded transition-colors"
                  >
                    {copied === step.copyText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === step.copyText ? 'Copied!' : `Copy: ${step.copyText}`}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function performanceScore(usage: number): { label: string; color: string } {
  if (usage > 20) return { label: 'Excellent', color: 'border-indigo-200 bg-indigo-50 text-indigo-700' };
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

  // Live analytics from client_conversations
  const [analytics, setAnalytics] = useState<{
    total: number;
    escalations: number;
    proactiveGreetings: number;
    daily: { date: string; count: number }[];
    byClient: { id: string; name: string; count: number; escalations: number }[];
    byChannel: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    fetch('/api/agency/analytics?days=7')
      .then(r => r.json())
      .then(d => { if (!d.error && !d.migrationRequired) setAnalytics(d); })
      .catch(() => {});
  }, []);

  const [weeklyEnabled, setWeeklyEnabled] = useState(!!agencySettings.weekly_report_enabled);
  const [reportEmail, setReportEmail] = useState((agencySettings.weekly_report_email as string) || '');
  const [savingReport, setSavingReport] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [sendingTestReport, setSendingTestReport] = useState(false);
  const [testReportResult, setTestReportResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSendTestReport = async () => {
    const emailToUse = reportEmail.trim();
    if (!emailToUse) {
      setTestReportResult({ ok: false, message: 'Enter a report email address first.' });
      return;
    }
    setSendingTestReport(true);
    setTestReportResult(null);
    try {
      const res = await fetch('/api/agency/performance/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });
      const json = await res.json();
      if (res.ok) {
        setTestReportResult({ ok: true, message: `Report sent to ${json.sentTo}!` });
      } else {
        const hint = json.hint ? ` ${json.hint}` : '';
        setTestReportResult({ ok: false, message: json.error + hint });
      }
    } catch {
      setTestReportResult({ ok: false, message: 'Network error — could not send report.' });
    }
    setSendingTestReport(false);
    setTimeout(() => setTestReportResult(null), 6000);
  };

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
    { label: 'Active This Month', value: activeThisMonth, icon: Activity, color: 'text-indigo-600 bg-indigo-50' },
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
      <ResendSetupBanner />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Performance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Weekly insights across all your AI workers
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            const rows = [
              ['Client', 'Status', 'Conversations', 'Response Rate'].join(','),
              ...clients.map(c =>
                [c.name, c.gateway_status || 'unknown', c.usage_this_month || 0, '—'].join(',')
              ),
            ];
            const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kyra-performance-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
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

      {/* ── Real Analytics from client_conversations ── */}
      {analytics && analytics.total > 0 && (
        <div className="mb-8 space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">{analytics.total}</p>
              <p className="text-xs text-gray-500 mt-1">Conversations (7d)</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${analytics.escalations > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className={`text-3xl font-bold ${analytics.escalations > 0 ? 'text-red-600' : 'text-gray-400'}`}>{analytics.escalations}</p>
              <p className={`text-xs mt-1 ${analytics.escalations > 0 ? 'text-red-500' : 'text-gray-500'}`}>🚨 Escalations</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${analytics.proactiveGreetings > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <p className={`text-3xl font-bold ${analytics.proactiveGreetings > 0 ? 'text-green-600' : 'text-gray-400'}`}>{analytics.proactiveGreetings}</p>
              <p className={`text-xs mt-1 ${analytics.proactiveGreetings > 0 ? 'text-green-500' : 'text-gray-500'}`}>👋 Proactive greetings</p>
            </div>
          </div>

          {/* Daily bar chart */}
          {analytics.daily.length > 0 && (() => {
            const maxCount = Math.max(...analytics.daily.map(d => d.count), 1);
            return (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Conversations — Last 7 Days</p>
                <div className="flex items-end gap-2 h-32">
                  {analytics.daily.map((d) => {
                    const pct = Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 2);
                    const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500 font-medium">{d.count > 0 ? d.count : ''}</span>
                        <div className="w-full rounded-t-md bg-indigo-500 transition-all" style={{ height: `${pct}%`, minHeight: '3px', opacity: d.count > 0 ? 1 : 0.2 }} />
                        <span className="text-[10px] text-gray-400">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Top clients */}
          {analytics.byClient.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Top Clients This Week</p>
              <div className="space-y-2">
                {analytics.byClient.slice(0, 5).map((c) => {
                  const maxC = analytics.byClient[0].count || 1;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-32 truncate">{c.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(c.count / maxC) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-6 text-right">{c.count}</span>
                      {c.escalations > 0 && <span className="text-[10px] text-red-500">🚨{c.escalations}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
            <div className="space-y-3">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendTestReport}
                  disabled={sendingTestReport || !reportEmail.trim()}
                  className="flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {sendingTestReport ? 'Sending…' : 'Send Test Report Now'}
                </Button>
              </div>
              {testReportResult && (
                <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
                  testReportResult.ok
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {testReportResult.ok ? '✅ ' : '❌ '}{testReportResult.message}
                </div>
              )}
              <p className="text-xs text-gray-400">
                Reports auto-send every Monday at 9:00 AM CET.
              </p>
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
            {/* Report header */}
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
