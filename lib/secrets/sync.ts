/**
 * Secrets Sync — syncs all decrypted secrets for a client to their OpenClaw container.
 *
 * After any secret CRUD operation, call syncAllSecretsForClient(clientId)
 * to push the full set of secrets to the container's .secrets.env file
 * and update the TOOLS.md with available key names.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { decrypt } from './crypto';
import {
  syncSecretsToContainer,
  readWorkspaceFile,
  writeWorkspaceFile,
  wakeContainerAI,
} from '@/lib/ovh/sync';

/**
 * Sync ALL secrets for a client to their container.
 *
 * 1. Reads all secrets from Supabase
 * 2. Decrypts each value
 * 3. Pushes them to the container via syncSecretsToContainer()
 * 4. Updates TOOLS.md with a Secrets section (key names only)
 * 5. Wakes the container AI so it re-reads workspace files
 *
 * This is fire-and-forget from the caller's perspective — errors are
 * logged but never bubble up to the API response.
 */
export async function syncAllSecretsForClient(clientId: string): Promise<void> {
  try {
    const supabase = createServiceClientWithoutCookies();

    // 1. Read all secrets for this client
    const { data: rows, error: listError } = await supabase
      .from('client_secrets')
      .select('key_name, encrypted_value')
      .eq('client_id', clientId);

    if (listError) {
      console.error(`[secrets-sync] Failed to list secrets for client ${clientId}:`, listError.message);
      return;
    }

    // 2. Decrypt each secret
    const decrypted: Array<{ key: string; value: string }> = [];
    const keyNames: string[] = [];

    for (const row of rows ?? []) {
      try {
        const value = decrypt(row.encrypted_value as string);
        decrypted.push({ key: row.key_name as string, value });
        keyNames.push(row.key_name as string);
      } catch (err) {
        console.error(
          `[secrets-sync] Failed to decrypt secret ${row.key_name} for client ${clientId}:`,
          err instanceof Error ? err.message : err
        );
        // Skip this secret but continue with others
      }
    }

    // 3. Sync secrets to container (.secrets.env)
    const syncResult = await syncSecretsToContainer(clientId, decrypted);
    if (!syncResult.ok) {
      console.error(`[secrets-sync] Failed to sync secrets to container for client ${clientId}:`, syncResult.error);
      return;
    }

    // 4. Update TOOLS.md with available secret key names
    await updateToolsMdSecrets(clientId, keyNames);

    // 5. Wake the container AI so it re-reads workspace files
    await wakeContainerIfConfigured(clientId);
  } catch (err) {
    console.error(
      `[secrets-sync] Unexpected error syncing secrets for client ${clientId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Update the container's TOOLS.md to include a Secrets section with
 * available key names (never values).
 */
async function updateToolsMdSecrets(clientId: string, keyNames: string[]): Promise<void> {
  // Read current TOOLS.md
  const readResult = await readWorkspaceFile(clientId, 'TOOLS.md');

  let content = readResult.ok && readResult.content ? readResult.content : '';

  // Strip any existing ## Secrets section (everything from ## Secrets to the next ## or EOF)
  content = content.replace(/## Secrets[\s\S]*?(?=\n## |\n$|$)/, '').trimEnd();

  // Build new Secrets section
  if (keyNames.length > 0) {
    const secretsList = keyNames.sort().map((k) => `- \`${k}\``).join('\n');
    const secretsSection = [
      '',
      '',
      '## Secrets',
      '',
      'Secrets are available as environment variables. Source them before use:',
      '',
      '```bash',
      '. .secrets.env',
      '```',
      '',
      'Available secrets:',
      secretsList,
      '',
      '> **Note:** Never log or expose secret values. Use them only in environment variables or tool configurations.',
    ].join('\n');

    content += secretsSection;
  }

  // Write updated TOOLS.md back
  const writeResult = await writeWorkspaceFile(clientId, 'TOOLS.md', content);
  if (!writeResult.ok) {
    console.error(`[secrets-sync] Failed to update TOOLS.md for client ${clientId}:`, writeResult.error);
  }
}

/**
 * Wake the container AI if the client has gateway credentials configured.
 */
async function wakeContainerIfConfigured(clientId: string): Promise<void> {
  try {
    const supabase = createServiceClientWithoutCookies();
    const { data: client, error } = await supabase
      .from('agency_clients')
      .select('gateway_url, gateway_token')
      .eq('id', clientId)
      .maybeSingle();

    if (error || !client) return;

    const gatewayUrl = client.gateway_url as string | null;
    const gatewayToken = client.gateway_token as string | null;

    if (gatewayUrl && gatewayToken) {
      await wakeContainerAI(
        gatewayUrl,
        gatewayToken,
        '[System] Secrets updated. Re-read workspace files and source .secrets.env for new environment variables.'
      );
    }
  } catch {
    // Wake is best-effort — don't fail the sync
  }
}
