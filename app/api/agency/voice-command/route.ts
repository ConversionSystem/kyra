// ============================================================================
// POST /api/agency/voice-command
//
// Accepts audio (multipart form data) OR text transcript (JSON body).
// Transcribes audio via Whisper, parses the command, and executes it.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { parseVoiceCommand, type VoiceCommand } from '@/lib/agency/voice-parser';
import { transcribeAudio } from '@/lib/channels/whisper';

export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────
  const authResult = await requireAgencyAdmin();
  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error.message },
      { status: authResult.error.status }
    );
  }

  const { agency } = authResult.data;

  // ── Check OPENAI_API_KEY ─────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          'Voice commands require OPENAI_API_KEY to be configured. Please add it to your environment variables.',
      },
      { status: 503 }
    );
  }

  // ── Get transcript ───────────────────────────────────────────────────
  let transcript: string;

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    // Audio file upload
    try {
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File | null;

      if (!audioFile) {
        return NextResponse.json(
          { error: 'Audio file required (field name: "audio")' },
          { status: 400 }
        );
      }

      // Size check (25MB Whisper limit)
      if (audioFile.size > 25 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Audio file too large. Maximum size is 25MB.' },
          { status: 400 }
        );
      }

      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      transcript = await transcribeAudio(buffer, {
        filename: audioFile.name || 'recording.webm',
      });
    } catch (err: unknown) {
      console.error('[voice-command] Transcription error:', err);
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }
  } else if (contentType.includes('application/json')) {
    // Text transcript
    try {
      const body = await request.json();
      if (!body.transcript || typeof body.transcript !== 'string') {
        return NextResponse.json(
          { error: 'JSON body must include a "transcript" string field' },
          { status: 400 }
        );
      }
      transcript = body.transcript.trim();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
  } else {
    return NextResponse.json(
      {
        error:
          'Unsupported content type. Use multipart/form-data (audio) or application/json (transcript).',
      },
      { status: 415 }
    );
  }

  if (!transcript) {
    return NextResponse.json(
      { error: 'Empty transcript — could not understand the audio' },
      { status: 400 }
    );
  }

  // ── Fetch agency clients for name matching ───────────────────────────
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('id, name, slug, status, container_config')
    .eq('agency_id', agency.id);

  const clientNames = (clients || []).map((c) => c.name);

  // ── Parse command ────────────────────────────────────────────────────
  const command = parseVoiceCommand(transcript, clientNames);

  if (command.action === 'unknown' || command.confidence < 0.4) {
    return NextResponse.json({
      success: false,
      error: "Couldn't understand that command. Try something like: \"Update the dental client's greeting to mention the spring special.\"",
      transcript,
      parsed: command,
    });
  }

  // ── Find the target client ───────────────────────────────────────────
  const targetClient = command.clientName
    ? (clients || []).find((c) => c.name === command.clientName) ?? null
    : null;

  if (!targetClient && command.action !== 'get_status') {
    return NextResponse.json({
      success: false,
      error: `Couldn't identify which client you're referring to. Available clients: ${clientNames.join(', ') || 'none'}`,
      transcript,
      parsed: command,
    });
  }

  // ── Execute action ───────────────────────────────────────────────────
  try {
    const result = await executeVoiceAction(
      command,
      targetClient,
      supabase,
      agency.id
    );

    // Log the command
    await logVoiceCommand(supabase, {
      agencyId: agency.id,
      clientId: targetClient?.id || null,
      transcript,
      action: command.action,
      params: command.params,
      success: result.success,
      resultMessage: result.message,
    });

    return NextResponse.json({
      success: result.success,
      action: result.message,
      transcript,
      parsed: command,
    });
  } catch (err: unknown) {
    console.error('[voice-command] Execution error:', err);

    await logVoiceCommand(supabase, {
      agencyId: agency.id,
      clientId: targetClient?.id || null,
      transcript,
      action: command.action,
      params: command.params,
      success: false,
      resultMessage: 'Execution failed',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute the command',
        transcript,
        parsed: command,
      },
      { status: 500 }
    );
  }
}

// ── Action execution ──────────────────────────────────────────────────────

interface ActionResult {
  success: boolean;
  message: string;
}

interface ClientRecord {
  id: string;
  name: string;
  slug: string;
  status: string;
  container_config: Record<string, unknown>;
}

