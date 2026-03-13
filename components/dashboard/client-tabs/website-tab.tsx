'use client';

import { useState, useEffect } from 'react';
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
          ⚠️ Connect Google Search Console to unlock Growth Engine data and track real search performance.
        </p>
      )}
    </div>
  );
}

// ── Growth Engine Suggestions ─────────────────────────────────────────────────

function GrowthEngineCard({ suggestions }: { suggestions: GrowthSuggestion[] | null }) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          Growth Engine
        </h4>
        <p className="text-xs text-gray-500">
          Growth suggestions will appear here after your site has been live for a few weeks and Google
          Search Console is connected.
        </p>
        <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <p className="text-xs text-indigo-700">
            💡 The Growth Engine analyzes your search data and suggests new pages, FAQs, and blog
            posts to drive more organic traffic.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          Growth Engine
        </h4>
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
          {suggestions.length} suggestions
        </span>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion, i) => (
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
            <button className="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              {suggestion.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page Breakdown ────────────────────────────────────────────────────────────

function PageBreakdown({ pageCount }: { pageCount: number }) {
  // Estimate breakdown (in production, fetch real data)
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
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-center"
          title="Coming soon"
          disabled
        >
          <PenLine className="h-5 w-5 text-purple-400" />
          <span className="text-xs font-medium text-gray-400">Edit Pages</span>
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
  );
}
