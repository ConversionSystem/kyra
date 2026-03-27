'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  LayoutDashboard,
  Search,
  PenTool,
  Eye,
  Smartphone,
  Mail,
  ArrowRight,
  Loader2,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Settings,
  Inbox,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import EmailMarketingTab from './email-marketing-tab';

// ── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'dashboard' | 'seo' | 'content' | 'competitors' | 'social' | 'email';

interface Keyword {
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  priority: number;
}

interface SerpResult {
  position: number;
  title: string;
  url: string;
  wordCount: number;
}

interface RankResult {
  keyword: string;
  position: number;
  change: number;
}

interface ContentDraft {
  id: string;
  title: string;
  format: string;
  status: string;
  created: string;
  body: string;
  url?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    'In Review': 'bg-amber-50 text-amber-700',
    Approved: 'bg-green-50 text-green-700',
    Published: 'bg-indigo-50 text-indigo-700',
    Posted: 'bg-indigo-50 text-indigo-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12 px-6">
      <Icon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function ConnectBanner({ service, settingsPath }: { service: string; settingsPath?: string }) {
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-4 flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-800">Connect {service} for live data</p>
        <p className="text-xs text-amber-600 mt-0.5">
          {settingsPath
            ? `Go to Settings → Secrets to add your ${service} credentials.`
            : `Configure ${service} in your agency settings to enable this feature.`
          }
        </p>
      </div>
    </div>
  );
}

// ── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ clientId, onNavigate }: { clientId: string; onNavigate: (tab: SubTab) => void }) {
  const [stats, setStats] = useState({ conversations: 0, pages: 0, contacts: 0, activities: 0 });
  const [activities, setActivities] = useState<Array<{ type: string; description: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch real stats from API
        const [convRes, pagesRes, contactsRes, actRes] = await Promise.allSettled([
          fetch(`/api/agency/clients/${clientId}/chat?limit=1`).then(r => r.json()),
          fetch(`/api/agency/sites?clientId=${clientId}`).then(r => r.json()),
          fetch(`/api/agency/crm/contacts?clientId=${clientId}&limit=1`).then(r => r.json()),
          fetch(`/api/agency/clients/${clientId}/ghl/actions?limit=10`).then(r => r.json()),
        ]);

        setStats({
          conversations: convRes.status === 'fulfilled' ? (convRes.value?.data?.length || convRes.value?.total || 0) : 0,
          pages: pagesRes.status === 'fulfilled' ? (pagesRes.value?.data?.[0]?.pages_count || 0) : 0,
          contacts: contactsRes.status === 'fulfilled' ? (contactsRes.value?.data?.length || contactsRes.value?.total || 0) : 0,
          activities: actRes.status === 'fulfilled' ? (actRes.value?.data?.length || 0) : 0,
        });

        // Use activities data if available
        if (actRes.status === 'fulfilled' && actRes.value?.data?.length) {
          setActivities(actRes.value.data.slice(0, 8).map((a: Record<string, unknown>) => ({
            type: String(a.action_type || a.type || 'activity'),
            description: String(a.description || a.action || a.summary || 'Activity'),
            created_at: String(a.created_at || a.timestamp || ''),
          })));
        }
      } catch {
        // Non-fatal — show zeros
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real metric cards from DB */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Conversations" value={stats.conversations} sub="Total AI conversations" />
        <MetricCard label="Site Pages" value={stats.pages} sub="Generated content pages" />
        <MetricCard label="Contacts" value={stats.contacts} sub="CRM contacts captured" />
        <MetricCard label="AI Actions" value={stats.activities} sub="Actions taken by AI" />
      </div>

      {/* Recent Activity — from real data or empty state */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
        {activities.length > 0 ? (
          <div className="space-y-2.5">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 text-base">
                  {a.type.includes('message') ? '💬' : a.type.includes('lead') ? '🎯' : a.type.includes('book') ? '📅' : '⚡'}
                </span>
                <span className="text-gray-700 flex-1">{a.description}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">
            No activity yet. Activity will appear here as your AI worker handles conversations, books appointments, and captures leads.
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Research Keywords', tab: 'seo' as SubTab },
            { label: 'Draft Content', tab: 'content' as SubTab },
            { label: 'Check Competitors', tab: 'competitors' as SubTab },
          ].map(a => (
            <button
              key={a.tab}
              onClick={() => onNavigate(a.tab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              {a.label} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SEO View ─────────────────────────────────────────────────────────────────

function SEOView({ clientId }: { clientId: string }) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [serpKeyword, setSerpKeyword] = useState('');
  const [rankDomain, setRankDomain] = useState('');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  const [ranks, setRanks] = useState<RankResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [hasDataForSEO, setHasDataForSEO] = useState<boolean | null>(null);

  // Check if DataForSEO is configured
  useEffect(() => {
    fetch(`/api/agency/clients/${clientId}/seo/keywords?seed=test&limit=1`)
      .then(r => {
        if (r.status === 503 || r.status === 400) setHasDataForSEO(false);
        else setHasDataForSEO(true);
      })
      .catch(() => setHasDataForSEO(false));
  }, [clientId]);

  const doResearch = useCallback(async () => {
    if (!seedKeyword.trim()) return;
    setLoading('research');
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
            priority: Number(k.priority || Math.round(Number(k.search_volume || 0) / 100)),
          })));
        }
      }
    } catch { /* handled by empty state */ }
    finally { setLoading(null); }
  }, [seedKeyword, clientId]);

  const doSerp = useCallback(async () => {
    if (!serpKeyword.trim()) return;
    setLoading('serp');
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/serp?keyword=${encodeURIComponent(serpKeyword)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.length) {
          setSerpResults(data.data.map((r: Record<string, unknown>) => ({
            position: Number(r.position || r.rank || 0),
            title: String(r.title || ''),
            url: String(r.url || ''),
            wordCount: Number(r.word_count || r.wordCount || 0),
          })));
        }
      }
    } catch { /* handled */ }
    finally { setLoading(null); }
  }, [serpKeyword, clientId]);

  const doRank = useCallback(async () => {
    if (!rankDomain.trim()) return;
    setLoading('rank');
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/rank?domain=${encodeURIComponent(rankDomain)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.length) {
          setRanks(data.data.map((r: Record<string, unknown>) => ({
            keyword: String(r.keyword || ''),
            position: Number(r.position || 0),
            change: Number(r.change || 0),
          })));
        }
      }
    } catch { /* handled */ }
    finally { setLoading(null); }
  }, [rankDomain, clientId]);

  return (
    <div className="space-y-6">
      {hasDataForSEO === false && (
        <ConnectBanner service="DataForSEO" settingsPath="Settings → Secrets" />
      )}

      {/* Keyword Research */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Keyword Research</h3>
        <div className="flex gap-2 mb-4">
          <input
            value={seedKeyword}
            onChange={e => setSeedKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doResearch()}
            placeholder="Enter a seed keyword (e.g., dental implants)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={doResearch}
            disabled={loading === 'research' || !seedKeyword.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'research' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Research
          </button>
        </div>

        {keywords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500">Keyword</th>
                  <th className="text-right py-2 font-medium text-gray-500">Volume</th>
                  <th className="text-right py-2 font-medium text-gray-500">KD</th>
                  <th className="text-right py-2 font-medium text-gray-500">CPC</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map(k => (
                  <tr key={k.keyword} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900">{k.keyword}</td>
                    <td className="py-2 text-right text-gray-600">{k.volume.toLocaleString()}</td>
                    <td className="py-2 text-right text-gray-600">{k.kd}</td>
                    <td className="py-2 text-right text-gray-600">${k.cpc.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            Enter a seed keyword above to discover keyword opportunities.
          </p>
        )}
      </div>

      {/* SERP Analysis */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">SERP Analysis</h3>
        <div className="flex gap-2 mb-4">
          <input
            value={serpKeyword}
            onChange={e => setSerpKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSerp()}
            placeholder="Keyword to analyze SERP for"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={doSerp}
            disabled={loading === 'serp' || !serpKeyword.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'serp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Analyze
          </button>
        </div>

        {serpResults.length > 0 ? (
          <div className="space-y-2">
            {serpResults.map(r => (
              <div key={r.position} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg font-bold text-gray-400 w-6 text-right shrink-0">#{r.position}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{r.title}</p>
                  <p className="text-xs text-gray-400 truncate">{r.url}</p>
                </div>
                {r.wordCount > 0 && (
                  <span className="text-xs text-gray-400 shrink-0">{r.wordCount.toLocaleString()} words</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            Enter a keyword to see who ranks for it and how their content compares.
          </p>
        )}
      </div>

      {/* Rank Tracking */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Rank Tracking</h3>
        <div className="flex gap-2 mb-4">
          <input
            value={rankDomain}
            onChange={e => setRankDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doRank()}
            placeholder="Your domain (e.g., yourbusiness.com)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={doRank}
            disabled={loading === 'rank' || !rankDomain.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'rank' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Track
          </button>
        </div>

        {ranks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500">Keyword</th>
                  <th className="text-right py-2 font-medium text-gray-500">Position</th>
                  <th className="text-right py-2 font-medium text-gray-500">Change</th>
                </tr>
              </thead>
              <tbody>
                {ranks.map(r => (
                  <tr key={r.keyword} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900">{r.keyword}</td>
                    <td className="py-2 text-right text-gray-600">#{r.position}</td>
                    <td className={`py-2 text-right font-medium ${r.change > 0 ? 'text-green-600' : r.change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {r.change > 0 ? `↑${r.change}` : r.change < 0 ? `↓${Math.abs(r.change)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            Enter your domain to track keyword rankings.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Content View ─────────────────────────────────────────────────────────────

function ContentView({ clientId }: { clientId: string }) {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('Blog');
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load existing content from site pages
  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      try {
        // Fetch site pages as content drafts
        const sitesRes = await fetch(`/api/agency/sites?clientId=${clientId}`);
        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          const siteId = sitesData.data?.[0]?.id;
          if (siteId) {
            const pagesRes = await fetch(`/api/agency/sites/${siteId}/pages`);
            if (pagesRes.ok) {
              const pagesData = await pagesRes.json();
              const pages = pagesData.data || [];
              setDrafts(pages.slice(0, 10).map((p: Record<string, unknown>) => ({
                id: String(p.id || ''),
                title: String(p.title || p.meta_title || ''),
                format: String(p.page_type || 'Page').charAt(0).toUpperCase() + String(p.page_type || 'page').slice(1),
                status: 'Published',
                created: String(p.generated_at || p.created_at || ''),
                body: String(p.hero_subtitle || p.meta_description || ''),
              })));
            }
          }
        }
      } catch { /* non-fatal */ }
      finally { setLoading(false); }
    }
    loadContent();
  }, [clientId]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      // Use the chat API to generate content via the AI worker
      const res = await fetch(`/api/agency/clients/${clientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Write a ${format.toLowerCase()} post about: ${topic}. Keep it professional, engaging, and around 300 words.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newDraft: ContentDraft = {
          id: `draft-${Date.now()}`,
          title: topic,
          format,
          status: 'Draft',
          created: new Date().toISOString().split('T')[0],
          body: data.reply || data.message || data.data?.reply || 'Content generated — check the AI worker conversation.',
        };
        setDrafts(prev => [newDraft, ...prev]);
        setTopic('');
      }
    } catch { /* handled */ }
    finally { setGenerating(false); }
  }, [topic, format, clientId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Generate Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Generate Content</h3>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="Topic or title for new content..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={format}
            onChange={e => setFormat(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          >
            <option>Blog</option>
            <option>LinkedIn</option>
            <option>Twitter</option>
            <option>Newsletter</option>
            <option>Email</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Content ({drafts.length})</h3>
        {drafts.length > 0 ? (
          <div className="space-y-3">
            {drafts.map(d => (
              <div key={d.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 flex-1 truncate">{d.title}</span>
                  <StatusBadge status={d.status} />
                  <span className="text-xs text-gray-400">{d.format}</span>
                </div>
                {expanded === d.id && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">{d.body}</div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="text-xs text-indigo-600 hover:text-indigo-800">
                    {expanded === d.id ? 'Collapse' : 'Expand'}
                  </button>
                  <button onClick={() => copyToClipboard(d.body, d.id)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    {copiedId === d.id ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                  {d.status === 'Draft' && (
                    <button onClick={() => deleteDraft(d.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PenTool}
            title="No content yet"
            description="Generate your first content piece above, or your AI Marketing Worker will create content drafts as it runs."
          />
        )}
      </div>
    </div>
  );
}

// ── Competitors View ─────────────────────────────────────────────────────────

function CompetitorsView({ clientId }: { clientId: string }) {
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<Array<{ domain: string; summary: string }>>([]);

  const addCompetitor = () => {
    const domain = newCompetitor.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (domain && !competitors.includes(domain)) {
      setCompetitors(prev => [...prev, domain]);
      setNewCompetitor('');
    }
  };

  const scanCompetitors = useCallback(async () => {
    if (competitors.length === 0) return;
    setScanning(true);
    try {
      // Use the AI worker chat to analyze competitors
      const res = await fetch(`/api/agency/clients/${clientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze these competitor websites and give me a brief competitive summary for each: ${competitors.join(', ')}. For each, note: what they do well, what they're missing, and any recent content or changes.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || data.message || data.data?.reply || '';
        setResults(competitors.map(d => ({
          domain: d,
          summary: reply.includes(d) ? reply : `Analysis for ${d}: ${reply.slice(0, 200)}...`,
        })));
      }
    } catch { /* handled */ }
    finally { setScanning(false); }
  }, [competitors, clientId]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Competitor Monitoring</h3>
        <p className="text-sm text-gray-500 mb-4">Add competitor domains to track. Your AI Marketing Worker can analyze their content and strategy.</p>

        <div className="flex gap-2 mb-4">
          <input
            value={newCompetitor}
            onChange={e => setNewCompetitor(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCompetitor()}
            placeholder="competitor.com"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addCompetitor}
            disabled={!newCompetitor.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {competitors.length > 0 ? (
          <div className="space-y-2 mb-4">
            {competitors.map(c => (
              <div key={c} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700">{c}</span>
                <button onClick={() => setCompetitors(prev => prev.filter(x => x !== c))} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={scanCompetitors}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Scan Competitors
            </button>
          </div>
        ) : (
          <EmptyState
            icon={Eye}
            title="No competitors tracked"
            description="Add competitor domains above. Your AI Marketing Worker can scan their websites for content changes, new features, and strategic moves."
          />
        )}

        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Scan Results</h4>
            {results.map(r => (
              <div key={r.domain} className="border border-gray-100 rounded-lg p-3">
                <p className="font-medium text-sm text-gray-900 mb-1">{r.domain}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Social View ──────────────────────────────────────────────────────────────

function SocialView({ clientId }: { clientId: string }) {
  const [postTopic, setPostTopic] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [generatedPost, setGeneratedPost] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);

  const handleGeneratePost = useCallback(async () => {
    if (!postTopic.trim()) return;
    setGenerating(true);
    setGeneratedPost('');
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Write a ${platform} post about: ${postTopic}. Make it engaging, use appropriate formatting for ${platform}. Keep it concise and end with a call to action.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedPost(data.reply || data.message || data.data?.reply || '');
      }
    } catch { /* handled */ }
    finally { setGenerating(false); }
  }, [postTopic, platform, clientId]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Generate Social Post</h3>
        <p className="text-sm text-gray-500 mb-4">Draft social media posts for your client. Copy and paste into their social accounts.</p>

        <div className="flex gap-2 mb-4">
          <input
            value={postTopic}
            onChange={e => setPostTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGeneratePost()}
            placeholder="Topic or idea for the post..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          >
            <option>LinkedIn</option>
            <option>Twitter</option>
            <option>Instagram</option>
            <option>Facebook</option>
          </select>
          <button
            onClick={handleGeneratePost}
            disabled={generating || !postTopic.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
            Draft
          </button>
        </div>

        {generatedPost ? (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{platform} Draft</span>
              <button
                onClick={() => { navigator.clipboard.writeText(generatedPost); setCopiedPost(true); setTimeout(() => setCopiedPost(false), 2000); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {copiedPost ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{generatedPost}</p>
          </div>
        ) : (
          <EmptyState
            icon={Smartphone}
            title="No posts drafted yet"
            description="Enter a topic above and select a platform. The AI will draft a post optimized for that platform."
          />
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'content', label: 'Content', icon: PenTool },
  { id: 'competitors', label: 'Competitors', icon: Eye },
  { id: 'social', label: 'Social', icon: Smartphone },
  { id: 'email', label: 'Email', icon: Mail },
];

export default function MarketingTab({ client }: { client: AgencyClient }) {
  const [subTab, setSubTab] = useState<SubTab>('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Marketing Command Center</h2>
        <p className="text-sm text-gray-500 mt-0.5">SEO, content, competitors & social — powered by your AI Marketing Worker.</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              subTab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'dashboard' && <DashboardView clientId={client.id} onNavigate={setSubTab} />}
      {subTab === 'seo' && <SEOView clientId={client.id} />}
      {subTab === 'content' && <ContentView clientId={client.id} />}
      {subTab === 'competitors' && <CompetitorsView clientId={client.id} />}
      {subTab === 'social' && <SocialView clientId={client.id} />}
      {subTab === 'email' && <EmailMarketingTab client={client} />}
    </div>
  );
}
