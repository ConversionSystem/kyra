'use client';

import { Globe, ArrowRight } from 'lucide-react';
import SeoGeoCommandCenterInner from '@/components/seo-geo-command-center';

export function SeoPageClient({ siteId }: { siteId: string | null }) {
  if (!siteId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
          <Globe className="w-8 h-8 text-indigo-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No website yet</h2>
        <p className="text-gray-500 max-w-md mb-6">
          Create a website first, then the SEO/GEO Command Center will appear here with all optimization tools.
        </p>
        <a
          href="/agency/sites"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Go to Websites
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return <SeoGeoCommandCenterInner siteId={siteId} />;
}
