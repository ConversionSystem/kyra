/**
 * Skills API
 * 
 * GET  — List available skills + user's enabled state
 * POST — Enable/disable a skill (with optional API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAvailableSkills, getSkillById } from '@/lib/skills/registry';
import { Plan } from '@/lib/billing/plans';

export async function GET() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get user plan
  const { data: profile } = await serviceClient
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = (profile?.plan || 'free') as Plan;
  const available = getAvailableSkills(plan);

  // Get user's enabled skills
  const { data: userSkills } = await serviceClient
    .from('user_skills')
    .select('skill_id, enabled, api_key_set')
    .eq('user_id', user.id);

  const enabledMap = new Map(
    (userSkills || []).map((s: any) => [s.skill_id, { enabled: s.enabled, apiKeySet: s.api_key_set }])
  );

  const skills = available.map(skill => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    icon: skill.icon,
    category: skill.category,
    needsApiKey: skill.needsApiKey,
    apiKeyLabel: skill.apiKeyLabel,
    apiKeyPlaceholder: skill.apiKeyPlaceholder,
    creditMultiplier: skill.creditMultiplier,
    enabled: enabledMap.get(skill.id)?.enabled ?? false,
    apiKeySet: enabledMap.get(skill.id)?.apiKeySet ?? false,
    requiredPlan: skill.requiredPlan,
  }));

  return NextResponse.json({ skills, plan });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { skillId, enabled, apiKey } = await request.json();
  if (!skillId || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'skillId and enabled required' }, { status: 400 });
  }

  // Verify skill exists and user has access
  const { data: profile } = await serviceClient
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = (profile?.plan || 'free') as Plan;
  const skill = getSkillById(skillId);

  if (!skill || !skill.hostedCompatible) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  }

  if (skill.requiredPlan.length > 0 && !skill.requiredPlan.includes(plan)) {
    return NextResponse.json({ error: 'Plan upgrade required' }, { status: 403 });
  }

  // If skill needs API key and is being enabled without one
  if (enabled && skill.needsApiKey && !apiKey) {
    // Check if key was previously set
    const { data: existing } = await serviceClient
      .from('user_skills')
      .select('api_key_set')
      .eq('user_id', user.id)
      .eq('skill_id', skillId)
      .single();

    if (!existing?.api_key_set) {
      return NextResponse.json({ error: 'API key required for this skill' }, { status: 400 });
    }
  }

  // Upsert the skill setting
  const upsertData: any = {
    user_id: user.id,
    skill_id: skillId,
    enabled,
    updated_at: new Date().toISOString(),
  };

  if (apiKey) {
    upsertData.api_key_encrypted = apiKey; // TODO: encrypt before storing
    upsertData.api_key_set = true;
  }

  const { error: upsertError } = await serviceClient
    .from('user_skills')
    .upsert(upsertData, { onConflict: 'user_id,skill_id' });

  if (upsertError) {
    console.error('Failed to update skill:', upsertError);
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });
  }

  return NextResponse.json({ success: true, skillId, enabled });
}
