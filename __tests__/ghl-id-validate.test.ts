import { describe, test, expect } from 'vitest';
import { isValidGhlId, validateGhlIds } from '@/lib/ghl/skills/validate';

describe('isValidGhlId', () => {
  test('accepts standard 24-char base62 ID', () => {
    expect(isValidGhlId('abc123XYZ456def789GHI012')).toBe(true);
  });

  test('accepts 20-char ID', () => {
    expect(isValidGhlId('abc123XYZ456def789GH')).toBe(true);
  });

  test('accepts 10-char ID (minimum)', () => {
    expect(isValidGhlId('aB3d5F7h9J')).toBe(true);
  });

  test('accepts 64-char ID (max)', () => {
    expect(isValidGhlId('a'.repeat(64))).toBe(true);
  });

  test('rejects short IDs (< 10 chars)', () => {
    expect(isValidGhlId('short')).toBe(false);
    expect(isValidGhlId('a1b2c3d4e')).toBe(false);
  });

  test('rejects overlong IDs (> 64 chars)', () => {
    expect(isValidGhlId('a'.repeat(65))).toBe(false);
  });

  test('rejects path traversal attempts', () => {
    expect(isValidGhlId('../admin/secrets')).toBe(false);
    expect(isValidGhlId('abc123/../etc/passwd')).toBe(false);
    expect(isValidGhlId('normal..path')).toBe(false);
  });

  test('rejects URL injection', () => {
    expect(isValidGhlId('abc123?query=1')).toBe(false);
    expect(isValidGhlId('abc123#fragment')).toBe(false);
    expect(isValidGhlId('abc123&param=1')).toBe(false);
    expect(isValidGhlId('abc123;drop=table')).toBe(false);
  });

  test('rejects scheme injection', () => {
    expect(isValidGhlId('http://evil.com/x')).toBe(false);
    expect(isValidGhlId('javascript:alert(1)')).toBe(false);
  });

  test('rejects whitespace', () => {
    expect(isValidGhlId('abc 123 def')).toBe(false);
    expect(isValidGhlId('abc\t123')).toBe(false);
    expect(isValidGhlId('abc\n123')).toBe(false);
  });

  test('rejects URL-encoded chars', () => {
    expect(isValidGhlId('abc%2F123%2Fetc')).toBe(false);
    expect(isValidGhlId('abc%00nullbyte')).toBe(false);
  });

  test('rejects non-string inputs', () => {
    expect(isValidGhlId(undefined)).toBe(false);
    expect(isValidGhlId(null)).toBe(false);
    expect(isValidGhlId(12345)).toBe(false);
    expect(isValidGhlId({})).toBe(false);
    expect(isValidGhlId([])).toBe(false);
    expect(isValidGhlId(true)).toBe(false);
  });

  test('rejects empty string', () => {
    expect(isValidGhlId('')).toBe(false);
  });

  test('rejects hyphens, underscores, dots', () => {
    expect(isValidGhlId('abc-123-def-456')).toBe(false);
    expect(isValidGhlId('abc_123_def_456')).toBe(false);
    expect(isValidGhlId('abc.123.def.456')).toBe(false);
  });
});

describe('validateGhlIds', () => {
  test('returns null when all IDs are valid', () => {
    const result = validateGhlIds(
      { contact_id: 'abc123XYZ456def789GHI012', task_id: 'xyz789ABC123ghi456JKL789' },
      ['contact_id', 'task_id'],
    );
    expect(result).toBeNull();
  });

  test('returns null when IDs are absent (not provided)', () => {
    const result = validateGhlIds({}, ['contact_id']);
    expect(result).toBeNull();
  });

  test('treats undefined and null as absent (not invalid)', () => {
    expect(validateGhlIds({ contact_id: undefined }, ['contact_id'])).toBeNull();
    expect(validateGhlIds({ contact_id: null }, ['contact_id'])).toBeNull();
  });

  test('returns error ToolResult when ID is malformed', () => {
    const result = validateGhlIds(
      { contact_id: '../evil/path' },
      ['contact_id'],
    );
    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);
    expect(result?.error).toContain('contact_id');
  });

  test('catches the first invalid ID when multiple fields checked', () => {
    const result = validateGhlIds(
      { contact_id: 'valid1234567890abcdef', task_id: '../evil' },
      ['contact_id', 'task_id'],
    );
    expect(result).not.toBeNull();
    expect(result?.error).toContain('task_id');
  });

  test('rejects injection even when other fields are valid', () => {
    const result = validateGhlIds(
      { opportunity_id: 'abc123XYZ456def789GHI012?admin=1' },
      ['opportunity_id'],
    );
    expect(result).not.toBeNull();
  });

  test('rejects empty string (present but invalid)', () => {
    const result = validateGhlIds({ contact_id: '' }, ['contact_id']);
    expect(result).not.toBeNull();
  });
});
