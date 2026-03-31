'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  Calendar,
  Users,
  Zap,
  TrendingUp,
  MessageSquare,
  Target,
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
}

interface CompetitorResult {
  domain: string;
  threat: 'high' | 'medium' | 'low';
  summary: string;
}

interface SocialDraft {
  id: string;
  platform: string;
  topic: string;
  body: string;
  status: 'draft' | 'posted';
  created: string;
  day?: string;
}

interface WorkerTeamConfig {
  enabled?: boolean;
  members?: Array<{ worker_id: string; role: string; name?: string }>;
  handoff_style?: string;
  primary_worker_id?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function DraftBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
      DRAFT — awaiting approval
    </span>
  );
}

function ThreatBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high: { emoji: '🔴', bg: 'bg-red-100 text-red-700', label: 'High threat' },
    medium: { emoji: '🟡', bg: 'bg-amber-100 text-amber-700', label: 'Medium' },
    low: { emoji: '🟢', bg: 'bg-green-100 text-green-700', label: 'Low' },
  };
  const t = map[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.bg}`}>
      {t.emoji} {t.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
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
            : `Configure ${service} in your agency settings to enable this feature.`}
        </p>
      </div>
    </div>
  );
}

/** Send a message to the AI worker chat and get the reply text. */
async function sendChatPrompt(clientId: string, message: string): Promise<string> {
  const res = await fetch(`/api/agency/clients/${clientId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);

  // Handle SSE stream
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE events
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || parsed.token || parsed.text || '';
            result += token;
          } catch {
            // Plain text chunk
            result += data;
          }
        }
      }
    }
    return result.trim() || 'Response received — check the AI worker conversation.';
  }

  // JSON response
  const data = await res.json();
  return data.reply || data.message || data.data?.reply || 'Content generated — check the AI worker conversation.';
}

// ── AI Worker Status Helper ──────────────────────────────────────────────────

function useWorkerStatus(client: AgencyClient) {
  const cfg = client.container_config || {};
  const activeWorkerId = cfg.active_worker_id as string | undefined;
  const workerTeam = cfg.worker_team as WorkerTeamConfig | undefined;

  const isMarketingWorker = activeWorkerId === 'ai-marketing-worker';
  const isInTeam = workerTeam?.enabled && workerTeam.members?.some(m => m.worker_id === 'ai-marketing-worker');
  const isActive = isMarketingWorker || !!isInTeam;

  const teamMembers = workerTeam?.enabled ? workerTeam.members : undefined;

  return { isActive, isMarketingWorker, isInTeam, teamMembers, activeWorkerId };
}

// ── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ client, onNavigate }: { client: AgencyClient; onNavigate: (tab: SubTab) => void }) {
  const clientId = client.id;
  const [stats, setStats] = useState({ conversations: 0, pages: 0, contacts: 0, activities: 0 });
  const [activities, setActivities] = useState<Array<{ type: string; subject: string; body: string; created_at: string; actor: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { isActive, isMarketingWorker, isInTeam, teamMembers, activeWorkerId } = useWorkerStatus(client);

  useEffect(() => {
    async function load() {
      try {
        const [convRes, pagesRes, contactsRes, actRes, crmRes] = await Promise.allSettled([
          fetch(`/api/agency/clients/${clientId}/chat?limit=1`).then(r => r.json()),
          fetch(`/api/agency/sites?clientId=${clientId}`).then(r => r.json()),
          fetch(`/api/agency/crm/contacts?clientId=${clientId}&limit=1`).then(r => r.json()),
          fetch(`/api/agency/clients/${clientId}/ghl/actions?limit=10`).then(r => r.json()),
          fetch(`/api/agency/crm/activities?limit=15`).then(r => r.json()),
        ]);

        setStats({
          conversations: convRes.status === 'fulfilled' ? (convRes.value?.data?.length || convRes.value?.total || 0) : 0,
          pages: pagesRes.status === 'fulfilled' ? (pagesRes.value?.data?.[0]?.pages_count || 0) : 0,
          contacts: contactsRes.status === 'fulfilled' ? (contactsRes.value?.data?.length || contactsRes.value?.total || 0) : 0,
          activities: actRes.status === 'fulfilled' ? (actRes.value?.data?.length || 0) : 0,
        });

        // Pull recent activities from CRM activities endpoint
        if (crmRes.status === 'fulfilled') {
          const raw = crmRes.value?.activities || crmRes.value?.data || [];
          setActivities(raw.slice(0, 8).map((a: Record<string, unknown>) => ({
            type: String(a.type || 'activity'),
            subject: String(a.subject || a.description || 'Activity'),
            body: String(a.body || ''),
            created_at: String(a.created_at || ''),
            actor: String(a.actor || 'system'),
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
      {/* AI Marketing Worker Status Card */}
      <div className={`rounded-xl border p-5 ${isActive ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100' : 'bg-amber-100'}`}>
            <Zap className={`h-5 w-5 ${isActive ? 'text-green-700' : 'text-amber-700'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${isActive ? 'text-green-800' : 'text-amber-800'}`}>
              {isActive ? 'AI Marketing Worker — Active' : 'AI Marketing Worker — Not Applied'}
            </h3>
            {isActive ? (
              <>
                <p className="text-xs text-green-600 mt-0.5">
                  {isMarketingWorker && !isInTeam && 'Running as primary worker. All marketing modes enabled.'}
                  {isInTeam && teamMembers && (
                    <>Marketing team: {teamMembers.map(m => m.name || m.worker_id).join(' + ')}</>
                  )}
                  {isInTeam && !teamMembers && 'Part of an active AI team.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-amber-600 mt-0.5">
                  Apply the AI Marketing Worker to unlock full marketing capabilities — SEO research, content creation, competitor intel, and social drafting.
                </p>
                <button
                  onClick={() => {
                    // Navigate to AI Workers tab (parent tab navigation)
                    const el = document.querySelector('[data-tab-id="ai-workers"]') as HTMLButtonElement;
                    if (el) el.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  Go to AI Workers <ArrowRight className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Conversations" value={stats.conversations} sub="Total AI conversations" />
        <MetricCard label="Site Pages" value={stats.pages} sub="Generated content pages" />
        <MetricCard label="Contacts" value={stats.contacts} sub="CRM contacts captured" />
        <MetricCard label="AI Actions" value={stats.activities} sub="Actions taken by AI" />
      </div>

      {/* Recent Activity — from CRM activities */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
        {activities.length > 0 ? (
          <div className="space-y-2.5">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 text-base">
                  {a.type.includes('message') || a.type.includes('chat') ? '💬' :
                   a.type.includes('lead') || a.type.includes('contact') ? '🎯' :
                   a.type.includes('book') || a.type.includes('appointment') ? '📅' :
                   a.type.includes('email') ? '📧' :
                   a.type.includes('content') || a.type.includes('seo') ? '📝' :
                   a.actor === 'ai' ? '🤖' : '⚡'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700">{a.subject}</span>
                  {a.body && <p className="text-xs text-gray-400 truncate mt-0.5">{a.body}</p>}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
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
            { label: 'Research Keywords', tab: 'seo' as SubTab, icon: Search },
            { label: 'Draft Content', tab: 'content' as SubTab, icon: PenTool },
            { label: 'Check Competitors', tab: 'competitors' as SubTab, icon: Eye },
            { label: 'Draft Social Posts', tab: 'social' as SubTab, icon: Smartphone },
          ].map(a => (
            <button
              key={a.tab}
              onClick={() => onNavigate(a.tab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <a.icon className="w-3.5 h-3.5" />
              {a.label} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SEO View ─────────────────────────────────────────────────────────────────

function SEOView({ client }: { client: AgencyClient }) {
  const clientId = client.id;
  const cfg = client.container_config || {};

  const [seedKeyword, setSeedKeyword] = useState('');
  const [serpKeyword, setSerpKeyword] = useState('');
  const [rankDomain, setRankDomain] = useState('');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  const [ranks, setRanks] = useState<RankResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [hasDataForSEO, setHasDataForSEO] = useState<boolean | null>(null);
  const [aiEstimated, setAiEstimated] = useState(false);
  const seedInputRef = useRef<HTMLInputElement>(null);

  const businessName = (cfg.business_name as string) || client.name;
  const industry = (cfg.industry as string) || client.industry || '';

  const [seoError, setSeoError] = useState<string | null>(null);

  // Check if DataForSEO is configured
  useEffect(() => {
    fetch(`/api/agency/clients/${clientId}/seo/keywords?seed=test&limit=1`)
      .then(async r => {
        if (!r.ok) { setHasDataForSEO(false); return; }
        const data = await r.json();
        setHasDataForSEO(!data.mock);
      })
      .catch(() => setHasDataForSEO(false));
  }, [clientId]);

  const doResearch = useCallback(async () => {
    if (!seedKeyword.trim()) return;
    setLoading('research');
    setAiEstimated(false);

    // If DataForSEO is configured, use it
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
            setLoading(null);
            return;
          }
        }
      } catch { /* fall through to AI */ }
    }

    // AI-powered keyword research fallback
    try {
      const prompt = `Research SEO keywords for "${businessName}" in the ${industry || 'general'} industry. Seed keyword: "${seedKeyword}". Find 20 keywords with estimated difficulty and search volume.

Return ONLY a JSON array with this format (no markdown, no explanation):
[{"keyword":"example keyword","volume":1200,"kd":45,"cpc":2.50}]

Volume = estimated monthly search volume. KD = keyword difficulty 0-100. CPC = estimated cost per click in USD.`;

      const reply = await sendChatPrompt(clientId, prompt);

      // Try to parse JSON from the response
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
          setKeywords(parsed.map(k => ({
            keyword: String(k.keyword || ''),
            volume: Number(k.volume || 0),
            kd: Number(k.kd || 0),
            cpc: Number(k.cpc || 0),
          })));
          setAiEstimated(true);
        } catch {
          // If JSON parse fails, show as single result
          setKeywords([{ keyword: seedKeyword, volume: 0, kd: 0, cpc: 0 }]);
        }
      }
    } catch { /* handled by empty state */ }
    finally { setLoading(null); }
  }, [seedKeyword, clientId, hasDataForSEO, businessName, industry]);

  const doSerp = useCallback(async () => {
    if (!serpKeyword.trim()) return;
    setLoading('serp');
    setSeoError(null);
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
    } catch {
      setSeoError('Failed. Check DataForSEO credentials in Settings → Integrations.');
    } finally { setLoading(null); }
  }, [serpKeyword, clientId]);

  const doRank = useCallback(async () => {
    if (!rankDomain.trim()) return;
    setLoading('rank');
    setSeoError(null);
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
    } catch {
      setSeoError('Failed. Check DataForSEO credentials in Settings → Integrations.');
    } finally { setLoading(null); }
  }, [rankDomain, clientId]);

  return (
    <div className="space-y-6">
      {hasDataForSEO === false && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 mb-4 flex items-start gap-3">
          <Search className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-800">AI-Powered SEO Research</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              DataForSEO not configured. Using AI-estimated keyword data. Connect DataForSEO in Settings → Secrets for real search volume data.
            </p>
          </div>
        </div>
      )}

      {/* Keyword Research */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Keyword Research</h3>
        <div className="flex gap-2 mb-4">
          <input
            ref={seedInputRef}
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

        {aiEstimated && keywords.length > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 mb-3">
            <p className="text-xs text-blue-700">
              ℹ️ These are AI-estimated values. Connect DataForSEO for real search volume data.
            </p>
          </div>
        )}

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
                    <td className="py-2 text-right">
                      <span className={`${k.kd > 70 ? 'text-red-600' : k.kd > 40 ? 'text-amber-600' : 'text-green-600'}`}>
                        {k.kd}
                      </span>
                    </td>
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

      {seoError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{seoError}</p>
        </div>
      )}
    </div>
  );
}

// ── Content View ─────────────────────────────────────────────────────────────

const CONTENT_FORMATS = ['Blog Post', 'LinkedIn', 'Twitter Thread', 'Newsletter', 'Video Script'] as const;
type ContentFormat = typeof CONTENT_FORMATS[number];

function ContentView({ client }: { client: AgencyClient }) {
  const clientId = client.id;
  const cfg = client.container_config || {};
  const businessName = (cfg.business_name as string) || client.name;
  const industry = (cfg.industry as string) || client.industry || '';
  const brandTone = (cfg.brand_tone as string) || 'Professional and engaging';
  const contentPillars = (cfg.content_pillars as string) || '';

  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState<ContentFormat>('Blog Post');
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const pillarsLine = contentPillars ? ` Focus on content pillars: ${contentPillars}.` : '';
      const prompt = `Mode 2: Write a ${format.toLowerCase()} about "${topic}" for ${businessName} in ${industry || 'their industry'}. Match brand tone: ${brandTone}.${pillarsLine}

Make it professional, engaging, and ready to publish. Use appropriate formatting for a ${format.toLowerCase()}.`;

      const reply = await sendChatPrompt(clientId, prompt);

      const newDraft: ContentDraft = {
        id: `draft-${Date.now()}`,
        title: topic,
        format,
        status: 'Draft',
        created: new Date().toISOString(),
        body: reply,
      };
      setDrafts(prev => [newDraft, ...prev]);
      setTopic('');
    } catch { /* handled */ }
    finally { setGenerating(false); }
  }, [topic, format, clientId, businessName, industry, brandTone, contentPillars]);

  const deleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Content Generator */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Content Generator</h3>
        <p className="text-xs text-gray-500 mb-4">
          Generate marketing content using the AI Marketing Worker. All content is generated as drafts for your review.
        </p>
        <div className="flex gap-2 mb-2">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="Topic or title (e.g., 5 Ways AI is Changing Marketing)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={format}
            onChange={e => setFormat(e.target.value as ContentFormat)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          >
            {CONTENT_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
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

      {/* Content Library */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Content Library ({drafts.length})
        </h3>
        {drafts.length > 0 ? (
          <div className="space-y-3">
            {drafts.map(d => (
              <div key={d.id} className="border border-gray-200 rounded-xl p-4 relative">
                {/* Draft badge */}
                <div className="absolute top-3 right-3">
                  <DraftBadge />
                </div>
                <div className="flex items-center gap-2 mb-1 pr-36">
                  <span className="font-medium text-sm text-gray-900 truncate">{d.title}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{d.format}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  {new Date(d.created).toLocaleDateString()} · {new Date(d.created).toLocaleTimeString()}
                </p>

                {expanded === d.id ? (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
                    {d.body}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 truncate">{d.body.slice(0, 150)}...</p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {expanded === d.id ? 'Collapse' : 'Expand'}
                  </button>
                  <CopyButton text={d.body} />
                  <button
                    onClick={() => deleteDraft(d.id)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PenTool}
            title="No content yet"
            description="Generate your first content piece above. Content is generated as drafts awaiting your approval — blog posts, LinkedIn articles, Twitter threads, newsletters, and more."
          />
        )}
      </div>
    </div>
  );
}

// ── Competitors View ─────────────────────────────────────────────────────────

function CompetitorsView({ client }: { client: AgencyClient }) {
  const clientId = client.id;
  const cfg = client.container_config || {};
  const businessName = (cfg.business_name as string) || client.name;

  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<CompetitorResult[]>([]);
  const [autoScan, setAutoScan] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved competitors from container_config on mount
  useEffect(() => {
    const saved = cfg.marketing_competitors as string[] | undefined;
    if (saved && Array.isArray(saved)) {
      setCompetitors(saved);
    }
    const savedAutoScan = cfg.marketing_auto_scan as boolean | undefined;
    if (savedAutoScan !== undefined) {
      setAutoScan(savedAutoScan);
    }
  }, [cfg.marketing_competitors, cfg.marketing_auto_scan]);

  // Persist competitors to container_config
  const saveCompetitors = useCallback(async (domains: string[], autoScanEnabled?: boolean) => {
    setSaving(true);
    try {
      await fetch(`/api/agency/clients/${clientId}/container-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketing_competitors: domains,
          ...(autoScanEnabled !== undefined ? { marketing_auto_scan: autoScanEnabled } : {}),
        }),
      });
    } catch { /* non-fatal */ }
    finally { setSaving(false); }
  }, [clientId]);

  const addCompetitor = () => {
    const domain = newCompetitor.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (domain && !competitors.includes(domain)) {
      const updated = [...competitors, domain];
      setCompetitors(updated);
      setNewCompetitor('');
      saveCompetitors(updated);
    }
  };

  const removeCompetitor = (domain: string) => {
    const updated = competitors.filter(x => x !== domain);
    setCompetitors(updated);
    saveCompetitors(updated);
  };

  const toggleAutoScan = () => {
    const newVal = !autoScan;
    setAutoScan(newVal);
    saveCompetitors(competitors, newVal);
  };

  const scanCompetitors = useCallback(async () => {
    if (competitors.length === 0) return;
    setScanning(true);
    setResults([]);
    try {
      const prompt = `Mode 3: Analyze these competitors for ${businessName}: ${competitors.join(', ')}. Score each as 🔴 High threat, 🟡 Medium, 🟢 Low. Check their latest blog posts, pricing pages, and social activity.

Return ONLY a JSON array with this format (no markdown, no explanation):
[{"domain":"competitor.com","threat":"high","summary":"Brief analysis of competitive positioning, recent content, pricing strategy, and threat assessment."}]

threat must be one of: "high", "medium", "low"`;

      const reply = await sendChatPrompt(clientId, prompt);

      // Try to parse JSON from the response
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
          setResults(parsed.map(r => ({
            domain: String(r.domain || ''),
            threat: (['high', 'medium', 'low'].includes(String(r.threat)) ? String(r.threat) : 'medium') as 'high' | 'medium' | 'low',
            summary: String(r.summary || ''),
          })));
        } catch {
          // Fallback: show raw reply
          setResults(competitors.map(d => ({
            domain: d,
            threat: 'medium' as const,
            summary: reply,
          })));
        }
      } else {
        // No JSON — show the full reply for each competitor
        setResults(competitors.map(d => ({
          domain: d,
          threat: 'medium' as const,
          summary: reply,
        })));
      }
    } catch { /* handled */ }
    finally { setScanning(false); }
  }, [competitors, clientId, businessName]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Competitor Intelligence</h3>
        <p className="text-sm text-gray-500 mb-4">
          Track competitor domains. The AI Marketing Worker will analyze their content, pricing, and strategy.
          {saving && <span className="text-indigo-500 ml-2">Saving...</span>}
        </p>

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
          <>
            <div className="space-y-2 mb-4">
              {competitors.map(c => (
                <div key={c} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">{c}</span>
                  </div>
                  <button onClick={() => removeCompetitor(c)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={scanCompetitors}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Scan Competitors
              </button>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScan}
                  onChange={toggleAutoScan}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Scan weekly (automated)
              </label>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Eye}
            title="No competitors tracked"
            description="Add competitor domains above. Your AI Marketing Worker can scan their websites for content changes, pricing, and strategic moves. Competitors are saved and persisted."
          />
        )}
      </div>

      {/* Scan Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Scan Results</h3>
          {results.map(r => (
            <div key={r.domain} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-sm text-gray-900">{r.domain}</span>
                </div>
                <ThreatBadge level={r.threat} />
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Social View ──────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: '🔵' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
] as const;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function SocialView({ client }: { client: AgencyClient }) {
  const clientId = client.id;
  const cfg = client.container_config || {};
  const businessName = (cfg.business_name as string) || client.name;
  const industry = (cfg.industry as string) || client.industry || '';
  const brandTone = (cfg.brand_tone as string) || 'Professional and engaging';
  const linkedinTargets = (cfg.linkedin_targets as string) || '';

  const [postTopic, setPostTopic] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(['linkedin']));
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<SocialDraft[]>([]);
  const [activeSection, setActiveSection] = useState<'generate' | 'calendar' | 'engagement'>('generate');

  // Engagement comments
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [engagementComments, setEngagementComments] = useState('');

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least one
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!postTopic.trim() || selectedPlatforms.size === 0) return;
    setGenerating(true);
    try {
      const platforms = Array.from(selectedPlatforms).map(id => PLATFORMS.find(p => p.id === id)!.label);
      const prompt = `Write social media posts for ${businessName} (${industry || 'general industry'}) about: "${postTopic}". Brand tone: ${brandTone}.

Generate a separate post for EACH of these platforms: ${platforms.join(', ')}

Return ONLY a JSON array (no markdown, no explanation):
[{"platform":"LinkedIn","body":"Post content here..."},{"platform":"Twitter/X","body":"Tweet content here..."}]

Requirements per platform:
- LinkedIn: Professional, thought leadership, 150-300 words, use paragraphs and line breaks, end with a question or CTA
- Twitter/X: Concise, punchy, under 280 characters, use relevant hashtags
- Instagram: Visual-friendly caption, use emojis, include relevant hashtags at the end, 100-200 words`;

      const reply = await sendChatPrompt(clientId, prompt);

      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
          const newDrafts = parsed.map(p => ({
            id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            platform: String(p.platform || ''),
            topic: postTopic,
            body: String(p.body || ''),
            status: 'draft' as const,
            created: new Date().toISOString(),
          }));
          setDrafts(prev => [...newDrafts, ...prev]);
          setPostTopic('');
        } catch {
          // Fallback: single draft with full reply
          setDrafts(prev => [{
            id: `social-${Date.now()}`,
            platform: platforms[0],
            topic: postTopic,
            body: reply,
            status: 'draft' as const,
            created: new Date().toISOString(),
          }, ...prev]);
        }
      } else {
        // No JSON — create one draft per platform with the full reply
        const newDrafts = platforms.map(p => ({
          id: `social-${Date.now()}-${p}`,
          platform: p,
          topic: postTopic,
          body: reply,
          status: 'draft' as const,
          created: new Date().toISOString(),
        }));
        setDrafts(prev => [...newDrafts, ...prev]);
      }
    } catch { /* handled */ }
    finally { setGenerating(false); }
  }, [postTopic, selectedPlatforms, clientId, businessName, industry, brandTone]);

  const generateForDay = useCallback(async (day: string) => {
    if (generating) return;
    setGenerating(true);
    try {
      const platforms = Array.from(selectedPlatforms).map(id => PLATFORMS.find(p => p.id === id)!.label);
      const prompt = `Write a ${platforms[0]} post for ${businessName} (${industry || 'general industry'}). This is for ${day}. Brand tone: ${brandTone}. Pick a relevant topic for the day/week and make it engaging. Return just the post text, no JSON.`;

      const reply = await sendChatPrompt(clientId, prompt);

      setDrafts(prev => [{
        id: `social-${Date.now()}-${day}`,
        platform: platforms[0],
        topic: `${day} post`,
        body: reply,
        status: 'draft' as const,
        created: new Date().toISOString(),
        day,
      }, ...prev]);
    } catch { /* handled */ }
    finally { setGenerating(false); }
  }, [generating, selectedPlatforms, clientId, businessName, industry, brandTone]);

  const markAsPosted = (id: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'posted' as const } : d));
  };

  const deleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const draftEngagementComments = useCallback(async () => {
    setEngagementLoading(true);
    setEngagementComments('');
    try {
      const targets = linkedinTargets || 'relevant accounts in our industry';
      const prompt = `Mode 4: Draft 3 engagement comments for LinkedIn. Target accounts: ${targets}. Rotate styles: data point, personal experience, thoughtful question, different perspective.

For each comment, include:
1. Which target account it's for
2. A suggested post topic to comment on
3. The actual comment draft (2-4 sentences, genuine and helpful)

Make them feel authentic, not salesy. Each should offer genuine value.`;

      const reply = await sendChatPrompt(clientId, prompt);
      setEngagementComments(reply);
    } catch { /* handled */ }
    finally { setEngagementLoading(false); }
  }, [clientId, linkedinTargets]);

  const platformIcon = (name: string) => {
    const p = PLATFORMS.find(p => p.label.toLowerCase().includes(name.toLowerCase()) || p.id === name.toLowerCase());
    return p?.icon || '📱';
  };

  // Calendar: figure out current week's days
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    return WEEKDAYS.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const hasContent = drafts.some(d => d.day === label);
      const isToday = date.toDateString() === today.toDateString();
      return { label, dateStr, hasContent, isToday };
    });
  }, [drafts]);

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'generate' as const, label: 'Generate Posts', icon: PenTool },
          { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
          { id: 'engagement' as const, label: 'Engagement', icon: MessageSquare },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeSection === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Generate Section */}
      {activeSection === 'generate' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Social Content Studio</h3>
          <p className="text-xs text-gray-500 mb-4">Generate platform-specific posts. Select multiple platforms to generate all at once.</p>

          {/* Platform Selector */}
          <div className="flex gap-2 mb-4">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  selectedPlatforms.has(p.id)
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              value={postTopic}
              onChange={e => setPostTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="Topic or idea for the post..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !postTopic.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
              Generate {selectedPlatforms.size > 1 ? `(${selectedPlatforms.size})` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Calendar Section */}
      {activeSection === 'calendar' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Weekly Calendar</h3>
          <p className="text-xs text-gray-500 mb-4">Click a day to generate content. Filled slots show scheduled drafts.</p>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <button
                key={day.label}
                onClick={() => !day.hasContent && generateForDay(day.label)}
                disabled={generating}
                className={`rounded-lg border p-3 text-center transition-colors ${
                  day.isToday ? 'border-indigo-300 bg-indigo-50' :
                  day.hasContent ? 'border-green-200 bg-green-50' :
                  'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <p className={`text-xs font-medium ${day.isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {day.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{day.dateStr}</p>
                {day.hasContent ? (
                  <Check className="w-4 h-4 text-green-600 mx-auto mt-1" />
                ) : (
                  <Plus className="w-4 h-4 text-gray-300 mx-auto mt-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Section */}
      {activeSection === 'engagement' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">LinkedIn Engagement Comments</h3>
          <p className="text-xs text-gray-500 mb-4">
            Draft thoughtful engagement comments for target accounts.
            {linkedinTargets ? '' : ' Set LinkedIn Target Accounts in the AI Workers tab for personalized results.'}
          </p>

          <button
            onClick={draftEngagementComments}
            disabled={engagementLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 mb-4"
          >
            {engagementLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Draft Engagement Comments
          </button>

          {engagementComments && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative">
              <div className="absolute top-3 right-3">
                <CopyButton text={engagementComments} />
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap pr-8">{engagementComments}</p>
            </div>
          )}
        </div>
      )}

      {/* Draft Queue */}
      {drafts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Draft Queue ({drafts.filter(d => d.status === 'draft').length} pending)
          </h3>
          <div className="space-y-3">
            {drafts.map(d => (
              <div key={d.id} className="border border-gray-200 rounded-xl p-4 relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{platformIcon(d.platform)}</span>
                  <span className="text-sm font-medium text-gray-900">{d.platform}</span>
                  {d.day && <span className="text-xs text-gray-400">· {d.day}</span>}
                  <span className="text-xs text-gray-400">· {d.topic}</span>
                  <div className="ml-auto">
                    {d.status === 'draft' ? (
                      <DraftBadge />
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        ✓ Posted
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.body}</p>
                <div className="flex items-center gap-2 mt-3">
                  <CopyButton text={d.body} />
                  {d.status === 'draft' && (
                    <button
                      onClick={() => markAsPosted(d.id)}
                      className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                    >
                      <Check className="w-3 h-3" /> Mark as Posted
                    </button>
                  )}
                  <button
                    onClick={() => deleteDraft(d.id)}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      {subTab === 'dashboard' && <DashboardView client={client} onNavigate={setSubTab} />}
      {subTab === 'seo' && <SEOView client={client} />}
      {subTab === 'content' && <ContentView client={client} />}
      {subTab === 'competitors' && <CompetitorsView client={client} />}
      {subTab === 'social' && <SocialView client={client} />}
      {subTab === 'email' && <EmailMarketingTab client={client} />}
    </div>
  );
}
