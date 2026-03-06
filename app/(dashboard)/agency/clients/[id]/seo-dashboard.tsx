'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, FileText, Globe, MessageCircle,
  BarChart3, Loader2, AlertTriangle, CheckCircle2, TrendingUp,
  TrendingDown, Minus, RefreshCw, ExternalLink, Calendar,
  ChevronDown, ChevronUp, BookOpen, Zap, Clock, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentPanel } from './content-panel';
import { NAPAuditPanel } from './nap-audit-panel';

// ── Getting Started Guide ─────────────────────────────────────────────────────

const SCHEDULE = [
  { day: 'Every Monday', icon: '🔍', title: 'GEO Visibility Test', desc: 'Tests 25 queries across ChatGPT and Perplexity to measure if your practice is being cited by AI assistants.' },
  { day: 'Every Tuesday + Thursday', icon: '✍️', title: 'Content Batch', desc: 'Publishes Web 2.0 articles and semantic stack pages to Google Docs, GitHub Pages, Notion, and Telegraph.' },
  { day: 'Every Wednesday', icon: '📍', title: 'NAP Consistency Audit', desc: 'Scrapes 15 major directories (Google, Yelp, Bing, etc.) and flags any mismatches in your business name, address, or phone.' },
  { day: 'Daily (8 AM + 6 PM)', icon: '💬', title: 'Reddit Monitoring', desc: 'Monitors vet-related subreddits for mentions of your city or services. Drafts replies for your review — never auto-posts.' },
  { day: 'Every Friday', icon: '📊', title: 'Weekly SEO Report', desc: 'Full report with GEO citation trends, NAP status, content published, and outreach pipeline.' },
];

const GLOSSARY = [
  { term: 'GEO Score', def: 'How often your practice is cited when someone asks an AI assistant (ChatGPT, Perplexity) for a vet recommendation in your city. 0% = not found, 100% = always cited.' },
  { term: 'NAP Consistency', def: 'Name, Address, Phone. All 15 major directories must show identical info. Mismatches hurt local rankings and AI citations.' },
  { term: 'Semantic Stack', def: 'Supporting pages on high-authority platforms (Google Docs, GitHub, Notion) that reinforce your main website in AI training data.' },
  { term: 'Web 2.0', def: 'Blog-style content published on WordPress, Blogger, Telegraph. Builds topical authority and backlinks.' },
  { term: 'Review Queue', def: 'Reddit replies drafted by AI and held for your approval. You approve, edit, or discard before anything is posted.' },
];

