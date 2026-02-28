/**
 * A/B Testing Engine — Message Optimization for Pipeline Outreach
 *
 * The problem: Agencies send one version of every outreach message.
 * They have no idea if a different tone, subject line, or angle would
 * get more replies. That's leaving money on the table.
 *
 * This engine:
 * 1. Creates A/B tests with two message variants per campaign
 * 2. Randomly assigns incoming leads to variant A or B
 * 3. Modifies the AI prompt during enrichment to match the variant's style
 * 4. Tracks performance (replies, bookings, closes) per variant
 * 5. Uses statistical significance (Z-test) to declare a winner
 * 6. Auto-optimizes: once a winner is found, all new leads use it
 *
 * Test types:
 * - "tone": Different writing styles (professional vs casual vs bold)
 * - "subject": Different subject line approaches
 * - "opener": Different SMS opener strategies
 * - "strategy": Different overall outreach strategies (pain-first vs value-first)
 * - "message": Full message rewrite with different instruction
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ABTestVariant {
  label: string;
  instruction: string;
  tone?: string;
  // Optional overrides for specific parts of the message
  subject_instruction?: string;
  opener_instruction?: string;
}

export interface ABTestStats {
  assigned: number;
  sent: number;
  opened: number;
  replied: number;
  interested: number;
  booked: number;
  closed: number;
}

export interface ABTest {
  id: string;
  agency_id: string;
  campaign_id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  test_type: 'message' | 'subject' | 'opener' | 'tone' | 'strategy';
  variant_a: ABTestVariant;
  variant_b: ABTestVariant;
  stats_a: ABTestStats;
  stats_b: ABTestStats;
  winner: 'a' | 'b' | null;
  confidence: number | null;
  winning_metric: string;
  auto_optimize: boolean;
  min_sample_size: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface MessageTemplate {
  id: string;
  agency_id: string;
  name: string;
  category: string;
  tone: string | null;
  instruction: string;
  example_subject: string | null;
  example_message: string | null;
  usage_count: number;
  avg_response_rate: number | null;
  created_at: string;
}

// ─── Default Templates (built-in message strategies) ──────────────────────────

export const DEFAULT_TEMPLATES: Omit<MessageTemplate, 'id' | 'agency_id' | 'created_at' | 'usage_count' | 'avg_response_rate'>[] = [
  {
    name: 'Professional & Direct',
    category: 'outreach',
    tone: 'professional',
    instruction: `Write in a professional, direct tone. Get to the point quickly. Use proper business language but avoid corporate jargon. Lead with a specific observation about their business. End with a clear, professional call-to-action. Example: "I noticed your team at [Company] is [observation]. We've helped similar businesses [result]. Would it make sense to explore this?"`,
    example_subject: 'Quick question about [Company]',
    example_message: null,
  },
  {
    name: 'Casual & Friendly',
    category: 'outreach',
    tone: 'casual',
    instruction: `Write like you're texting a friend who runs a business. Super casual, no formalities. Use short sentences. Maybe a dash of humor. Make it feel like you genuinely stumbled upon their business and got excited. No "Dear" or "I hope this finds you well." Start with something specific and end with a low-pressure question.`,
    example_subject: 'saw your store and had an idea',
    example_message: null,
  },
  {
    name: 'Pain-Point First',
    category: 'outreach',
    tone: 'empathetic',
    instruction: `Lead with their biggest pain point. Show you understand their struggle before mentioning any solution. Use empathetic language: "I know how frustrating it is when..." or "Most [industry] businesses waste hours on..." Make them feel understood. Only after acknowledging the pain, hint at a solution without being salesy. End with curiosity: "Is [pain point] something you've been dealing with?"`,
    example_subject: 'the [industry] problem nobody talks about',
    example_message: null,
  },
  {
    name: 'Value-First (Give Before Ask)',
    category: 'outreach',
    tone: 'generous',
    instruction: `Lead with free value — a specific tip, insight, or observation about their business they can use immediately, even if they never respond. Don't pitch. Give them something useful first (a website improvement they could make, a marketing tip for their industry, a competitive insight). Then casually mention you help businesses with this kind of thing. The CTA should feel like an afterthought, not the point of the email.`,
    example_subject: 'noticed something on your website',
    example_message: null,
  },
  {
    name: 'Bold & Provocative',
    category: 'outreach',
    tone: 'bold',
    instruction: `Be bold. Make a provocative claim or ask a challenging question that makes them think. Use contrast: "Most [industry] businesses do X. The top 10% do Y." Or "I bet your competitors are already doing this." Don't be aggressive — be confident and slightly contrarian. This style polarizes: some will love it, some won't. That's the point — lukewarm messages get lukewarm responses.`,
    example_subject: 'your competitors are already doing this',
    example_message: null,
  },
  {
    name: 'Story-Driven',
    category: 'outreach',
    tone: 'narrative',
    instruction: `Tell a micro-story. Start with a brief anecdote about a similar business you helped (keep it vague but believable). Paint the before/after picture in 2-3 sentences. People remember stories, not pitches. The story should naturally lead to "and I thought of your business when I saw [specific thing]." End with genuine curiosity about whether they face the same challenge.`,
    example_subject: 'reminded me of a business in [location]',
    example_message: null,
  },
];

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the active A/B test for a campaign (if any).
 */
