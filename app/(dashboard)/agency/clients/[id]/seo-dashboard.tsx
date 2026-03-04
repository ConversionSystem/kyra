'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, FileText, Globe, MessageCircle, Mail,
  BarChart3, Loader2, AlertTriangle, CheckCircle2, TrendingUp,
  TrendingDown, Minus, RefreshCw, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SEODashboardProps {
  clientId: string;
  clientName: string;
}

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
  url: string;
  type: 'press_release' | 'web20' | 'semantic_stack';
  published_at: string;
}

interface SEOData {
  template: string;
  status: string;
  setup: Record<string, unknown>;
  geo_scores: GeoScore[];
  nap_status: NapEntry[];
  content_published: ContentEntry[];
  outreach_pipeline: Array<Record<string, unknown>>;
  reddit_queue: Array<Record<string, unknown>>;
  last_report: string | null;
  stats: {
    geo_score_current: number | null;
    geo_score_trend: 'up' | 'down' | 'stable' | null;
    content_count: number;
    nap_issues: number;
    pending_reviews: number;
  };
}

export function SEODashboard({ clientId, clientName }: SEODashboardProps) {
  const [data, setData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Failed (${res.status})`);
      }
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SEO data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading SEO dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
        <p className="text-gray-400 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { stats } = data;
  const TrendIcon = stats.geo_score_trend === 'up' ? TrendingUp
    : stats.geo_score_trend === 'down' ? TrendingDown
    : Minus;
  const trendColor = stats.geo_score_trend === 'up' ? 'text-green-400'
    : stats.geo_score_trend === 'down' ? 'text-red-400'
    : 'text-gray-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-400" />
            SEO Dashboard — {clientName}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Veterinary SEO Worker • Premium Template
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* GEO Score */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">GEO Score</span>
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.geo_score_current !== null ? `${stats.geo_score_current}%` : '—'}
          </p>
          <p className="text-xs text-gray-500">AI citation rate</p>
        </div>

        {/* Content Published */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Content</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.content_count}</p>
          <p className="text-xs text-gray-500">Pages published</p>
        </div>

        {/* NAP Issues */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">NAP Health</span>
            {stats.nap_issues === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            )}
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.nap_issues === 0 ? '✓' : stats.nap_issues}
          </p>
          <p className="text-xs text-gray-500">
            {stats.nap_issues === 0 ? 'All consistent' : 'Issues found'}
          </p>
        </div>

        {/* Pending Reviews */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Review Queue</span>
            <MessageCircle className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.pending_reviews}</p>
          <p className="text-xs text-gray-500">Drafts pending</p>
        </div>
      </div>

      {/* GEO Scores Detail */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400" />
            GEO Visibility Tests
          </h3>
          <Badge className="bg-indigo-900/50 text-indigo-300 border-indigo-700 text-xs">
            {data.geo_scores.length} queries tracked
          </Badge>
        </div>
        {data.geo_scores.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No GEO tests run yet. First test runs on the next scheduled Monday.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-750 text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Query</th>
                  <th className="text-left px-4 py-2">Provider</th>
                  <th className="text-center px-4 py-2">Cited?</th>
                  <th className="text-left px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.geo_scores.slice(0, 25).map((score, i) => (
                  <tr key={i} className="border-t border-gray-700/50">
                    <td className="px-4 py-2 text-gray-300">{score.query}</td>
                    <td className="px-4 py-2 text-gray-400">{score.provider}</td>
                    <td className="px-4 py-2 text-center">
                      {score.cited ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 inline" />
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(score.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NAP Audit */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-400" />
            NAP Consistency Audit
          </h3>
        </div>
        {data.nap_status.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No NAP audit run yet. First audit runs on the next scheduled Wednesday.
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {data.nap_status.map((entry, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{entry.directory}</p>
                  {entry.issues.length > 0 && (
                    <p className="text-xs text-yellow-400 mt-0.5">{entry.issues.join(' • ')}</p>
                  )}
                </div>
                <Badge className={`text-xs ${
                  entry.status === 'match' ? 'bg-green-900/50 text-green-300 border-green-700' :
                  entry.status === 'mismatch' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' :
                  'bg-gray-700 text-gray-400 border-gray-600'
                }`}>
                  {entry.status === 'match' ? '✓ Consistent' :
                   entry.status === 'mismatch' ? '⚠ Mismatch' :
                   'Not Found'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content Published */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            Published Content
          </h3>
        </div>
        {data.content_published.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No content published yet. Content creation begins after the first GEO baseline is established.
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {data.content_published.map((entry, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{entry.title}</p>
                  <p className="text-xs text-gray-500">{entry.platform} • {new Date(entry.published_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Badge className="text-xs bg-gray-700 text-gray-300 border-gray-600">
                    {entry.type === 'press_release' ? 'PR' : entry.type === 'web20' ? 'Web 2.0' : 'Stack'}
                  </Badge>
                  {entry.url && (
                    <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup Data (collapsible) */}
      <details className="bg-gray-800 border border-gray-700 rounded-lg">
        <summary className="px-4 py-3 text-sm font-medium text-gray-400 cursor-pointer hover:text-white">
          Client Setup Data
        </summary>
        <div className="px-4 pb-4">
          <pre className="text-xs text-gray-500 bg-gray-900 rounded p-3 overflow-x-auto">
            {JSON.stringify(data.setup, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}
