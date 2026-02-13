// ============================================================================
// Agency Utility Functions
// ============================================================================

/**
 * Convert a string to a URL-safe slug (lowercase, hyphens only).
 * Strips non-alphanumeric characters, collapses multiple hyphens.
 */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // remove non-alphanumeric (except spaces/hyphens)
    .replace(/[\s_]+/g, '-')        // spaces/underscores → hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim leading/trailing hyphens
}

/**
 * Validate that a slug is URL-safe: lowercase letters, numbers, and hyphens only.
 * Must be 2-48 chars, start and end with alphanumeric.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/.test(slug) || /^[a-z0-9]{1,2}$/.test(slug);
}