export async function getActiveTest(campaignId: string): Promise<ABTest | null> {
  const svc = createServiceClientWithoutCookies();

  try {
    const { data, error } = await svc
      .from('pipeline_ab_tests')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as ABTest;
  } catch {
    // Table might not exist yet (migration pending)
    return null;
  }
}

/**
 * Assign a lead to a variant in an active A/B test.
 * Uses simple random assignment (50/50 split).
 * If one variant already has a winner, assigns to the winner.
 */
export async function assignVariant(
  testId: string,
  leadId: string,
  test?: ABTest,
): Promise<{ variant: 'a' | 'b'; instruction: string } | null> {
  const svc = createServiceClientWithoutCookies();

  // Load test if not provided
  if (!test) {
    const { data } = await svc
      .from('pipeline_ab_tests')
      .select('*')
      .eq('id', testId)
      .single();
    if (!data) return null;
    test = data as ABTest;
  }

  // If test has a winner and is completed, always use winner
  if (test.winner) {
    const variant = test.winner as 'a' | 'b';
    const variantData = variant === 'a' ? test.variant_a : test.variant_b;

    await svc.from('pipeline_leads').update({
      ab_test_id: testId,
      ab_variant: variant,
    }).eq('id', leadId);

    return { variant, instruction: variantData.instruction };
  }

  // Random 50/50 assignment
  const variant: 'a' | 'b' = Math.random() < 0.5 ? 'a' : 'b';
  const variantData = variant === 'a' ? test.variant_a : test.variant_b;

  // Update lead with variant assignment
  await svc.from('pipeline_leads').update({
    ab_test_id: testId,
    ab_variant: variant,
  }).eq('id', leadId);

  // Increment assigned count
  const statsKey = variant === 'a' ? 'stats_a' : 'stats_b';
  const currentStats = variant === 'a' ? test.stats_a : test.stats_b;
  await svc.from('pipeline_ab_tests').update({
    [statsKey]: { ...currentStats, assigned: (currentStats.assigned || 0) + 1 },
    updated_at: new Date().toISOString(),
  }).eq('id', testId);

  return { variant, instruction: variantData.instruction };
}

/**
 * Update stats when a lead's stage changes.
 * Called from the pipeline stage transition handlers.
 */
