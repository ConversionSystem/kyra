'use client';

import { useParams } from 'next/navigation';
import SeoGeoCommandCenterInner from '@/components/seo-geo-command-center';

export default function SeoGeoCommandCenterPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  return <SeoGeoCommandCenterInner siteId={siteId} />;
}
