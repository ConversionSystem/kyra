/**
 * Secrets Sync — syncs all decrypted secrets for a client to their OpenClaw container.
 *
 * After any secret CRUD operation, call syncAllSecretsForClient(clientId)
 * to push the full set of secrets to the container's .secrets.env file
 * and update the TOOLS.md with available key names.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { decrypt } from './crypto';

/** Maps container_config keys to environment variable names for the container. */
const INTEGRATION_ENV_MAP: Record<string, string> = {
  microsoft_tenant_id: 'MS_TENANT_ID',
  microsoft_client_id: 'MS_CLIENT_ID',
  microsoft_client_secret: 'MS_CLIENT_SECRET',
  google_service_account_email: 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  google_service_account_key: 'GOOGLE_SERVICE_ACCOUNT_KEY',
  fathom_api_key: 'FATHOM_API_KEY',
  github_token: 'GH_TOKEN',
  github_repos: 'GITHUB_REPOS',
  email_address: 'EMAIL_ADDRESS',
  email_imap_host: 'EMAIL_IMAP_HOST',
  email_imap_port: 'EMAIL_IMAP_PORT',
  email_password: 'EMAIL_PASSWORD',
  email_smtp_host: 'EMAIL_SMTP_HOST',
  email_smtp_port: 'EMAIL_SMTP_PORT',
};
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

/**
 * Sync integration credentials from container_config to the container's .secrets.env.
 *
 * Reads existing client_secrets, merges them with integration env vars extracted
 * from container_config, and pushes the full set to the container.
 * This ensures integration credentials and manual secrets coexist in .secrets.env.
 */
export async function syncIntegrationCredentials(
  clientId: string,
  containerConfig: Record<string, unknown>
): Promise<void> {
  try {
    // 1. Extract integration env vars from container_config
    const integrationSecrets: Array<{ key: string; value: string }> = [];
    for (const [configKey, envName] of Object.entries(INTEGRATION_ENV_MAP)) {
      const val = containerConfig[configKey];
      if (typeof val === 'string' && val.trim()) {
        integrationSecrets.push({ key: envName, value: val });
      }
    }

    if (integrationSecrets.length === 0) return;

    // 2. Read existing client_secrets so we don't overwrite them
    const supabase = createServiceClientWithoutCookies();
    const { data: rows } = await supabase
      .from('client_secrets')
      .select('key_name, encrypted_value')
      .eq('client_id', clientId);

    const allSecrets = [...integrationSecrets];
    const integrationKeySet = new Set(integrationSecrets.map((s) => s.key));

    for (const row of rows ?? []) {
      // Don't duplicate keys that integration already provides
      if (!integrationKeySet.has(row.key_name as string)) {
        try {
          allSecrets.push({ key: row.key_name as string, value: decrypt(row.encrypted_value as string) });
        } catch {
          // Skip secrets that fail to decrypt
        }
      }
    }

    // 3. Push merged set to container
    const syncResult = await syncSecretsToContainer(clientId, allSecrets);
    if (!syncResult.ok) {
      console.error(`[integration-sync] Failed to sync to container for ${clientId}:`, syncResult.error);
      return;
    }

    // 4. Update TOOLS.md with all key names
    const allKeyNames = allSecrets.map((s) => s.key).sort();
    await updateToolsMdSecrets(clientId, allKeyNames);

    // 5. If email credentials present, generate himalaya config in workspace
    await syncHimalayaConfigIfNeeded(clientId, containerConfig);

    // 6. Wake the container
    await wakeContainerIfConfigured(clientId);
  } catch (err) {
    console.error(
      `[integration-sync] Unexpected error for ${clientId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Generate and write himalaya config to the workspace when email credentials are present.
 * Written to ~/workspace/himalaya-config.toml so the AI worker can use:
 *   himalaya -c ~/workspace/himalaya-config.toml envelope list
 */
async function syncHimalayaConfigIfNeeded(
  clientId: string,
  containerConfig: Record<string, unknown>
): Promise<void> {
  const email = containerConfig.email_address as string | undefined;
  const imapHost = containerConfig.email_imap_host as string | undefined;
  const password = containerConfig.email_password as string | undefined;

  if (!email || !imapHost || !password) return;

  const imapPort = (containerConfig.email_imap_port as string) || '993';
  const smtpHost = (containerConfig.email_smtp_host as string) || imapHost.replace('imap', 'smtp');
  const smtpPort = (containerConfig.email_smtp_port as string) || '465';
  const displayName = email.split('@')[0];

  // himalaya v1.x only accepts "tls" and "start-tls" (not "ssl")
  // port 993 (IMAP) → tls, port 465 (SMTP) → tls, port 587 (SMTP) → start-tls
  const imapEncryption = 'tls'; // IMAP almost always uses TLS (port 993)
  const smtpEncryption = smtpPort === '587' ? 'start-tls' : 'tls';

  // himalaya v1.x config format (inline dotted keys — required by v1.0+)
  const config = `[accounts.default]
email = "${email}"
display-name = "${displayName}"
default = true

backend.type = "imap"
backend.host = "${imapHost}"
backend.port = ${imapPort}
backend.encryption.type = "${imapEncryption}"
backend.login = "${email}"
backend.auth.type = "password"
backend.auth.raw = "${password}"

message.send.backend.type = "smtp"
message.send.backend.host = "${smtpHost}"
message.send.backend.port = ${smtpPort}
message.send.backend.encryption.type = "${smtpEncryption}"
message.send.backend.login = "${email}"
message.send.backend.auth.type = "password"
message.send.backend.auth.raw = "${password}"
`;

  const result = await writeWorkspaceFile(clientId, 'himalaya-config.toml', config);
  if (!result.ok) {
    console.error(`[integration-sync] Failed to write himalaya config for ${clientId}:`, result.error);
  }
}
