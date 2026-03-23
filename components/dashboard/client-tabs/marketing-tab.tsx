'use client';

import { useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Search,
  PenTool,
  Eye,
  Smartphone,
  Target,
  TrendingUp,
  ArrowRight,
  Loader2,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

// ── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'dashboard' | 'seo' | 'content' | 'competitors' | 'social' | 'leads' | 'analytics';

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
  format: 'Blog' | 'LinkedIn' | 'Twitter' | 'Newsletter';
  status: 'Draft' | 'In Review' | 'Approved' | 'Published';
  created: string;
  body: string;
  url?: string;
}

interface Competitor {
  domain: string;
  lastChecked: string;
  newContent: number;
}

interface ThreatItem {
  competitor: string;
  title: string;
  url: string;
  level: 'High' | 'Medium' | 'Low';
  date: string;
}

interface SocialPost {
  id: string;
  text: string;
  status: 'Draft' | 'Approved' | 'Posted';
  date: string;
}

interface CommentDraft {
  id: string;
  targetAccount: string;
  postSummary: string;
  comment: string;
  status: 'Draft' | 'Approved';
}

interface Lead {
  id: string;
  name: string;
  source: 'LinkedIn' | 'Web' | 'Forum';
  signal: string;
  date: string;
  score: number;
}

