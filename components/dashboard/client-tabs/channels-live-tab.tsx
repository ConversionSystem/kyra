'use client';

import { ChannelsClient } from '@/app/(dashboard)/agency/channels/channels-client';
import { WidgetBuilderEmbedded } from '@/components/dashboard/widget-builder-embedded';

interface AgencyClient {
  id: string;
  name: string;
  container_config?: Record<string, unknown> | null;
  industry?: string;
}

export default function ChannelsLiveTab({
  clientId,
  client,
}: {
  clientId: string;
  client: AgencyClient;
}) {
  return (
    <div className="space-y-8 pb-8">
      {/* ── Live Channels ── */}
      <ChannelsClient clientId={clientId} embedded />

      {/* ── Web Chat Widget (Purple Lotus style) ── */}
      <div className="max-w-6xl px-4 sm:px-6 md:px-8">
        <WidgetBuilderEmbedded
          clientId={clientId}
          clientName={client.name}
          clientIndustry={client.industry}
          initialConfig={client.container_config ?? undefined}
        />
      </div>
    </div>
  );
}
