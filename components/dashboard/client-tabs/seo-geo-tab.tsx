'use client';

import { useState, useEffect } from 'react';
import { Loader2, Globe, ArrowRight } from 'lucide-react';
import SeoGeoCommandCenterInner from '@/components/seo-geo-command-center';

interface SeoGeoTabProps {
  clientId: string;
  clientName: string;
}

interface SiteData {
  id: string;
  domain?: string;
  name?: string;
}

export default function SeoGeoTab({ clientId, clientName }: SeoGeoTabProps) {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/agency/sites?clientId=${clientId}`);
        if (!res.ok) throw new Error('Failed to load sites');
        const result = await res.json();
        const sites = result.data || result;
        const siteData = Array.isArray(sites) ? sites[0] : sites;
        if (siteData?.id) {
          setSite(siteData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
          <Globe className="w-8 h-8 text-indigo-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No website yet</h2>
        <p className="text-gray-500 max-w-md mb-6">
          Create a website for {clientName} first, then the SEO/GEO Command Center will appear here with all optimization tools.
        </p>
        <a
          href={`/agency/clients/${clientId}?tab=website`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Go to Website tab
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return <SeoGeoCommandCenterInner siteId={site.id} embedded />;
}
