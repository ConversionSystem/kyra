// ============================================================================
// GET/POST /api/agency/api-keys
//
// GET  → Returns which providers have keys configured (not the actual keys)
// POST → Saves API keys for the agency (encrypted in Supabase)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

const VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'openrouter'];

// ── GET: Check which providers are configured ─────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get agency
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'No agency found' }, { status: 404 });
  }

  // Get agency settings
  const serviceClient = createServiceClientWithoutCookies();
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('api_keys')
    .eq('id', member.agency_id)
    .single();

  const apiKeys = (agency?.api_keys as Record<string, string>) || {};

  // Return which providers have keys (not the actual keys)
  const configured: Record<string, boolean> = {};
  for (const provider of VALID_PROVIDERS) {
    configured[provider] = !!apiKeys[provider];
  }

  return NextResponse.json({ configured });
}

// ── POST: Save API keys ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: { keys?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const newKeys = body.keys;
  if (!newKeys || typeof newKeys !== 'object') {
    return NextResponse.json(
      { error: 'Keys object is required' },
      { status: 400 },
    );
  }

  // Validate provider names
  for (const provider of Object.keys(newKeys)) {
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider: ${provider}` },
        { status: 400 },
      );
    }
  }

  // Get agency
  const { data: member } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'No agency found' }, { status: 404 });
  }

  if (member.role !== 'owner' && member.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only owners and admins can manage API keys' },
      { status: 403 },
    );
  }

  // Get existing keys and merge
  const serviceClient = createServiceClientWithoutCookies();
  const { data: agency } = await serviceClient
    .from('agencies')
    .select('api_keys')
    .eq('id', member.agency_id)
    .single();

  const existingKeys = (agency?.api_keys as Record<string, string>) || {};
  const mergedKeys = { ...existingKeys, ...newKeys };

  // Remove empty keys
  for (const [key, value] of Object.entries(mergedKeys)) {
    if (!value || !value.trim()) {
      delete mergedKeys[key];
    }
  }

  // Save
  const { error } = await serviceClient
    .from('agencies')
    .update({
      api_keys: mergedKeys,
      updated_at: new Date().toISOString(),
    })
    .eq('id', member.agency_id);

  if (error) {
    console.error('[api-keys] Save failed:', error);
    return NextResponse.json(
      { error: 'Failed to save API keys' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    configured: Object.fromEntries(
      VALID_PROVIDERS.map((p) => [p, !!mergedKeys[p]])
    ),
  });
}