function GettingStartedGuide({ setup }: { setup: Record<string, unknown> }) {
  const [open, setOpen] = useState(true);

  const clinicName = (setup?.clinic_name as string) || (setup?.clinicName as string) || 'your practice';
  const city = (setup?.city as string) || '';
  const services = (setup?.services as string[]) || [];

  return (
    <Card className="border-indigo-200 bg-indigo-50/40">
      <CardHeader className="pb-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold text-indigo-900">
              Getting Started Guide — What happens next
            </CardTitle>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
        </button>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-5">
          {/* Setup summary */}
          <div className="bg-white rounded-lg border border-indigo-100 p-4">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">✅ Configuration Confirmed</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Practice</p>
                <p className="font-medium text-gray-800">{clinicName}</p>
              </div>
              {city && (
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="font-medium text-gray-800">{city}</p>
                </div>
              )}
              {services.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Target Services</p>
                  <p className="font-medium text-gray-800">{services.slice(0, 3).join(', ')}{services.length > 3 ? ` +${services.length - 3}` : ''}</p>
                </div>
              )}
            </div>
          </div>

          {/* Week 1 timeline */}
          <div>
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Week 1 Timeline
            </p>
            <div className="space-y-2">
              {[
                { when: 'This Monday', what: '🔍 First GEO Visibility Test runs. Establishes your baseline citation rate across 25 AI queries.' },
                { when: 'This Wednesday', what: '📍 First NAP Audit runs. Checks all 15 directories for consistency issues.' },
                { when: 'Tue + Thu', what: '✍️ AI drafts first batch of Web 2.0 + semantic stack content for your review.' },
                { when: 'This Friday', what: '📊 First weekly report generated. You\'ll see your starting GEO score and NAP health.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-xs font-medium text-indigo-600 w-28 shrink-0 pt-0.5">{item.when}</span>
                  <span className="text-gray-700">{item.what}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly schedule */}
          <div>
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Ongoing Weekly Schedule
            </p>
            <div className="grid gap-2">
              {SCHEDULE.map((item, i) => (
                <div key={i} className="bg-white rounded-md border border-indigo-100 p-3 flex gap-3">
                  <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800">{item.title}</p>
                      <span className="text-xs text-indigo-500 font-medium">{item.day}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What you need to do */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Your Only Job
            </p>
            <ul className="space-y-1.5 text-sm text-amber-800">
              <li>• <strong>Check Review Queue weekly</strong> — approve or edit Reddit replies before they go live (tab above)</li>
              <li>• <strong>Review Friday reports</strong> — they show GEO trend + what content was published</li>
              <li>• <strong>Fix any NAP mismatches flagged</strong> — log into the listed directory and update the info directly</li>
              <li>• Everything else is fully automated 🤖</li>
            </ul>
          </div>

          {/* Glossary */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800 select-none flex items-center gap-1">
              <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
              Glossary — what do these terms mean?
            </summary>
            <div className="mt-3 grid gap-2">
              {GLOSSARY.map((item, i) => (
                <div key={i} className="bg-white rounded border border-indigo-100 p-3">
                  <p className="text-xs font-semibold text-gray-800">{item.term}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.def}</p>
                </div>
              ))}
            </div>
          </details>
        </CardContent>
      )}
    </Card>
  );
}

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
  url: string | null;
  type: 'press_release' | 'web20' | 'semantic_stack';
  published_at: string;
  status?: 'draft' | 'published';
  body?: string;
  target_keyword?: string;
  word_count?: number;
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
  last_report: Record<string, unknown> | string | null;
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
  const [running, setRunning] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ task: string; ok: boolean; message: string } | null>(null);

  const runTask = async (task: 'geo_test' | 'nap_audit' | 'content_draft' | 'reddit_scan' | 'weekly_report') => {
    setRunning(task);
    setRunResult(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRunResult({ task, ok: false, message: json.error || 'Task failed' });
      } else {
        setRunResult({ task, ok: true, message: `${task === 'geo_test' ? 'GEO test' : 'NAP audit'} completed successfully! Refreshing data…` });
        setTimeout(() => fetchData(), 1500);
      }
    } catch (err) {
      setRunResult({ task, ok: false, message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setRunning(null);
    }
  };

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

  const isNewActivation = data.geo_scores.length === 0 && data.content_published.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between overflow-x-hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            SEO Dashboard — {clientName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Veterinary SEO Worker · Premium Template
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/agency/clients/${clientId}/seo-guide`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Client PDF Guide
          </a>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Getting Started Guide — always visible, collapsible */}
      <GettingStartedGuide setup={data.setup} />

      {/* Run Now Panel */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-x-hidden">
            <div>
              <p className="text-sm font-semibold text-gray-900">Run tasks now</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Don&apos;t wait for the weekly schedule — kick off a task immediately.
                Requires <code className="text-xs bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> + <code className="text-xs bg-gray-100 px-1 rounded">PERPLEXITY_API_KEY</code> for GEO,
                and <code className="text-xs bg-gray-100 px-1 rounded">FIRECRAWL_API_KEY</code> for NAP.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'geo_test' as const, label: 'GEO Test', cls: 'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100' },
                { id: 'nap_audit' as const, label: 'NAP Audit', cls: 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100' },
                { id: 'content_draft' as const, label: 'Generate Content', cls: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' },
                { id: 'reddit_scan' as const, label: 'Reddit Scan', cls: 'text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100' },
                { id: 'weekly_report' as const, label: 'Weekly Report', cls: 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100' },
              ]).map((t) => (
                <Button key={t.id} size="sm" variant="outline" onClick={() => runTask(t.id)} disabled={!!running} className={t.cls}>
                  {running === t.id
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</>
                    : <><Play className="w-3.5 h-3.5 mr-1.5" />{t.label}</>}
                </Button>
              ))}
            </div>
          </div>

          {runResult && (
            <div className={`mt-3 rounded-md px-3 py-2 text-sm flex items-start gap-2 ${
              runResult.ok
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {runResult.ok
                ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{runResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between overflow-x-hidden">
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
              <table className="min-w-full w-full text-sm">
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
      <NAPAuditPanel entries={data.nap_status} />

      {/* Content Drafts + Published */}
      <ContentPanel entries={data.content_published} clientId={clientId} onRefresh={fetchData} />

      {/* Reddit Queue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-orange-500" />
            Reddit Review Queue
            {data.reddit_queue.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs ml-auto">
                {data.reddit_queue.filter(r => r.status === 'pending_review').length} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.reddit_queue.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No Reddit posts found yet. Click "Reddit Scan" above to search for relevant discussions in {(data.setup as Record<string, unknown>)?.city as string || 'your city'}.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.reddit_queue.slice(0, 5).map((item, i) => (
                <div key={i} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.title as string}</p>
                    <p className="text-xs text-gray-500">r/{String(item.subreddit)} · {Number(item.num_comments)} comments</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${(item.status as string) === 'pending_review' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {(item.status as string) === 'pending_review' ? 'Needs review' : String(item.status)}
                    </Badge>
                    {(item.url as string | null) && (
                      <a href={item.url as string} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-600">
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

      {/* Weekly Report */}
      {data.last_report && typeof data.last_report === 'object' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Latest Weekly Report
              <span className="ml-auto text-xs text-gray-400 font-normal">
                {(data.last_report as Record<string, unknown>).report_date as string}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-700 mb-3">{(data.last_report as Record<string, unknown>).summary as string}</p>
            {((data.last_report as Record<string, unknown>).action_items as string[] || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Action Items</p>
                <ul className="space-y-1">
                  {((data.last_report as Record<string, unknown>).action_items as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-amber-700 flex gap-2">
                      <span className="text-amber-500 shrink-0">→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Publishing Platforms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            Publishing Platforms
            <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200 text-xs">Phase 2</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-gray-500 mb-3">Content will be published to these platforms automatically. Direct API publishing (no browser automation).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { name: 'WordPress.com', type: 'Web 2.0', icon: '📝', note: 'REST API' },
              { name: 'Blogger', type: 'Web 2.0', icon: '📰', note: 'Google Blogger API v3' },
              { name: 'Telegraph', type: 'Web 2.0', icon: '✈️', note: 'No auth required' },
              { name: 'Notion', type: 'Web 2.0 + Stack', icon: '📓', note: 'Notion API' },
              { name: 'Google Docs', type: 'Semantic Stack', icon: '📄', note: 'Google Docs API' },
              { name: 'GitHub Pages', type: 'Semantic Stack', icon: '⚡', note: 'GitHub REST API' },
              { name: 'Google Sites', type: 'Semantic Stack', icon: '🌐', note: 'Google Sites API' },
            ].map((p, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-base">{p.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.type} · {p.note}</p>
                </div>
              </div>
            ))}
          </div>
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