export async function updateTestStats(leadId: string, newStage: string): Promise<void> {
  const svc = createServiceClientWithoutCookies();

  try {
    // Get lead's A/B test assignment
    const { data: lead } = await svc
      .from('pipeline_leads')
      .select('ab_test_id, ab_variant')
      .eq('id', leadId)
      .single();

    if (!lead?.ab_test_id || !lead?.ab_variant) return;

    // Get current test
    const { data: test } = await svc
      .from('pipeline_ab_tests')
      .select('*')
      .eq('id', lead.ab_test_id)
      .single();

    if (!test || test.status !== 'active') return;

    // Map stage to stat key
    const stageToStat: Record<string, string> = {
      messaged: 'sent',
      replied: 'replied',
      interested: 'interested',
      booked: 'booked',
      closed: 'closed',
    };

    const statKey = stageToStat[newStage];
    if (!statKey) return;

    const statsField = lead.ab_variant === 'a' ? 'stats_a' : 'stats_b';
    const currentStats = lead.ab_variant === 'a' ? test.stats_a : test.stats_b;
    const updatedStats = {
      ...currentStats,
      [statKey]: ((currentStats as Record<string, number>)[statKey] || 0) + 1,
    };

    await svc.from('pipeline_ab_tests').update({
      [statsField]: updatedStats,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.ab_test_id);

    // Check if we should auto-optimize
    if (test.auto_optimize) {
      await checkAndDeclareWinner(lead.ab_test_id);
    }
  } catch {
    // Silently fail — A/B stats are nice-to-have, not critical
  }
}

/**
 * Check if statistical significance has been reached and declare a winner.
 * Uses a two-proportion Z-test.
 */
export async function checkAndDeclareWinner(testId: string): Promise<{
  winner: 'a' | 'b' | null;
  confidence: number;
  significant: boolean;
} | null> {
  const svc = createServiceClientWithoutCookies();

  const { data: test } = await svc
    .from('pipeline_ab_tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (!test) return null;

  const statsA = test.stats_a as ABTestStats;
  const statsB = test.stats_b as ABTestStats;
  const metric = test.winning_metric as keyof ABTestStats || 'replied';

  const nA = statsA.sent || 0;
  const nB = statsB.sent || 0;
  const succA = (statsA[metric] as number) || 0;
  const succB = (statsB[metric] as number) || 0;

  // Need minimum sample size in both variants
  if (nA < (test.min_sample_size || 20) || nB < (test.min_sample_size || 20)) {
    return { winner: null, confidence: 0, significant: false };
  }

  // Calculate proportions
  const pA = nA > 0 ? succA / nA : 0;
  const pB = nB > 0 ? succB / nB : 0;

  // Pooled proportion
  const pPool = (succA + succB) / (nA + nB);

  // Standard error
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));

  // Z-score
  const z = se > 0 ? (pA - pB) / se : 0;

  // Two-tailed p-value (simplified using normal approximation)
  const absZ = Math.abs(z);
  const confidence = zToConfidence(absZ);

  const significant = confidence >= 95;
  const winner = significant ? (pA > pB ? 'a' : 'b') : null;

  // If significant and auto-optimize, declare winner
  if (significant && test.auto_optimize && !test.winner) {
    await svc.from('pipeline_ab_tests').update({
      winner,
      confidence,
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', testId);
  }

  return { winner, confidence, significant };
}

/**
 * Convert Z-score to confidence percentage.
 * Uses a polynomial approximation of the normal CDF.
 */
function zToConfidence(z: number): number {
  // Approximation of the standard normal CDF
  // Abramowitz and Stegun formula 26.2.17
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z);
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z / 2);
  const cdf = 0.5 * (1 + sign * y);

  // Two-tailed confidence: probability that the difference is real
  const pValue = 2 * (1 - cdf);
  return Math.round((1 - pValue) * 10000) / 100; // confidence as percentage with 2 decimals
}

/**
 * Get the prompt modification for a specific variant.
 * This gets injected into the enrichment prompt to change the message style.
 */
export function getVariantPromptOverride(
  variant: ABTestVariant,
  testType: string,
): string {
  const parts: string[] = [];

  parts.push(`\n═══ A/B TEST INSTRUCTION ═══`);
  parts.push(`You are writing this message in "${variant.label}" style.`);

  if (variant.instruction) {
    parts.push(`STYLE GUIDE: ${variant.instruction}`);
  }

  if (variant.tone) {
    parts.push(`TONE: ${variant.tone}`);
  }

  if (testType === 'subject' && variant.subject_instruction) {
    parts.push(`SUBJECT LINE APPROACH: ${variant.subject_instruction}`);
  }

  if (testType === 'opener' && variant.opener_instruction) {
    parts.push(`SMS OPENER APPROACH: ${variant.opener_instruction}`);
  }

  parts.push(`═══ END A/B TEST ═══\n`);

  return parts.join('\n');
}

