'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  TrendingUp,
  Search,
  Loader2,
  Sparkles,
  BarChart2,
  ArrowUpRight,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  Edit3,
  Settings,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteData {
  id: string;
  business_name: string;
  industry: string;
  site_subdomain: string | null;
  site_domain: string | null;
  search_console_connected: boolean;
  growth_suggestions: GrowthSuggestion[] | null;
  growth_last_analyzed: string | null;
  page_count: number;
}

interface GrowthSuggestion {
  type: 'new_page' | 'improve_page' | 'new_city' | 'new_service';
  title: string;
  description: string;
  estimatedVolume?: number;
  slug?: string;
  priority: 'high' | 'medium' | 'low';
  implemented?: boolean;
}

interface DeployRecord {
  id: string;
  triggered_by: string;
  status: string;
  pages_deployed: number;
  deployed_at: string;
  notes: string | null;
}

// ── Suggestion Card ───────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onImplement,
  implementing,
}: {
  suggestion: GrowthSuggestion;
  onImplement: (s: GrowthSuggestion) => void;
  implementing: boolean;
}) {
  const priorityColors = {
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-gray-50 border-gray-200 text-gray-600',
  };

  const typeIcons = {
    new_page: <Plus className="h-4 w-4" />,
    improve_page: <TrendingUp className="h-4 w-4" />,
    new_city: <Globe className="h-4 w-4" />,
    new_service: <Sparkles className="h-4 w-4" />,
  };

  const typeLabels = {
    new_page: 'New Page',
    improve_page: 'Improve',
    new_city: 'New City',
    new_service: 'New Service',
  };

  if (suggestion.implemented) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">{suggestion.title}</p>
          <p className="text-xs text-green-600">Implemented ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${priorityColors[suggestion.priority]}`}>
              {typeIcons[suggestion.type]}
              {typeLabels[suggestion.type]}
            </span>
            {suggestion.estimatedVolume && (
              <span className="text-xs text-gray-400">
                ~{suggestion.estimatedVolume.toLocaleString()} searches/mo
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900">{suggestion.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{suggestion.description}</p>
        </div>
        <button
          onClick={() => onImplement(suggestion)}
          disabled={implementing}
          className="shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
        >
          {implementing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Build It
        </button>
      </div>
    </div>
  );
}

// ── Deploy History ────────────────────────────────────────────────────────────

function DeployHistory({ siteId }: { siteId: string }) {
  const [deploys, setDeploys] = useState<DeployRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agency/sites/${siteId}/deploys`)
      .then((r) => r.json())
      .then((result) => {
        if (Array.isArray(result.data)) setDeploys(result.data);
      })
      .catch((err) => console.error('[growth] load deploys:', err))
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" />;

  if (deploys.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">No deploys yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {deploys.map((d) => (
        <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
          <div className="flex items-center gap-2">
            {d.status === 'success' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className="text-gray-700 capitalize">{d.triggered_by}</span>
            {d.pages_deployed > 0 && (
              <span className="text-gray-400 text-xs">({d.pages_deployed} pages)</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Clock className="h-3 w-3" />
            {new Date(d.deployed_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GrowthEngine() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [implementing, setImplementing] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GrowthSuggestion[]>([]);

  const fetchSite = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/sites/${siteId}`);
      if (res.ok) {
        const result = await res.json();
        const s = result.data as SiteData;
        setSite(s);
        if (s.growth_suggestions) setSuggestions(s.growth_suggestions);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchSite(); }, [fetchSite]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      // Generate AI-powered suggestions based on site data
      const res = await fetch(`/api/agency/sites/${siteId}/growth`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        if (Array.isArray(result.data?.suggestions)) {
          setSuggestions(result.data.suggestions);
        }
        await fetchSite();
      }
    } catch {
      // ignore
    } finally {
      setAnalyzing(false);
    }
  };

  const implementSuggestion = async (suggestion: GrowthSuggestion) => {
    setImplementing(suggestion.slug || suggestion.title);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/growth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion }),
      });
      if (res.ok) {
        setSuggestions((prev) =>
          prev.map((s) =>
            s.slug === suggestion.slug && s.title === suggestion.title
              ? { ...s, implemented: true }
              : s
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setImplementing(null);
    }
  };

  const siteUrl = site?.site_subdomain
    ? `https://${site.site_subdomain}`
    : site?.site_domain
      ? `https://${site.site_domain}`
      : null;

  const highPriority = suggestions.filter((s) => s.priority === 'high' && !s.implemented);
  const mediumPriority = suggestions.filter((s) => s.priority === 'medium' && !s.implemented);
  const lowPriority = suggestions.filter((s) => s.priority === 'low' && !s.implemented);
  const implemented = suggestions.filter((s) => s.implemented);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/agency/website" className="text-gray-500 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                {site?.business_name || 'Growth Engine'}
              </h1>
              <p className="text-xs text-gray-400">AI-powered SEO suggestions</p>
            </div>
          </div>
          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ExternalLink className="h-3 w-3" />
              View Site
            </a>
          )}
        </div>
        {/* Sub-navigation tabs */}
        <div className="flex border-t border-gray-100 px-4">
          {[
            { href: `/agency/website/${siteId}/editor`, icon: <Edit3 className="h-3.5 w-3.5" />, label: 'Editor', active: false },
            { href: `/agency/website/${siteId}/growth`, icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Growth', active: true },
            { href: `/agency/website/${siteId}/settings`, icon: <Settings className="h-3.5 w-3.5" />, label: 'Settings', active: false },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab.active
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Suggestions */}
          <div className="lg:col-span-2 space-y-6">

            {/* Analysis CTA */}
            {suggestions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-indigo-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Discover Growth Opportunities
                </h2>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  AI will analyze your site structure, industry, and service area to generate
                  high-impact SEO opportunities — new pages, city expansions, and content improvements.
                </p>
                <button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 mx-auto transition-colors"
                >
                  {analyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Run Growth Analysis</>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Re-analyze button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {suggestions.length} Growth Opportunities
                    </h2>
                    {site?.growth_last_analyzed && (
                      <p className="text-xs text-gray-400">
                        Last analyzed: {new Date(site.growth_last_analyzed).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Re-analyze
                  </button>
                </div>

                {/* High Priority */}
                {highPriority.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      High Priority ({highPriority.length})
                    </h3>
                    <div className="space-y-3">
                      {highPriority.map((s, i) => (
                        <SuggestionCard
                          key={i}
                          suggestion={s}
                          onImplement={implementSuggestion}
                          implementing={implementing === (s.slug || s.title)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Medium Priority */}
                {mediumPriority.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
                      Medium Priority ({mediumPriority.length})
                    </h3>
                    <div className="space-y-3">
                      {mediumPriority.map((s, i) => (
                        <SuggestionCard
                          key={i}
                          suggestion={s}
                          onImplement={implementSuggestion}
                          implementing={implementing === (s.slug || s.title)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Low Priority */}
                {lowPriority.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Low Priority ({lowPriority.length})
                    </h3>
                    <div className="space-y-3">
                      {lowPriority.map((s, i) => (
                        <SuggestionCard
                          key={i}
                          suggestion={s}
                          onImplement={implementSuggestion}
                          implementing={implementing === (s.slug || s.title)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Implemented */}
                {implemented.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-3">
                      Implemented ({implemented.length})
                    </h3>
                    <div className="space-y-2">
                      {implemented.map((s, i) => (
                        <SuggestionCard
                          key={i}
                          suggestion={s}
                          onImplement={implementSuggestion}
                          implementing={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Console */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Google Search Console</h3>
                  <p className="text-xs text-gray-500">Real traffic data for smarter suggestions</p>
                </div>
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Connect Search Console to see which keywords bring traffic, which pages underperform,
                and get suggestions based on real impressions + click data.
              </p>
            </div>
          </div>

          {/* Right: Stats + Deploy History */}
          <div className="space-y-5">
            {/* Site stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Site Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pages</span>
                  <span className="font-medium text-gray-900">{site?.page_count || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Industry</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {site?.industry?.replace(/-/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Suggestions</span>
                  <span className="font-medium text-gray-900">{suggestions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Implemented</span>
                  <span className="font-medium text-green-600">{implemented.length}</span>
                </div>
              </div>
            </div>

            {/* Deploy History */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Deploy History</h3>
              <DeployHistory siteId={siteId} />
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/agency/website/${siteId}/editor`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Globe className="h-4 w-4 text-gray-400" />
                  Edit Pages
                </Link>
                <Link
                  href={`/agency/website/${siteId}/settings`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Search className="h-4 w-4 text-gray-400" />
                  Site Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
