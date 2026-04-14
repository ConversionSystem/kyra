'use client';

import { useParams, redirect } from 'next/navigation';

/**
 * Growth page now lives inside the unified SEO/GEO Command Center.
 * Redirect to ?tab=growth on the unified dashboard.
 */
export default function GrowthRedirect() {
  const params = useParams();
  const siteId = params.siteId as string;
  redirect(`/agency/website/${siteId}/seo?tab=growth`);
}
