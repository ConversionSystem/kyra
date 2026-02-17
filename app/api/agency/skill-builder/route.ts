import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { getAnthropic } from '@/lib/ai/claude';
import {
  buildSkillBuilderSystemPrompt,
  buildSkillBuilderUserMessage,
  parseSkillPackResponse,
  type GeneratedSkillPack,
} from '@/lib/agency/skill-builder-prompt';

const MAX_CONTENT_LENGTH = 50_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch a URL and extract readable text (strip HTML tags).
 */
async function fetchUrlContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Kyra-SkillBuilder/1.0' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL (${res.status} ${res.statusText})`);
  }

  const html = await res.text();

  // Strip script/style tags and their content first
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Decode base64 file content.
 */
function decodeFileContent(base64Content: string): string {
  // Handle data URLs
  const base64Data = base64Content.includes(',')
    ? base64Content.split(',')[1]
    : base64Content;

  return Buffer.from(base64Data, 'base64').toString('utf-8');
}

// ── Route Handler ────────────────────────────────────────────────────────────

/**
 * POST /api/agency/skill-builder
 *
 * Accepts business content (text, URL, or file) and generates a complete
 * AI skill pack using Claude.
 */
export async function POST(request: NextRequest) {
  // Auth: require agency membership
  const authResult = await requireAgencyMember();
  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error.message },
      { status: authResult.error.status }
    );
  }

  const { agency } = authResult.data;

  // Parse request body
  let body: {
    clientId?: string;
    sourceType: 'text' | 'url' | 'file';
    content: string;
    businessName: string;
    industry: string;
    additionalContext?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { clientId, sourceType, content, businessName, industry, additionalContext } = body;

  // Validate required fields
  if (!sourceType || !content || !businessName || !industry) {
    return NextResponse.json(
      { error: 'Missing required fields: sourceType, content, businessName, industry' },
      { status: 400 }
    );
  }

  if (!['text', 'url', 'file'].includes(sourceType)) {
    return NextResponse.json(
      { error: 'sourceType must be "text", "url", or "file"' },
      { status: 400 }
    );
  }

  // ── Extract source content ────────────────────────────────────────────────

  let sourceContent: string;

  try {
    switch (sourceType) {
      case 'url':
        sourceContent = await fetchUrlContent(content);
        break;
      case 'file':
        sourceContent = decodeFileContent(content);
        break;
      case 'text':
      default:
        sourceContent = content;
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to extract content';
    return NextResponse.json(
      { error: `Content extraction failed: ${message}` },
      { status: 422 }
    );
  }

  // Truncate to max length
  if (sourceContent.length > MAX_CONTENT_LENGTH) {
    sourceContent = sourceContent.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated at 50,000 characters]';
  }

  if (sourceContent.trim().length < 50) {
    return NextResponse.json(
      { error: 'Source content is too short. Please provide more content for analysis.' },
      { status: 422 }
    );
  }

  // ── Generate skill pack via Claude ────────────────────────────────────────

  let skillPack: GeneratedSkillPack;

  try {
    const anthropic = getAnthropic();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: buildSkillBuilderSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildSkillBuilderUserMessage({
            businessName,
            industry,
            additionalContext,
            content: sourceContent,
          }),
        },
      ],
    });

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    skillPack = parseSkillPackResponse(rawText);
  } catch (err) {
    console.error('[skill-builder] Claude API error:', err);
    const message = err instanceof Error ? err.message : 'AI generation failed';
    return NextResponse.json(
      { error: `Skill pack generation failed: ${message}` },
      { status: 500 }
    );
  }

  // ── Optionally save to client ─────────────────────────────────────────────

  if (clientId) {
    try {
      const serviceClient = await createServiceClient();

      // Verify client belongs to this agency
      const { data: client, error: clientError } = await serviceClient
        .from('agency_clients')
        .select('id, agency_id')
        .eq('id', clientId)
        .eq('agency_id', agency.id)
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { error: 'Client not found or does not belong to your agency' },
          { status: 404 }
        );
      }

      // Save skill pack to client's container_config
      const { error: updateError } = await serviceClient
        .from('agency_clients')
        .update({
          container_config: {
            skill_pack: {
              personality: skillPack.personality,
              systemPrompt: skillPack.systemPrompt,
              greeting: skillPack.greeting,
              sampleResponses: skillPack.sampleResponses,
              suggestedSkills: skillPack.suggestedSkills,
              extractedKnowledge: skillPack.extractedKnowledge,
              tone: skillPack.tone,
              generatedAt: new Date().toISOString(),
              source: { businessName, industry, sourceType },
            },
          },
        })
        .eq('id', clientId);

      if (updateError) {
        console.error('[skill-builder] Failed to save to client:', updateError);
        // Return the skill pack anyway — just note the save failure
        return NextResponse.json({
          skillPack,
          savedToClient: false,
          saveError: 'Failed to save to client configuration',
        });
      }

      return NextResponse.json({ skillPack, savedToClient: true });
    } catch (err) {
      console.error('[skill-builder] Client save error:', err);
      return NextResponse.json({ skillPack, savedToClient: false });
    }
  }

  return NextResponse.json({ skillPack });
}
