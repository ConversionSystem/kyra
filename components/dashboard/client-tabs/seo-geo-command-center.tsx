'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Globe, Shield, FileText, BarChart3, Loader2,
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Minus, RefreshCw, Play, MessageCircle, ExternalLink,
  ChevronDown, ChevronUp, BookOpen, Calendar, Clock, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgencyClient } from '@/lib/agency/queries';

// ── Types ────────────────────────────────────────────────────────────────────

interface GeoScore {
  query: string;
  provider: string;
  cited: boolean;
  position: number | null;
  date: string;
}

interface NapEntry {
  directory: string;
  status: 'match' | 'mismatch' | 'not_found';
  issues: string[];
  last_checked: string;
}

interface ContentEntry {
  title: string;
  platform: string;
  url: string | null;
  type: 'press_release' | 'web20' | 'semantic_stack';
  published_at: string;
}

interface SEOData {
  template: string;
  industry?: string;
  status: string;
  setup: Record<string, unknown>;
  geo_scores: GeoScore[];
  nap_status: NapEntry[];
  content_published: ContentEntry[];
  content_gaps: Array<Record<string, unknown>>;
  competitor_scores: Array<Record<string, unknown>>;
  publishing_platforms: string[];
  outreach_pipeline: Array<Record<string, unknown>>;
  reddit_queue: Array<Record<string, unknown>>;
  last_report: Record<string, unknown> | string | null;
  stats: {
    geo_score_current: number | null;
    geo_score_trend: 'up' | 'down' | 'stable' | null;
    content_count: number;
    nap_issues: number;
    pending_reviews: number;
    content_gaps_count: number;
    competitor_count: number;
  };
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

// ── Section Types ────────────────────────────────────────────────────────────

type MainSection = 'seo' | 'geo';
type SeoSubTab = 'overview' | 'keywords' | 'serp' | 'rankings' | 'growth';
type GeoSubTab = 'overview' | 'citations' | 'nap' | 'authority' | 'gaps';

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, subtitle, color, icon: Icon,
}: {
  label: string;
  value: string | undefined;
  subtitle?: string;
  color: 'blue' | 'indigo' | 'green' | 'amber' | 'red' | 'purple';
  icon: typeof Globe;
}) {
  const bg = {
    blue: 'bg-blue-50', indigo: 'bg-indigo-50', green: 'bg-emerald-50',
    amber: 'bg-amber-50', red: 'bg-red-50', purple: 'bg-purple-50',
  }[color];
  const iconColor = {
    blue: 'text-blue-600', indigo: 'text-indigo-600', green: 'text-emerald-600',
    amber: 'text-amber-600', red: 'text-red-600', purple: 'text-purple-600',
  }[color];

  return (
    <div className={`rounded-lg ${bg} p-4`}>
      <div className="flex items-center gap-2.5">
        <div className={`rounded-lg ${bg} p-2`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
          <p className="text-[11px] text-gray-500 truncate">{label}</p>
          {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

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
    <Card className="bg-white">
      <CardContent className="p-8 text-center">
        <div className="rounded-full bg-gray-50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
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

// ══════════════════════════════════════════════════════════════════════════════
// ── SEO Sub-tabs
// ══════════════════════════════════════════════════════════════════════════════

function SeoOverview({ client, hasDataForSEO }: { client: AgencyClient; hasDataForSEO: boolean | null }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="DataForSEO" value={hasDataForSEO ? 'Connected' : 'Not configured'} color={hasDataForSEO ? 'green' : 'amber'} icon={Search} />
        <StatCard label="Industry" value={client.industry || 'General'} color="blue" icon={BarChart3} />
        <StatCard label="Status" value="Active" color="green" icon={CheckCircle2} />
        <StatCard label="Plan" value="Agency" color="indigo" icon={TrendingUp} />
      </div>
      <Card className="bg-white">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            Use the <strong>Keywords</strong>, <strong>SERP</strong>, and <strong>Rankings</strong> sub-tabs to research keywords, analyze search results, and track your positions.
            {!hasDataForSEO && (
              <span className="block mt-2 text-amber-600 text-xs">
                DataForSEO is not configured. Keyword data will use AI-estimated values. Add your DataForSEO credentials in agency settings for real data.
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KeywordsSubTab({ clientId, client, hasDataForSEO }: { clientId: string; client: AgencyClient; hasDataForSEO: boolean | null }) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiEstimated, setAiEstimated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cfg = client.container_config || {};
  const businessName = (cfg.business_name as string) || client.name;
  const industry = (cfg.industry as string) || client.industry || '';

  const doResearch = useCallback(async () => {
    if (!seedKeyword.trim()) return;
    setLoading(true);
    setAiEstimated(false);

    if (hasDataForSEO) {
      try {
        const res = await fetch(`/api/agency/clients/${clientId}/seo/keywords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seed: seedKeyword, limit: 20 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.length) {
            setKeywords(data.data.map((k: Record<string, unknown>) => ({
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
    }

    // AI fallback
    try {
      const prompt = `Research SEO keywords for "${businessName}" in the ${industry || 'general'} industry. Seed keyword: "${seedKeyword}". Find 20 keywords with estimated difficulty and search volume.\n\nReturn ONLY a JSON array: [{"keyword":"...","volume":1200,"kd":45,"cpc":2.50}]`;
      const res = await fetch(`/api/agency/clients/${clientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, context: 'seo_research' }),
      });
      const data = await res.json();
      const text = data.response || data.message || '';
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        setKeywords(JSON.parse(match[0]));
        setAiEstimated(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [seedKeyword, hasDataForSEO, clientId, businessName, industry]);

  return (
    <div className="space-y-4">
      <Card className="bg-white">
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
            <Button onClick={doResearch} disabled={loading || !seedKeyword.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-2">Research</span>
            </Button>
          </div>
          {aiEstimated && (
            <p className="text-xs text-amber-600 mt-2">Values are AI-estimated. Connect DataForSEO for real data.</p>
          )}
        </CardContent>
      </Card>

      {keywords.length > 0 && (
        <Card className="bg-white">
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
                  {keywords.map((kw, i) => (
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
    </div>
  );
}

function SerpSubTab({ clientId }: { clientId: string }) {
  const [serpKeyword, setSerpKeyword] = useState('');
  const [results, setResults] = useState<SerpResult[]>([]);
  const [loading, setLoading] = useState(false);

  const doSerp = useCallback(async () => {
    if (!serpKeyword.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/serp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: serpKeyword }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [serpKeyword, clientId]);

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">SERP Analysis</p>
          <div className="flex gap-2">
            <input
              value={serpKeyword}
              onChange={e => setSerpKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSerp(); }}
              placeholder="Enter keyword to analyze SERP"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={doSerp} disabled={loading || !serpKeyword.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-2">Analyze</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="bg-white">
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

function RankingsSubTab({ clientId }: { clientId: string }) {
  const [domain, setDomain] = useState('');
  const [ranks, setRanks] = useState<RankResult[]>([]);
  const [loading, setLoading] = useState(false);

  const doRank = useCallback(async () => {
    if (!domain.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (res.ok) {
        const data = await res.json();
        setRanks(data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [domain, clientId]);

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Rank Tracking</p>
          <div className="flex gap-2">
            <input
              value={domain}
              onChange={e => setDomain(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doRank(); }}
              placeholder="Enter domain (e.g. yoursite.com)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={doRank} disabled={loading || !domain.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              <span className="ml-2">Track</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {ranks.length > 0 && (
        <Card className="bg-white">
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
                          {r.change > 0 ? `+${r.change}` : r.change === 0 ? '—' : r.change}
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

function GrowthSubTab() {
  return (
    <Card className="bg-white">
      <CardContent className="p-6 text-center">
        <div className="rounded-full bg-blue-50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Growth Insights</h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Growth recommendations will appear here as your SEO data accumulates. Continue running keyword research and tracking rankings to generate insights.
        </p>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── GEO Sub-tabs
// ══════════════════════════════════════════════════════════════════════════════

function GeoOverview({ data, onRunTask, running }: { data: SEOData; onRunTask: (task: string) => void; running: string | null }) {
  const { stats } = data;
  const TrendIcon = stats.geo_score_trend === 'up' ? TrendingUp
    : stats.geo_score_trend === 'down' ? TrendingDown
    : Minus;
  const trendColor = stats.geo_score_trend === 'up' ? 'text-emerald-600'
    : stats.geo_score_trend === 'down' ? 'text-red-600' : 'text-gray-400';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="GEO Citation Rate"
          value={stats.geo_score_current !== null ? `${stats.geo_score_current}%` : undefined}
          subtitle={stats.geo_score_trend ? `Trend: ${stats.geo_score_trend}` : undefined}
          color={stats.geo_score_current !== null && stats.geo_score_current >= 50 ? 'green' : 'indigo'}
          icon={Globe}
        />
        <StatCard
          label="Pages Published"
          value={String(stats.content_count)}
          color="blue"
          icon={FileText}
        />
        <StatCard
          label="NAP Issues"
          value={stats.nap_issues === 0 ? 'All clear' : String(stats.nap_issues)}
          color={stats.nap_issues === 0 ? 'green' : 'amber'}
          icon={Shield}
        />
        <StatCard
          label="Pending Reviews"
          value={String(stats.pending_reviews)}
          color="purple"
          icon={MessageCircle}
        />
      </div>

      {/* GEO Trend indicator */}
      {stats.geo_score_current !== null && (
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">
                GEO Score: {stats.geo_score_current}%
              </p>
              <p className="text-xs text-gray-500">
                {stats.geo_score_trend === 'up' ? 'Improving — AI assistants are citing you more often' :
                 stats.geo_score_trend === 'down' ? 'Declining — review content gaps below' :
                 'Stable — maintain your content publishing schedule'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Run Buttons */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Run tasks now</p>
              <p className="text-xs text-gray-500 mt-0.5">Kick off a GEO or NAP task immediately.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'geo_test', label: 'GEO Test', cls: 'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100' },
                { id: 'nap_audit', label: 'NAP Audit', cls: 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100' },
                { id: 'content_draft', label: 'Generate Content', cls: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' },
              ].map(t => (
                <Button key={t.id} size="sm" variant="outline" onClick={() => onRunTask(t.id)} disabled={!!running} className={t.cls}>
                  {running === t.id
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</>
                    : <><Play className="w-3.5 h-3.5 mr-1.5" />{t.label}</>}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CitationsSubTab({ data, clientId, onRunTask, running }: { data: SEOData; clientId: string; onRunTask: (task: string) => void; running: string | null }) {
  if (data.geo_scores.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="No GEO tests run yet"
        description="Test whether AI assistants like ChatGPT and Perplexity cite your business. Run your first test to get a GEO visibility score."
        actionLabel="Run First GEO Test"
        onAction={() => onRunTask('geo_test')}
        loading={running === 'geo_test'}
      />
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            AI Citation Results
          </CardTitle>
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
            {data.geo_scores.length} queries tracked
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
              {data.geo_scores.slice(0, 50).map((score, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{score.query}</td>
                  <td className="px-4 py-2 text-gray-500">{score.provider}</td>
                  <td className="px-4 py-2 text-center">
                    {score.cited
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                      : <span className="text-red-400 text-xs">✗</span>
                    }
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">
                    {new Date(score.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function NapSubTab({ data, clientId, onRunTask, running }: { data: SEOData; clientId: string; onRunTask: (task: string) => void; running: string | null }) {
  if (data.nap_status.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="NAP audit pending"
        description="Check if your business Name, Address, and Phone number are consistent across online directories."
        actionLabel="Run NAP Audit"
        onAction={() => onRunTask('nap_audit')}
        loading={running === 'nap_audit'}
      />
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            NAP Consistency Audit
          </CardTitle>
          <Badge className={`text-xs ${
            data.stats.nap_issues === 0
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {data.stats.nap_issues === 0 ? 'All consistent' : `${data.stats.nap_issues} issues`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-gray-100">
          {data.nap_status.map((entry, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {entry.status === 'match' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : entry.status === 'mismatch' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{entry.directory}</p>
                  {entry.issues.length > 0 && (
                    <p className="text-xs text-amber-600 mt-0.5">{entry.issues.join(', ')}</p>
                  )}
                </div>
              </div>
              <Badge className={`text-xs ${
                entry.status === 'match' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                entry.status === 'mismatch' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
                {entry.status === 'match' ? 'Match' : entry.status === 'mismatch' ? 'Mismatch' : 'Not found'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AuthoritySubTab({ data, clientId }: { data: SEOData; clientId: string }) {
  if (data.content_published.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No content published yet"
        description="Publish authority-building content across Web 2.0 platforms and semantic stacks to improve your AI citations."
        actionLabel="Publish First Article"
        onAction={async () => {
          await fetch(`/api/agency/clients/${clientId}/seo/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        }}
      />
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Published Content
          </CardTitle>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
            {data.content_published.length} articles
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-gray-100">
          {data.content_published.slice(0, 20).map((entry, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{entry.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {entry.platform} · {entry.type.replace(/_/g, ' ')} · {new Date(entry.published_at).toLocaleDateString()}
                </p>
              </div>
              {entry.url && (
                <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 shrink-0 ml-2">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GapsSubTab({ data }: { data: SEOData }) {
  if (data.content_gaps.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <div className="rounded-full bg-gray-50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No content gaps detected</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Content gaps appear when AI assistants fail to cite your business for relevant queries. Run a GEO test to discover gaps.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
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
          {data.content_gaps.slice(0, 15).map((gap, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{gap.query as string}</p>
                <p className="text-xs text-gray-400">{gap.gap_type as string} gap</p>
              </div>
              <Badge className={`text-xs shrink-0 ml-2 ${
                (gap.priority_score as number) >= 4
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                P{gap.priority_score as number}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Component
// ══════════════════════════════════════════════════════════════════════════════

interface SeoGeoCommandCenterProps {
  client: AgencyClient;
}

export default function SeoGeoCommandCenter({ client }: SeoGeoCommandCenterProps) {
  const clientId = client.id;
  const [mainSection, setMainSection] = useState<MainSection>('seo');
  const [seoSubTab, setSeoSubTab] = useState<SeoSubTab>('overview');
  const [geoSubTab, setGeoSubTab] = useState<GeoSubTab>('overview');

  // GEO data (from existing SEO endpoint)
  const [geoData, setGeoData] = useState<SEOData | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  // SEO/DataForSEO status
  const [hasDataForSEO, setHasDataForSEO] = useState<boolean | null>(null);

  const fetchGeoData = useCallback(async () => {
    setGeoLoading(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Failed (${res.status})`);
      }
      setGeoData(await res.json());
      setGeoError(null);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setGeoLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchGeoData(); }, [fetchGeoData]);

  useEffect(() => {
    fetch(`/api/agency/clients/${clientId}/seo/status`)
      .then(async r => {
        if (!r.ok) { setHasDataForSEO(false); return; }
        const data = await r.json();
        setHasDataForSEO(!!data.configured);
      })
      .catch(() => setHasDataForSEO(false));
  }, [clientId]);

  const runTask = async (task: string) => {
    setRunning(task);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      if (res.ok) {
        setTimeout(() => fetchGeoData(), 1500);
      }
    } catch { /* ignore */ }
    setRunning(null);
  };

  const seoSubTabs: { id: SeoSubTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'serp', label: 'SERP' },
    { id: 'rankings', label: 'Rankings' },
    { id: 'growth', label: 'Growth' },
  ];

  const geoSubTabs: { id: GeoSubTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'citations', label: 'AI Citations' },
    { id: 'nap', label: 'NAP Audit' },
    { id: 'authority', label: 'Authority' },
    { id: 'gaps', label: 'Content Gaps' },
  ];

  return (
    <div className="space-y-4">
      {/* Main Section Tabs: SEO | GEO */}
      <div className="flex gap-0 border-b border-gray-200">
        <button
          onClick={() => setMainSection('seo')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-3 transition-colors ${
            mainSection === 'seo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search className="w-4 h-4" />
          SEO
        </button>
        <button
          onClick={() => setMainSection('geo')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-3 transition-colors ${
            mainSection === 'geo'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          GEO
        </button>
      </div>

      {/* Sub-tab Pills */}
      {mainSection === 'seo' && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {seoSubTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setSeoSubTab(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  seoSubTab === t.id
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {seoSubTab === 'overview' && <SeoOverview client={client} hasDataForSEO={hasDataForSEO} />}
          {seoSubTab === 'keywords' && <KeywordsSubTab clientId={clientId} client={client} hasDataForSEO={hasDataForSEO} />}
          {seoSubTab === 'serp' && <SerpSubTab clientId={clientId} />}
          {seoSubTab === 'rankings' && <RankingsSubTab clientId={clientId} />}
          {seoSubTab === 'growth' && <GrowthSubTab />}
        </>
      )}

      {mainSection === 'geo' && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {geoSubTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setGeoSubTab(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  geoSubTab === t.id
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {geoLoading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading GEO data...
            </div>
          )}

          {geoError && (
            <div className="text-center py-16">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-flex flex-col items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <p className="text-amber-700 text-sm">{geoError}</p>
                <Button variant="outline" size="sm" onClick={fetchGeoData}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Retry
                </Button>
              </div>
            </div>
          )}

          {!geoLoading && !geoError && geoData && (
            <>
              {geoSubTab === 'overview' && <GeoOverview data={geoData} onRunTask={runTask} running={running} />}
              {geoSubTab === 'citations' && <CitationsSubTab data={geoData} clientId={clientId} onRunTask={runTask} running={running} />}
              {geoSubTab === 'nap' && <NapSubTab data={geoData} clientId={clientId} onRunTask={runTask} running={running} />}
              {geoSubTab === 'authority' && <AuthoritySubTab data={geoData} clientId={clientId} />}
              {geoSubTab === 'gaps' && <GapsSubTab data={geoData} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
