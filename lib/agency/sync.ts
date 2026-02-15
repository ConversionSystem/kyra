// ============================================================================
// Container Config Sync
//
// Syncs generated workspace files to Supabase Storage and manages
// per-client container configuration. Called when a client is created,
// updated, or when their GHL connection changes.
// ============================================================================

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { buildWorkspaceFiles } from './workspace';
import type { AgencyClient, Agency, AgencyTemplate } from './types';
import type { GHLLocationInfo } from '@/lib/ghl/webhook-types';

const STORAGE_BUCKET = 'kyra-workspaces';

// ============================================================================
// Public API
// ============================================================================

export interface SyncResult {
  success: boolean;
  clientId: string;
  filesUploaded: string[];
  errors: string[];
}

/**
 * Sync all workspace files for a client to Supabase Storage.
 *
 * 1. Loads client + agency + template from Supabase
 * 2. Optionally fetches GHL location info if connected
 * 3. Generates all workspace files via buildWorkspaceFiles()
 * 4. Uploads to Supabase Storage bucket under clients/{clientId}/
 *
 * @param clientId - The agency_client ID to sync
 * @param ghlData  - Optional pre-fetched GHL location info (saves an API call)
 */
export async function syncClientWorkspace(
  clientId: string,
  ghlData?: GHLLocationInfo
): Promise<SyncResult> {
  const supabase = createServiceClientWithoutCookies();
  const result: SyncResult = {
    success: false,
    clientId,
    filesUploaded: [],
    errors: [],
  };

  // --- Load client with template join ---
  const { data: client, error: clientError } = await supabase
    .from('agency_clients')
    .select('*, template:agency_templates(*)')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    result.errors.push(`Client not found: ${clientError?.message ?? 'no data'}`);
    return result;
  }

  // --- Load agency ---
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', client.agency_id)
    .single();

  if (agencyError || !agency) {
    result.errors.push(`Agency not found: ${agencyError?.message ?? 'no data'}`);
    return result;
  }

  // --- Optionally fetch GHL location data ---
  let locationData = ghlData;
  if (!locationData && client.ghl_location_id && client.ghl_access_token) {
    locationData = await fetchGHLLocationInfo(
      client.ghl_access_token,
      client.ghl_location_id
    );
  }

  // --- Generate workspace files ---
  const template = (client as AgencyClient & { template?: AgencyTemplate | null }).template ?? null;
  const files = buildWorkspaceFiles(
    client as AgencyClient,
    agency as Agency,
    template,
    locationData
  );

  // --- Ensure storage bucket exists ---
  await ensureBucket(supabase);

  // --- Upload each file ---
  const storagePath = `clients/${clientId}`;

  for (const [filename, content] of Object.entries(files)) {
    const filePath = `${storagePath}/${filename}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, new Blob([content], { type: 'text/markdown' }), {
          upsert: true,
          contentType: 'text/markdown',
        });

      if (uploadError) {
        result.errors.push(`Failed to upload ${filename}: ${uploadError.message}`);
      } else {
        result.filesUploaded.push(filename);
      }
    } catch (err) {
      result.errors.push(
        `Upload error for ${filename}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // --- Update client record with sync timestamp ---
  await supabase
    .from('agency_clients')
    .update({
      container_config: {
        ...((client as AgencyClient).container_config || {}),
        last_workspace_sync: new Date().toISOString(),
        workspace_files: Object.keys(files),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  result.success = result.errors.length === 0;

  console.log(
    `[sync] ${result.success ? '✅' : '⚠️'} Synced workspace for client ${clientId}: ` +
    `${result.filesUploaded.length} files uploaded` +
    (result.errors.length ? `, ${result.errors.length} errors` : '')
  );

  return result;
}

/**
 * Update the container_config JSONB on an agency_client record.
 *
 * Config includes: model preference, enabled skills, voice settings,
 * business hours, language, etc.
 *
 * @param clientId - The agency_client ID
 * @param config   - Partial config to merge into existing container_config
 */
export async function updateClientConfig(
  clientId: string,
  config: ContainerConfig
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClientWithoutCookies();

  // Load existing config to merge
  const { data: client, error: fetchError } = await supabase
    .from('agency_clients')
    .select('container_config')
    .eq('id', clientId)
    .single();

  if (fetchError || !client) {
    return { success: false, error: `Client not found: ${fetchError?.message ?? 'no data'}` };
  }

  const existingConfig = (client.container_config as Record<string, unknown>) || {};
  const mergedConfig = { ...existingConfig, ...config, updated_at: new Date().toISOString() };

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({
      container_config: mergedConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId);

  if (updateError) {
    return { success: false, error: `Update failed: ${updateError.message}` };
  }

  console.log(`[sync] ✅ Updated container config for client ${clientId}`);
  return { success: true };
}

/**
 * Get the workspace files for a client from Supabase Storage.
 * Returns a map of filename → content, or null if not synced.
 */
export async function getClientWorkspaceFiles(
  clientId: string
): Promise<Record<string, string> | null> {
  const supabase = createServiceClientWithoutCookies();
  const storagePath = `clients/${clientId}`;

  // List files in the client's workspace directory
  const { data: fileList, error: listError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(storagePath);

  if (listError || !fileList?.length) return null;

  const files: Record<string, string> = {};

  for (const file of fileList) {
    if (!file.name.endsWith('.md')) continue;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(`${storagePath}/${file.name}`);

    if (!error && data) {
      files[file.name] = await data.text();
    }
  }

  return Object.keys(files).length > 0 ? files : null;
}

/**
 * Delete all workspace files for a client from storage.
 * Called when a client is deleted.
 */
export async function deleteClientWorkspace(clientId: string): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  const storagePath = `clients/${clientId}`;

  const { data: fileList } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(storagePath);

  if (fileList?.length) {
    const filePaths = fileList.map((f) => `${storagePath}/${f.name}`);
    await supabase.storage.from(STORAGE_BUCKET).remove(filePaths);
    console.log(`[sync] 🗑️ Deleted workspace files for client ${clientId}`);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ContainerConfig {
  /** Preferred AI model (e.g. 'claude-sonnet-4-20250514') */
  model?: string;
  /** Enabled skill IDs */
  enabled_skills?: string[];
  /** Voice settings for TTS */
  voice?: {
    provider?: 'elevenlabs' | 'openai';
    voice_id?: string;
    enabled?: boolean;
  };
  /** Business hours (e.g. "Mon-Fri 9am-5pm EST") */
  business_hours?: string;
  /** Primary language */
  language?: string;
  /** Response style override */
  response_style?: 'professional' | 'casual' | 'friendly' | 'formal';
  /** Custom greeting for new conversations */
  custom_greeting?: string;
  /** Max tokens per response */
  max_tokens?: number;
  /** Whether the AI should auto-respond or queue for human review */
  auto_respond?: boolean;
  /** Allow additional arbitrary fields */
  [key: string]: unknown;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Ensure the kyra-workspaces storage bucket exists.
 * Creates it if it doesn't — idempotent.
 */
async function ensureBucket(
  supabase: ReturnType<typeof createServiceClientWithoutCookies>
): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);

  if (!exists) {
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: false,
      fileSizeLimit: 1024 * 1024, // 1MB — workspace files are small
    });
    if (error && !error.message.includes('already exists')) {
      console.error(`[sync] Failed to create bucket: ${error.message}`);
    }
  }
}

/**
 * Fetch GHL location info via the GHL API.
 * Returns null on failure — workspace generation will use fallback data.
 */
async function fetchGHLLocationInfo(
  accessToken: string,
  locationId: string
): Promise<GHLLocationInfo | undefined> {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-07-28',
        },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) {
      console.warn(`[sync] Failed to fetch GHL location ${locationId}: ${response.status}`);
      return undefined;
    }

    const data = (await response.json()) as { location?: Record<string, unknown> };
    const loc = data.location;
    if (!loc) return undefined;

    return {
      id: locationId,
      name: (loc.name as string) || '',
      address: loc.address as string | undefined,
      city: loc.city as string | undefined,
      state: loc.state as string | undefined,
      postalCode: loc.postalCode as string | undefined,
      country: loc.country as string | undefined,
      phone: loc.phone as string | undefined,
      email: loc.email as string | undefined,
      website: loc.website as string | undefined,
      timezone: loc.timezone as string | undefined,
      logoUrl: loc.logoUrl as string | undefined,
      businessType: loc.businessType as string | undefined,
    };
  } catch (err) {
    console.warn(`[sync] Error fetching GHL location: ${err}`);
    return undefined;
  }
}
