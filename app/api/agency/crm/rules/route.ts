import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { getRules, saveRules, executeRule, getDefaultRules } from '@/lib/crm/rules';
import type { CrmRule } from '@/lib/crm/rules';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// GET — list rules
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  let rules = await getRules(agencyId);
  if (!rules.length) {
    rules = getDefaultRules();
    await saveRules(agencyId, rules);
  }

  return NextResponse.json({ rules });
}

// POST — create/update rules or execute a rule
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();

  // Execute a specific rule
  if (body.execute_rule_id) {
    const rules = await getRules(agencyId);
    const rule = rules.find(r => r.id === body.execute_rule_id);
    if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    const result = await executeRule(agencyId, rule);
    return NextResponse.json(result);
  }

  // Save rules
  if (body.rules && Array.isArray(body.rules)) {
    const ok = await saveRules(agencyId, body.rules as CrmRule[]);
    if (!ok) return NextResponse.json({ error: 'Failed to save rules' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
