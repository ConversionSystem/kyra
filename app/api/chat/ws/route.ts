/**
 * GET /api/chat/ws — Get WebSocket connection details for real-time chat
 *
 * Returns the WebSocket URL with auth params for connecting to
 * the user's OpenClaw container via kyra-worker.
 */
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WORKER_URL = process.env.KYRA_WORKER_URL;
const API_SECRET = process.env.KYRA_API_SECRET;

export async function GET(request: NextRequest) {
  if (!WORKER_URL || !API_SECRET) {
    return new Response(JSON.stringify({ error: 'Worker not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Build WebSocket URL
  const wsUrl =
    WORKER_URL.replace(/^http/, 'ws') +
    `/api/kyra/ws?token=${encodeURIComponent(API_SECRET)}&userId=${encodeURIComponent(user.id)}`;

  return new Response(JSON.stringify({ wsUrl, userId: user.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
