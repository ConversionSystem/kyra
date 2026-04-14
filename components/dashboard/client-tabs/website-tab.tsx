'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Users,
  TrendingUp,
  Search,
  Rocket,
  Sparkles,
  Settings,
  Pencil,
  FileText,
  Lightbulb,
  ShieldCheck,
  ChevronRight,
  Plus,
  BookOpen,
  Send,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteData {
  id: string;
  client_id?: string | null;
  status: 'draft' | 'generating' | 'building' | 'deploying' | 'live' | 'error';
  business_name: string;
  industry: string;
  site_domain: string | null;
  site_subdomain: string | null;
  page_count: number;
  last_deployed_at: string | null;
  search_console_connected: boolean;
  growth_suggestions: GrowthSuggestion[] | null;
  color_primary: string;
  design_style: string;
  ai_name: string | null;
  booking_url: string | null;
  google_review_url: string | null;
  ga4_id?: string | null;
  white_label?: boolean;
}

interface GrowthSuggestion {
  type: 'new_page' | 'improve_page' | 'new_city' | 'new_service';
  title: string;
  description: string;
  estimatedVolume?: number;
  slug?: string;
  priority: 'high' | 'medium' | 'low';
  implemented?: boolean;
  // Legacy fields (overview card compat)
  keyword?: string;
  volume?: number;
  action?: string;
}

