import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Log every non-API request path in development only. In production this
// would flood Vercel logs (and cost money at scale) with data that's
// already captured by Vercel Analytics + Sentry request instrumentation.
const LOG_REQUESTS = process.env.NODE_ENV !== 'production';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (LOG_REQUESTS) {
    console.log('[middleware]', request.method, path);
  }

  // Skip auth middleware for ALL API routes (webhooks, billing, etc.)
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
