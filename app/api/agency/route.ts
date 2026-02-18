import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { isValidSlug } from '@/lib/agency/utils';
import { provisionGateway } from '@/lib/fly/provisioner';
import type { CreateAgencyRequest, AgencyWithCounts } from '@/lib/agency/types';

/**
 * GET /api/agency
 * Return the current user's agency data with member count and client count.
 * Returns { agency: null } if user has no agency (instead of erroring).
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    // For "no membership" — return null instead of an error so signup pages don't break
    if (result.error.status === 403) {
      return NextResponse.json({ agency: null }, { status: 200 });
    }
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Fetch counts in parallel
  const [membersResult, clientsResult] = await Promise.all([
    supabase
      .from('agency_members')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id),
    supabase
      .from('agency_clients')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agency.id),
  ]);

  const response: AgencyWithCounts = {
    ...agency,
    member_count: membersResult.count ?? 0,
    client_count: clientsResult.count ?? 0,
  };

  return NextResponse.json(response);
}

/**
 * POST /api/agency
 * Create a new agency. Also creates an agency_member record for the user as owner.
 * Uses service client to bypass RLS during initial creation.
 */
export async function POST(request: NextRequest) {
  console.log('[POST /api/agency] Creating agency...');
  
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('[POST /api/agency] Auth failed:', authError?.message);
    return NextResponse.json({ error: 'Not authenticated. Please log in and try again.' }, { status: 401 });
  }
  
  console.log('[POST /api/agency] User:', user.id, user.email);

  // Parse body
  let body: CreateAgencyRequest;
  try {
    body = (await request.json()) as CreateAgencyRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, slug, plan } = body;

  // Validate required fields
  if (!name || !slug || !plan) {
    return NextResponse.json({ error: 'Missing required fields: name, slug, plan' }, { status: 400 });
  }

  // Validate plan (beta = free full access during beta period, stored as 'scale' in DB)
  const validPlans = ['starter', 'pro', 'scale', 'beta'];
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }
  // Map 'beta' to 'scale' for DB storage (DB constraint only allows starter/pro/scale)
  // All beta users get full access anyway (isPremium = true)
  const dbPlan = plan === 'beta' ? 'scale' : plan;

  // Validate slug
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug. Use lowercase letters, numbers, and hyphens only (2-48 chars).' },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();

  // Check if user already has an agency
  const { data: existingMembership } = await serviceClient
    .from('agency_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (existingMembership) {
    return NextResponse.json({ error: 'You already belong to an agency' }, { status: 409 });
  }

  // Check slug uniqueness
  const { data: existingAgency } = await serviceClient
    .from('agencies')
    .select('id')
    .eq('slug', slug)
    .limit(1)
    .single();

  if (existingAgency) {
    return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 });
  }

  // Create agency
  const { data: agency, error: createError } = await serviceClient
    .from('agencies')
    .insert({
      owner_id: user.id,
      name,
      slug,
      plan: dbPlan,
    })
    .select()
    .single();

  if (createError || !agency) {
    console.error('[POST /api/agency] Failed to create agency:', createError?.message, createError?.code, createError?.details);
    return NextResponse.json({ error: `Failed to create agency: ${createError?.message || 'unknown error'}` }, { status: 500 });
  }

  console.log('[POST /api/agency] Agency created:', agency.id, agency.name);

  // Create owner membership
  const { error: memberError } = await serviceClient.from('agency_members').insert({
    agency_id: agency.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    console.error('[POST /api/agency] Failed to create member:', memberError?.message, memberError?.code, memberError?.details);
    // Rollback agency creation
    await serviceClient.from('agencies').delete().eq('id', agency.id);
    return NextResponse.json({ error: `Failed to create agency membership: ${memberError?.message || 'unknown error'}` }, { status: 500 });
  }

  console.log('[POST /api/agency] Success! Agency:', agency.id, 'User:', user.id);

  // ── Auto-provision OpenClaw Gateway ──────────────────────────────────────
  // Fire and forget — don't block the signup response.
  // Gateway takes ~2-3 min to boot. Status page will show progress.
  provisionGateway(agency.id)
    .then((result) => {
      if (result.success) {
        console.log(`[POST /api/agency] Gateway provisioned: ${result.appName} → ${result.gatewayUrl}`);
      } else {
        console.error(`[POST /api/agency] Gateway provisioning failed: ${result.error}`);
      }
    })
    .catch((err) => {
      console.error(`[POST /api/agency] Gateway provisioning error:`, err);
    });

  return NextResponse.json(agency, { status: 201 });
}
