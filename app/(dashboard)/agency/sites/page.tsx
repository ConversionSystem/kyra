'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe, Plus, ExternalLink, Loader2, CheckCircle2,
  AlertTriangle, Clock, Zap, RefreshCw, Search,
} from 'lucide-react';

interface SiteRow {
  id: string;
  business_name: string;
  industry: string;
  status: 'draft' | 'generating' | 'building' | 'deploying' | 'live' | 'error';
  page_count: number;
  site_domain: string | null;
  site_subdomain: string | null;
  last_deployed_at: string | null;
  color_primary: string;
  client_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  live:       { label: 'Live',       color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  generating: { label: 'Generating', color: 'bg-blue-100 text-blue-700',    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  building:   { label: 'Building',   color: 'bg-blue-100 text-blue-700',    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  deploying:  { label: 'Deploying',  color: 'bg-indigo-100 text-indigo-700', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  error:      { label: 'Error',      color: 'bg-red-100 text-red-700',      icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  draft:      { label: 'Draft',      color: 'bg-gray-100 text-gray-600',    icon: <Clock className="h-3.5 w-3.5" /> },
};

export default function SitesPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/agency/sites');
        if (res.ok) {
          const result = await res.json();
          setSites(result.data || []);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = sites.filter(s =>
    !search || s.business_name.toLowerCase().includes(search.toLowerCase())
  );

  const liveSites = sites.filter(s => s.status === 'live');
  const inProgress = sites.filter(s => ['generating','building','deploying'].includes(s.status));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Websites</h1>
          <p className="text-sm text-gray-500 mt-1">
            {liveSites.length} live · {inProgress.length} building · {sites.length} total
          </p>
        </div>
        <Link
          href="/agency/clients"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Site
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sites…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Globe className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No websites yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Go to a client and click the Website tab to build their first AI-powered site in minutes.
          </p>
          <Link
            href="/agency/clients"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Plus className="h-4 w-4" />
            Go to Clients
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(site => {
            const siteUrl = site.site_domain
              ? `https://${site.site_domain}`
              : site.site_subdomain
                ? `https://${site.site_subdomain}`
                : null;
            const status = STATUS_CONFIG[site.status] || STATUS_CONFIG.draft;
            const deployed = site.last_deployed_at
              ? new Date(site.last_deployed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : null;

            return (
              <div
                key={site.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                {/* Site header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: site.color_primary || '#6366f1' }}
                    >
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{site.business_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{site.industry?.replace(/-/g, ' ')}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${status.color} shrink-0`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>

                {/* URL */}
                {siteUrl && (
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline mb-4 truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{siteUrl.replace('https://', '')}</span>
                  </a>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {site.page_count || 0} pages
                  </span>
                  {deployed && (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      {deployed}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {site.client_id && (
                    <Link
                      href={`/agency/clients/${site.client_id}?tab=website`}
                      className="flex-1 text-center text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg transition"
                    >
                      Manage
                    </Link>
                  )}
                  {siteUrl && (
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition"
                    >
                      View Live
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
