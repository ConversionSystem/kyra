import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { getGSCAuthUrl } from '@/lib/integrations/google-search-console';

export async function GET(request: NextRequest) {
  const auth = await requireAgencyMember();
  if (auth.error) return NextResponse.redirect(new URL('/login', request.url));

  const siteId = request.nextUrl.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }

  const authUrl = getGSCAuthUrl(siteId);
  return NextResponse.redirect(authUrl);
}
