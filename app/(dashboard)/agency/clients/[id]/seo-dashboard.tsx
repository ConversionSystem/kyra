'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, FileText, Globe, MessageCircle,
  BarChart3, Loader2, AlertTriangle, CheckCircle2, TrendingUp,
  TrendingDown, Minus, RefreshCw, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-flex flex-col items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <p className="text-amber-700 text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats } = data;
  const TrendIcon = stats.geo_score_trend === 'up' ? TrendingUp
    : stats.geo_score_trend === 'down' ? TrendingDown
    : Minus;
  const trendColor = stats.geo_score_trend === 'up' ? 'text-emerald-600'
    : stats.geo_score_trend === 'down' ? 'text-red-600'
    : 'text-gray-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            SEO Dashboard — {clientName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Veterinary SEO Worker · Premium Template
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* GEO Score */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-indigo-50 p-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xl font-bold text-gray-900">
                    {stats.geo_score_current !== null ? `${stats.geo_score_current}%` : '—'}
                  </p>
                  <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
                </div>
                <p className="text-[11px] text-gray-400">GEO citation rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Published */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-blue-50 p-2">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.content_count}</p>
                <p className="text-[11px] text-gray-400">Pages published</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NAP Health */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className={`rounded-lg p-2 ${stats.nap_issues === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                {stats.nap_issues === 0
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <AlertTriangle className="h-4 w-4 text-amber-600" />
                }
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {stats.nap_issues === 0 ? '✓' : stats.nap_issues}
                </p>
                <p className="text-[11px] text-gray-400">
                  {stats.nap_issues === 0 ? 'NAP consistent' : 'NAP issues'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Queue */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-purple-50 p-2">
                <MessageCircle className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.pending_reviews}</p>
                <p className="text-[11px] text-gray-400">Pending review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GEO Scores */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              GEO Visibility Tests
            </CardTitle>
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
              {data.geo_scores.length} queries tracked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {data.geo_scores.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No GEO tests run yet. First test runs on the next scheduled Monday.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Query</th>
                    <th className="text-left px-4 py-2 font-medium">Provider</th>
                    <th className="text-center px-4 py-2 font-medium">Cited?</th>
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.geo_scores.slice(0, 25).map((score, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-700">{score.query}</td>
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
          )}
        </CardContent>
      </Card>

      {/* NAP Audit */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            NAP Consistency Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.nap_status.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No NAP audit run yet. First audit runs on the next scheduled Wednesday.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.nap_status.map((entry, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{entry.directory}</p>
                    {entry.issues.length > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">{entry.issues.join(' · ')}</p>
                    )}
                  </div>
                  <Badge className={`text-xs ${
                    entry.status === 'match'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : entry.status === 'mismatch'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {entry.status === 'match' ? '✓ Consistent'
                      : entry.status === 'mismatch' ? '⚠ Mismatch'
                      : 'Not Found'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Published Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            Published Content
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.content_published.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No content published yet. Content creation begins after the first GEO baseline.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.content_published.map((entry, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{entry.title}</p>
                    <p className="text-xs text-gray-500">{entry.platform} · {new Date(entry.published_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge className="text-xs bg-gray-100 text-gray-600 border-gray-200">
                      {entry.type === 'press_release' ? 'PR' : entry.type === 'web20' ? 'Web 2.0' : 'Stack'}
                    </Badge>
                    {entry.url && (
                      <a href={entry.url} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-indigo-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Data */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 select-none">
          View client setup data
        </summary>
        <div className="mt-2">
          <pre className="text-xs text-blue-700 font-mono bg-gray-50 border border-gray-200 rounded-md px-3 py-2 overflow-x-auto">
            {JSON.stringify(data.setup, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}