interface AnalyticsData {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  daily: { date: string; clicks: number; impressions: number }[];
  quickWins: { keyword: string; position: number; impressions: number }[];
  drops: { keyword: string; oldPosition: number; newPosition: number }[];
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_KEYWORDS: Keyword[] = [
  { keyword: 'ai customer support', volume: 12100, kd: 45, cpc: 8.50, priority: 92 },
  { keyword: 'automated chat solutions', volume: 6600, kd: 38, cpc: 6.20, priority: 85 },
  { keyword: 'business ai assistant', volume: 4400, kd: 52, cpc: 11.30, priority: 78 },
  { keyword: 'ai workflow automation', volume: 3200, kd: 41, cpc: 9.10, priority: 74 },
  { keyword: 'smart business chatbot', volume: 2900, kd: 35, cpc: 5.80, priority: 71 },
];

const MOCK_SERP: SerpResult[] = [
  { position: 1, title: 'Top 10 AI Customer Support Tools in 2026', url: 'https://techreview.com/ai-support-tools', wordCount: 3200 },
  { position: 2, title: 'AI Customer Support: Complete Guide', url: 'https://hubspot.com/ai-customer-support', wordCount: 4500 },
  { position: 3, title: 'How AI is Changing Customer Support', url: 'https://zendesk.com/blog/ai-support', wordCount: 2800 },
  { position: 4, title: 'Best AI Chatbots for Business Support', url: 'https://g2.com/ai-chatbots', wordCount: 2100 },
  { position: 5, title: 'AI Support Automation Platform', url: 'https://intercom.com/ai', wordCount: 1900 },
];

const MOCK_RANKS: RankResult[] = [
  { keyword: 'ai assistant platform', position: 8, change: 3 },
  { keyword: 'business chatbot builder', position: 14, change: -2 },
  { keyword: 'ai customer service tool', position: 22, change: 5 },
  { keyword: 'automated support bot', position: 11, change: 0 },
  { keyword: 'ai workflow builder', position: 31, change: -8 },
];

const MOCK_DRAFTS: ContentDraft[] = [
  { id: '1', title: '5 Ways AI Assistants Boost Customer Retention', format: 'Blog', status: 'Draft', created: '2026-03-22', body: 'Customer retention is the backbone of sustainable growth. In this post, we explore five proven strategies where AI assistants make a measurable difference...' },
  { id: '2', title: 'Why Your Business Needs an AI Workflow in 2026', format: 'LinkedIn', status: 'In Review', created: '2026-03-21', body: 'The businesses that thrive in 2026 won\'t be the ones with the biggest teams — they\'ll be the ones with the smartest workflows.\n\nHere\'s why AI workflow automation is no longer optional...' },
  { id: '3', title: 'AI Support ROI: Real Numbers from Real Businesses', format: 'Newsletter', status: 'Approved', created: '2026-03-20', body: 'We surveyed 200+ businesses using AI support tools. Here\'s what we found about their return on investment...' },
  { id: '4', title: 'The Future of Customer Service is Here', format: 'Blog', status: 'Published', created: '2026-03-18', body: 'Published content about the future of AI in customer service.', url: 'https://example.com/blog/future-customer-service' },
];

const MOCK_COMPETITORS: Competitor[] = [
  { domain: 'competitor-ai.com', lastChecked: '2026-03-22', newContent: 3 },
  { domain: 'rival-chatbot.io', lastChecked: '2026-03-21', newContent: 1 },
  { domain: 'botbuilder.co', lastChecked: '2026-03-20', newContent: 5 },
];

const MOCK_THREATS: ThreatItem[] = [
  { competitor: 'competitor-ai.com', title: 'New Enterprise AI Support Suite Launch', url: 'https://competitor-ai.com/enterprise', level: 'High', date: '2026-03-22' },
  { competitor: 'rival-chatbot.io', title: 'Case Study: 50% Reduction in Support Tickets', url: 'https://rival-chatbot.io/case-study', level: 'Medium', date: '2026-03-21' },
  { competitor: 'botbuilder.co', title: 'Free Tier Now Includes AI Training', url: 'https://botbuilder.co/pricing', level: 'High', date: '2026-03-20' },
  { competitor: 'competitor-ai.com', title: 'Integration with Salesforce Announced', url: 'https://competitor-ai.com/salesforce', level: 'Medium', date: '2026-03-19' },
  { competitor: 'botbuilder.co', title: 'New Blog: AI Chatbot Best Practices', url: 'https://botbuilder.co/blog/best-practices', level: 'Low', date: '2026-03-18' },
];

const MOCK_SOCIAL_POSTS: SocialPost[] = [
  { id: '1', text: '🚀 Just published our latest case study on AI-powered customer support. The results? 40% fewer tickets, 60% faster resolution.\n\nThe future of support isn\'t about replacing humans — it\'s about empowering them.\n\n#AI #CustomerSupport #Automation', status: 'Draft', date: '2026-03-22' },
  { id: '2', text: 'Hot take: Most businesses don\'t need more support agents. They need smarter workflows.\n\nAI assistants handle the repetitive 80% so your team can focus on the complex 20%.\n\nWho\'s already seeing this in their org?', status: 'Approved', date: '2026-03-21' },
  { id: '3', text: 'Proud to announce our new AI workflow builder! Build custom automation in minutes, not months.\n\nLink in comments 👇', status: 'Posted', date: '2026-03-19' },
];

const MOCK_COMMENTS: CommentDraft[] = [
  { id: '1', targetAccount: 'Sarah Chen (VP of Ops at TechCorp)', postSummary: 'Shared challenges with scaling customer support team', comment: 'Great insights, Sarah! We\'ve seen similar challenges. One approach that\'s worked well is using AI to handle tier-1 tickets automatically — frees up the team for complex cases. Happy to share what we\'ve learned.', status: 'Draft' },
  { id: '2', targetAccount: 'Mike Johnson (CTO at ScaleUp)', postSummary: 'Asked about AI chatbot recommendations for SaaS', comment: 'Mike, great question! The key is finding a solution that integrates with your existing stack. We\'ve had success with session-based AI that maintains context across conversations. DM me if you want to chat more about it.', status: 'Approved' },
];

const MOCK_LEADS: Lead[] = [
  { id: '1', name: 'Sarah Chen', source: 'LinkedIn', signal: 'Posted about struggling with support ticket volume', date: '2026-03-22', score: 92 },
  { id: '2', name: 'DataFlow Inc.', source: 'Web', signal: 'Visited pricing page 3x this week, downloaded AI whitepaper', date: '2026-03-21', score: 88 },
  { id: '3', name: 'Mike Johnson', source: 'LinkedIn', signal: 'Asked for AI chatbot recommendations in SaaS group', date: '2026-03-21', score: 85 },
  { id: '4', name: 'RetailPlus Co.', source: 'Forum', signal: 'Mentioned evaluating AI support tools on Reddit', date: '2026-03-20', score: 72 },
  { id: '5', name: 'Elena Rodriguez', source: 'LinkedIn', signal: 'Commented on competitor\'s post about limitations', date: '2026-03-19', score: 68 },
];

const MOCK_ANALYTICS: AnalyticsData = {
  clicks: 2847,
  impressions: 48200,
  ctr: 5.9,
  avgPosition: 18.4,
  daily: Array.from({ length: 30 }, (_, i) => ({
    date: `Mar ${i + 1}`,
    clicks: Math.floor(60 + Math.random() * 80 + (i * 2)),
    impressions: Math.floor(1200 + Math.random() * 600 + (i * 30)),
  })),
  quickWins: [
    { keyword: 'ai support automation', position: 14, impressions: 820 },
    { keyword: 'chatbot for business', position: 18, impressions: 650 },
    { keyword: 'ai customer service platform', position: 22, impressions: 540 },
  ],
  drops: [
    { keyword: 'ai workflow builder', oldPosition: 23, newPosition: 31 },
    { keyword: 'automated business chat', oldPosition: 15, newPosition: 28 },
  ],
};

const MOCK_ACTIVITIES = [
  { icon: '✍️', desc: 'Drafted blog post: "5 Ways AI Assistants Boost Customer Retention"', time: '2 hours ago' },
  { icon: '👀', desc: 'Competitor alert: competitor-ai.com launched Enterprise AI Suite', time: '4 hours ago' },
  { icon: '🎯', desc: 'New lead identified: Sarah Chen (LinkedIn, score: 92)', time: '5 hours ago' },
  { icon: '🔍', desc: 'Keyword research completed: 12 new opportunities found', time: '8 hours ago' },
  { icon: '📱', desc: 'LinkedIn post drafted and queued for approval', time: '12 hours ago' },
  { icon: '📈', desc: 'Ranking improved: "ai assistant platform" moved from #11 to #8', time: '1 day ago' },
  { icon: '✍️', desc: 'Newsletter draft: "AI Support ROI: Real Numbers"', time: '1 day ago' },
  { icon: '👀', desc: 'Competitor content detected: botbuilder.co published 5 new posts', time: '2 days ago' },
  { icon: '🎯', desc: 'Lead found: DataFlow Inc. visited pricing page 3x', time: '2 days ago' },
  { icon: '📈', desc: 'Weekly analytics report generated', time: '3 days ago' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function DemoBanner({ service }: { service: string }) {
  return (
    <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5 mb-4">
      <p className="text-sm text-indigo-700">
        <span className="font-medium">Demo data</span> — connect {service} in Settings → Secrets for live results
      </p>
    </div>
  );
}

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

function ThreatBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const colors = { High: 'bg-red-50 text-red-700', Medium: 'bg-amber-50 text-amber-700', Low: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[level]}`}>
      {level}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    LinkedIn: 'bg-blue-50 text-blue-700',
    Web: 'bg-purple-50 text-purple-700',
    Forum: 'bg-orange-50 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[source] || 'bg-gray-100 text-gray-700'}`}>
      {source}
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

function SimpleBar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Sub-Tab Views ────────────────────────────────────────────────────────────

function DashboardView({ onNavigate }: { onNavigate: (tab: SubTab) => void }) {
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Content Drafted This Week" value="4 posts" />
        <MetricCard label="Comments Drafted" value="2" />
        <MetricCard label="Leads Found" value="5" />
        <MetricCard label="Competitor Alerts" value="3" />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
        <div className="space-y-2.5">
          {MOCK_ACTIVITIES.map((a, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="shrink-0 text-base">{a.icon}</span>
              <span className="text-gray-700 flex-1">{a.desc}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Research Keywords', tab: 'seo' as SubTab },
            { label: 'Draft a Post', tab: 'content' as SubTab },
            { label: 'Check Competitors', tab: 'competitors' as SubTab },
            { label: 'Find Leads', tab: 'leads' as SubTab },
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

function SEOView({ clientId }: { clientId: string }) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [serpKeyword, setSerpKeyword] = useState('');
  const [rankDomain, setRankDomain] = useState('');
  const [keywords, setKeywords] = useState<Keyword[]>(MOCK_KEYWORDS);
  const [serpResults, setSerpResults] = useState<SerpResult[]>(MOCK_SERP);
  const [ranks, setRanks] = useState<RankResult[]>(MOCK_RANKS);
  const [loading, setLoading] = useState<string | null>(null);

  const doResearch = useCallback(async () => {
    if (!seedKeyword.trim()) return;
    setLoading('research');
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: seedKeyword }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.keywords?.length) setKeywords(data.keywords);
      }
    } catch { /* use mock data */ }
    setLoading(null);
  }, [clientId, seedKeyword]);

  const doSerp = useCallback(async () => {
    if (!serpKeyword.trim()) return;
    setLoading('serp');
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/serp?keyword=${encodeURIComponent(serpKeyword)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results?.length) setSerpResults(data.results);
      }
    } catch { /* use mock data */ }
    setLoading(null);
  }, [clientId, serpKeyword]);

  const doRank = useCallback(async () => {
    if (!rankDomain.trim()) return;
    setLoading('rank');
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/rank?domain=${encodeURIComponent(rankDomain)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.rankings?.length) setRanks(data.rankings);
      }
    } catch { /* use mock data */ }
    setLoading(null);
  }, [clientId, rankDomain]);

  return (
    <div className="space-y-6">
      <DemoBanner service="DataForSEO" />

      {/* Keyword Research */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Keyword Research</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={seedKeyword}
            onChange={e => setSeedKeyword(e.target.value)}
            placeholder="Enter seed keyword..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={e => e.key === 'Enter' && doResearch()}
          />
          <button
            onClick={doResearch}
            disabled={loading === 'research'}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'research' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Research'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Keyword</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Volume</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">KD</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">CPC</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Priority</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-900">{kw.keyword}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{kw.volume.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{kw.kd}</td>
                  <td className="py-2 px-2 text-right text-gray-600">${kw.cpc.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      kw.priority >= 80 ? 'bg-green-50 text-green-700' : kw.priority >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>{kw.priority}</span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Track</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SERP Analysis */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">SERP Analysis</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={serpKeyword}
            onChange={e => setSerpKeyword(e.target.value)}
            placeholder="Enter keyword to analyze..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={e => e.key === 'Enter' && doSerp()}
          />
          <button
            onClick={doSerp}
            disabled={loading === 'serp'}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'serp' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze SERP'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">#</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">URL</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Words</th>
              </tr>
            </thead>
            <tbody>
              {serpResults.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-400 font-medium">{r.position}</td>
                  <td className="py-2 px-2 text-gray-900">{r.title}</td>
                  <td className="py-2 px-2 text-gray-500 text-xs truncate max-w-[200px]">{r.url}</td>
                  <td className="py-2 px-2 text-right text-gray-600">{r.wordCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rank Tracking */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Rank Tracking</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={rankDomain}
            onChange={e => setRankDomain(e.target.value)}
            placeholder="Enter domain to track..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={e => e.key === 'Enter' && doRank()}
          />
          <button
            onClick={doRank}
            disabled={loading === 'rank'}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'rank' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check Rankings'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Keyword</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Position</th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Change</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-900">{r.keyword}</td>
                  <td className="py-2 px-2 text-right text-gray-600 font-medium">#{r.position}</td>
                  <td className="py-2 px-2 text-right">
                    {r.change > 0 && <span className="text-green-600 font-medium">↑ {r.change}</span>}
                    {r.change < 0 && <span className="text-red-600 font-medium">↓ {Math.abs(r.change)}</span>}
                    {r.change === 0 && <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ContentView({ clientId }: { clientId: string }) {
  const [drafts, setDrafts] = useState<ContentDraft[]>(MOCK_DRAFTS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newFormat, setNewFormat] = useState<ContentDraft['format']>('Blog');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!newTopic.trim()) return;
    setGenerating(true);
    // Simulate AI generation
    await new Promise(r => setTimeout(r, 1500));
    const newDraft: ContentDraft = {
      id: Date.now().toString(),
      title: newTopic,
      format: newFormat,
      status: 'Draft',
      created: new Date().toISOString().split('T')[0],
      body: `AI-generated draft about "${newTopic}" in ${newFormat} format. This content will be generated by the AI Marketing Worker based on your SEO research and brand voice...`,
    };
    setDrafts(prev => [newDraft, ...prev]);
    setShowNewForm(false);
    setNewTopic('');
    setGenerating(false);
  }, [newTopic, newFormat]);

  const queueDrafts = drafts.filter(d => d.status !== 'Published');
  const published = drafts.filter(d => d.status === 'Published');

  return (
    <div className="space-y-6">
      {/* Content Queue */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Content Queue</h3>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Draft
          </button>
        </div>

        {showNewForm && (
          <div className="mb-4 p-4 rounded-lg border border-indigo-100 bg-indigo-50/50">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="Topic or title..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={newFormat}
                onChange={e => setNewFormat(e.target.value as ContentDraft['format'])}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Blog">Blog</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter">Twitter</option>
                <option value="Newsletter">Newsletter</option>
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !newTopic.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />Generating...</> : 'Generate'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {queueDrafts.map(d => (
            <div key={d.id} className="border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
              <button
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                  <p className="text-xs text-gray-500">{d.format} · {d.created}</p>
                </div>
                <StatusBadge status={d.status} />
                {expanded === d.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {expanded === d.id && (
                <div className="px-3 pb-3 border-t border-gray-50">
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{d.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Published Content */}
      {published.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Published Content</h3>
          <div className="space-y-2">
            {published.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                  <p className="text-xs text-gray-500">{d.format} · {d.created}</p>
                </div>
                <StatusBadge status={d.status} />
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompetitorsView() {
  const [competitors, setCompetitors] = useState<Competitor[]>(MOCK_COMPETITORS);
  const [threats] = useState<ThreatItem[]>(MOCK_THREATS);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [scanning, setScanning] = useState<string | null>(null);

  const addCompetitor = useCallback(() => {
    if (!newCompetitor.trim()) return;
    const domain = newCompetitor.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    setCompetitors(prev => [...prev, { domain, lastChecked: 'Never', newContent: 0 }]);
    setNewCompetitor('');
  }, [newCompetitor]);

  const scanCompetitor = useCallback(async (domain: string) => {
    setScanning(domain);
    await new Promise(r => setTimeout(r, 2000));
    setCompetitors(prev => prev.map(c =>
      c.domain === domain ? { ...c, lastChecked: new Date().toISOString().split('T')[0], newContent: Math.floor(Math.random() * 5) } : c
    ));
    setScanning(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Monitored Competitors */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Monitored Competitors</h3>
        <div className="space-y-2 mb-4">
          {competitors.map(c => (
            <div key={c.domain} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{c.domain}</p>
                <p className="text-xs text-gray-500">Last checked: {c.lastChecked} · {c.newContent} new posts</p>
              </div>
              <button
                onClick={() => scanCompetitor(c.domain)}
                disabled={scanning === c.domain}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              >
                {scanning === c.domain ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Scan Now
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCompetitor}
            onChange={e => setNewCompetitor(e.target.value)}
            placeholder="Add competitor URL..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={e => e.key === 'Enter' && addCompetitor()}
          />
          <button
            onClick={addCompetitor}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Threat Feed */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Threat Feed</h3>
        <div className="space-y-2">
          {threats.map((t, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  <ThreatBadge level={t.level} />
                </div>
                <p className="text-xs text-gray-500">{t.competitor} · {t.date}</p>
              </div>
              <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 shrink-0">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SocialView() {
  const [posts] = useState<SocialPost[]>(MOCK_SOCIAL_POSTS);
  const [comments] = useState<CommentDraft[]>(MOCK_COMMENTS);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const draftPosts = posts.filter(p => p.status === 'Draft');
  const approvedPosts = posts.filter(p => p.status === 'Approved');

  return (
    <div className="space-y-6">
      {/* LinkedIn Post Queue */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">LinkedIn Post Queue</h3>
        <div className="space-y-3">
          {draftPosts.map(p => (
            <div key={p.id} className="p-3 border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={p.status} />
                <span className="text-xs text-gray-400">{p.date}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{p.text}</p>
              <div className="flex gap-2">
                <button className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors">Approve</button>
                <button className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Drafts */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Comment Drafts</h3>
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="p-3 border border-gray-100 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">{c.targetAccount}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-xs text-gray-500 mb-2 italic">Re: {c.postSummary}</p>
              <p className="text-sm text-gray-700 mb-2">{c.comment}</p>
              <div className="flex gap-2">
                {c.status === 'Draft' && (
                  <button className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors">Approve</button>
                )}
                <button
                  onClick={() => copyToClipboard(c.comment, c.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {copied === c.id ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approved for Posting */}
      {approvedPosts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Approved for Posting</h3>
          <div className="space-y-3">
            {approvedPosts.map(p => (
              <div key={p.id} className="p-3 border border-green-100 bg-green-50/30 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{p.text}</p>
                <button
                  onClick={() => copyToClipboard(p.text, `post-${p.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  {copied === `post-${p.id}` ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy to Clipboard</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);

  const dismissLead = useCallback((id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const leadsThisWeek = leads.filter(l => l.date >= '2026-03-17').length;
  const topSource = 'LinkedIn';

  return (
    <div className="space-y-6">
      {/* Lead Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Leads This Week" value={leadsThisWeek} />
        <MetricCard label="Top Source" value={topSource} />
        <MetricCard label="Avg Score" value={Math.round(leads.reduce((a, l) => a + l.score, 0) / (leads.length || 1))} />
      </div>

      {/* Lead Feed */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Lead Feed</h3>
        <div className="space-y-2">
          {leads.map(l => (
            <div key={l.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900">{l.name}</p>
                  <SourceBadge source={l.source} />
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    l.score >= 80 ? 'bg-green-50 text-green-700' : l.score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    Score: {l.score}
                  </span>
                </div>
                <p className="text-xs text-gray-500 italic">{l.signal}</p>
                <p className="text-xs text-gray-400 mt-0.5">{l.date}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors">
                  Add to CRM
                </button>
                <button
                  onClick={() => dismissLead(l.id)}
                  className="px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
          {leads.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No leads yet. The AI worker will find leads as it monitors your industry.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ onNavigate }: { onNavigate: (tab: SubTab) => void }) {
  const [data] = useState<AnalyticsData>(MOCK_ANALYTICS);
  const [generatingReport, setGeneratingReport] = useState(false);

  const maxImpressions = Math.max(...data.daily.map(d => d.impressions));
  const maxClicks = Math.max(...data.daily.map(d => d.clicks));

  const handleGenerateReport = useCallback(async () => {
    setGeneratingReport(true);
    await new Promise(r => setTimeout(r, 2000));
    setGeneratingReport(false);
  }, []);

  return (
    <div className="space-y-6">
      <DemoBanner service="Google Search Console" />

      {/* Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Clicks" value={data.clicks.toLocaleString()} sub="Last 30 days" />
        <MetricCard label="Impressions" value={data.impressions.toLocaleString()} sub="Last 30 days" />
        <MetricCard label="Avg CTR" value={`${data.ctr}%`} sub="Last 30 days" />
        <MetricCard label="Avg Position" value={data.avgPosition.toFixed(1)} sub="Last 30 days" />
      </div>

      {/* Click Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">30-Day Click Trend</h3>
        <div className="flex items-end gap-[2px] h-24">
          {data.daily.map((d, i) => (
            <div
              key={i}
              className="flex-1 bg-indigo-400 hover:bg-indigo-600 rounded-t transition-colors cursor-default"
              style={{ height: `${(d.clicks / maxClicks) * 100}%` }}
              title={`${d.date}: ${d.clicks} clicks`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">Mar 1</span>
          <span className="text-[10px] text-gray-400">Mar 30</span>
        </div>
      </div>

      {/* Impression Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">30-Day Impression Trend</h3>
        <div className="flex items-end gap-[2px] h-24">
          {data.daily.map((d, i) => (
            <div
              key={i}
              className="flex-1 bg-purple-300 hover:bg-purple-500 rounded-t transition-colors cursor-default"
              style={{ height: `${(d.impressions / maxImpressions) * 100}%` }}
              title={`${d.date}: ${d.impressions} impressions`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">Mar 1</span>
          <span className="text-[10px] text-gray-400">Mar 30</span>
        </div>
      </div>

      {/* Quick Wins */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Wins (Position 11-30, High Impressions)</h3>
        <div className="space-y-2">
          {data.quickWins.map((qw, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{qw.keyword}</p>
                <p className="text-xs text-gray-500">Position #{qw.position} · {qw.impressions.toLocaleString()} impressions</p>
              </div>
              <button
                onClick={() => onNavigate('content')}
                className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
              >
                Create Content
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking Drops */}
      {data.drops.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Ranking Drops</h3>
          <div className="space-y-2">
            {data.drops.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-red-100 bg-red-50/30 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{d.keyword}</p>
                  <p className="text-xs text-gray-500">#{d.oldPosition} → #{d.newPosition}</p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  ↓ {d.newPosition - d.oldPosition}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Report */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Weekly Report</h3>
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {generatingReport ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : 'Generate Report'}
          </button>
        </div>
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
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

export default function MarketingTab({ client }: { client: AgencyClient }) {
  const [subTab, setSubTab] = useState<SubTab>('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Marketing Command Center</h2>
        <p className="text-sm text-gray-500 mt-0.5">SEO, content, competitors, social, leads & analytics — all in one place.</p>
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
      {subTab === 'dashboard' && <DashboardView onNavigate={setSubTab} />}
      {subTab === 'seo' && <SEOView clientId={client.id} />}
      {subTab === 'content' && <ContentView clientId={client.id} />}
      {subTab === 'competitors' && <CompetitorsView />}
      {subTab === 'social' && <SocialView />}
      {subTab === 'leads' && <LeadsView />}
      {subTab === 'analytics' && <AnalyticsView onNavigate={setSubTab} />}
    </div>
  );
}