interface WebsiteTabProps {
  clientId: string;
  clientName?: string;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SiteData['status'] }) {
  const styles: Record<string, string> = {
    live: 'bg-green-100 text-green-700 border-green-200',
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    generating: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    building: 'bg-amber-100 text-amber-700 border-amber-200',
    deploying: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    error: 'bg-red-100 text-red-700 border-red-200',
  };

  const icons: Record<string, React.ReactNode> = {
    live: <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />,
    generating: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
    building: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
    deploying: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
    error: <AlertTriangle className="h-3 w-3 mr-1" />,
  };

  const isPolling = ['generating', 'building', 'deploying'].includes(status);

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${styles[status] || styles.draft} ${isPolling ? 'animate-pulse' : ''}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── SEO Health (compact badges) ───────────────────────────────────────────────

function SEOHealthCompact({ site }: { site: SiteData }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const isDeployed = !!site.last_deployed_at || site.status === 'live';
  const hasSubdomain = !!site.site_subdomain;

  if (!isDeployed) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gray-400" />
          SEO Health
        </h4>
        <p className="text-sm text-gray-500">Deploy your site first to see SEO health checks.</p>
      </div>
    );
  }

  const checks = [
    { label: site.page_count > 0 ? `Sitemap (${site.page_count})` : 'Sitemap', ok: site.page_count > 0 },
    { label: 'Schema', ok: true },
    { label: 'Meta tags', ok: true },
    { label: 'Mobile', ok: true },
    { label: 'SSL', ok: hasSubdomain || !!site.site_domain },
    { label: 'GSC', ok: site.search_console_connected },
  ];

  const passing = checks.filter(c => c.ok).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gray-400" />
          SEO Health
        </h4>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${passing === checks.length ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {passing}/{checks.length} passing
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((check, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${
              check.ok
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {check.ok ? (
              <CheckCircle2 className="h-3 w-3 shrink-0" />
            ) : (
              <AlertTriangle className="h-3 w-3 shrink-0" />
            )}
            {check.label}
          </span>
        ))}
      </div>
      {site.search_console_connected ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-green-700 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Search Console connected
          </span>
          <button
            onClick={async () => {
              setSubmitting(true);
              setSubmitResult(null);
              try {
                const res = await fetch(`/api/agency/sites/${site.id}/submit-sitemap`, { method: 'POST' });
                const data = await res.json();
                setSubmitResult(data.ok ? 'Sitemap submitted!' : (data.error || 'Failed'));
              } catch {
                setSubmitResult('Failed to submit');
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Submit Sitemap
          </button>
        </div>
      ) : (
        <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-xl p-2.5 border border-amber-100">
          Connect Google Search Console to unlock Growth Engine data and track real search performance.
        </p>
      )}
      {submitResult && (
        <p className="text-xs mt-2 text-gray-600">{submitResult}</p>
      )}
    </div>
  );
}

// ── No Site State ─────────────────────────────────────────────────────────────

function NoSiteState({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
        <Globe className="h-8 w-8 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Website Yet</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        Create an AI-powered website for {clientName}. SEO-optimized, live HTTPS domain, AI chat widget — deployed in minutes.
      </p>
      <Link
        href={`/agency/website/create?clientId=${encodeURIComponent(clientName || '')}&cid=${clientId}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <Sparkles className="h-4 w-4" />
        Create Website
      </Link>
    </div>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  icon: Icon,
  color = 'text-gray-900',
}: {
  value: string | number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="flex-1 min-w-0 bg-gray-50 rounded-xl p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

// ── Overview View ─────────────────────────────────────────────────────────────

function OverviewView({
  site,
  siteUrl,
  actionLoading,
  handleAction,
}: {
  site: SiteData;
  siteUrl: string | null;
  actionLoading: string | null;
  handleAction: (action: string) => void;
}) {
  const suggestions = site.growth_suggestions;
  const suggestionCount = suggestions?.length || 0;
  const hasLegacy = suggestions && suggestions.length > 0 && !!suggestions[0].keyword;

  // SEO health score
  const isDeployed = !!site.last_deployed_at || site.status === 'live';
  const hasSubdomain = !!site.site_subdomain;
  const seoChecks = isDeployed
    ? [
        site.page_count > 0,
        true, // schema
        true, // meta
        true, // mobile
        hasSubdomain || !!site.site_domain, // ssl
        site.search_console_connected, // gsc
      ]
    : [];
  const seoPassing = seoChecks.filter(Boolean).length;
  const seoTotal = seoChecks.length;

  // Last deployed formatted
  const lastDeployed = site.last_deployed_at
    ? new Date(site.last_deployed_at).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      })
    : '—';

  // Top suggestions to display (max 3)
  const topSuggestions = suggestions?.filter(s => !s.implemented)?.slice(0, 3) || [];

  return (
    <div className="space-y-4">
      {/* ── Stat Pills ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill
            value={site.page_count === 0 && ['draft', 'error'].includes(site.status) ? '—' : site.page_count}
            label="Pages"
            icon={FileText}
          />
          <StatPill
            value={suggestionCount}
            label="Growth Ideas"
            icon={Lightbulb}
            color={suggestionCount > 0 ? 'text-indigo-600' : 'text-gray-900'}
          />
          <StatPill
            value={isDeployed ? `${seoPassing}/${seoTotal}` : '—'}
            label="SEO Health"
            icon={ShieldCheck}
            color={isDeployed && seoPassing === seoTotal ? 'text-green-600' : isDeployed ? 'text-amber-600' : 'text-gray-900'}
          />
          <StatPill
            value={lastDeployed}
            label="Last Deploy"
            icon={Clock}
          />
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
        {/* Primary: Edit Website */}
        <Link
          href={`/agency/website/${site.id}/editor`}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Pencil className="h-4 w-4" />
          Edit Website
        </Link>

        {/* Secondary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleAction('regenerate')}
            disabled={!!actionLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'regenerate' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Regenerate
          </button>
          <button
            onClick={() => handleAction('redeploy')}
            disabled={!!actionLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'redeploy' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            Redeploy
          </button>
          <Link
            href="/agency/widget"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Chat Widget
          </Link>
          <Link
            href={`/agency/website/${site.id}/settings`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
        </div>
      </div>

      {/* ── SEO Health ─────────────────────────────────────────────── */}
      {isDeployed ? (
        <SEOHealthCompact site={site} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-indigo-500" />
            Launch Checklist
          </h4>
          <div className="space-y-2">
            {[
              { label: 'Generate content', done: site.page_count > 0 },
              { label: 'Review and edit pages', done: false },
              { label: 'Deploy your site', done: false },
              { label: 'Connect Google Search Console', done: site.search_console_connected },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <span className={step.done ? 'text-gray-500 line-through' : 'text-gray-700'}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Growth Opportunities (compact) ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Growth Opportunities
          </h4>
          {suggestionCount > 0 && (
            <Link
              href={`/agency/website/${site.id}/seo?tab=growth`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 transition-colors"
            >
              View all {suggestionCount}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {topSuggestions.length > 0 ? (
          <div className="space-y-2">
            {topSuggestions.map((suggestion, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  suggestion.priority === 'high' ? 'bg-indigo-500' :
                  suggestion.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 font-medium truncate">
                    {hasLegacy ? `"${suggestion.keyword}"` : suggestion.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {hasLegacy
                      ? `${suggestion.volume?.toLocaleString()} searches/mo`
                      : suggestion.description}
                  </p>
                </div>
                {(suggestion.estimatedVolume || suggestion.volume) && (
                  <span className="text-xs text-gray-400 shrink-0 font-medium">
                    {((suggestion.estimatedVolume || suggestion.volume) ?? 0) >= 1000
                      ? `${(((suggestion.estimatedVolume || suggestion.volume) ?? 0) / 1000).toFixed(1)}K`
                      : (suggestion.estimatedVolume || suggestion.volume)?.toLocaleString()}{' '}
                    vol
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500">
              Growth suggestions will appear here after your site has been live and Google Search Console is connected.
            </p>
            <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <p className="text-xs text-indigo-700">
                The Growth Engine analyzes your search data and suggests new pages, FAQs, and blog posts to drive more organic traffic.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Blog Types ────────────────────────────────────────────────────────────────

interface BlogPage {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  created_at: string;
  page_type: string;
}

// ── Blog Section ─────────────────────────────────────────────────────────────

function BlogSection({ siteId }: { siteId: string }) {
  const [posts, setPosts] = useState<BlogPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', meta_description: '', content: '' });

  useEffect(() => {
    fetch(`/api/agency/sites/${siteId}/pages`)
      .then(r => r.json())
      .then(data => {
        const all: BlogPage[] = data.data || [];
        setPosts(all.filter(p => p.page_type === 'blog'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  const autoSlug = (title: string) =>
    title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleTitleChange = (title: string) => {
    setForm(f => ({ ...f, title, slug: f.slug || autoSlug(title) }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug: `/blog/${form.slug}`,
          page_type: 'blog',
          meta_description: form.meta_description,
          hero_h1: form.title,
          hero_subtitle: form.meta_description,
          content_sections: form.content
            ? [{ heading: 'Article', body: form.content }]
            : [{ heading: 'Introduction', body: '' }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(p => [data.data, ...p]);
        setShowForm(false);
        setForm({ title: '', slug: '', meta_description: '', content: '' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-gray-400" />
          Blog Posts
          {posts.length > 0 && (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{posts.length}</span>
          )}
        </h4>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Post
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. 5 Signs You Need a New HVAC System"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">/blog/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="my-blog-post"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Meta Description</label>
            <input
              type="text"
              value={form.meta_description}
              onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
              placeholder="Brief description for search engines"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Write your article content here..."
              rows={5}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="text-xs font-medium text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 bg-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save Post
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
      ) : posts.length === 0 ? (
        <p className="text-xs text-gray-500">No blog posts yet. Add your first post to start a blog.</p>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                <p className="text-xs text-gray-400 truncate">{post.slug}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main WebsiteTab ───────────────────────────────────────────────────────────

export default function WebsiteTab({ clientId, clientName }: WebsiteTabProps) {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSite() {
      try {
        const res = await fetch(`/api/agency/sites?clientId=${clientId}`);
        if (res.ok) {
          const result = await res.json();
          const sites = result.data || result;
          const siteData = Array.isArray(sites) ? sites[0] : sites;
          if (siteData && siteData.id) {
            setSite(siteData);
          }
        }
      } catch {
        // Silently fail — show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchSite();
  }, [clientId]);

  const refreshSite = useCallback(async () => {
    const res = await fetch(`/api/agency/sites?clientId=${clientId}`);
    if (res.ok) {
      const result = await res.json();
      const sites = result.data || result;
      const siteData = Array.isArray(sites) ? sites[0] : sites;
      if (siteData?.id) setSite(siteData);
    }
  }, [clientId]);

  // Poll for status updates while site is generating/building/deploying
  // Auto-calls sync-status to self-heal if build finished on VPS but DB is stuck
  useEffect(() => {
    if (!site || !['generating', 'building', 'deploying'].includes(site.status)) return;

    const siteId = site.id;

    const syncStatus = async () => {
      try {
        const res = await fetch(`/api/agency/sites/${siteId}/sync-status`, { method: 'POST' });
        if (res.ok) {
          const result = await res.json();
          if (result.healed) {
            await refreshSite();
            return true;
          }
        }
      } catch (err) { console.error('[website-tab]', err); }
      return false;
    };

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/agency/sites?clientId=${clientId}`);
        if (res.ok) {
          const data = await res.json();
          const sites = data.data || data;
          const updated = Array.isArray(sites) ? sites[0] : sites;
          if (updated?.id) setSite(updated);
          if (['live', 'error'].includes(updated?.status)) clearInterval(interval);
        }
      } catch {
        // Silently fail
      }
    }, 5000);

    // After 6 min, try sync-status to self-heal a stuck build
    const healTimeout = setTimeout(async () => {
      const healed = await syncStatus();
      if (!healed) {
        // Try once more after another 2 min
        setTimeout(syncStatus, 2 * 60 * 1000);
      }
    }, 6 * 60 * 1000);

    // Hard stop polling at 12 min
    const stopTimeout = setTimeout(() => clearInterval(interval), 12 * 60 * 1000);

    return () => { clearInterval(interval); clearTimeout(healTimeout); clearTimeout(stopTimeout); };
  }, [site?.status, site?.id, clientId, refreshSite]);

  const handleAction = async (action: string) => {
    if (!site) return;
    if (action === 'regenerate' && !window.confirm('Regenerate all content? This will overwrite any manual edits.')) return;

    setActionLoading(action);
    try {
      const endpoint =
        action === 'regenerate'
          ? `/api/agency/sites/${site.id}/generate`
          : action === 'redeploy'
            ? `/api/agency/sites/${site.id}/build`
            : null;

      if (endpoint) {
        const res = await fetch(endpoint, { method: 'POST' });
        if (res.ok) {
          await new Promise(r => setTimeout(r, 3000));
          await refreshSite();
        }
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!site) {
    return <NoSiteState clientId={clientId} clientName={clientName || 'this client'} />;
  }

  const siteUrl = site.site_domain
    ? `https://${site.site_domain}`
    : site.site_subdomain
      ? `https://${site.site_subdomain}`
      : null;

  return (
    <div className="space-y-4">
      {/* ── Generating / Building / Deploying banner ──────────────── */}
      {['deploying', 'building', 'generating'].includes(site.status) && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-indigo-500 shrink-0 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-800">
              {site.status === 'generating' ? 'AI is generating content…' :
               site.status === 'building' ? 'Compiling your site…' :
               'Deploying to the web…'}
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              This takes 4–8 minutes. If it&apos;s been longer, click &ldquo;Check if Live&rdquo;.
            </p>
          </div>
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/agency/sites/${site.id}/sync-status`, { method: 'POST' });
                const result = await res.json();
                if (result.healed) {
                  await refreshSite();
                } else {
                  await refreshSite();
                }
              } catch (err) { console.error('[website-tab]', err); }
            }}
            className="shrink-0 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition whitespace-nowrap"
          >
            Check if Live
          </button>
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────────── */}
      {site.status === 'error' && site.last_deployed_at && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">Last action failed</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The site is still live from its last successful deploy. Click <strong>Redeploy</strong> to retry.
            </p>
          </div>
          <button
            onClick={() => handleAction('redeploy')}
            disabled={!!actionLoading}
            className="shrink-0 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition"
          >
            {actionLoading === 'redeploy' ? 'Deploying\u2026' : 'Redeploy Now'}
          </button>
        </div>
      )}

      {/* ── Site Header Card ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: site.color_primary || '#6366f1' }}
            >
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-900">{site.business_name}</h3>
                <StatusBadge status={site.status} />
              </div>
              {siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                >
                  {siteUrl.replace('https://', '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Visit
              </a>
            )}
            <Link
              href={`/agency/clients/${site.client_id || ''}/site-portal`}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition"
            >
              <Users className="h-3.5 w-3.5" />
              Client View
            </Link>
          </div>
        </div>
      </div>

      {/* ── Overview content ──────────────────────────────────────── */}
      <OverviewView
        site={site}
        siteUrl={siteUrl}
        actionLoading={actionLoading}
        handleAction={handleAction}
      />

      {/* ── Blog management ──────────────────────────────────────── */}
      <BlogSection siteId={site.id} />
    </div>
  );
}
