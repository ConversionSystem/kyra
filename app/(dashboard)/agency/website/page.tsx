'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  Plus,
  ExternalLink,
  Loader2,
  Edit3,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Zap,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteListItem {
  id: string;
  business_name: string;
  industry: string;
  status: string;
  page_count: number;
  site_domain: string | null;
  site_subdomain: string | null;
  created_at: string;
  updated_at: string;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    live: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-700',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    draft: {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-600',
      icon: <Clock className="h-3 w-3" />,
    },
    generating: {
      bg: 'bg-indigo-50 border-indigo-200',
      text: 'text-indigo-700',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    building: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    deploying: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

  const c = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${c.bg} ${c.text}`}>
      {c.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Site Card ─────────────────────────────────────────────────────────────────

function SiteCard({ site }: { site: SiteListItem }) {
  const router = useRouter();
  const siteUrl = site.site_subdomain
    ? `https://${site.site_subdomain}`
    : site.site_domain
      ? `https://${site.site_domain}`
      : null;

  const createdDate = new Date(site.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
      {/* Preview banner */}
      <div className="h-32 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 rounded-t-xl flex items-center justify-center relative overflow-hidden">
        <Globe className="h-12 w-12 text-indigo-300" />
        {site.status === 'live' && siteUrl && (
          <div className="absolute bottom-2 right-2">
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 bg-white/80 backdrop-blur-sm text-xs font-medium text-indigo-600 rounded-lg hover:bg-white flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Visit
            </a>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{site.business_name}</h3>
            <p className="text-xs text-gray-500 capitalize">{site.industry?.replace(/-/g, ' ')}</p>
          </div>
          <StatusBadge status={site.status} />
        </div>

        {siteUrl && (
          <p className="text-xs font-mono text-gray-400 truncate mb-3">{siteUrl.replace('https://', '')}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
          <span>{site.page_count} pages</span>
          <span>Created {createdDate}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/agency/website/${site.id}/editor`)}
            className="flex-1 px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </button>
          {site.status === 'live' && (
            <button
              onClick={() => router.push(`/agency/website/${site.id}/growth`)}
              className="px-3 py-2 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
              title="Growth Engine"
            >
              <TrendingUp className="h-3 w-3" />
            </button>
          )}
          {site.status === 'live' && (
            <button
              onClick={async () => {
                try {
                  await fetch(`/api/agency/sites/${site.id}/build`, { method: 'POST' });
                } catch { /* ignore */ }
              }}
              className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              title="Rebuild"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-6">
        <Globe className="h-10 w-10 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No websites yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Create your first AI-generated website in minutes. Just fill in the details and we&apos;ll build it.
      </p>
      <Link
        href="/agency/website/create"
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        Create Your First Website
      </Link>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WebsitesOverview() {
  const [sites, setSites] = useState<SiteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSites() {
      try {
        const res = await fetch('/api/agency/sites');
        if (res.ok) {
          const result = await res.json();
          if (Array.isArray(result.data)) {
            setSites(result.data);
          }
        }
      } catch (err) {
        console.error('[websites] Failed to fetch sites:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSites();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Globe className="h-6 w-6 text-indigo-600" />
              Websites
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {sites.length > 0 ? `${sites.length} site${sites.length !== 1 ? 's' : ''}` : 'Create and manage client websites'}
            </p>
          </div>
          {sites.length > 0 && (
            <div className="flex gap-2">
              <Link
                href="/agency/website/bulk"
                className="px-3 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Bulk Generate
              </Link>
              <Link
                href="/agency/website/create"
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Website
              </Link>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading websites...</p>
          </div>
        ) : sites.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
