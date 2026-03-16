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
  TrendingUp,
  Search,
  Link2,
  Plus,
  Rocket,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
  Save,
  RotateCcw,
  Home,
  Tag,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteData {
  id: string;
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
}

interface GrowthSuggestion {
  keyword: string;
  volume: number;
  action: string;
}

interface SitePage {
  id: string;
  site_id: string;
  slug: string;
  page_type: 'homepage' | 'service' | 'city' | 'city_service' | 'utility' | 'blog';
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  hero_h1: string | null;
  hero_subtitle: string | null;
  edited: boolean;
  edited_at: string | null;
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

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${styles[status] || styles.draft}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── SEO Health Checklist ──────────────────────────────────────────────────────

function SEOHealthChecklist({ site }: { site: SiteData }) {
  const checks = [
    { label: `Sitemap (${site.page_count} URLs)`, ok: site.status === 'live' },
    { label: 'Schema markup', ok: site.status === 'live' },
    { label: 'Meta tags (title + description)', ok: site.status === 'live' },
    { label: 'Mobile responsive', ok: true },
    { label: 'SSL certificate', ok: site.status === 'live' },
    { label: 'Google Search Console', ok: site.search_console_connected },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-400" />
        SEO Health
      </h4>
      <div className="space-y-2">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            {c.ok ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            )}
            <span className={`text-sm ${c.ok ? 'text-gray-700' : 'text-gray-400'}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Growth Engine Card ────────────────────────────────────────────────────────

function GrowthEngineCard({ suggestions }: { suggestions: GrowthSuggestion[] | null }) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          Growth Engine
        </h4>
        <p className="text-sm text-gray-400">
          Connect Google Search Console to unlock AI-powered growth suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-indigo-500" />
        Growth Engine
      </h4>
      <div className="space-y-2">
        {suggestions.slice(0, 5).map((s, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{s.keyword}</p>
              <p className="text-xs text-gray-400">{s.action}</p>
            </div>
            <div className="shrink-0 ml-3 flex items-center gap-1 text-xs text-indigo-600 font-medium">
              <ArrowUpRight className="h-3 w-3" />
              {s.volume?.toLocaleString() ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page Breakdown ────────────────────────────────────────────────────────────

function PageBreakdown({ pageCount }: { pageCount: number }) {
  const segs = [
    { label: 'Homepage',  count: 1,                     icon: Globe,    bg: 'bg-indigo-50',  text: 'text-indigo-700' },
    { label: 'Services',  count: Math.max(0, Math.floor((pageCount - 1) * 0.3)), icon: FileText, bg: 'bg-purple-50',  text: 'text-purple-700' },
    { label: 'Cities',    count: Math.max(0, Math.floor((pageCount - 1) * 0.4)), icon: MapPin,   bg: 'bg-blue-50',    text: 'text-blue-700'   },
    { label: 'Blog / FAQ',count: Math.max(0, Math.floor((pageCount - 1) * 0.3)), icon: FileText, bg: 'bg-amber-50',   text: 'text-amber-700'  },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {segs.map(seg => {
        const Icon = seg.icon;
        return (
          <div key={seg.label} className={`${seg.bg} rounded-xl p-3 text-center`}>
            <Icon className="h-4 w-4 mx-auto mb-1" />
            <p className="text-lg font-bold">{seg.count}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide">{seg.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Page Type Label ────────────────────────────────────────────────────────────

const PAGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  homepage:     { label: 'Home',         color: 'bg-indigo-100 text-indigo-700' },
  service:      { label: 'Service',      color: 'bg-purple-100 text-purple-700' },
  city:         { label: 'City',         color: 'bg-blue-100 text-blue-700'     },
  city_service: { label: 'City+Service', color: 'bg-cyan-100 text-cyan-700'     },
  utility:      { label: 'Utility',      color: 'bg-gray-100 text-gray-600'     },
  blog:         { label: 'Blog',         color: 'bg-amber-100 text-amber-700'   },
};

// ── Page Editor Modal ─────────────────────────────────────────────────────────

interface PageEditorModalProps {
  siteId: string;
  onClose: () => void;
}

function PageEditorModal({ siteId, onClose }: PageEditorModalProps) {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, Partial<SitePage>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function loadPages() {
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
    loadPages();
  }, [siteId]);

  const getEdit = (slug: string): Partial<SitePage> => editState[slug] ?? {};

  const updateEdit = (slug: string, field: keyof SitePage, value: string) => {
    setEditState(prev => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  };

  const handleSave = async (page: SitePage) => {
    const edits = editState[page.slug];
    if (!edits || Object.keys(edits).length === 0) return;

    setSaving(page.slug);
    try {
      const res = await fetch(
        `/api/agency/sites/${siteId}/pages/${encodeURIComponent(page.slug)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edits),
        }
      );
      if (res.ok) {
        const result = await res.json();
        setPages(prev => prev.map(p => (p.slug === page.slug ? { ...p, ...result.data } : p)));
        setEditState(prev => {
          const next = { ...prev };
          delete next[page.slug];
          return next;
        });
        setSaved(prev => ({ ...prev, [page.slug]: true }));
        setTimeout(() => setSaved(prev => { const n = { ...prev }; delete n[page.slug]; return n; }), 2500);
      }
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  };

  const handleRegenerate = async (page: SitePage) => {
    if (!window.confirm(`Regenerate "${page.title}"? This will overwrite any manual edits.`)) return;
    setRegenerating(page.slug);
    try {
      await fetch(
        `/api/agency/sites/${siteId}/pages/${encodeURIComponent(page.slug)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'regenerate' }),
        }
      );
    } finally {
      setRegenerating(null);
    }
  };

  const filteredPages = filter === 'all' ? pages : pages.filter(p => p.page_type === filter);
  const pageTypes = Array.from(new Set(pages.map(p => p.page_type)));
  const hasEdits = (slug: string) => editState[slug] && Object.keys(editState[slug]).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-4 sm:pt-10 px-2 sm:px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-purple-600" />
            <h2 className="text-base font-semibold text-gray-900">Edit Pages</h2>
            {!loading && (
              <span className="text-xs text-gray-400 font-normal">{pages.length} pages</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Filter tabs */}
        {!loading && pageTypes.length > 1 && (
          <div className="flex items-center gap-1 px-5 py-3 border-b border-gray-100 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All ({pages.length})
            </button>
            {pageTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${filter === type ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {PAGE_TYPE_LABELS[type]?.label ?? type} ({pages.filter(p => p.page_type === type).length})
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="divide-y divide-gray-100 max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No pages found.</div>
          ) : (
            filteredPages.map(page => {
              const isExpanded = expandedSlug === page.slug;
              const edits = getEdit(page.slug);
              const isDirty = hasEdits(page.slug);
              const typeInfo = PAGE_TYPE_LABELS[page.page_type] ?? { label: page.page_type, color: 'bg-gray-100 text-gray-600' };

              return (
                <div key={page.slug} className="group">
                  {/* Row header */}
                  <button
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedSlug(isExpanded ? null : page.slug)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {(edits as any).title || page.title}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        {page.edited && !isDirty && (
                          <span className="text-[10px] text-indigo-500 font-medium">✎ edited</span>
                        )}
                        {isDirty && (
                          <span className="text-[10px] text-amber-500 font-medium">● unsaved</span>
                        )}
                        {saved[page.slug] && (
                          <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> saved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">/{page.slug}</p>
                    </div>
                  </button>

                  {/* Expanded editor */}
                  {isExpanded && (
                    <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-100">
                      <div className="pt-4 space-y-4">
                        {/* H1 */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Page H1 <span className="font-normal text-gray-400">(main headline)</span>
                          </label>
                          <input
                            type="text"
                            value={(edits as any).hero_h1 ?? page.hero_h1 ?? ''}
                            onChange={e => updateEdit(page.slug, 'hero_h1', e.target.value)}
                            placeholder="Enter main headline..."
                            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
                          />
                        </div>

                        {/* Meta Title */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Meta Title{' '}
                            <span className={`font-normal ${((edits as any).meta_title ?? page.meta_title ?? '').length > 60 ? 'text-amber-500' : 'text-gray-400'}`}>
                              ({((edits as any).meta_title ?? page.meta_title ?? '').length}/60)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={(edits as any).meta_title ?? page.meta_title ?? ''}
                            onChange={e => updateEdit(page.slug, 'meta_title', e.target.value)}
                            placeholder="SEO page title..."
                            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
                          />
                        </div>

                        {/* Meta Description */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Meta Description{' '}
                            <span className={`font-normal ${((edits as any).meta_description ?? page.meta_description ?? '').length > 160 ? 'text-amber-500' : 'text-gray-400'}`}>
                              ({((edits as any).meta_description ?? page.meta_description ?? '').length}/160)
                            </span>
                          </label>
                          <textarea
                            rows={3}
                            value={(edits as any).meta_description ?? page.meta_description ?? ''}
                            onChange={e => updateEdit(page.slug, 'meta_description', e.target.value)}
                            placeholder="Brief description for search engines..."
                            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white resize-none"
                          />
                        </div>

                        {/* Hero subtitle */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Hero Subtitle <span className="font-normal text-gray-400">(subheadline)</span>
                          </label>
                          <input
                            type="text"
                            value={(edits as any).hero_subtitle ?? page.hero_subtitle ?? ''}
                            onChange={e => updateEdit(page.slug, 'hero_subtitle', e.target.value)}
                            placeholder="Supporting tagline below headline..."
                            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleSave(page)}
                            disabled={!isDirty || saving === page.slug}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {saving === page.slug ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            {saving === page.slug ? 'Saving…' : 'Save Changes'}
                          </button>
                          {isDirty && (
                            <button
                              onClick={() => {
                                setEditState(prev => {
                                  const next = { ...prev };
                                  delete next[page.slug];
                                  return next;
                                });
                              }}
                              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-white transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Discard
                            </button>
                          )}
                          <button
                            onClick={() => handleRegenerate(page)}
                            disabled={regenerating === page.slug}
                            className="ml-auto flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-white border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {regenerating === page.slug ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Regen
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Changes are saved page-by-page. Redeploy to publish.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
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
        Create an AI-powered website for {clientName} in under 5 minutes. SEO-optimized pages + trained AI worker — deployed instantly.
      </p>
      <Link
        href={`/agency/website/create?clientId=${encodeURIComponent(clientName || '')}&cid=${clientId}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <Sparkles className="h-4 w-4" />
        Build Website
      </Link>
    </div>
  );
}

// ── Main WebsiteTab ───────────────────────────────────────────────────────────

export default function WebsiteTab({ clientId, clientName }: WebsiteTabProps) {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPageEditor, setShowPageEditor] = useState(false);

  useEffect(() => {
    async function fetchSite() {
      try {
        const res = await fetch(`/api/agency/sites?clientId=${clientId}`);
        if (res.ok) {
          const result = await res.json();
          // API returns { ok: true, data: [...] }
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

  const handleAction = async (action: string) => {
    if (!site) return;
    if (action === 'regenerate' && !window.confirm('Regenerate all content? This will overwrite any manual edits.')) return;

    setActionLoading(action);
    try {
      const endpoint =
        action === 'regenerate'
          ? `/api/agency/sites/${site.id}/generate`
          : action === 'redeploy'
            ? `/api/agency/sites/${site.id}/deploy`
            : null;

      if (endpoint) {
        await fetch(endpoint, { method: 'POST' });
        // Refresh site data
        const res = await fetch(`/api/agency/sites?clientId=${clientId}`);
        if (res.ok) {
          const result = await res.json();
          const sites = result.data || result;
          const siteData = Array.isArray(sites) ? sites[0] : sites;
          if (siteData?.id) setSite(siteData);
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
    <>
      {showPageEditor && (
        <PageEditorModal siteId={site.id} onClose={() => setShowPageEditor(false)} />
      )}

      <div className="space-y-6">
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
                <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {site.last_deployed_at
                ? `Deployed ${new Date(site.last_deployed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'Not deployed'}
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
              <p className="text-sm font-medium text-gray-900">{site.design_style || '—'}</p>
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
            onClick={() => setShowPageEditor(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-center"
          >
            <PenLine className="h-5 w-5 text-purple-600" />
            <span className="text-xs font-medium text-gray-700">Edit Pages</span>
          </button>
          <button
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-amber-300 hover:bg-amber-50/50 transition-colors text-center"
            title="Coming soon"
            disabled
          >
            <Link2 className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-medium text-gray-400">Domain</span>
          </button>
        </div>

        {/* Growth Engine */}
        <GrowthEngineCard suggestions={site.growth_suggestions} />

        {/* SEO Health */}
        <SEOHealthChecklist site={site} />
      </div>
    </>
  );
}
