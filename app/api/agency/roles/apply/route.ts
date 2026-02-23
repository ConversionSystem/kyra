import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { updateClientConfig } from '@/lib/ovh/provisioner';
import { buildInjectionDefensePromptSuffix } from '@/lib/security/prompt-injection';

/**
 * POST /api/agency/roles/apply
 * Apply an agent role persona to an existing client.
 * Merges role data into existing container_config — never overwrites business instructions.
 */
export async function POST(request: NextRequest) {
  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  const { agency } = result.data;

  let body: { clientId: string; roleName: string; roleTagline: string; roleSoulMd: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, roleName, roleTagline, roleSoulMd } = body;
  if (!clientId || !roleName || !roleSoulMd) {
    return NextResponse.json({ error: 'Missing required fields: clientId, roleName, roleSoulMd' }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch current client config
  const { data: client, error: fetchError } = await supabase
    .from('agency_clients')
    .select('id, name, container_config')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const existingCfg = (client.container_config as Record<string, unknown>) ?? {};

  // Merge role data into config — keep existing instructions/greeting/calendar_url
  const updatedCfg: Record<string, unknown> = {
    ...existingCfg,
    role_name:    roleName,
    role_tagline: roleTagline,
    // persona = the role's full behavioral SOUL (HOW the AI thinks)
    // instructions = business knowledge (WHAT the AI knows) — preserved
    persona: roleSoulMd,
  };

  // Persist to DB
  const { data: updated, error: updateError } = await supabase
    .from('agency_clients')
    .update({ container_config: updatedCfg })
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .select('id, name, container_config')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }

  // Push new SOUL.md to the container (fire-and-forget)
  void (async () => {
    try {
      const cfg        = updatedCfg;
      const persona    = roleSoulMd;
      const greeting   = (cfg.greeting   as string) || '';
      const instructions = (cfg.instructions as string) || '';
      const language   = (cfg.response_language as string) || 'English';

      const soulLines: string[] = [`# SOUL.md — ${client.name}`, ''];

      // Role behavior section
      soulLines.push('## Who You Are & How You Think');
      soulLines.push(persona);
      soulLines.push('');

      // Business knowledge (preserved from Personality tab)
      if (instructions) {
        soulLines.push('## Business Knowledge & Instructions');
        soulLines.push(instructions);
        soulLines.push('');
      }

      if (greeting) {
        soulLines.push('## Greeting');
        soulLines.push(`When someone reaches out for the first time: "${greeting}"`);
        soulLines.push('');
      }

      soulLines.push('## Communication Style');
      soulLines.push(`- Always respond in ${language}`);
      soulLines.push('- Keep replies concise and clear (SMS/messaging)');
      soulLines.push('- Stay in character at all times');
      soulLines.push('- Ask one focused question if you need more info');
      soulLines.push('- Never reveal you are an AI unless directly asked');

      const soulMd = soulLines.join('\n') + buildInjectionDefensePromptSuffix();
      const pushResult = await updateClientConfig(clientId, { soulMd });

      if (pushResult.success) {
        console.log(`[roles/apply] SOUL.md pushed for client ${clientId} — role: ${roleName}`);
      } else {
        console.warn(`[roles/apply] Failed to push SOUL.md for ${clientId}:`, pushResult.error);
      }
    } catch (err) {
      console.error(`[roles/apply] Error pushing SOUL.md for ${clientId}:`, err);
    }
  })();

  return NextResponse.json({ success: true, client: updated });
}
