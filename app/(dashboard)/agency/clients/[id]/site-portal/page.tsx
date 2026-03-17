'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Globe, MessageSquare, Users, TrendingUp, ExternalLink,
  Zap, CheckCircle, BarChart2, Clock, Star, Phone
} from 'lucide-react';

interface SiteData {
  id: string;
  business_name: string;
  site_domain?: string;
  site_subdomain?: string;
  status: string;
  page_count?: number;
  industry: string;
  color_primary?: string;
  services: Array<{ name: string }>;
  created_at: string;
}

interface ConvStats {
  total: number;
  today: number;
  leads: number;
}

export default function SitePortalPage() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<SiteData | null>(null);
  const [convStats, setConvStats] = useState<ConvStats>({ total: 0, today: 0, leads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sitesRes, convsRes] = await Promise.all([
          fetch(`/api/agency/sites?clientId=${id}`),
          fetch(`/api/agency/clients/${id}/conversations?limit=200`),
        ]);
        if (sitesRes.ok) {
          const { data } = await sitesRes.json();
          if (data?.length) setSite(data[0]);
        }
        if (convsRes.ok) {
          const convsJson = await convsRes.json();
          // API returns { conversations: [...], total: N } — not { data: [...] }
          const convs = convsJson.conversations;
          if (Array.isArray(convs)) {
            const today = new Date().toDateString();
            const todayCount = convs.filter((c: { created_at: string }) =>
              new Date(c.created_at).toDateString() === today
            ).length;
            const leads = convs.filter((c: { metadata?: { lead?: boolean } }) =>
              c.metadata?.lead === true
            ).length;
            // Use server-side total count for accuracy
            setConvStats({ total: convsJson.total ?? convs.length, today: todayCount, leads });
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!site || site.status !== 'live') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <Globe className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No live site yet</h3>
        <p className="text-sm text-gray-500">Build a website first to see the client portal.</p>
      </div>
    );
  }

  const siteUrl = site.site_domain
    ? `https://${site.site_domain}`
    : site.site_subdomain
    ? `https://${site.site_subdomain}`
    : '';

  const brandColor = site.color_primary || '#6366f1';
  const launchDate = new Date(site.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-600 uppercase tracking-wider">Live</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{site.business_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Launched {launchDate}</p>
        </div>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            View Site
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Globe, label: 'Pages', value: site.page_count || '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: MessageSquare, label: 'Total chats', value: convStats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Users, label: 'Leads', value: convStats.leads, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: TrendingUp, label: 'Today', value: convStats.today, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* What's included */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">✅ What&apos;s on your site</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Zap, label: `${site.services?.length || 0} service pages`, ok: true },
            { icon: CheckCircle, label: 'SEO-optimized content', ok: true },
            { icon: MessageSquare, label: 'AI chat widget (24/7)', ok: true },
            { icon: Phone, label: 'Lead capture forms', ok: true },
            { icon: Globe, label: 'Local city pages', ok: true },
            { icon: BarChart2, label: 'Blog articles (2)', ok: true },
            { icon: Star, label: 'FAQ schema markup', ok: true },
            { icon: Clock, label: 'Mobile responsive', ok: true },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <CheckCircle className={`h-4 w-4 shrink-0 ${ok ? 'text-green-500' : 'text-gray-300'}`} />
              <span className="text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Site URL */}
      {siteUrl && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Your website URL</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono text-gray-700 flex-1 truncate">{siteUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(siteUrl)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Powered by */}
      <p className="text-center text-xs text-gray-400">
        Powered by <span className="font-medium text-gray-500">Kyra AI</span>
      </p>
    </div>
  );
}
