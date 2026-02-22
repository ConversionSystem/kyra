import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyMember, requireAgencyAdmin, requireAgencyOwner } from '@/lib/agency/middleware';
import { updateClientConfig } from '@/lib/ovh/provisioner';
import type { UpdateClientRequest } from '@/lib/agency/types';

/**
 * Build a SOUL.md from Personality tab fields.
 * This is the AI's core identity — OpenClaw reads it on every session start.
 */
function buildSoulMd(
  clientName: string,
  persona: string,
  greeting: string,
  instructions: string
): string {
  const lines: string[] = [];
  lines.push(`# SOUL.md — ${clientName}`);
  lines.push('');

  if (persona) {
    lines.push('## Who You Are');
    lines.push(persona);
    lines.push('');
  }

  if (greeting) {
    lines.push('## Greeting');
    lines.push(`When someone reaches out for the first time, greet them with:`);
    lines.push(`"${greeting}"`);
    lines.push('');
  }

  if (instructions) {
    lines.push('## Your Instructions & Knowledge');
    lines.push(instructions);
    lines.push('');
  }

  lines.push('## Communication Style');
  lines.push('- You are responding via SMS/messaging — keep replies concise and clear');
  lines.push('- Stay in character as described above at all times');
  lines.push('- If you need more information, ask one focused question');
  lines.push('- Never reveal you are an AI unless directly asked');

  return lines.join('\n');
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/agency/clients/[id]
 * Get details of a specific client.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const result = await requireAgencyMember();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .select('*')
    .eq('id', id)
    .eq('agency_id', agency.id)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json(client);
}

/**
 * PATCH /api/agency/clients/[id]
 * Update a client's name, industry, status, or container_config (requires admin+).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const result = await requireAgencyAdmin();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;

  // Parse body
  let body: UpdateClientRequest;
  try {
    body = (await request.json()) as UpdateClientRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate status if provided
  if (body.status && !['active', 'paused', 'setup'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status. Must be: active, paused, or setup' }, { status: 400 });
  }

  // Build update object — only include provided fields
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.industry !== undefined) updates.industry = body.industry;
  if (body.status !== undefined) updates.status = body.status;
  if (body.container_config !== undefined) updates.container_config = body.container_config;

  const supabase = await createClient();

  // Merge settings JSONB if provided
  if (body.settings !== undefined && typeof body.settings === 'object') {
    const { data: existing } = await supabase
      .from('agency_clients')
      .select('settings')
      .eq('id', id)
      .eq('agency_id', agency.id)
      .single();
    const currentSettings = (existing?.settings ?? {}) as Record<string, unknown>;
    updates.settings = { ...currentSettings, ...body.settings };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: client, error } = await supabase
    .from('agency_clients')
    .update(updates)
    .eq('id', id)
    .eq('agency_id', agency.id)
    .select()
    .single();

  if (error || !client) {
    console.error('Failed to update client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }

  // ── Push personality to container SOUL.md (fire-and-forget) ──────────────
  // When persona/instructions change, rebuild SOUL.md and push to the VPS
  // container so OpenClaw uses the updated identity immediately.
  if (body.container_config !== undefined) {
    const cfg = client.container_config as Record<string, unknown> | null ?? {};
    const persona = (cfg.persona as string) || '';
    const greeting = (cfg.greeting as string) || '';
    const instructions = (cfg.instructions as string) || '';

    if (persona || instructions || greeting) {
      void (async () => {
        try {
          const soulMd = buildSoulMd(client.name, persona, greeting, instructions);
          const result = await updateClientConfig(client.id, { soulMd });
          if (result.success) {
            console.log(`[personality] SOUL.md pushed to container for client ${client.id}`);
          } else {
            console.warn(`[personality] Failed to push SOUL.md for ${client.id}:`, result.error);
          }
        } catch (err) {
          console.error(`[personality] Error pushing SOUL.md for ${client.id}:`, err);
        }
      })();
    }
  }

  return NextResponse.json(client);
}

/**
 * DELETE /api/agency/clients/[id]
 * Delete a client (owner only).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const result = await requireAgencyOwner();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const { agency } = result.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from('agency_clients')
    .delete()
    .eq('id', id)
    .eq('agency_id', agency.id);

  if (error) {
    console.error('Failed to delete client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
