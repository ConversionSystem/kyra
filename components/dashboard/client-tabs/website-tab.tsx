'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Loader2,
  FileText,
  MapPin,
  PenLine,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Users,
  TrendingUp,
  Search,
  Link2,
  Rocket,
  Sparkles,
  Zap,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  Settings,
  Phone,
  Mail,
  User,
  MessageSquare,
} from 'lucide-react';
import type { SitePage, ContentSection, DesignStyle } from '@/lib/sites/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubView = 'overview' | 'pages' | 'leads' | 'growth' | 'settings';

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

interface DeployRecord {
  id: string;
  site_id: string;
  status: string;
  deployed_at: string;
  deploy_url?: string;
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
    deploying: 'bg-blue-100 text-blue-700 border-blue-200',
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

// ── SEO Health Checklist ──────────────────────────────────────────────────────

function SEOHealthChecklist({ site }: { site: SiteData }) {
  // Site has been deployed before — SEO infrastructure is in place
  const isDeployed = !!site.last_deployed_at || site.status === 'live';
  const checks = [
    { label: `Sitemap (${site.page_count} URLs)`, ok: isDeployed },
    { label: 'Schema markup (LocalBusiness + FAQ)', ok: isDeployed },
    { label: 'Meta tags (title + description)', ok: isDeployed },
    { label: 'Mobile responsive', ok: true },
    { label: 'SSL certificate (HTTPS)', ok: isDeployed },
    { label: 'Google Search Console', ok: site.search_console_connected },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-400" />
        SEO Health
      </h4>
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {check.ok ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className={check.ok ? 'text-gray-700' : 'text-amber-700'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
      {!site.search_console_connected && (
        <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg p-2">
          Connect Google Search Console to unlock Growth Engine data and track real search performance.
        </p>
      )}
    </div>
  );
}

// ── Page Breakdown ────────────────────────────────────────────────────────────

function PageBreakdown({ pageCount }: { pageCount: number }) {
  const core = Math.min(pageCount, 10);
  const local = Math.max(0, Math.min(pageCount - core, 20));
  const blog = Math.max(0, pageCount - core - local);

  const segments = [
    { label: 'Core', count: core, icon: FileText, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { label: 'Local', count: local, icon: MapPin, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: 'Blog', count: blog, icon: PenLine, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex gap-3">
      {segments.map((seg) => {
        const Icon = seg.icon;
        return (
          <div key={seg.label} className={`flex-1 rounded-xl border p-3 text-center ${seg.color}`}>
            <Icon className="h-4 w-4 mx-auto mb-1" />
            <p className="text-lg font-bold">{seg.count}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide">{seg.label}</p>
          </div>
        );
      })}
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
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/agency/website/quick-start?clientId=${encodeURIComponent(clientName || '')}&cid=${clientId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Zap className="h-4 w-4" />
          Quick Start (3 fields)
        </Link>
        <Link
          href={`/agency/website/create?clientId=${encodeURIComponent(clientName || '')}&cid=${clientId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 bg-white text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Full Wizard
        </Link>
      </div>
    </div>
  );
}

// ── Sub-Nav ───────────────────────────────────────────────────────────────────

const SUB_VIEWS: { key: SubView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'pages', label: 'Pages' },
  { key: 'leads', label: 'Leads' },
  { key: 'growth', label: 'Growth' },
  { key: 'settings', label: 'Settings' },
];

function SubNav({ view, setView }: { view: SubView; setView: (v: SubView) => void }) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      {SUB_VIEWS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setView(key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            view === key
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Pages View ────────────────────────────────────────────────────────────────

function PagesView({ siteId }: { siteId: string }) {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ hero_h1: string; content_sections: ContentSection[] }>({
    hero_h1: '',
    content_sections: [],
  });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetch(`/api/agency/sites/${siteId}/pages`);
        if (res.ok) {
          const result = await res.json();
          setPages(result.data || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchPages();
  }, [siteId]);

  const expandPage = (page: SitePage) => {
    if (expandedSlug === page.slug) {
      setExpandedSlug(null);
      return;
    }
    setExpandedSlug(page.slug);
    setEditValues({
      hero_h1: page.hero_h1 || '',
      content_sections: page.content_sections || [],
    });
    setFeedback('');
  };

  const savePage = async (slug: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/pages/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_h1: editValues.hero_h1,
          content_sections: editValues.content_sections,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setPages((prev) => prev.map((p) => (p.slug === slug ? { ...p, ...result.data } : p)));
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const regeneratePage = async (slug: string) => {
    setRegenerating(slug);
    try {
      await fetch(`/api/agency/sites/${siteId}/pages/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', feedback: feedback || undefined }),
      });
      // Refetch after a short delay to show new content
      setTimeout(async () => {
        const res = await fetch(`/api/agency/sites/${siteId}/pages`);
        if (res.ok) {
          const result = await res.json();
          setPages(result.data || []);
        }
        setRegenerating(null);
      }, 3000);
    } catch {
      setRegenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        No pages generated yet. Use the <strong>Regenerate</strong> action on the Overview tab to generate content.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">{pages.length} Pages</h4>
      </div>
      {pages.map((page) => (
        <div key={page.slug} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => expandPage(page)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">{page.title}</span>
                <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                  {page.page_type}
                </span>
                {page.edited && (
                  <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">
                    edited
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">/{page.slug}</p>
            </div>
            {expandedSlug === page.slug ? (
              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            )}
          </button>

          {expandedSlug === page.slug && (
            <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hero H1</label>
                <input
                  type="text"
                  value={editValues.hero_h1}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, hero_h1: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {editValues.content_sections.map((section, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={section.heading}
                    onChange={(e) => {
                      const updated = [...editValues.content_sections];
                      updated[i] = { ...updated[i], heading: e.target.value };
                      setEditValues((prev) => ({ ...prev, content_sections: updated }));
                    }}
                    className="w-full px-2 py-1.5 text-sm font-medium border border-gray-200 rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Section heading"
                  />
                  <textarea
                    value={section.body}
                    onChange={(e) => {
                      const updated = [...editValues.content_sections];
                      updated[i] = { ...updated[i], body: e.target.value };
                      setEditValues((prev) => ({ ...prev, content_sections: updated }));
                    }}
                    rows={4}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                    placeholder="Section body"
                  />
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => savePage(page.slug)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Optional feedback for AI..."
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    onClick={() => regeneratePage(page.slug)}
                    disabled={regenerating === page.slug}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition"
                  >
                    {regenerating === page.slug ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    AI Regenerate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Leads View ────────────────────────────────────────────────────────────────

interface LeadContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
  source_url: string | null;
  custom_fields: Record<string, string> | null;
}

function LeadsView({ siteId }: { siteId: string }) {
  const [leads, setLeads] = useState<LeadContact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch(`/api/agency/sites/${siteId}/leads?limit=50`);
        if (res.ok) {
          const result = await res.json();
          setLeads(result.data || []);
          setTotal(result.total || 0);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
        <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <User className="h-6 w-6 text-indigo-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads yet</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Leads from your contact form, hero form, and chat widget will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{total} leads from this site</h3>
        <span className="text-xs text-gray-400">Sorted by most recent</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {leads.map((lead) => {
            const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Anonymous';
            const inquiry = lead.custom_fields?.inquiry || null;
            const date = new Date(lead.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            });
            return (
              <div key={lead.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-indigo-600">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                    <span className="text-xs text-gray-400 shrink-0">{date}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-600 transition-colors">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.email && (
                      <a href={`mailto:${lead.email}`}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-600 transition-colors">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </a>
                    )}
                  </div>
                  {inquiry && (
                    <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                      <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="truncate">{inquiry}</span>
                    </p>
                  )}
                </div>
                {lead.status && (
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 font-medium ${
                    lead.status === 'new' ? 'bg-green-100 text-green-700' :
                    lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {lead.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Growth View ───────────────────────────────────────────────────────────────

function GrowthView({ site, onRefreshSite }: { site: SiteData; onRefreshSite: () => Promise<void> }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [implementing, setImplementing] = useState<string | null>(null);
  const [deploys, setDeploys] = useState<DeployRecord[]>([]);
  const [deploysLoading, setDeploysLoading] = useState(true);

  useEffect(() => {
    async function fetchDeploys() {
      try {
        const res = await fetch(`/api/agency/sites/${site.id}/deploys`);
        if (res.ok) {
          const result = await res.json();
          setDeploys(result.data || []);
        }
      } catch {
        // silent
      } finally {
        setDeploysLoading(false);
      }
    }
    fetchDeploys();
  }, [site.id]);

  // NOTE: Growth analysis is NOT auto-triggered — user clicks "Analyze" manually

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await fetch(`/api/agency/sites/${site.id}/growth`, { method: 'POST' });
      // Poll for results after background job completes
      setTimeout(async () => {
        await onRefreshSite();
        setAnalyzing(false);
      }, 5000);
    } catch {
      setAnalyzing(false);
    }
  };

  const implementSuggestion = async (suggestion: GrowthSuggestion) => {
    const key = suggestion.slug || suggestion.title;
    setImplementing(key);
    try {
      await fetch(`/api/agency/sites/${site.id}/growth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion }),
      });
      await onRefreshSite();
    } catch {
      // silent
    } finally {
      setImplementing(null);
    }
  };

  const suggestions = site.growth_suggestions || [];
  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* Analyze button */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Growth Engine
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              AI analyzes your site and suggests new pages to drive organic traffic.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analyze with AI
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">
            {suggestions.length} Suggestions
          </h4>
          {suggestions.map((s, i) => {
            const key = s.slug || s.title;
            return (
              <div
                key={i}
                className={`bg-white rounded-xl border shadow-sm p-4 ${s.implemented ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{s.title}</p>
                      <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border ${priorityColors[s.priority] || priorityColors.low}`}>
                        {s.priority}
                      </span>
                      <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {s.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                    {s.estimatedVolume && (
                      <p className="text-xs text-indigo-600 mt-1">~{s.estimatedVolume} searches/mo</p>
                    )}
                    {s.slug && <p className="text-xs text-gray-400 mt-0.5">{s.slug}</p>}
                  </div>
                  {s.implemented ? (
                    <span className="shrink-0 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                      Implemented
                    </span>
                  ) : (
                    <button
                      onClick={() => implementSuggestion(s)}
                      disabled={implementing === key}
                      className="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {implementing === key ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Implement'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy history */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Rocket className="h-4 w-4 text-gray-400" />
          Deploy History
        </h4>
        {deploysLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : deploys.length === 0 ? (
          <p className="text-xs text-gray-500">No deploys yet.</p>
        ) : (
          <div className="space-y-2">
            {deploys.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === 'success' ? 'bg-green-500' : d.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'}`} />
                  <span className="text-gray-700 capitalize">{d.status}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(d.deployed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings View ─────────────────────────────────────────────────────────────

function EmbedCodeCard({ clientId, siteName }: { clientId: string; siteName: string }) {
  const [copied, setCopied] = useState(false);
  const embedCode = `<script src="https://kyra.conversionsystem.com/api/widget/${clientId}/script" async></script>`;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 className="text-sm font-semibold text-gray-900 mb-1">Chat Widget Embed Code</h4>
      <p className="text-xs text-gray-500 mb-3">
        Add this to any website to embed {siteName}&apos;s AI chat widget.
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 font-mono text-xs text-gray-700 break-all">
        {embedCode}
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        {copied ? <><CheckCircle2 className="h-4 w-4" /> Copied!</> : <><Link2 className="h-4 w-4" /> Copy Embed Code</>}
      </button>
    </div>
  );
}

function SettingsView({ site, onRefreshSite, onDeleteSite }: {
  site: SiteData;
  onRefreshSite: () => Promise<void>;
  onDeleteSite: () => void;
}) {
  const [form, setForm] = useState({
    site_domain: site.site_domain || '',
    ga4_id: site.ga4_id || '',
    booking_url: site.booking_url || '',
    white_label: site.white_label || false,
    color_primary: site.color_primary || '#6366f1',
    design_style: site.design_style || 'modern-dark',
    ai_name: site.ai_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/agency/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        // If site is live, auto-redeploy so changes take effect
        if (site.status === 'live') {
          await fetch(`/api/agency/sites/${site.id}/build`, { method: 'POST' });
        }
        await onRefreshSite();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this website? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agency/sites/${site.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleteSite();
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-400" />
          Site Settings
        </h4>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Custom Domain</label>
          <input
            type="text"
            value={form.site_domain}
            onChange={(e) => setForm((f) => ({ ...f, site_domain: e.target.value }))}
            placeholder="example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">GA4 Measurement ID</label>
          <input
            type="text"
            value={form.ga4_id}
            onChange={(e) => setForm((f) => ({ ...f, ga4_id: e.target.value }))}
            placeholder="G-XXXXXXXXXX"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Booking URL</label>
          <input
            type="text"
            value={form.booking_url}
            onChange={(e) => setForm((f) => ({ ...f, booking_url: e.target.value }))}
            placeholder="https://calendly.com/..."
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">AI Worker Name</label>
          <input
            type="text"
            value={form.ai_name}
            onChange={(e) => setForm((f) => ({ ...f, ai_name: e.target.value }))}
            placeholder="Alex"
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">Name shown in the chat widget</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="white-label"
            checked={form.white_label}
            onChange={(e) => setForm((f) => ({ ...f, white_label: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="white-label" className="text-sm text-gray-700">White-label (remove branding)</label>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.color_primary}
              onChange={(e) => setForm((f) => ({ ...f, color_primary: e.target.value }))}
              className="h-9 w-14 rounded border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={form.color_primary}
              onChange={(e) => setForm((f) => ({ ...f, color_primary: e.target.value }))}
              className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Design Style</label>
          <select
            value={form.design_style}
            onChange={(e) => setForm((f) => ({ ...f, design_style: e.target.value as DesignStyle }))}
            className={inputClass}
          >
            <option value="modern-dark">Modern Dark</option>
            <option value="clean-light">Clean Light</option>
            <option value="bold">Bold</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? (site.status === 'live' ? 'Saving & Redeploying…' : 'Saving…') : 'Save & Redeploy'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Saved — redeploying now
            </span>
          )}
        </div>
      </div>

      {/* Widget embed code */}
      {site.client_id && (
        <EmbedCodeCard clientId={site.client_id} siteName={site.business_name} />
      )}

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
        <h4 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h4>
        <p className="text-xs text-gray-500 mb-3">
          Permanently delete this website and all its pages. This action cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete Website
        </button>
      </div>
    </div>
  );
}

// ── Overview View (original content) ──────────────────────────────────────────

function OverviewView({
  site,
  siteUrl,
  actionLoading,
  handleAction,
  setView,
}: {
  site: SiteData;
  siteUrl: string | null;
  actionLoading: string | null;
  handleAction: (action: string) => void;
  setView: (v: SubView) => void;
}) {
  // Growth card compat: support both new (title/description) and legacy (keyword/volume/action)
  const suggestions = site.growth_suggestions;
  const hasLegacy = suggestions && suggestions.length > 0 && !!suggestions[0].keyword;

  return (
    <div className="space-y-6">
      {/* Live site preview card */}
      {siteUrl && site.status === 'live' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-gray-500 font-mono ml-2">{siteUrl.replace('https://','')}</span>
            </div>
            <a href={siteUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium">
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="relative" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={siteUrl}
              title={`${site.business_name} preview`}
              className="absolute inset-0 w-full h-full border-0"
              style={{ transform: 'scale(0.5)', transformOrigin: '0 0', width: '200%', height: '200%' }}
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Page breakdown */}
      <PageBreakdown pageCount={site.page_count} />

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => handleAction('regenerate')}
          disabled={!!actionLoading}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-center disabled:opacity-50"
        >
          {actionLoading === 'regenerate' ? (
            <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5 text-indigo-500" />
          )}
          <span className="text-xs font-medium text-gray-700">Regenerate</span>
        </button>
        <button
          onClick={() => handleAction('redeploy')}
          disabled={!!actionLoading}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-green-300 hover:bg-green-50/50 transition-colors text-center disabled:opacity-50"
        >
          {actionLoading === 'redeploy' ? (
            <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
          ) : (
            <Rocket className="h-5 w-5 text-green-500" />
          )}
          <span className="text-xs font-medium text-gray-700">Redeploy</span>
        </button>
        <button
          onClick={() => setView('pages')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-center"
        >
          <PenLine className="h-5 w-5 text-purple-500" />
          <span className="text-xs font-medium text-gray-700">Edit Pages</span>
        </button>
        <button
          onClick={() => setView('settings')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-amber-300 hover:bg-amber-50/50 transition-colors text-center"
        >
          <Link2 className="h-5 w-5 text-amber-500" />
          <span className="text-xs font-medium text-gray-700">Domain</span>
        </button>
      </div>

      {/* Growth Engine — supports both legacy and new format */}
      {hasLegacy ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Growth Engine
            </h4>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {suggestions!.length} suggestions
            </span>
          </div>
          <div className="space-y-2">
            {suggestions!.map((suggestion, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 font-medium truncate">
                    &ldquo;{suggestion.keyword}&rdquo;
                  </p>
                  <p className="text-xs text-gray-500">{suggestion.volume} searches/mo</p>
                </div>
                <button
                  onClick={() => setView('growth')}
                  className="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {suggestion.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Growth Engine
          </h4>
          {suggestions && suggestions.length > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-3">
                {suggestions.length} growth suggestions available.
              </p>
              <button
                onClick={() => setView('growth')}
                className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                View Suggestions
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Growth suggestions will appear here after your site has been live for a few weeks and Google
                Search Console is connected.
              </p>
              <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-xs text-indigo-700">
                  The Growth Engine analyzes your search data and suggests new pages, FAQs, and blog
                  posts to drive more organic traffic.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* SEO Health */}
      <SEOHealthChecklist site={site} />
    </div>
  );
}

// ── Main WebsiteTab ───────────────────────────────────────────────────────────

export default function WebsiteTab({ clientId, clientName }: WebsiteTabProps) {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [view, setView] = useState<SubView>('overview');

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
      } catch { /* silent */ }
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
    <div className="space-y-6">
      {/* Deploying/building banner with self-heal button */}
      {['deploying', 'building', 'generating'].includes(site.status) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-500 shrink-0 animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-800">
              {site.status === 'generating' ? 'AI is generating content…' :
               site.status === 'building' ? 'Compiling your site…' :
               'Deploying to the web…'}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
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
              } catch { /* silent */ }
            }}
            className="shrink-0 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition whitespace-nowrap"
          >
            Check if Live
          </button>
        </div>
      )}

      {/* Error banner */}
      {site.status === 'error' && site.last_deployed_at && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
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

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
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
          <div className="flex items-center gap-3">
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Visit Site
              </a>
            )}
            <Link
              href={`/agency/clients/${site.client_id || ''}/site-portal`}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition"
            >
              <Users className="h-3.5 w-3.5" />
              Client View
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {site.last_deployed_at
                ? `Deployed ${new Date(site.last_deployed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'Not deployed'}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xl font-bold text-gray-900">{site.page_count}</p>
            <p className="text-xs text-gray-500">Pages</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{site.industry}</p>
            <p className="text-xs text-gray-500">Industry</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{site.design_style || '\u2014'}</p>
            <p className="text-xs text-gray-500">Design</p>
          </div>
          {site.ai_name && (
            <div>
              <p className="text-sm font-medium text-gray-900">{site.ai_name}</p>
              <p className="text-xs text-gray-500">AI Worker</p>
            </div>
          )}
        </div>
      </div>

      {/* Sub-nav */}
      <SubNav view={view} setView={setView} />

      {/* View content */}
      {view === 'overview' && (
        <OverviewView
          site={site}
          siteUrl={siteUrl}
          actionLoading={actionLoading}
          handleAction={handleAction}
          setView={setView}
        />
      )}
      {view === 'pages' && <PagesView siteId={site.id} />}
      {view === 'leads' && <LeadsView siteId={site.id} />}
      {view === 'growth' && <GrowthView site={site} onRefreshSite={refreshSite} />}
      {view === 'settings' && (
        <SettingsView
          site={site}
          onRefreshSite={refreshSite}
          onDeleteSite={() => setSite(null)}
        />
      )}
    </div>
  );
}