async function executeVoiceAction(
  command: VoiceCommand,
  client: ClientRecord | null,
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string
): Promise<ActionResult> {
  switch (command.action) {
    case 'update_greeting': {
      if (!client) return { success: false, message: 'No client found' };
      const content = command.params.content;
      if (!content) return { success: false, message: 'No greeting content provided' };

      const currentConfig = (client.container_config || {}) as Record<string, unknown>;
      const updatedConfig = {
        ...currentConfig,
        greeting: content,
      };

      const { error } = await supabase
        .from('agency_clients')
        .update({ container_config: updatedConfig })
        .eq('id', client.id)
        .eq('agency_id', agencyId);

      if (error) return { success: false, message: 'Database update failed' };
      return {
        success: true,
        message: `Updated greeting for ${client.name}`,
      };
    }

    case 'update_instructions': {
      if (!client) return { success: false, message: 'No client found' };
      const content = command.params.content;
      if (!content) return { success: false, message: 'No instruction content provided' };

      const currentConfig = (client.container_config || {}) as Record<string, unknown>;
      const existingInstructions =
        (currentConfig.custom_instructions as string) || '';
      const updatedConfig = {
        ...currentConfig,
        custom_instructions: existingInstructions
          ? `${existingInstructions}\n\n${content}`
          : content,
      };

      const { error } = await supabase
        .from('agency_clients')
        .update({ container_config: updatedConfig })
        .eq('id', client.id)
        .eq('agency_id', agencyId);

      if (error) return { success: false, message: 'Database update failed' };
      return {
        success: true,
        message: `Updated instructions for ${client.name}`,
      };
    }

    case 'toggle_permission': {
      if (!client) return { success: false, message: 'No client found' };
      const permission = command.params.permission;
      const enabled = command.params.enabled === 'true';

      if (!permission) return { success: false, message: 'No permission specified' };

      const currentConfig = (client.container_config || {}) as Record<string, unknown>;
      const permissions = (currentConfig.permissions || {}) as Record<string, unknown>;
      const updatedConfig = {
        ...currentConfig,
        permissions: {
          ...permissions,
          [permission.replace(/\s+/g, '_').toLowerCase()]: enabled,
        },
      };

      const { error } = await supabase
        .from('agency_clients')
        .update({ container_config: updatedConfig })
        .eq('id', client.id)
        .eq('agency_id', agencyId);

      if (error) return { success: false, message: 'Database update failed' };
      return {
        success: true,
        message: `${enabled ? 'Enabled' : 'Disabled'} ${permission} for ${client.name}`,
      };
    }

    case 'update_persona': {
      if (!client) return { success: false, message: 'No client found' };
      const content = command.params.content;
      if (!content) return { success: false, message: 'No persona content provided' };

      const currentConfig = (client.container_config || {}) as Record<string, unknown>;
      const updatedConfig = {
        ...currentConfig,
        persona: content,
      };

      const { error } = await supabase
        .from('agency_clients')
        .update({ container_config: updatedConfig })
        .eq('id', client.id)
        .eq('agency_id', agencyId);

      if (error) return { success: false, message: 'Database update failed' };
      return {
        success: true,
        message: `Updated persona for ${client.name}`,
      };
    }

    case 'send_message': {
      if (!client) return { success: false, message: 'No client found' };
      const message = command.params.message;
      if (!message) return { success: false, message: 'No message content provided' };

      // For now, log the intent. Actual broadcast requires GHL integration.
      // Store as a pending broadcast in config
      const currentConfig = (client.container_config || {}) as Record<string, unknown>;
      const pendingBroadcasts = (currentConfig.pending_broadcasts as unknown[]) || [];
      const updatedConfig = {
        ...currentConfig,
        pending_broadcasts: [
          ...pendingBroadcasts,
          {
            message,
            created_at: new Date().toISOString(),
            status: 'pending',
          },
        ],
      };

      const { error } = await supabase
        .from('agency_clients')
        .update({ container_config: updatedConfig })
        .eq('id', client.id)
        .eq('agency_id', agencyId);

      if (error) return { success: false, message: 'Database update failed' };
      return {
        success: true,
        message: `Queued broadcast message for ${client.name}'s contacts`,
      };
    }

    case 'get_status': {
      // If we have a specific client, get their status
      if (client) {
        const { data: usage } = await supabase
          .from('agency_clients')
          .select('name, status, usage_this_month, created_at')
          .eq('id', client.id)
          .single();

        if (usage) {
          return {
            success: true,
            message: `${usage.name}: ${usage.status}, ${usage.usage_this_month || 0} messages this month`,
          };
        }
      }

      // Otherwise, give a general overview
      const { data: allClients } = await supabase
        .from('agency_clients')
        .select('name, status, usage_this_month')
        .eq('agency_id', agencyId);

      if (allClients && allClients.length > 0) {
        const active = allClients.filter((c) => c.status === 'active').length;
        const totalUsage = allClients.reduce(
          (sum, c) => sum + (c.usage_this_month || 0),
          0
        );
        return {
          success: true,
          message: `${allClients.length} clients (${active} active), ${totalUsage} total messages this month`,
        };
      }

      return { success: true, message: 'No clients found' };
    }

    default:
      return { success: false, message: 'Unknown action' };
  }
}

// ── Voice command logging ─────────────────────────────────────────────────

interface VoiceCommandLog {
  agencyId: string;
  clientId: string | null;
  transcript: string;
  action: string;
  params: Record<string, string>;
  success: boolean;
  resultMessage: string;
}

async function logVoiceCommand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  log: VoiceCommandLog
) {
  try {
    // Store in a JSON column on the agency or a dedicated table.
    // For now, we'll use a lightweight approach: upsert into agency settings.
    // In production, you'd want a dedicated voice_command_logs table.
    const { data: agency } = await supabase
      .from('agencies')
      .select('settings')
      .eq('id', log.agencyId)
      .single();

    if (!agency) return;

    const settings = (agency.settings || {}) as Record<string, unknown>;
    const voiceLogs = (settings.voice_command_logs as unknown[]) || [];

    // Keep last 100 logs
    const newLogs = [
      {
        timestamp: new Date().toISOString(),
        client_id: log.clientId,
        transcript: log.transcript,
        action: log.action,
        params: log.params,
        success: log.success,
        result: log.resultMessage,
      },
      ...voiceLogs.slice(0, 99),
    ];

    await supabase
      .from('agencies')
      .update({
        settings: { ...settings, voice_command_logs: newLogs },
      })
      .eq('id', log.agencyId);
  } catch (err) {
    // Non-critical — don't fail the request if logging fails
    console.error('[voice-command] Failed to log command:', err);
  }
}
