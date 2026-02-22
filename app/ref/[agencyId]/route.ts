// GET /ref/[agencyId]
// Referral redirect — sets a cookie then forwards to /signup/agency
// Short, shareable URL that agencies put in their bio, DMs, cold emails etc.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  const { agencyId } = await params;

  const response = NextResponse.redirect(
    new URL(`/signup/agency?ref=${agencyId}`, _request.url)
  );

  // 30-day referral cookie — survives multiple visits
  response.cookies.set('kyra_ref', agencyId, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });

  return response;
}
