// GET /api/admin/health-check
// Returns a list of pending action items for the admin.
// Only callable by admin users (checked via service key header).

import { NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function tableExists(sb: ReturnType<typeof getSupabase>, name: string): Promise<boolean> {
  const { data, error } = await sb
    .from(name)
    .select('id')
    .limit(0);
  return !error;
}

export async function GET() {
  const checks: Array<{ id: string; title: string; desc: string; link: string; linkLabel: string; severity: 'critical' | 'warning' | 'info' }> = [];

  // 1. RESEND_API_KEY
  if (!process.env.RESEND_API_KEY) {
    checks.push({
      id: 'resend_api_key',
      title: 'Add RESEND_API_KEY to Vercel',
      desc: 'Email sending is disabled. Welcome emails, escalation alerts, email sequences, and weekly reports all require this key.',
      link: 'https://vercel.com/dashboard',
      linkLabel: 'Open Vercel Dashboard →',
      severity: 'critical',
    });
  }

  const sb = getSupabase();

  // 2. agency_referrals migration
  const referralsOk = await tableExists(sb, 'agency_referrals');
  if (!referralsOk) {
    checks.push({
      id: 'migration_referrals',
      title: 'Apply Supabase migration: agency_referrals',
      desc: 'The referral program is live but the DB table is missing. Referral links will fail silently until this is applied.',
      link: 'https://supabase.com/dashboard/project/yaijdtsunxicuphrakcc/sql',
      linkLabel: 'Open Supabase SQL Editor →',
      severity: 'critical',
    });
  }

  // 3. kyra_waitlist migration
  const waitlistOk = await tableExists(sb, 'kyra_waitlist');
  if (!waitlistOk) {
    checks.push({
      id: 'migration_waitlist',
      title: 'Apply Supabase migration: kyra_waitlist',
      desc: 'Lead capture on the landing page is live but the DB table is missing. Submitted emails are being lost.',
      link: 'https://supabase.com/dashboard/project/yaijdtsunxicuphrakcc/sql',
      linkLabel: 'Open Supabase SQL Editor →',
      severity: 'critical',
    });
  }

  // 4. GHL Marketplace
  checks.push({
    id: 'ghl_marketplace',
    title: 'Submit Kyra to GHL Marketplace',
    desc: 'Listing copy is ready. You have GHL agency status. This unlocks distribution to 60,000 agencies.',
    link: '/agency/ghl-listing',
    linkLabel: 'View listing copy →',
    severity: 'warning',
  });

  // 5. Demo video
  checks.push({
    id: 'demo_video',
    title: 'Record 60-second demo video',
    desc: 'Needed for the GHL Marketplace listing, Launch Accelerator application, and pitch pages.',
    link: '/agency/launch-pitch',
    linkLabel: 'See checklist →',
    severity: 'info',
  });

  return NextResponse.json({ checks, timestamp: new Date().toISOString() });
}
