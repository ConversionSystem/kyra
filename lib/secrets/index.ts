import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { decrypt, encrypt } from './crypto';

export const SECRET_KEY_NAME_REGEX = /^[A-Z][A-Z0-9_]*$/;

export interface SecretMetadata {
  id: string;
  key_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function normalizeKeyName(keyName: string): string {
  return keyName.trim().toUpperCase();
}

function validateKeyName(keyName: string): void {
  if (!SECRET_KEY_NAME_REGEX.test(keyName)) {
    throw new Error('Invalid key_name. Use uppercase letters, numbers, and underscores only (e.g. GITHUB_TOKEN).');
  }
}

async function assertClientBelongsToAgency(agencyId: string, clientId: string) {
  const supabase = createServiceClientWithoutCookies();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('id', clientId)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify client access: ${error.message}`);
  }

  if (!client) {
    throw new Error('Client not found or not accessible for this agency');
  }
}

export async function listSecrets(agencyId: string, clientId: string): Promise<SecretMetadata[]> {
  await assertClientBelongsToAgency(agencyId, clientId);

  const supabase = createServiceClientWithoutCookies();
  const { data, error } = await supabase
    .from('client_secrets')
    .select('id, key_name, description, created_at, updated_at')
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list secrets: ${error.message}`);
  }

  return (data ?? []) as SecretMetadata[];
}

export async function getSecret(
  agencyId: string,
  clientId: string,
  keyName: string
): Promise<string | null> {
  await assertClientBelongsToAgency(agencyId, clientId);

  const normalizedKeyName = normalizeKeyName(keyName);
  validateKeyName(normalizedKeyName);

  const supabase = createServiceClientWithoutCookies();
  const { data, error } = await supabase
    .from('client_secrets')
    .select('encrypted_value')
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .eq('key_name', normalizedKeyName)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch secret: ${error.message}`);
  }

  if (!data?.encrypted_value) return null;
  return decrypt(data.encrypted_value as string);
}

export async function createSecret(
  agencyId: string,
  clientId: string,
  keyName: string,
  value: string,
  description?: string
): Promise<SecretMetadata> {
  await assertClientBelongsToAgency(agencyId, clientId);

  const normalizedKeyName = normalizeKeyName(keyName);
  validateKeyName(normalizedKeyName);

  if (!value || value.trim().length === 0) {
    throw new Error('Secret value is required');
  }

  const encryptedValue = encrypt(value);

  const supabase = createServiceClientWithoutCookies();
  const { data, error } = await supabase
    .from('client_secrets')
    .insert({
      agency_id: agencyId,
      client_id: clientId,
      key_name: normalizedKeyName,
      encrypted_value: encryptedValue,
      description: description?.trim() ? description.trim() : null,
    })
    .select('id, key_name, description, created_at, updated_at')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error('A secret with this key name already exists for this client');
    }
    throw new Error(`Failed to create secret: ${error.message}`);
  }

  return data as SecretMetadata;
}

export async function updateSecret(
  agencyId: string,
  clientId: string,
  secretId: string,
  value?: string,
  description?: string
): Promise<SecretMetadata> {
  await assertClientBelongsToAgency(agencyId, clientId);

  if (typeof value === 'undefined' && typeof description === 'undefined') {
    throw new Error('No updates provided');
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    throw new Error('Secret value cannot be empty');
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof value === 'string') {
    updates.encrypted_value = encrypt(value);
  }

  if (typeof description !== 'undefined') {
    updates.description = description.trim() ? description.trim() : null;
  }

  const supabase = createServiceClientWithoutCookies();
  const { data, error } = await supabase
    .from('client_secrets')
    .update(updates)
    .eq('id', secretId)
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .select('id, key_name, description, created_at, updated_at')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update secret: ${error.message}`);
  }

  if (!data) {
    throw new Error('Secret not found');
  }

  return data as SecretMetadata;
}

export async function deleteSecret(
  agencyId: string,
  clientId: string,
  secretId: string
): Promise<boolean> {
  await assertClientBelongsToAgency(agencyId, clientId);

  const supabase = createServiceClientWithoutCookies();
  const { data, error } = await supabase
    .from('client_secrets')
    .delete()
    .eq('id', secretId)
    .eq('agency_id', agencyId)
    .eq('client_id', clientId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete secret: ${error.message}`);
  }

  return !!data;
}
