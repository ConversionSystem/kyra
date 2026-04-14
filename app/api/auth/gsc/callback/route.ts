import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import {
  exchangeGSCCode,
  getGSCSites,
} from '@/lib/integrations/google-search-console';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com';

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/agency?error=gsc_auth_failed`);
  }

  let siteId: string;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, 'base64').toString());
    siteId = state.siteId;
  } catch {
    return NextResponse.redirect(`${appUrl}/agency?error=gsc_invalid_state`);
  }

  try {
    const tokens = await exchangeGSCCode(code);
    const supabase = createServiceClientWithoutCookies();

    // Get list of GSC sites to auto-detect the correct one
    const sites = await getGSCSites(tokens.access_token);

    // Get site domain to match
    const { data: site } = await supabase
      .from('client_sites')
      .select('site_domain, site_subdomain')
      .eq('id', siteId)
      .single();

    const domain = site?.site_domain || site?.site_subdomain || '';
    const matchedSite =
      sites.find((s) => s.includes(domain)) || sites[0] || '';

    await supabase
      .from('client_sites')
      .update({
        gsc_access_token: tokens.access_token,
        gsc_refresh_token: tokens.refresh_token || null,
        gsc_token_expires_at: new Date(
          Date.now() + (tokens.expires_in || 3600) * 1000,
        ).toISOString(),
        gsc_site_url: matchedSite,
        search_console_connected: true,
      })
      .eq('id', siteId);

    return NextResponse.redirect(
      `${appUrl}/agency/website/${siteId}/seo?gsc=connected`,
    );
  } catch (err) {
    console.error('[gsc/callback] error:', err);
    return NextResponse.redirect(
      `${appUrl}/agency?error=gsc_exchange_failed`,
    );
  }
}
