import { NextRequest, NextResponse } from 'next/server';
import { runProactiveCheckAll } from '@/lib/proactive/engine';

/**
 * POST /api/proactive/check
 * 
 * Cron endpoint: runs proactive intelligence for all active users.
 * Should be called every 2-4 hours via Cloudflare Cron Triggers or external scheduler.
 * 
 * Auth: API key required
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const cronKey = process.env.CRON_API_KEY || process.env.OPENCLAW_API_KEY;
  
  if (!cronKey || apiKey !== cronKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runProactiveCheckAll();
    
    const totalInsights = results.reduce((sum, r) => sum + r.insights.length, 0);
    
    return NextResponse.json({
      success: true,
      usersChecked: results.length,
      totalInsights,
      results: results.map(r => ({
        userId: r.userId,
        insightCount: r.insights.length,
        types: r.insights.map(i => i.type),
      })),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Proactive check error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