// ─── CRUD Operations ──────────────────────────────────────────────────────────

/**
 * Create a new A/B test.
 */
export async function createABTest(
  agencyId: string,
  campaignId: string,
  data: {
    name: string;
    test_type: string;
    variant_a: ABTestVariant;
    variant_b: ABTestVariant;
    winning_metric?: string;
    auto_optimize?: boolean;
    min_sample_size?: number;
  },
): Promise<ABTest | null> {
  const svc = createServiceClientWithoutCookies();

  // Pause any existing active test for this campaign
  await svc
    .from('pipeline_ab_tests')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('campaign_id', campaignId)
    .eq('status', 'active');

  const { data: test, error } = await svc
    .from('pipeline_ab_tests')
    .insert({
      agency_id: agencyId,
      campaign_id: campaignId,
      name: data.name,
      test_type: data.test_type,
      variant_a: data.variant_a,
      variant_b: data.variant_b,
      winning_metric: data.winning_metric || 'replied',
      auto_optimize: data.auto_optimize ?? true,
      min_sample_size: data.min_sample_size || 20,
    })
    .select()
    .single();

  if (error) {
    console.error('[ab-test] Failed to create:', error.message);
    return null;
  }

  return test as ABTest;
}

/**
 * List all A/B tests for an agency, optionally filtered by campaign.
 */
export async function listABTests(
  agencyId: string,
  campaignId?: string,
): Promise<ABTest[]> {
  const svc = createServiceClientWithoutCookies();

  try {
    let query = svc
      .from('pipeline_ab_tests')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data } = await query;
    return (data || []) as ABTest[];
  } catch {
    return [];
  }
}

/**
 * Update an A/B test (pause, resume, change settings).
 */
export async function updateABTest(
  testId: string,
  agencyId: string,
  updates: Partial<Pick<ABTest, 'name' | 'status' | 'winning_metric' | 'auto_optimize' | 'min_sample_size'>>,
): Promise<boolean> {
  const svc = createServiceClientWithoutCookies();

  const { error } = await svc
    .from('pipeline_ab_tests')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', testId)
    .eq('agency_id', agencyId);

  return !error;
}

/**
 * Manually declare a winner.
 */
export async function declareWinner(
  testId: string,
  agencyId: string,
  winner: 'a' | 'b',
): Promise<boolean> {
  const svc = createServiceClientWithoutCookies();

  // Get current test for confidence calculation
  const result = await checkAndDeclareWinner(testId);

  const { error } = await svc
    .from('pipeline_ab_tests')
    .update({
      winner,
      confidence: result?.confidence ?? null,
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', testId)
    .eq('agency_id', agencyId);

  return !error;
}

// ─── Template Operations ──────────────────────────────────────────────────────

/**
 * Get templates for an agency (including defaults).
 */
export async function getTemplates(agencyId: string): Promise<MessageTemplate[]> {
  const svc = createServiceClientWithoutCookies();

  try {
    const { data } = await svc
      .from('pipeline_message_templates')
      .select('*')
      .eq('agency_id', agencyId)
      .order('usage_count', { ascending: false });

    return (data || []) as MessageTemplate[];
  } catch {
    return [];
  }
}

/**
 * Seed default templates for an agency (called on first use).
 */
export async function seedDefaultTemplates(agencyId: string): Promise<void> {
  const svc = createServiceClientWithoutCookies();

  try {
    // Check if agency already has templates
    const { count } = await svc
      .from('pipeline_message_templates')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId);

    if ((count || 0) > 0) return; // Already seeded

    const templates = DEFAULT_TEMPLATES.map(t => ({
      ...t,
      agency_id: agencyId,
    }));

    await svc.from('pipeline_message_templates').insert(templates);
  } catch {
    // Table might not exist yet
  }
}
