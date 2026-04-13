'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart2,
  Globe,
  Shield,
  Search,
  FileText,
  TrendingUp,
  TrendingDown,
  Settings,
  Loader2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Target,
  Play,
  Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeoData {
  site_id: string;
  client_id: string | null;
  industry: string;
  industry_pack_id: string | null;
  gsc_connected: boolean;
  metrics: {
    total_clicks: number;
    total_impressions: number;
    avg_ctr: number;
    avg_position: number;
    page_count: number;
    top_pages: Array<{ slug: string; clicks: number; impressions: number; ctr: number; position: number }>;
    quick_wins: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    ranking_drops: Array<{ query: string; previous_position: number; current_position: number; drop: number; impressions: number }>;
  };
  geo: {
    score: number | null;
    total_queries: number;
    cited: number;
    results: Array<{ provider: string; query: string; cited: boolean; citation_text: string | null; tested_at: string }>;
  };
  nap: {
    health: number | null;
    total: number;
    matches: number;
    audits: Array<{ directory: string; status: string; nap_found: Record<string, unknown>; issues: unknown[] }>;
  };
  content_gaps: Array<{ query: string; gap_type: string; priority_score: number }>;
  keywords: Array<{ keyword: string; position: number; url: string; date: string }>;
  published_content: Array<{ platform: string; url: string; title: string; content_type: string; published_at: string }>;
  publish_queue: Array<{ title: string; target_platform: string; status: string; scheduled_at: string }>;
}

interface GrowthSuggestion {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: Record<string, unknown>;
}

interface Keyword {
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
}

interface SerpResult {
  position: number;
  title: string;
  url: string;
  description: string;
}

interface RankResult {
  keyword: string;
  position: number;
  url: string;
  change: number;
}

type TabId = 'overview' | 'gsc' | 'geo' | 'nap' | 'keywords' | 'content' | 'growth' | 'settings';

// ── Shared inner component (used by both the page route and the client tab) ──

