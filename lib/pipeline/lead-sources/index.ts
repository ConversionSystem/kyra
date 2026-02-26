/**
 * Lead Sources — Unified entry point
 *
 * Routes campaign lead generation to the correct source:
 * - google_maps: Outscraper (real Google Maps data)
 * - ai_discovery: GPT-4o/Claude/Gemini (AI-generated, may not be real)
 * - csv_upload: Agency's own data (skip to enrich)
 */

export * from './types';
export { searchOutscraper } from './outscraper';
export { searchAiDiscovery, AVAILABLE_MODELS } from './ai-discovery';
export { parseCsv, csvToLeads } from './csv-upload';

import type { LeadSourceConfig, LeadSourceResult, StreamCallback } from './types';
import { searchOutscraper } from './outscraper';
import { searchAiDiscovery } from './ai-discovery';
import { csvToLeads } from './csv-upload';

/**
 * Universal lead source dispatcher.
 * Call this from the /run route — it picks the right source based on config.
 */
export async function findLeads(
  config: LeadSourceConfig,
  keys: {
    outscraperKey?: string;
    openaiKey?: string;
    enrichModel?: string;
  },
  onLead?: StreamCallback,
): Promise<LeadSourceResult> {
  switch (config.type) {
    case 'google_maps': {
      if (!keys.outscraperKey) {
        // Fall back to AI discovery with a warning
        onLead?.('step', {
          label: '⚠️ No Outscraper API key — falling back to AI Discovery',
          status: 'running',
        });
        return searchAiDiscovery({
          industry: config.query,
          location: config.location,
          role: config.role,
          companySize: config.companySize,
          limit: config.limit,
          model: keys.enrichModel || 'gpt-4o',
          apiKey: keys.openaiKey,
          onLead,
        });
      }

      return searchOutscraper(
        config.query,
        config.location,
        config.limit,
        keys.outscraperKey,
        onLead,
      );
    }

    case 'ai_discovery': {
      return searchAiDiscovery({
        industry: config.query,
        location: config.location,
        role: config.role,
        companySize: config.companySize,
        limit: config.limit,
        model: keys.enrichModel || 'gpt-4o',
        apiKey: keys.openaiKey,
        onLead,
      });
    }

    case 'csv_upload': {
      if (!config.csvData?.length) {
        return {
          source: 'csv_upload',
          leads: [],
          total: 0,
          warning: 'No CSV data provided.',
        };
      }

      return csvToLeads(
        config.csvData,
        { industry: config.query, location: config.location },
        onLead,
      );
    }

    default:
      return { source: 'ai_discovery', leads: [], total: 0, warning: 'Unknown lead source type.' };
  }
}
