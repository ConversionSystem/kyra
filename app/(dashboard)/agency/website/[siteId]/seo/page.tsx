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
  ArrowUpRight,
  ExternalLink,
  Zap,
  Target,
} from 'lucide-react';

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
  const [growth, setGrowth] = useState<GrowthSuggestion[]>([]);
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
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {error || 'Failed to load SEO data'}
        </div>
      </div>
    );
  }

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/agency/website/${siteId}/editor`} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">SEO Command Center</h1>
            <p className="text-sm text-gray-400">Programmatic SEO + GEO optimization</p>
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

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'gsc' && <GSCTab data={data} />}
        {activeTab === 'geo' && <GEOTab data={data} />}
        {activeTab === 'nap' && <NAPTab data={data} />}
        {activeTab === 'keywords' && <KeywordsTab data={data} />}
        {activeTab === 'content' && <ContentTab data={data} />}
        {activeTab === 'growth' && <GrowthTab siteId={siteId} />}
        {activeTab === 'settings' && <SettingsTab data={data} siteId={siteId} />}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: SeoData }) {
  const { metrics, geo, nap } = data;

  return (
    <div className="space-y-6">
      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          label="GSC Clicks (28d)"
          value={metrics.total_clicks.toLocaleString()}
          subtitle={`${metrics.total_impressions.toLocaleString()} impressions`}
          color="blue"
        />
        <ScoreCard
          label="GEO Score"
          value={geo.score !== null ? `${geo.score}%` : '--'}
          subtitle={`${geo.cited}/${geo.total_queries} cited`}
          color={geo.score !== null && geo.score >= 50 ? 'green' : 'yellow'}
        />
        <ScoreCard
          label="NAP Health"
          value={nap.health !== null ? `${nap.health}%` : '--'}
          subtitle={`${nap.matches}/${nap.total} directories`}
          color={nap.health !== null && nap.health >= 80 ? 'green' : 'red'}
        />
        <ScoreCard
          label="Avg Position"
          value={metrics.avg_position > 0 ? metrics.avg_position.toFixed(1) : '--'}
          subtitle={`${metrics.page_count} pages tracked`}
          color={metrics.avg_position > 0 && metrics.avg_position <= 10 ? 'green' : 'yellow'}
        />
      </div>

      {/* Quick Wins */}
      {metrics.quick_wins.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Quick Wins (Position 11-30)
          </h3>
          <div className="space-y-2">
            {metrics.quick_wins.slice(0, 5).map((qw, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate max-w-[60%]">{qw.query}</span>
                <div className="flex items-center gap-4 text-gray-400">
                  <span>Pos {qw.position.toFixed(1)}</span>
                  <span>{qw.impressions} imp</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Gaps */}
      {data.content_gaps.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            Content Gaps (Not Cited by AI)
          </h3>
          <div className="space-y-2">
            {data.content_gaps.slice(0, 5).map((gap, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate max-w-[70%]">{gap.query}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  gap.priority_score >= 4 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  P{gap.priority_score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── GSC Tab ───────────────────────────────────────────────────────────────────

function GSCTab({ data }: { data: SeoData }) {
  const { metrics } = data;

  if (!data.gsc_connected) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-8 text-center">
        <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Connect Google Search Console</h3>
        <p className="text-gray-400 mb-4">Link your GSC account to see real search performance data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard label="Clicks" value={metrics.total_clicks.toLocaleString()} color="blue" />
        <ScoreCard label="Impressions" value={metrics.total_impressions.toLocaleString()} color="blue" />
        <ScoreCard label="CTR" value={`${(metrics.avg_ctr * 100).toFixed(1)}%`} color="blue" />
        <ScoreCard label="Avg Position" value={metrics.avg_position.toFixed(1)} color="blue" />
      </div>

      {/* Top Pages */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Top Pages (28 days)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left px-4 py-2">Page</th>
                <th className="text-right px-4 py-2">Clicks</th>
                <th className="text-right px-4 py-2">Impressions</th>
                <th className="text-right px-4 py-2">CTR</th>
                <th className="text-right px-4 py-2">Position</th>
              </tr>
            </thead>
            <tbody>
              {metrics.top_pages.map((page, i) => (
                <tr key={i} className="border-b border-gray-700/50 text-gray-300">
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
      </div>

      {/* Ranking Drops */}
      {metrics.ranking_drops.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-300 mb-3">Ranking Drops</h3>
          <div className="space-y-2">
            {metrics.ranking_drops.map((drop, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate max-w-[50%]">{drop.query}</span>
                <span className="text-red-400">
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

function GEOTab({ data }: { data: SeoData }) {
  const { geo } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <ScoreCard
          label="GEO Score"
          value={geo.score !== null ? `${geo.score}%` : '--'}
          subtitle="AI citation rate"
          color={geo.score !== null && geo.score >= 50 ? 'green' : 'yellow'}
        />
        <ScoreCard label="Cited" value={String(geo.cited)} subtitle={`of ${geo.total_queries} queries`} color="green" />
        <ScoreCard label="Not Cited" value={String(geo.total_queries - geo.cited)} subtitle="content gaps" color="red" />
      </div>

      {/* Results */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">GEO Test Results</h3>
        </div>
        <div className="divide-y divide-gray-700/50">
          {geo.results.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No GEO tests run yet. Tests run automatically on Mondays.
            </div>
          ) : (
            geo.results.slice(0, 25).map((result, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{result.query}</p>
                  <p className="text-xs text-gray-500">{result.provider}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  result.cited ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {result.cited ? 'Cited' : 'Not Cited'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── NAP Tab ───────────────────────────────────────────────────────────────────

function NAPTab({ data }: { data: SeoData }) {
  const { nap } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <ScoreCard
          label="NAP Health"
          value={nap.health !== null ? `${nap.health}%` : '--'}
          color={nap.health !== null && nap.health >= 80 ? 'green' : 'red'}
        />
        <ScoreCard label="Matching" value={String(nap.matches)} color="green" />
        <ScoreCard label="Issues" value={String(nap.total - nap.matches)} color="red" />
      </div>

      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Directory-by-Directory Status</h3>
        </div>
        <div className="divide-y divide-gray-700/50">
          {nap.audits.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No NAP audits run yet. Audits run automatically on Wednesdays.
            </div>
          ) : (
            nap.audits.map((audit, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">{audit.directory}</span>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  audit.status === 'match' ? 'bg-green-500/20 text-green-300' :
                  audit.status === 'mismatch' ? 'bg-red-500/20 text-red-300' :
                  audit.status === 'not_found' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {audit.status === 'match' ? 'Match' :
                   audit.status === 'mismatch' ? 'Mismatch' :
                   audit.status === 'not_found' ? 'Not Found' : 'Pending'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Keywords Tab ──────────────────────────────────────────────────────────────

function KeywordsTab({ data }: { data: SeoData }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Tracked Keywords</h3>
        </div>
        {data.keywords.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No keyword rankings tracked yet. Connect DataForSEO to start tracking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left px-4 py-2">Keyword</th>
                  <th className="text-right px-4 py-2">Position</th>
                  <th className="text-right px-4 py-2">URL</th>
                  <th className="text-right px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.keywords.slice(0, 50).map((kw, i) => (
                  <tr key={i} className="border-b border-gray-700/50 text-gray-300">
                    <td className="px-4 py-2">{kw.keyword}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={kw.position <= 10 ? 'text-green-400' : kw.position <= 30 ? 'text-yellow-400' : 'text-gray-400'}>
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
        )}
      </div>
    </div>
  );
}

// ── Content Tab ───────────────────────────────────────────────────────────────

function ContentTab({ data }: { data: SeoData }) {
  return (
    <div className="space-y-6">
      {/* Published Content */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Published Content</h3>
        </div>
        {data.published_content.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No content published yet. Content is auto-generated and published to authority platforms.
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {data.published_content.map((content, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{content.title}</p>
                  <p className="text-xs text-gray-500">
                    {content.platform} · {content.content_type} · {new Date(content.published_at).toLocaleDateString()}
                  </p>
                </div>
                {content.url && (
                  <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publish Queue */}
      {data.publish_queue.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">Publish Queue</h3>
          </div>
          <div className="divide-y divide-gray-700/50">
            {data.publish_queue.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.target_platform} · scheduled {new Date(item.scheduled_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Gaps */}
      {data.content_gaps.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">Content Gaps (GEO)</h3>
          </div>
          <div className="divide-y divide-gray-700/50">
            {data.content_gaps.map((gap, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-300 truncate max-w-[70%]">{gap.query}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  gap.priority_score >= 4 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  Priority {gap.priority_score}
                </span>
              </div>
            ))}
          </div>
        </div>
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

  return (
    <div className="space-y-4">
      {suggestions.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg p-8 text-center text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p>No growth suggestions yet. Connect GSC and run GEO tests to get data-driven recommendations.</p>
        </div>
      ) : (
        suggestions.map((suggestion, i) => (
          <div key={i} className={`bg-gray-800/50 rounded-lg p-4 border-l-4 ${
            suggestion.priority === 'high' ? 'border-red-500' :
            suggestion.priority === 'medium' ? 'border-yellow-500' :
            'border-gray-500'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    suggestion.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                    suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {suggestion.priority}
                  </span>
                  <span className="text-xs text-gray-500">{suggestion.type.replace(/_/g, ' ')}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{suggestion.title}</h3>
                <p className="text-sm text-gray-400">{suggestion.description}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ data, siteId }: { data: SeoData; siteId: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Integrations</h3>
        <div className="space-y-4">
          {/* GSC */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Google Search Console</p>
              <p className="text-xs text-gray-500">Track search performance and indexing</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              data.gsc_connected ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {data.gsc_connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {/* Industry Pack */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Industry Pack</p>
              <p className="text-xs text-gray-500">GEO queries, NAP directories, audience data</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              data.industry_pack_id ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
            }`}>
              {data.industry_pack_id ? data.industry : 'Not Configured'}
            </span>
          </div>

          {/* DataForSEO */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">DataForSEO</p>
              <p className="text-xs text-gray-500">Keyword research and ranking data</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400">
              System-wide
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Schedule</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong className="text-gray-300">Monday:</strong> GEO visibility tests</p>
          <p><strong className="text-gray-300">Wednesday:</strong> NAP consistency audits</p>
          <p><strong className="text-gray-300">Daily:</strong> GSC metric sync (5 AM UTC)</p>
          <p><strong className="text-gray-300">Hourly:</strong> Publish queue processing</p>
        </div>
      </div>
    </div>
  );
}

// ── Growth API Route (data-driven) ────────────────────────────────────────────
// The GrowthTab fetches from /api/agency/sites/[id]/seo/growth
// which we'll create separately.

// ── Shared Components ─────────────────────────────────────────────────────────

function ScoreCard({
  label,
  value,
  subtitle,
  color = 'blue',
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorMap = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    red: 'bg-red-500/10 border-red-500/20',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
