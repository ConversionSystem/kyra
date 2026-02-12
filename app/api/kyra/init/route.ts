import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/kyra/init
 *
 * Writes personalized SOUL.md and USER.md to the user's R2 workspace.
 * Called after onboarding completes.
 *
 * Body: { name, role, timezone, tone }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    role?: string;
    timezone?: string;
    tone?: string;
  };

  const name = body.name || 'there';
  const role = body.role || '';
  const timezone = body.timezone || 'UTC';
  const tone = body.tone || 'balanced';

  // Build personalized SOUL.md based on tone
  const soulMd = buildSoulMd(tone, name);
  const userMd = buildUserMd(name, role, timezone);

  // Write files to R2 workspace
  const prefix = `workspaces/${user.id}`;

  try {
    // Use getCloudflareContext to access R2 binding in production
    // In development / non-Cloudflare environments, we skip R2 writes
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    const bucket = (env as Record<string, unknown>).R2 as R2Bucket | undefined;

    if (bucket) {
      await Promise.all([
        bucket.put(`${prefix}/SOUL.md`, soulMd, {
          httpMetadata: { contentType: 'text/markdown' },
        }),
        bucket.put(`${prefix}/USER.md`, userMd, {
          httpMetadata: { contentType: 'text/markdown' },
        }),
      ]);
    } else {
      console.warn('[kyra/init] R2 bucket not available — skipping workspace file writes');
    }
  } catch (e) {
    // In local dev without Cloudflare runtime, getCloudflareContext may fail
    console.warn('[kyra/init] Could not access R2 — running outside Cloudflare?', e);
  }

  return NextResponse.json({ success: true, files: ['SOUL.md', 'USER.md'] });
}

function buildSoulMd(tone: string, name: string): string {
  const toneInstructions: Record<string, string> = {
    casual: `You speak in a warm, casual, friendly tone. Use contractions, conversational language, and the occasional bit of humor. Think "texting a smart friend." Keep things light but still helpful. Feel free to use short sentences and everyday words.`,
    professional: `You speak in a clear, polished, professional tone. Be concise and structured. Avoid slang or overly casual language. Think "trusted executive assistant." Prioritize clarity and actionability in every response.`,
    balanced: `You speak in a warm but clear tone — friendly without being too casual, professional without being stiff. Think "helpful colleague." Adapt naturally to the context of the conversation.`,
  };

  return `# SOUL.md — Kyra's Personality

## Who I Am
I am Kyra, ${name}'s personal AI assistant. I remember everything important, stay organized, and help ${name} get things done.

## How I Communicate
${toneInstructions[tone] || toneInstructions.balanced}

## Core Principles
- **Remember everything** — I use memories to personalize every interaction
- **Be proactive** — If I notice something useful, I mention it
- **Stay concise** — Respect ${name}'s time. No filler, no fluff
- **Be honest** — If I don't know something, I say so
- **Take action** — When asked to do something, do it. Don't just describe how

## Things I Never Do
- Lecture or over-explain unless asked
- Use corporate jargon or buzzwords
- Repeat information the user already knows
- Add unnecessary caveats or disclaimers
`;
}

function buildUserMd(name: string, role: string, timezone: string): string {
  const lines = [`# USER.md — About ${name}`, ''];

  lines.push('## Profile');
  lines.push(`- **Name:** ${name}`);
  if (role) {
    lines.push(`- **Role:** ${role}`);
  }
  lines.push(`- **Timezone:** ${timezone}`);
  lines.push('');
  lines.push('## Preferences');
  lines.push('- (Kyra will learn and update these over time)');
  lines.push('');

  return lines.join('\n');
}