export default function SeoGeoCommandCenterInner({ siteId, embedded }: { siteId: string; embedded?: boolean }) {
  const initialTab: TabId = 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/seo`);
      if (!res.ok) throw new Error('Failed to load SEO data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/agency/sites/${siteId}/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_gsc' }),
      });
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  const runTask = async (task: string) => {
    setRunning(task);
    try {
      if (data?.client_id) {
        await fetch(`/api/agency/clients/${data.client_id}/seo/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task }),
        });
      } else {
        await fetch(`/api/agency/sites/${siteId}/seo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: `run_${task}` }),
        });
      }
      setTimeout(() => fetchData(), 2000);
    } catch { /* ignore */ }
    setRunning(null);
  };

  const tabs: Array<{ id: TabId; label: string; icon: typeof BarChart2 }> = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'gsc', label: 'GSC', icon: Search },
    { id: 'geo', label: 'GEO Score', icon: Globe },
    { id: 'nap', label: 'NAP Health', icon: Shield },
    { id: 'keywords', label: 'Keywords', icon: Target },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'growth', label: 'Growth', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {error || 'Failed to load SEO data'}
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-6' : 'p-4 sm:p-6 md:p-8 space-y-6'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!embedded && (
            <Link href={`/agency/website/${siteId}/editor`} className="text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">SEO/GEO Command Center</h1>
            <p className="text-sm text-gray-500">Search engine optimization, AI visibility testing, NAP audits &amp; content authority</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runTask('geo_test')}
            disabled={!!running}
            className="flex items-center gap-2 px-3 py-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm disabled:opacity-50"
          >
            {running === 'geo_test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            GEO Test
          </button>
          <button
            onClick={() => runTask('nap_audit')}
            disabled={!!running}
            className="flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm disabled:opacity-50"
          >
            {running === 'nap_audit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            NAP Audit
          </button>
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab data={data} siteId={siteId} onRunTask={runTask} running={running} />}
        {activeTab === 'gsc' && <GSCTab data={data} />}
        {activeTab === 'geo' && <GEOTab data={data} siteId={siteId} onRunTask={runTask} running={running} />}
        {activeTab === 'nap' && <NAPTab data={data} siteId={siteId} onRunTask={runTask} running={running} />}
        {activeTab === 'keywords' && <KeywordsTab data={data} clientId={data.client_id} />}
        {activeTab === 'content' && <ContentTab data={data} clientId={data.client_id} />}
        {activeTab === 'growth' && <GrowthTab siteId={siteId} />}
        {activeTab === 'settings' && <SettingsTab data={data} siteId={siteId} />}
      </div>
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────

function ScoreCard({
  label, value, emptyText, subtitle, color = 'blue', icon: Icon,
}: {
  label: string;
  value?: string;
  emptyText?: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'indigo';
  icon?: typeof BarChart2;
}) {
  const colorMap = {
    blue: 'bg-blue-50', green: 'bg-emerald-50', amber: 'bg-amber-50', red: 'bg-red-50', indigo: 'bg-indigo-50',
  };
  const iconColorMap = {
    blue: 'text-blue-600', green: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600', indigo: 'text-indigo-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`rounded-lg ${colorMap[color]} p-2`}>
              <Icon className={`h-4 w-4 ${iconColorMap[color]}`} />
            </div>
          )}
          <div>
            <p className="text-xl font-bold text-gray-900">{value || emptyText || '--'}</p>
            <p className="text-[11px] text-gray-400">{subtitle || label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon, title, description, actionLabel, onAction, loading,
}: {
  icon: typeof Globe;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
        <button
          onClick={onAction}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {actionLabel}
        </button>
      </CardContent>
    </Card>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data, siteId, onRunTask, running }: { data: SeoData; siteId: string; onRunTask: (task: string) => void; running: string | null }) {
  const { metrics, geo, nap } = data;
  const hasGeoData = geo.total_queries > 0;
  const hasNapData = nap.total > 0;
  const hasGsc = data.gsc_connected && metrics.total_clicks > 0;

  const geoTrend = geo.score !== null && geo.score >= 50 ? 'up' : geo.score !== null ? 'down' : null;
  const TrendIcon = geoTrend === 'up' ? TrendingUp : geoTrend === 'down' ? TrendingDown : Minus;
  const trendColor = geoTrend === 'up' ? 'text-emerald-600' : geoTrend === 'down' ? 'text-red-600' : 'text-gray-400';

  return (
    <div className="space-y-6">
      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          label="GSC Clicks (28d)"
          value={hasGsc ? metrics.total_clicks.toLocaleString() : undefined}
          emptyText="GSC not connected"
          subtitle={hasGsc ? `${metrics.total_impressions.toLocaleString()} impressions` : undefined}
          color="blue"
          icon={Search}
        />
        <ScoreCard
          label="GEO Score"
          value={hasGeoData && geo.score !== null ? `${geo.score}%` : undefined}
          emptyText="No tests run yet"
          subtitle={hasGeoData ? `${geo.cited}/${geo.total_queries} cited` : undefined}
          color={geo.score !== null && geo.score >= 50 ? 'green' : 'amber'}
          icon={Globe}
        />
        <ScoreCard
          label="NAP Health"
          value={hasNapData && nap.health !== null ? `${nap.health}%` : undefined}
          emptyText="Audit pending"
          subtitle={hasNapData ? `${nap.matches}/${nap.total} directories` : undefined}
          color={nap.health !== null && nap.health >= 80 ? 'green' : 'red'}
          icon={Shield}
        />
        <ScoreCard
          label="Avg Position"
          value={hasGsc && metrics.avg_position > 0 ? metrics.avg_position.toFixed(1) : undefined}
          emptyText="No data yet"
          subtitle={hasGsc ? `${metrics.page_count} pages tracked` : undefined}
          color={metrics.avg_position > 0 && metrics.avg_position <= 10 ? 'green' : 'amber'}
          icon={Target}
        />
      </div>

      {/* GEO Trend */}
      {hasGeoData && geo.score !== null && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">GEO Score: {geo.score}%</p>
              <p className="text-xs text-gray-500">
                {geoTrend === 'up' ? 'AI assistants are citing your business' :
                 geoTrend === 'down' ? 'Declining — review content gaps below' :
                 'Maintain your content publishing schedule'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Tasks */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Run tasks now</p>
              <p className="text-xs text-gray-500 mt-0.5">Kick off a GEO test, NAP audit, or content generation immediately.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'geo_test', label: 'GEO Test', cls: 'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100' },
                { id: 'nap_audit', label: 'NAP Audit', cls: 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100' },
                { id: 'content_draft', label: 'Generate Content', cls: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' },
              ].map(t => (
                <Button key={t.id} size="sm" variant="outline" onClick={() => onRunTask(t.id)} disabled={!!running} className={t.cls}>
                  {running === t.id
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running...</>
                    : <><Play className="w-3.5 h-3.5 mr-1.5" />{t.label}</>}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding CTAs when no data */}
      {!hasGeoData && (
        <EmptyState
          icon={Globe}
          title="No GEO tests run yet"
          description="Test whether AI assistants like ChatGPT and Perplexity cite your business. Run your first test to get a GEO visibility score."
          actionLabel="Run First GEO Test"
          onAction={() => onRunTask('geo_test')}
          loading={running === 'geo_test'}
        />
      )}

      {!data.gsc_connected && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="rounded-full bg-blue-50 w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">GSC not connected</h3>
            <p className="text-xs text-gray-500 mb-4">Connect Google Search Console to see real search performance data.</p>
            <Link
              href={`/agency/website/${siteId}/settings`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
            >
              Connect Google Search Console
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Wins */}
      {metrics.quick_wins.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Quick Wins (Position 11-30)
            </h3>
            <div className="space-y-2">
              {metrics.quick_wins.slice(0, 5).map((qw, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[60%]">{qw.query}</span>
                  <div className="flex items-center gap-4 text-gray-500">
                    <span>Pos {qw.position.toFixed(1)}</span>
                    <span>{qw.impressions} imp</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Gaps */}
      {data.content_gaps.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Content Gaps (Not Cited by AI)
            </h3>
            <div className="space-y-2">
              {data.content_gaps.slice(0, 5).map((gap, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[70%]">{gap.query}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    gap.priority_score >= 4 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    P{gap.priority_score}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── GSC Tab ───────────────────────────────────────────────────────────────────

function GSCTab({ data }: { data: SeoData }) {
  const { metrics } = data;

  if (!data.gsc_connected) {
    return (
      <EmptyState
        icon={Search}
        title="Connect Google Search Console"
        description="Link your GSC account to see real search performance data — clicks, impressions, CTR, and keyword positions."
        actionLabel="Connect Google Search Console"
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard label="Clicks" value={metrics.total_clicks.toLocaleString()} color="blue" icon={Search} />
        <ScoreCard label="Impressions" value={metrics.total_impressions.toLocaleString()} color="blue" icon={BarChart2} />
        <ScoreCard label="CTR" value={`${(metrics.avg_ctr * 100).toFixed(1)}%`} color="blue" icon={Target} />
        <ScoreCard label="Avg Position" value={metrics.avg_position.toFixed(1)} color="blue" icon={TrendingUp} />
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Top Pages (28 days)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left px-4 py-2">Page</th>
                <th className="text-right px-4 py-2">Clicks</th>
                <th className="text-right px-4 py-2">Impressions</th>
                <th className="text-right px-4 py-2">CTR</th>
                <th className="text-right px-4 py-2">Position</th>
              </tr>
            </thead>
            <tbody>
              {metrics.top_pages.map((page, i) => (
                <tr key={i} className="border-b border-gray-100 text-gray-700">
                  <td className="px-4 py-2 max-w-[200px] truncate">{page.slug}</td>
                  <td className="px-4 py-2 text-right">{page.clicks}</td>
                  <td className="px-4 py-2 text-right">{page.impressions}</td>
                  <td className="px-4 py-2 text-right">{(page.ctr * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right">{page.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {metrics.ranking_drops.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-3">Ranking Drops</h3>
          <div className="space-y-2">
            {metrics.ranking_drops.map((drop, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate max-w-[50%]">{drop.query}</span>
                <span className="text-red-600">
                  {drop.previous_position.toFixed(1)} &rarr; {drop.current_position.toFixed(1)} (&darr;{drop.drop.toFixed(1)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── GEO Tab ───────────────────────────────────────────────────────────────────

function GEOTab({ data, siteId, onRunTask, running }: { data: SeoData; siteId: string; onRunTask: (task: string) => void; running: string | null }) {
  const { geo } = data;

  if (geo.total_queries === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="No GEO tests run yet"
        description="Test whether AI assistants like ChatGPT and Perplexity cite your business when answering relevant queries."
        actionLabel="Run First GEO Test"
        onAction={() => onRunTask('geo_test')}
        loading={running === 'geo_test'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <ScoreCard
          label="GEO Score"
          value={geo.score !== null ? `${geo.score}%` : undefined}
          emptyText="Pending"
          subtitle="AI citation rate"
          color={geo.score !== null && geo.score >= 50 ? 'green' : 'amber'}
          icon={Globe}
        />
        <ScoreCard label="Cited" value={String(geo.cited)} subtitle={`of ${geo.total_queries} queries`} color="green" icon={CheckCircle2} />
        <ScoreCard label="Not Cited" value={String(geo.total_queries - geo.cited)} subtitle="content gaps" color="red" icon={AlertCircle} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              AI Citation Results
            </CardTitle>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
              {geo.results.length} queries tracked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-80 overflow-y-auto rounded-md border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Query</th>
                  <th className="text-left px-4 py-2 font-medium">Provider</th>
                  <th className="text-center px-4 py-2 font-medium">Cited?</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {geo.results.slice(0, 50).map((result, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-900">{result.query}</td>
                    <td className="px-4 py-2 text-gray-500">{result.provider}</td>
                    <td className="px-4 py-2 text-center">
                      {result.cited
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                        : <span className="text-red-400 text-xs">&#10007;</span>
                      }
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {new Date(result.tested_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── NAP Tab ───────────────────────────────────────────────────────────────────

function NAPTab({ data, siteId, onRunTask, running }: { data: SeoData; siteId: string; onRunTask: (task: string) => void; running: string | null }) {
  const { nap } = data;

  if (nap.total === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="NAP audit pending"
        description="Check if your business Name, Address, and Phone number are consistent across online directories like Google, Yelp, and Facebook."
        actionLabel="Run NAP Audit"
        onAction={() => onRunTask('nap_audit')}
        loading={running === 'nap_audit'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <ScoreCard
          label="NAP Health"
          value={nap.health !== null ? `${nap.health}%` : undefined}
          emptyText="Pending"
          color={nap.health !== null && nap.health >= 80 ? 'green' : 'red'}
          icon={Shield}
        />
        <ScoreCard label="Matching" value={String(nap.matches)} color="green" icon={CheckCircle2} />
        <ScoreCard label="Issues" value={String(nap.total - nap.matches)} color="red" icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Directory-by-Directory Status
            </CardTitle>
            <Badge className={`text-xs ${
              (nap.total - nap.matches) === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {(nap.total - nap.matches) === 0 ? 'All consistent' : `${nap.total - nap.matches} issues`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-gray-100">
            {nap.audits.map((audit, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {audit.status === 'match' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : audit.status === 'mismatch' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Minus className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{audit.directory}</p>
                    {Array.isArray(audit.issues) && audit.issues.length > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">{audit.issues.join(', ')}</p>
                    )}
                  </div>
                </div>
                <Badge className={`text-xs ${
                  audit.status === 'match' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  audit.status === 'mismatch' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {audit.status === 'match' ? 'Match' : audit.status === 'mismatch' ? 'Mismatch' : 'Not found'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Keywords Tab (merged: tracked rankings + research) ───────────────────────

function KeywordsTab({ data, clientId }: { data: SeoData; clientId: string | null }) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [researchResults, setResearchResults] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiEstimated, setAiEstimated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doResearch = useCallback(async () => {
    if (!seedKeyword.trim() || !clientId) return;
    setLoading(true);
    setAiEstimated(false);

    // Try DataForSEO first
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: seedKeyword, limit: 20 }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.length) {
          setResearchResults(json.data.map((k: Record<string, unknown>) => ({
            keyword: String(k.keyword),
            volume: Number(k.search_volume || k.volume || 0),
            kd: Number(k.keyword_difficulty || k.kd || 0),
            cpc: Number(k.cpc || 0),
          })));
          setLoading(false);
          return;
        }
      }
    } catch { /* fall through to AI */ }

    // AI fallback
    try {
      const prompt = `Research SEO keywords related to "${seedKeyword}". Find 20 keywords with estimated difficulty and search volume.\n\nReturn ONLY a JSON array: [{"keyword":"...","volume":1200,"kd":45,"cpc":2.50}]`;
      const res = await fetch(`/api/agency/clients/${clientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, context: 'seo_research' }),
      });
      const json = await res.json();
      const text = json.response || json.message || '';
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        setResearchResults(JSON.parse(match[0]));
        setAiEstimated(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [seedKeyword, clientId]);

  return (
    <div className="space-y-6">
      {/* Keyword Research */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Keyword Research</p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={seedKeyword}
              onChange={e => setSeedKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doResearch(); }}
              placeholder="Enter a seed keyword (e.g. dental implants NYC)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={doResearch} disabled={loading || !seedKeyword.trim() || !clientId} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-2">Research</span>
            </Button>
          </div>
          {aiEstimated && (
            <p className="text-xs text-amber-600 mt-2">Values are AI-estimated. Connect DataForSEO for real data.</p>
          )}
          {!clientId && (
            <p className="text-xs text-amber-600 mt-2">No client linked to this site. Keyword research requires a client connection.</p>
          )}
        </CardContent>
      </Card>

      {/* Research Results */}
      {researchResults.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Keyword</th>
                    <th className="text-right px-4 py-2 font-medium">Volume</th>
                    <th className="text-right px-4 py-2 font-medium">KD</th>
                    <th className="text-right px-4 py-2 font-medium">CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {researchResults.map((kw, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-900">{kw.keyword}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{kw.volume.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          kw.kd < 30 ? 'bg-emerald-50 text-emerald-700' :
                          kw.kd < 60 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>{kw.kd}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">${kw.cpc.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracked Keywords (from seo_keyword_rankings) */}
      {data.keywords.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Tracked Keywords</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left px-4 py-2">Keyword</th>
                  <th className="text-right px-4 py-2">Position</th>
                  <th className="text-right px-4 py-2">URL</th>
                  <th className="text-right px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.keywords.slice(0, 50).map((kw, i) => (
                  <tr key={i} className="border-b border-gray-100 text-gray-700">
                    <td className="px-4 py-2">{kw.keyword}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={kw.position <= 10 ? 'text-emerald-600' : kw.position <= 30 ? 'text-amber-600' : 'text-gray-500'}>
                        {kw.position?.toFixed(1) || '--'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 max-w-[150px] truncate">{kw.url || '--'}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{kw.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data.keywords.length === 0 && researchResults.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No keyword rankings tracked yet</h3>
            <p className="text-sm text-gray-500">Use the keyword research tool above or connect DataForSEO to start tracking positions.</p>
          </CardContent>
        </Card>
      )}

      {/* SERP Analysis */}
      <SERPInline clientId={clientId} />

      {/* Rank Tracking */}
      <RankingsInline clientId={clientId} />
    </div>
  );
}

// ── SERP Inline ──────────────────────────────────────────────────────────────

function SERPInline({ clientId }: { clientId: string | null }) {
  const [serpKeyword, setSerpKeyword] = useState('');
  const [results, setResults] = useState<SerpResult[]>([]);
  const [loading, setLoading] = useState(false);

  const doSerp = useCallback(async () => {
    if (!serpKeyword.trim() || !clientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/serp?keyword=${encodeURIComponent(serpKeyword)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [serpKeyword, clientId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-gray-900 mb-1">SERP Analysis</p>
          <p className="text-xs text-gray-500 mb-3">See the top Google results for any keyword to understand what content format wins.</p>
          <div className="flex gap-2">
            <input
              value={serpKeyword}
              onChange={e => setSerpKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSerp(); }}
              placeholder="Enter keyword to analyze SERP"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={doSerp} disabled={loading || !serpKeyword.trim() || !clientId} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-2">Analyze</span>
            </Button>
          </div>
          {!clientId && (
            <p className="text-xs text-amber-600 mt-2">No client linked to this site. SERP analysis requires a client connection.</p>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {results.map((r, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-gray-400 mt-1 w-6 text-right shrink-0">#{r.position}</span>
                    <div className="flex-1 min-w-0">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block">
                        {r.title}
                      </a>
                      <p className="text-xs text-gray-400 truncate">{r.url}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Rankings Inline ──────────────────────────────────────────────────────────

function RankingsInline({ clientId }: { clientId: string | null }) {
  const [domain, setDomain] = useState('');
  const [ranks, setRanks] = useState<RankResult[]>([]);
  const [loading, setLoading] = useState(false);

  const doRank = useCallback(async () => {
    if (!domain.trim() || !clientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/rank?domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        setRanks(data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [domain, clientId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-gray-900 mb-1">Rank Tracking</p>
          <p className="text-xs text-gray-500 mb-3">Enter your domain to see which keywords you rank for and your current positions.</p>
          <div className="flex gap-2">
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doRank(); }}
              placeholder="Enter domain (e.g. yoursite.com)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={doRank} disabled={loading || !domain.trim() || !clientId} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              <span className="ml-2">Track</span>
            </Button>
          </div>
          {!clientId && (
            <p className="text-xs text-amber-600 mt-2">No client linked to this site. Rank tracking requires a client connection.</p>
          )}
        </CardContent>
      </Card>

      {ranks.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Keyword</th>
                    <th className="text-right px-4 py-2 font-medium">Position</th>
                    <th className="text-right px-4 py-2 font-medium">Change</th>
                    <th className="text-left px-4 py-2 font-medium">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {ranks.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-900">{r.keyword}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{r.position}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs font-medium ${r.change > 0 ? 'text-emerald-600' : r.change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {r.change > 0 ? `+${r.change}` : r.change === 0 ? '--' : r.change}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-[200px]">{r.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Content Tab ──────────────────────────────────────────────────────────────

function ContentTab({ data, clientId }: { data: SeoData; clientId: string | null }) {
  if (data.published_content.length === 0 && data.publish_queue.length === 0 && data.content_gaps.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No content published yet"
        description="Content is auto-generated and published to authority platforms (Telegraph, WordPress, Blogger, Notion, Google Docs) once GEO tests identify gaps."
        actionLabel="Generate Content Now"
        onAction={async () => {
          if (!clientId) return;
          await fetch(`/api/agency/clients/${clientId}/seo/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: 'content_draft' }),
          });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Published Content */}
      {data.published_content.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Published Content
              </CardTitle>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                {data.published_content.length} articles
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-gray-100">
              {data.published_content.map((content, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{content.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {content.platform} &middot; {content.content_type.replace(/_/g, ' ')} &middot; {new Date(content.published_at).toLocaleDateString()}
                    </p>
                  </div>
                  {content.url && (
                    <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 shrink-0 ml-2">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Publish Queue */}
      {data.publish_queue.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Publish Queue</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.publish_queue.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.target_platform} &middot; scheduled {new Date(item.scheduled_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">{item.status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Content Gaps */}
      {data.content_gaps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Content Gaps
              </CardTitle>
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                {data.content_gaps.length} gaps found
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-gray-100">
              {data.content_gaps.map((gap, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{gap.query}</p>
                    <p className="text-xs text-gray-400">{gap.gap_type} gap</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ml-2 ${
                    gap.priority_score >= 4
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    P{gap.priority_score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Growth Tab ───────────────────────────────────────────────────────────────

function GrowthTab({ siteId }: { siteId: string }) {
  const [suggestions, setSuggestions] = useState<GrowthSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agency/sites/${siteId}/seo/growth`)
      .then(r => r.json())
      .then(data => setSuggestions(data.suggestions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No growth suggestions yet</h3>
          <p className="text-sm text-gray-500">Connect GSC and run GEO tests to get data-driven recommendations for new pages, city expansion, and service optimization.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Data-driven growth suggestions based on GSC metrics, GEO test gaps, and NAP audit results.</p>
      {suggestions.map((suggestion, i) => (
        <Card key={i} className={`border-l-4 ${
          suggestion.priority === 'high' ? 'border-l-red-500' :
          suggestion.priority === 'medium' ? 'border-l-amber-500' :
          'border-l-gray-300'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                    suggestion.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {suggestion.priority}
                  </span>
                  <span className="text-xs text-gray-500">{suggestion.type.replace(/_/g, ' ')}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{suggestion.title}</h3>
                <p className="text-sm text-gray-500">{suggestion.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ data, siteId }: { data: SeoData; siteId: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Integrations</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Google Search Console</p>
                <p className="text-xs text-gray-500">Track search performance and indexing</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                data.gsc_connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {data.gsc_connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Industry Pack</p>
                <p className="text-xs text-gray-500">GEO queries, NAP directories, audience data</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                data.industry_pack_id ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {data.industry_pack_id ? data.industry : 'Not Configured'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">DataForSEO</p>
                <p className="text-xs text-gray-500">Keyword research and ranking data</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">System-wide</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Automated Schedule</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p><strong className="text-gray-700">Monday:</strong> GEO visibility tests</p>
            <p><strong className="text-gray-700">Tuesday &amp; Thursday:</strong> Content creation</p>
            <p><strong className="text-gray-700">Wednesday:</strong> NAP consistency audits</p>
            <p><strong className="text-gray-700">Friday:</strong> Weekly SEO report</p>
            <p><strong className="text-gray-700">Daily:</strong> GSC metric sync (5 AM UTC)</p>
            <p><strong className="text-gray-700">Hourly:</strong> Publish queue processing</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Getting Started</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${data.gsc_connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>1</div>
              <p>Connect Google Search Console to track real search performance data.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${data.geo.total_queries > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>2</div>
              <p>Run your first GEO test to measure AI citation visibility.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${data.nap.total > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>3</div>
              <p>Run a NAP audit to check directory consistency.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${data.published_content.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>4</div>
              <p>Publish authority content across Web 2.0 platforms to close content gaps.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
