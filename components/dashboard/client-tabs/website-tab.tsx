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
  Rocket,
  Sparkles,
  Settings,
  Pencil,
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

// ── SEO Health Checklist ──────────────────────────────────────────────────────

function SEOHealthChecklist({ site }: { site: SiteData }) {
  const isDeployed = !!site.last_deployed_at || site.status === 'live';
  const hasSubdomain = !!site.site_subdomain;

  // Not deployed at all — show a simple message
  if (!isDeployed) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          SEO Health
        </h4>
        <p className="text-sm text-gray-500">Deploy your site first to see SEO health checks.</p>
      </div>
    );
  }

  const checks = [
    { label: site.page_count > 0 ? `Sitemap (${site.page_count} URLs)` : 'Sitemap', ok: site.page_count > 0 },
    { label: 'Schema markup (LocalBusiness + FAQ)', ok: true },
    { label: 'Meta tags (title + description)', ok: true },
    { label: 'Mobile responsive', ok: true },
    { label: 'SSL certificate (HTTPS)', ok: hasSubdomain || !!site.site_domain },
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
  // Growth card compat: support both new (title/description) and legacy (keyword/volume/action)
  const suggestions = site.growth_suggestions;
  const hasLegacy = suggestions && suggestions.length > 0 && !!suggestions[0].keyword;

  return (
    <div className="space-y-6">
      {/* Live site preview card */}
      {siteUrl && site.status === 'live' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Browser chrome bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-gray-500 font-mono ml-2 truncate max-w-[200px]">{siteUrl.replace('https://','')}</span>
            </div>
            <a href={siteUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium">
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {/* Thumbnail placeholder — links to site */}
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="bg-gradient-to-br from-indigo-50 to-slate-100 h-48 flex flex-col items-center justify-center gap-3 hover:from-indigo-100 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">{site.business_name}</p>
                <p className="text-xs text-indigo-600 mt-0.5 flex items-center justify-center gap-1">
                  View live site <ExternalLink className="h-3 w-3" />
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Live</span>
                <span>{site.page_count || 0} pages</span>
              </div>
            </div>
          </a>
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
        <Link
          href={`/agency/website/${site.id}/editor`}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-center"
        >
          <Pencil className="h-5 w-5 text-purple-500" />
          <span className="text-xs font-medium text-gray-700">Edit Website</span>
        </Link>
        <Link
          href={`/agency/website/${site.id}/settings`}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-amber-300 hover:bg-amber-50/50 transition-colors text-center"
        >
          <Settings className="h-5 w-5 text-amber-500" />
          <span className="text-xs font-medium text-gray-700">Settings</span>
        </Link>
      </div>

      {/* Live URL */}
      {siteUrl && site.status === 'live' && (
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
        >
          <Globe className="h-4 w-4" />
          {siteUrl.replace('https://', '')}
          <ExternalLink className="h-3.5 w-3.5 ml-auto" />
        </a>
      )}

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
                <Link
                  href={`/agency/website/${site.id}/growth`}
                  className="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {suggestion.action}
                </Link>
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
              <Link
                href={`/agency/website/${site.id}/growth`}
                className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
              >
                View Suggestions <ArrowUpRight className="h-3 w-3" />
              </Link>
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

      {/* SEO Health or Launch Checklist */}
      {(!!site.last_deployed_at || site.status === 'live') ? (
        <SEOHealthChecklist site={site} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
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
    <div className="space-y-6">
      {/* Deploying/building banner with self-heal button */}
      {['deploying', 'building', 'generating'].includes(site.status) && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
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
            {site.page_count === 0 && ['draft', 'error'].includes(site.status) ? (
              <>
                <p className="text-sm font-medium text-gray-400">Not built yet</p>
                <p className="text-xs text-gray-500">Pages</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900">{site.page_count}</p>
                <p className="text-xs text-gray-500">Pages</p>
              </>
            )}
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

      {/* Overview content (single view — no sub-navigation) */}
      <OverviewView
        site={site}
        siteUrl={siteUrl}
        actionLoading={actionLoading}
        handleAction={handleAction}
      />
    </div>
  );
}
