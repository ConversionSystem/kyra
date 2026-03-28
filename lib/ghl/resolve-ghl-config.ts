// ============================================================================
// Resolve GHL Config — Calendar ID, Pipeline ID from pipeline_integrations
//
// Single source of truth for resolving GHL configuration (calendar, pipeline)
// for any client. Falls back through:
//   1. container_config (per-client override)
//   2. pipeline_integrations (agency-level GHL connection)
//
// Used by: poller.ts, smart-handler.ts, voice routes
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface ResolvedGHLConfig {
  calendarId: string | undefined;
  pipelineId: string | undefined;
  calendarName: string | undefined;
}

/**
 * Resolve the GHL calendar + pipeline IDs for a client.
 *
 * Priority:
 *   1. container_config.calendar_id / pipeline_id (per-client override set in UI)
 *   2. pipeline_integrations config (agency-level, set when GHL was connected)
 *
 * Caches nothing — called once per conversation turn, DB lookup is fast.
 */
export async function resolveGHLConfig(
  agencyId: string,
  containerConfig: Record<string, unknown> | null,
): Promise<ResolvedGHLConfig> {
  const cc = containerConfig || {};

  // Check container_config first (per-client override)
  let calendarId = (cc.calendar_id as string) || undefined;
  let pipelineId = (cc.pipeline_id as string) || undefined;

  // If both are set, we're done
  if (calendarId && pipelineId) {
    return { calendarId, pipelineId, calendarName: undefined };
  }

  // Fall back to pipeline_integrations (agency-level GHL connection)
  try {
    const svc = createServiceClientWithoutCookies();
    const { data: integration } = await svc
      .from('pipeline_integrations')
      .select('config')
      .eq('agency_id', agencyId)
      .eq('provider', 'ghl')
      .eq('status', 'connected')
      .single();

    if (integration?.config) {
      const cfg = integration.config as Record<string, unknown>;
      if (!calendarId && cfg.calendar_id) {
        calendarId = cfg.calendar_id as string;
      }
      if (!pipelineId && cfg.pipeline_id) {
        pipelineId = cfg.pipeline_id as string;
      }
    }
  } catch {
    // pipeline_integrations lookup failed — continue with what we have
  }

  return { calendarId, pipelineId, calendarName: undefined };
}
