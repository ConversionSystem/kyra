'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart2,
  Globe,
  Shield,
  Search,
  FileText,
  TrendingUp,
  Settings,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Target,
  Play,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeoData {
  site_id: string;
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

type TabId = 'overview' | 'gsc' | 'geo' | 'nap' | 'keywords' | 'content' | 'growth' | 'settings';

// ── Main Component ────────────────────────────────────────────────────────────

export default function SeoCommandCenter() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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

  const tabs: Array<{ id: TabId; label: string; icon: typeof BarChart2 }> = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'gsc', label: 'GSC', icon: Search },
    { id: 'geo', label: 'GEO Score', icon: Globe },
    { id: 'nap', label: 'NAP Health', icon: Shield },
    { id: 'keywords', label: 'Keywords', icon: Target },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/agency/website/${siteId}/editor`} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Visibility &amp; Authority</h1>
            <p className="text-sm text-gray-500">GEO citation testing, NAP audits &amp; content authority stacking</p>
          </div>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync GSC'}
        </button>
      </div>

      {/* Cross-reference note */}
      <p className="text-xs text-gray-400">
        For keyword research &amp; rank tracking, see{' '}
        <Link href={`/agency/clients`} className="text-indigo-600 hover:underline">Marketing → SEO tab</Link>
      </p>

      {/* Tab Navigation — always visible */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
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
        {activeTab === 'overview' && <OverviewTab data={data} siteId={siteId} />}
        {activeTab === 'gsc' && <GSCTab data={data} />}
        {activeTab === 'geo' && <GEOTab data={data} siteId={siteId} />}
        {activeTab === 'nap' && <NAPTab data={data} siteId={siteId} />}
        {activeTab === 'keywords' && <KeywordsTab data={data} />}
        {activeTab === 'content' && <ContentTab data={data} />}
        {activeTab === 'growth' && <GrowthTab siteId={siteId} />}
        {activeTab === 'settings' && <SettingsTab data={data} siteId={siteId} />}
      </div>
    </div>
  );
}

// ── Empty State Component ────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  loading,
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

function OverviewTab({ data, siteId }: { data: SeoData; siteId: string }) {
  const { metrics, geo, nap } = data;
  const [runningGeo, setRunningGeo] = useState(false);

  const hasGeoData = geo.total_queries > 0;
  const hasNapData = nap.total > 0;
  const hasGsc = data.gsc_connected && metrics.total_clicks > 0;

  const runGeoTest = async () => {
    setRunningGeo(true);
    try {
      await fetch(`/api/agency/sites/${siteId}/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_geo' }),
      });
    } finally {
      setRunningGeo(false);
    }
  };

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

      {/* Onboarding CTAs when no data */}
      {!hasGeoData && (
        <EmptyState
          icon={Globe}
          title="No GEO tests run yet"
          description="Test whether AI assistants like ChatGPT and Perplexity cite your business. Run your first test to get a GEO visibility score."
          actionLabel="Run First GEO Test"
          onAction={runGeoTest}
          loading={runningGeo}
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

      {!hasNapData && (
        <EmptyState
          icon={Shield}
          title="NAP audit pending"
          description="Check if your business Name, Address, and Phone number are consistent across online directories."
          actionLabel="Run NAP Audit"
          onAction={async () => {
            await fetch(`/api/agency/sites/${siteId}/seo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'run_nap' }),
            });
          }}
        />
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
        onAction={() => {/* navigates via settings */}}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard label="Clicks" value={metrics.total_clicks.toLocaleString()} color="blue" icon={Search} />
        <ScoreCard label="Impressions" value={metrics.total_impressions.toLocaleString()} color="blue" icon={BarChart2} />
        <ScoreCard label="CTR" value={`${(metrics.avg_ctr * 100).toFixed(1)}%`} color="blue" icon={Target} />
        <ScoreCard label="Avg Position" value={metrics.avg_position.toFixed(1)} color="blue" icon={TrendingUp} />
      </div>

      {/* Top Pages */}
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

      {/* Ranking Drops */}
      {metrics.ranking_drops.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-3">Ranking Drops</h3>
          <div className="space-y-2">
            {metrics.ranking_drops.map((drop, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate max-w-[50%]">{drop.query}</span>
                <span className="text-red-600">
                  {drop.previous_position.toFixed(1)} → {drop.current_position.toFixed(1)} (↓{drop.drop.toFixed(1)})
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

function GEOTab({ data, siteId }: { data: SeoData; siteId: string }) {
  const { geo } = data;
  const [running, setRunning] = useState(false);

  if (geo.total_queries === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="No GEO tests run yet"
        description="Test whether AI assistants like ChatGPT and Perplexity cite your business when answering relevant queries."
        actionLabel="Run First GEO Test"
        onAction={async () => {
          setRunning(true);
          try {
            await fetch(`/api/agency/sites/${siteId}/seo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'run_geo' }),
            });
          } finally {
            setRunning(false);
          }
        }}
        loading={running}
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

      {/* Results */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">GEO Test Results</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {geo.results.slice(0, 25).map((result, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{result.query}</p>
                <p className="text-xs text-gray-500">{result.provider}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                result.cited ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {result.cited ? 'Cited' : 'Not Cited'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── NAP Tab ───────────────────────────────────────────────────────────────────

function NAPTab({ data, siteId }: { data: SeoData; siteId: string }) {
  const { nap } = data;
  const [running, setRunning] = useState(false);

  if (nap.total === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="NAP audit pending"
        description="Check if your business Name, Address, and Phone number are consistent across online directories like Google, Yelp, and Facebook."
        actionLabel="Run NAP Audit"
        onAction={async () => {
          setRunning(true);
          try {
            await fetch(`/api/agency/sites/${siteId}/seo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'run_nap' }),
            });
          } finally {
            setRunning(false);
          }
        }}
        loading={running}
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
        <ScoreCard label="Issues" value={String(nap.total - nap.matches)} color="red" icon={AlertCircle} />
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Directory-by-Directory Status</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {nap.audits.map((audit, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">{audit.directory}</span>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                audit.status === 'match' ? 'bg-emerald-100 text-emerald-700' :
                audit.status === 'mismatch' ? 'bg-red-100 text-red-700' :
                audit.status === 'not_found' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {audit.status === 'match' ? 'Match' :
                 audit.status === 'mismatch' ? 'Mismatch' :
                 audit.status === 'not_found' ? 'Not Found' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Keywords Tab ──────────────────────────────────────────────────────────────

function KeywordsTab({ data }: { data: SeoData }) {
  if (data.keywords.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No keyword rankings tracked yet</h3>
          <p className="text-sm text-gray-500">Connect DataForSEO or Google Search Console to start tracking keyword positions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
    </div>
  );
}

// ── Content Tab ───────────────────────────────────────────────────────────────

function ContentTab({ data }: { data: SeoData }) {
  if (data.published_content.length === 0 && data.publish_queue.length === 0 && data.content_gaps.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No content published yet</h3>
          <p className="text-sm text-gray-500">Content is auto-generated and published to authority platforms once GEO tests identify gaps.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Published Content */}
      {data.published_content.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Published Content</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.published_content.map((content, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{content.title}</p>
                  <p className="text-xs text-gray-500">
                    {content.platform} · {content.content_type} · {new Date(content.published_at).toLocaleDateString()}
                  </p>
                </div>
                {content.url && (
                  <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
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
                  <p className="text-xs text-gray-500">{item.target_platform} · scheduled {new Date(item.scheduled_at).toLocaleDateString()}</p>
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
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Content Gaps (GEO)</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.content_gaps.map((gap, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate max-w-[70%]">{gap.query}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  gap.priority_score >= 4 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  Priority {gap.priority_score}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Growth Tab ────────────────────────────────────────────────────────────────

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
          <p className="text-sm text-gray-500">Connect GSC and run GEO tests to get data-driven recommendations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
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

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ data, siteId }: { data: SeoData; siteId: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Integrations</h3>
          <div className="space-y-4">
            {/* GSC */}
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

            {/* Industry Pack */}
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

            {/* DataForSEO */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">DataForSEO</p>
                <p className="text-xs text-gray-500">Keyword research and ranking data</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                System-wide
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Schedule</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p><strong className="text-gray-700">Monday:</strong> GEO visibility tests</p>
            <p><strong className="text-gray-700">Wednesday:</strong> NAP consistency audits</p>
            <p><strong className="text-gray-700">Daily:</strong> GSC metric sync (5 AM UTC)</p>
            <p><strong className="text-gray-700">Hourly:</strong> Publish queue processing</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────

function ScoreCard({
  label,
  value,
  emptyText,
  subtitle,
  color = 'blue',
  icon: Icon,
}: {
  label: string;
  value?: string;
  emptyText?: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
  icon?: typeof BarChart2;
}) {
  const colorMap = {
    blue: 'bg-blue-50',
    green: 'bg-emerald-50',
    amber: 'bg-amber-50',
    red: 'bg-red-50',
  };

  const iconColorMap = {
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
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
