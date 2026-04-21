/**
 * lib/agency/constants.ts
 *
 * Centralized agency identifiers + feature-entitlement lookups.
 *
 * Previously these UUIDs were hardcoded in 7+ client-component files
 * (client-detail-view, ai-setup-tab, ai-workers-tab, marketing-tab, etc.).
 * Onboarding a new agency into "advanced tabs" required a code deploy;
 * removing one required another. This module is the single source of
 * truth — override via env vars in production.
 *
 * Long-term the allowlists should move to a `agencies.entitlements` JSONB
 * column so onboarding is a row update, not a deploy. That's tracked
 * separately.
 */

/** The Conversion System master agency UUID. */
export const MASTER_AGENCY_ID =
  process.env.MASTER_AGENCY_ID || '1511e077-77ef-4c47-81fd-06a3bc9f1dbb';

function parseEnvUuidList(envValue: string | undefined, defaults: string[]): readonly string[] {
  if (!envValue) return Object.freeze([...defaults]);
  const fromEnv = envValue
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Object.freeze(Array.from(new Set([...defaults.map((s) => s.toLowerCase()), ...fromEnv])));
}

/**
 * Agencies with access to the advanced tabs cluster:
 *   Marketing · Voice/SMS · SEO-GEO · Integrations (IT Ops)
 *
 * Env override (additive): ADVANCED_TABS_AGENCIES="uuid1,uuid2"
 */
export const ADVANCED_TABS_AGENCIES: readonly string[] = parseEnvUuidList(
  process.env.ADVANCED_TABS_AGENCIES,
  [
    MASTER_AGENCY_ID.toLowerCase(), // Conversion System (Kyra master)
    '18e6e562-ec29-4652-a38b-58f6be2e533f', // TrustedNetworx
    '13cc47bc-88bb-4ef8-84e8-f2c0cd97fd3e', // Priv7 (Purple Lotus — Paul Rivera)
  ],
);

/**
 * Agencies with Dispatch tab (Onfleet integration).
 *
 * Env override (additive): DISPATCH_AGENCIES="uuid1,uuid2"
 */
export const DISPATCH_AGENCIES: readonly string[] = parseEnvUuidList(
  process.env.DISPATCH_AGENCIES,
  [
    MASTER_AGENCY_ID.toLowerCase(), // Conversion System (Kyra master)
    '13cc47bc-88bb-4ef8-84e8-f2c0cd97fd3e', // Priv7 (Purple Lotus — Paul Rivera)
  ],
);

/** Runtime gate helpers — take an agency ID (any case) and return bool. */
export function isMasterAgency(agencyId: string | null | undefined): boolean {
  if (!agencyId) return false;
  return agencyId.toLowerCase() === MASTER_AGENCY_ID.toLowerCase();
}

export function hasAdvancedTabs(agencyId: string | null | undefined): boolean {
  if (!agencyId) return false;
  return ADVANCED_TABS_AGENCIES.includes(agencyId.toLowerCase());
}

export function hasDispatchTab(agencyId: string | null | undefined): boolean {
  if (!agencyId) return false;
  return DISPATCH_AGENCIES.includes(agencyId.toLowerCase());
}
