// ============================================================================
// GHL Skill Input Validation
// ============================================================================
// LLM-supplied tool arguments reach these skill modules via function calling.
// Without validation, an untrusted or compromised prompt can inject path
// segments, query params, or scheme-relative URLs via an `id` argument that
// gets interpolated directly into `fetch(`${GHL_API_BASE}/contacts/${id}`)`.
//
// GHL object IDs are base62-ish alphanumeric strings (typically 20–24 chars,
// occasionally longer for nested IDs). The check below is intentionally lax
// on length but strict on character set: any non-alphanumeric char is
// rejected, which blocks `/`, `\`, `.`, `?`, `#`, `&`, `;`, whitespace, `%`,
// `<`, `>`, `@`, and all other URL-manipulation vectors.

import type { ToolResult } from '../ghl-tools';

const GHL_ID_SHAPE = /^[A-Za-z0-9]{10,64}$/;

export function isValidGhlId(value: unknown): value is string {
  return typeof value === 'string' && GHL_ID_SHAPE.test(value);
}

export function validateGhlId(value: unknown, field: string): string | ToolResult {
  if (!isValidGhlId(value)) {
    return {
      success: false,
      error: `Invalid ${field}: must be alphanumeric (10–64 chars)`,
    };
  }
  return value;
}

/**
 * Validates all required ID fields on an args object. Returns an error
 * ToolResult if any field fails, otherwise null.
 */
export function validateGhlIds(
  args: Record<string, unknown>,
  fields: string[],
): ToolResult | null {
  for (const field of fields) {
    if (args[field] === undefined || args[field] === null) continue;
    if (!isValidGhlId(args[field])) {
      return {
        success: false,
        error: `Invalid ${field}: must be alphanumeric (10–64 chars)`,
      };
    }
  }
  return null;
}
