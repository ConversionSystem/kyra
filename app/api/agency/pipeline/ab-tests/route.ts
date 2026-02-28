/**
 * /api/agency/pipeline/ab-tests
 *
 * GET  — List A/B tests for agency (optional ?campaign_id= filter)
 * POST — Create a new A/B test
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';
import {
  createABTest,
  listABTests,
  updateABTest,
  declareWinner,
  checkAndDeclareWinner,
  getTemplates,
  seedDefaultTemplates,
  DEFAULT_TEMPLATES,
} from '@/lib/pipeline/ab-testing';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// ─── GET: List A/B tests + templates ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id') || undefined;
  const includeTemplates = searchParams.get('templates') === 'true';

  try {
    const tests = await listABTests(agencyId, campaignId);

    // Refresh significance for active tests
    for (const test of tests) {
      if (test.status === 'active' && !test.winner) {
        const result = await checkAndDeclareWinner(test.id);
        if (result) {
          test.confidence = result.confidence;
          if (result.winner) {
            test.winner = result.winner;
            test.status = 'completed';
          }
        }
      }
    }

    let templates = null;
    if (includeTemplates) {
      templates = await getTemplates(agencyId);
      // If no templates yet, provide defaults
      if (templates.length === 0) {
        await seedDefaultTemplates(agencyId);
        templates = await getTemplates(agencyId);
        // If still empty (migration not run), return defaults with fake IDs
        if (templates.length === 0) {
          templates = DEFAULT_TEMPLATES.map((t, i) => ({
            ...t,
            id: `default-${i}`,
            agency_id: agencyId,
            usage_count: 0,
            avg_response_rate: null,
            created_at: new Date().toISOString(),
          }));
        }
      }
    }

    return NextResponse.json({
      tests,
      templates: templates || undefined,
    });
  } catch (err) {
    // If table doesn't exist yet, return empty
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('relation') || msg.includes('does not exist')) {
      return NextResponse.json({
        tests: [],
        templates: includeTemplates ? DEFAULT_TEMPLATES.map((t, i) => ({
          ...t,
          id: `default-${i}`,
          agency_id: agencyId,
          usage_count: 0,
          avg_response_rate: null,
          created_at: new Date().toISOString(),
        })) : undefined,
        migration_pending: true,
      });
    }
    return NextResponse.json({ error: 'Failed to load A/B tests' }, { status: 500 });
  }
}

// ─── POST: Create A/B test ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { campaign_id, name, test_type, variant_a, variant_b, winning_metric, auto_optimize, min_sample_size } = body;

  // Validation
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  if (!variant_a?.label || !variant_a?.instruction) {
    return NextResponse.json({ error: 'variant_a must have label and instruction' }, { status: 400 });
  }
  if (!variant_b?.label || !variant_b?.instruction) {
    return NextResponse.json({ error: 'variant_b must have label and instruction' }, { status: 400 });
  }

  try {
    const test = await createABTest(agencyId, campaign_id, {
      name,
      test_type: test_type || 'message',
      variant_a,
      variant_b,
      winning_metric,
      auto_optimize,
      min_sample_size,
    });

    if (!test) {
      return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
    }

    return NextResponse.json({ test });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('relation') || msg.includes('does not exist')) {
      return NextResponse.json({
        error: 'A/B testing tables not yet created. Run migration: 20260228001_pipeline_ab_tests.sql',
        migration_pending: true,
      }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }
}

// ─── PATCH: Update A/B test (pause, resume, declare winner) ───────────────────

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { test_id, action, ...updates } = body;

  if (!test_id) return NextResponse.json({ error: 'test_id required' }, { status: 400 });

  try {
    if (action === 'declare_winner') {
      const { winner } = body;
      if (winner !== 'a' && winner !== 'b') {
        return NextResponse.json({ error: 'winner must be "a" or "b"' }, { status: 400 });
      }
      const ok = await declareWinner(test_id, agencyId, winner);
      return ok
        ? NextResponse.json({ success: true })
        : NextResponse.json({ error: 'Failed to declare winner' }, { status: 500 });
    }

    if (action === 'pause') {
      const ok = await updateABTest(test_id, agencyId, { status: 'paused' });
      return ok
        ? NextResponse.json({ success: true })
        : NextResponse.json({ error: 'Failed to pause test' }, { status: 500 });
    }

    if (action === 'resume') {
      const ok = await updateABTest(test_id, agencyId, { status: 'active' });
      return ok
        ? NextResponse.json({ success: true })
        : NextResponse.json({ error: 'Failed to resume test' }, { status: 500 });
    }

    // Generic update
    const ok = await updateABTest(test_id, agencyId, updates);
    return ok
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  }
}
