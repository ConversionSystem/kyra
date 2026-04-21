/**
 * Validates partial updates to the `agencies.settings` JSONB column.
 *
 * Why extracted from the route file:
 *   - Testable in isolation (see __tests__/agency-settings-validator.test.ts).
 *   - Used as the single source of truth for what keys are accepted + how
 *     they're normalized. Prevents the route from silently merging arbitrary
 *     client-supplied JSON into the DB.
 *
 * Security-relevant rule: `show_powered_by = false` is only honored on Pro
 * and Scale plans. Lower plans (free / solo_pro / starter / beta) are
 * silently forced back to "show badge" regardless of what they submit.
 */

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Plans that may hide the "Powered by Kyra" badge (white-label). */
export const PLANS_THAT_CAN_HIDE_BADGE: ReadonlyArray<string> = ['pro', 'scale'];

export function validateHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export interface ValidateSettingsResult {
  /** Validated & normalized settings to merge. `undefined` values signal delete. */
  updates: Record<string, unknown>;
  /** Present if validation failed. Route should return 400 with this message. */
  error?: string;
}

/**
 * Validate a partial update to `agencies.settings`.
 *
 * Unknown keys are silently dropped — this is an allowlist, not a blocklist.
 * Returning `updates: { key: undefined }` signals that the caller should
 * delete that key from the existing settings object.
 *
 * @param input  client-supplied object (from request body)
 * @param currentPlan  the agency's current plan, used for the badge plan-gate
 */
export function validateSettingsPatch(
  input: Record<string, unknown>,
  currentPlan: string,
): ValidateSettingsResult {
  const out: Record<string, unknown> = {};

  if ('logo_url' in input) {
    const v = input.logo_url;
    if (v === undefined || v === null || v === '') {
      out.logo_url = undefined;
    } else if (typeof v !== 'string') {
      return { updates: {}, error: 'logo_url must be a string' };
    } else {
      const normalized = validateHttpUrl(v.trim());
      if (!normalized) {
        return { updates: {}, error: 'logo_url must be a valid http(s) URL' };
      }
      out.logo_url = normalized;
    }
  }

  for (const key of ['primary_color', 'accent_color'] as const) {
    if (key in input) {
      const v = input[key];
      if (v === undefined || v === null || v === '') {
        out[key] = undefined;
      } else if (typeof v !== 'string' || !HEX_COLOR.test(v.trim())) {
        return { updates: {}, error: `${key} must be a hex color (e.g. #8b5cf6)` };
      } else {
        out[key] = v.trim().toLowerCase();
      }
    }
  }

  if ('company_name' in input) {
    const v = input.company_name;
    if (v === undefined || v === null || v === '') {
      out.company_name = undefined;
    } else if (typeof v !== 'string') {
      return { updates: {}, error: 'company_name must be a string' };
    } else {
      const name = v.trim();
      if (name.length > 100) return { updates: {}, error: 'company_name must be ≤ 100 characters' };
      out.company_name = name;
    }
  }

  if ('support_email' in input) {
    const v = input.support_email;
    if (v === undefined || v === null || v === '') {
      out.support_email = undefined;
    } else if (typeof v !== 'string' || !EMAIL_RE.test(v.trim())) {
      return { updates: {}, error: 'support_email must be a valid email address' };
    } else {
      out.support_email = v.trim().toLowerCase();
    }
  }

  if ('show_powered_by' in input) {
    const v = input.show_powered_by;
    if (typeof v !== 'boolean') {
      return { updates: {}, error: 'show_powered_by must be a boolean' };
    }
    // Plan-gate: only Pro/Scale can hide the badge. Lower plans submitting
    // `false` are silently ignored rather than erroring — keeps the UI
    // tolerant of forms that always send every field.
    if (v === false && !PLANS_THAT_CAN_HIDE_BADGE.includes(currentPlan)) {
      // skip — badge stays visible for this plan
    } else {
      out.show_powered_by = v;
    }
  }

  return { updates: out };
}
