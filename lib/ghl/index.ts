// ============================================================================
// kyra-ghl — GoHighLevel Integration
//
// Barrel export + factory for creating GHL clients from database records.
// ============================================================================

export { GHLClient, GHLError, GHLRateLimitError, GHLTokenExpiredError } from './client';
export type { OnTokenRefresh } from './client';
export * from './types';
export {
  encodeOAuthState,
  decodeOAuthState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
} from './oauth';

import { GHLClient, type OnTokenRefresh } from './client';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

/**
 * Create a GHLClient for a given agency_client record.
 *
 * Automatically wires up token persistence: when the client refreshes
 * the access token, the new tokens are written back to the database.
 */
export async function createGHLClientForAgencyClient(
  agencyClientId: string,
): Promise<GHLClient | null> {
  const supabase = createServiceClientWithoutCookies();

  const { data, error } = await supabase
    .from('agency_clients')
    .select('ghl_access_token, ghl_refresh_token, ghl_location_id')
    .eq('id', agencyClientId)
    .single();

  if (error || !data?.ghl_access_token || !data?.ghl_refresh_token) {
    return null;
  }

  const onTokenRefresh: OnTokenRefresh = async ({ accessToken, refreshToken }) => {
    await supabase
      .from('agency_clients')
      .update({
        ghl_access_token: accessToken,
        ghl_refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agencyClientId);
  };

  return new GHLClient({
    accessToken: data.ghl_access_token,
    refreshToken: data.ghl_refresh_token,
    onTokenRefresh,
  });
}
