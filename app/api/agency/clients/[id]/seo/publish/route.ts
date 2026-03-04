/**
 * POST /api/agency/clients/[id]/seo/publish
 *
 * Publish a content draft to a platform.
 * Currently supports: Telegraph (no auth required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface PageParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: PageParams) {
  const { id: clientId } = await params;

  const authResult = await requireAgencyAdmin();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }
  const { agency } = authResult.data;
  const supabase = await createClient();

  const body = await request.json();
  const { platform, title, body: articleBody, published_at } = body as {
    platform: string;
    title: string;
    body: string;
    published_at: string;
  };

  if (platform !== 'telegraph') {
    return NextResponse.json({ error: `Platform '${platform}' not yet supported for direct publish` }, { status: 400 });
  }

  // ── Telegraph: create account + publish ──────────────────────────────
  // Telegraph requires no API key — just create an anonymous account
  try {
    // Step 1: Create a Telegraph account (or reuse stored token)
    const { data: clientRow } = await supabase
      .from('agency_clients')
      .select('settings')
      .eq('id', clientId)
      .eq('agency_id', agency.id)
      .single();

    const settings = (clientRow?.settings as Record<string, unknown>) ?? {};
    let telegraphToken = settings.telegraph_token as string | undefined;

    if (!telegraphToken) {
      const accountRes = await fetch('https://api.telegra.ph/createAccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_name: 'KyraSEO', author_name: 'Kyra SEO Worker' }),
      });
      const account = await accountRes.json() as { ok: boolean; result?: { access_token: string } };
      if (!account.ok || !account.result?.access_token) {
        return NextResponse.json({ error: 'Failed to create Telegraph account' }, { status: 500 });
      }
      telegraphToken = account.result.access_token;

      // Save token for future use
      await supabase
        .from('agency_clients')
        .update({ settings: { ...settings, telegraph_token: telegraphToken } })
        .eq('id', clientId);
    }

    // Step 2: Convert HTML body to Telegraph Node format
    // Telegraph accepts simple HTML — convert <h2>, <p>, <strong>, <a>, <ul>, <li>
    const content = htmlToTelegraphNodes(articleBody || `<p>${title}</p>`);

    // Step 3: Create page
    const pageRes = await fetch('https://api.telegra.ph/createPage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: telegraphToken,
        title,
        content,
        return_content: false,
      }),
    });
    const page = await pageRes.json() as { ok: boolean; result?: { url: string; path: string } };

    if (!page.ok || !page.result?.url) {
      return NextResponse.json({ error: 'Telegraph page creation failed' }, { status: 500 });
    }

    const pageUrl = page.result.url;

    // Step 4: Update the content entry in Supabase with the published URL
    const seoData = (settings.seo_data as Record<string, unknown>) ?? {};
    const contentList = ((seoData.content_published as Array<Record<string, unknown>>) ?? []);
    const updated = contentList.map((entry) => {
      if (entry.published_at === published_at && entry.title === title) {
        return { ...entry, url: pageUrl, status: 'published', platform: 'Telegraph', published_live_at: new Date().toISOString() };
      }
      return entry;
    });

    await supabase
      .from('agency_clients')
      .update({
        settings: {
          ...settings,
          telegraph_token: telegraphToken,
          seo_data: { ...seoData, content_published: updated },
        },
      })
      .eq('id', clientId);

    console.log(`[seo/publish] Published to Telegraph: ${pageUrl}`);
    return NextResponse.json({ ok: true, platform: 'telegraph', url: pageUrl });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/publish] Telegraph error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Convert simple HTML to Telegraph Node format.
 * Supports: p, h2, h3, strong, em, a, br, ul/ol, li
 */
function htmlToTelegraphNodes(html: string): unknown[] {
  // Strip script/style tags for safety
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Split into block-level chunks
  const blocks: unknown[] = [];
  const blockRegex = /<(h[1-6]|p|ul|ol|li|blockquote|pre)[^>]*>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(clean)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2].replace(/<[^>]+>/g, '').trim();
    if (!inner) continue;

    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      blocks.push({ tag: 'h4', children: [inner] });
    } else if (tag === 'p' || tag === 'li') {
      blocks.push({ tag: 'p', children: [inner] });
    } else if (tag === 'blockquote') {
      blocks.push({ tag: 'blockquote', children: [inner] });
    }
    lastIndex = match.index + match[0].length;
  }

  // If no blocks parsed (plain text or unusual HTML), wrap in paragraphs
  if (blocks.length === 0) {
    const text = clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = text.match(/.{1,500}(\s|$)/g) || [text];
    for (const s of sentences) {
      if (s.trim()) blocks.push({ tag: 'p', children: [s.trim()] });
    }
  }

  return blocks.length > 0 ? blocks : [{ tag: 'p', children: [clean.replace(/<[^>]+>/g, '').trim().slice(0, 500)] }];
}
