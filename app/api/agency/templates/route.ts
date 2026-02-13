import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';

/**
 * GET /api/agency/templates
 * Return built-in templates (agency_id IS NULL) + the user's agency's own templates.
 */
export async function GET() {
  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  // Fetch built-in templates + agency's own templates in parallel
  const [builtInResult, agencyResult] = await Promise.all([
    supabase
      .from('agency_templates')
      .select('*')
      .is('agency_id', null)
      .order('name'),
    supabase
      .from('agency_templates')
      .select('*')
      .eq('agency_id', agency.id)
      .order('name'),
  ]);

  if (builtInResult.error) {
    console.error('Failed to fetch built-in templates:', builtInResult.error);
  }
  if (agencyResult.error) {
    console.error('Failed to fetch agency templates:', agencyResult.error);
  }

  return NextResponse.json({
    built_in: builtInResult.data ?? [],
    custom: agencyResult.data ?? [],
  });
}
