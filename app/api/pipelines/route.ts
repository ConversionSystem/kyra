import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getUserPipelines } from '@/lib/pipelines/engine';

/**
 * GET /api/pipelines — List user's pipelines
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  
  const pipelines = await getUserPipelines(user.id, status);
  return NextResponse.json({ pipelines });
}
