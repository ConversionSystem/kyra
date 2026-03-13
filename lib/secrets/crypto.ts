import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce recommended for GCM
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const rawKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      'SECRETS_ENCRYPTION_KEY is missing. Set SECRETS_ENCRYPTION_KEY to enable Secrets Vault encryption.'
    );
  }

  // Derive a stable 32-byte key for AES-256 from the configured secret.
  cachedKey = createHash('sha256').update(rawKey).digest();
  return cachedKey;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Output format (base64): [12-byte iv][16-byte authTag][ciphertext]
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypts a base64 payload created by encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const payload = Buffer.from(ciphertext, 'base64');

  if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext payload for secret decryption');
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    throw new Error('Failed to decrypt secret value');
  }
}
