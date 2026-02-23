// ============================================================================
// GET /api/agency/invite
// POST /api/agency/invite  (rotate code)
//
// Returns (or creates) a unique invite link for this agency.
// Invite codes are stored in agencies.settings.invite_code
// No DB migration needed — pure JSONB.
//
// The invite link: https://kyra.conversionsystem.com/invite/[CODE]
// On visit → redirects to /signup/agency?ref=[agencyId]&from=[agencyName]
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';

function generateCode(): string {
  // 8-char alphanumeric code — readable and short enough to share
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars (0,o,l,1,i)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getOrCreateInviteCode(agencyId: string, agencySettings: Record<string, unknown>): Promise<string> {
  if (agencySettings.invite_code && typeof agencySettings.invite_code === 'string') {
    return agencySettings.invite_code;
  }

  // Generate a new code
  const code = generateCode();
  const db = createServiceClientWithoutCookies();
  await db
    .from('agencies')
    .update({ settings: { ...agencySettings, invite_code: code, invite_clicks: 0, invite_signups: 0 } })
    .eq('id', agencyId);

  return code;
}

function buildInviteUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com';
  return `${base}/invite/${code}`;
}

// GET — return the invite link (create code if none)
export async function GET() {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const code = await getOrCreateInviteCode(agency.id, settings);

  return NextResponse.json({
    code,
    url: buildInviteUrl(code),
    clicks: (settings.invite_clicks as number) ?? 0,
    signups: (settings.invite_signups as number) ?? 0,
  });
}

// POST — rotate invite code (generate a new one)
export async function POST() {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const settings = (agency.settings ?? {}) as Record<string, unknown>;

  const code = generateCode();
  const db = createServiceClientWithoutCookies();
  await db
    .from('agencies')
    .update({ settings: { ...settings, invite_code: code, invite_clicks: 0, invite_signups: 0 } })
    .eq('id', agency.id);

  return NextResponse.json({
    code,
    url: buildInviteUrl(code),
    clicks: 0,
    signups: 0,
  });
}
