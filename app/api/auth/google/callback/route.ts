import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveGoogleTokens } from '@/lib/integrations/google';

/**
 * GET /api/auth/google/callback
 * 
 * OAuth callback handler for Google Calendar integration.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL('/settings?error=google_auth_failed', request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?error=missing_params', request.url)
      );
    }

    // Decode state to get userId
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decoded.userId;
    } catch {
      return NextResponse.redirect(
        new URL('/settings?error=invalid_state', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Save tokens
    await saveGoogleTokens(userId, tokens);

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/settings?success=google_connected', request.url)
    );
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=google_auth_failed', request.url)
    );
  }
}
