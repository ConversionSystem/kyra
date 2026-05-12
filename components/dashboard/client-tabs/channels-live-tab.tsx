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
  hideChatWidget = false,
}: {
  clientId: string;
  client: AgencyClient;
  /**
   * When the parent already renders WidgetBuilderEmbedded in a dedicated
   * tab (Settings → Chat Widget), pass `hideChatWidget` so this tab
   * doesn't duplicate the card. Default false preserves legacy callers.
   */
  hideChatWidget?: boolean;
}) {
  return (
    <div className="space-y-8 pb-8">
      {/* ── Live Channels ── */}
      <ChannelsClient clientId={clientId} embedded />

      {/* ── Web Chat Widget — only when not surfaced as its own tab ── */}
      {!hideChatWidget && (
        <div className="max-w-6xl px-4 sm:px-6 md:px-8">
          <WidgetBuilderEmbedded
            clientId={clientId}
            clientName={client.name}
            clientIndustry={client.industry}
            initialConfig={client.container_config ?? undefined}
          />
        </div>
      )}
    </div>
  );
}
