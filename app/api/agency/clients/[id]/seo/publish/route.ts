/**
 * POST /api/agency/clients/[id]/seo/publish
 *
 * Publish content to any supported platform.
 * Platforms: Telegraph, WordPress.com, GitHub Pages, Notion, Blogger, Google Docs
 * All platform credentials are Kyra-managed (env vars), not per-agency.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { generateBusinessSchema } from '@/lib/seo/schema-markup';
import { getGoogleServiceAccessToken, provisionPlatforms } from '@/lib/seo/platform-provisioner';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface PageParams {
  params: Promise<{ id: string }>;
}

type JsonObject = Record<string, unknown>;

function asObject(v: unknown): JsonObject {
  return typeof v === 'object' && v !== null ? (v as JsonObject) : {};
}

export async function POST(request: NextRequest, { params }: PageParams) {
  const { id: clientId } = await params;

  // Allow both user auth and cron/agent auth
  const authHeader = request.headers.get('authorization');
  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  let agencyId: string | undefined;
  const supabase = await createClient();

  if (isCron) {
    const { data: client } = await supabase
      .from('agency_clients')
      .select('agency_id')
      .eq('id', clientId)
      .single();
    agencyId = client?.agency_id;
  } else {
    const authResult = await requireAgencyAdmin();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
    }
    agencyId = authResult.data.agency.id;
  }

  if (!agencyId) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const body = await request.json();
  const { platform, title, body: articleBody, published_at, slug } = body as {
    platform: string;
    title: string;
    body: string;
    published_at?: string;
    slug?: string;
  };

  if (!platform || !title) {
    return NextResponse.json({ error: 'Missing platform or title' }, { status: 400 });
  }

  // Get client settings
  const { data: clientRow } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  const settings = asObject(clientRow?.settings);
  const seoPlatforms = asObject(settings.seo_platforms);
  const seoData = asObject(settings.seo_data);
  const setupData = asObject(settings.premium_template_setup);

  // Clinic info for schema markup
  const clinicName = (setupData.clinic_name || setupData.clinicName || '') as string;
  const city = (setupData.city || '') as string;

  const articleSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  try {
    let publishedUrl: string;

    switch (platform) {
      case 'telegraph':
        publishedUrl = await publishToTelegraph(settings, clientId, title, articleBody, supabase);
        break;

      case 'wordpress':
        publishedUrl = await publishToWordPress(seoPlatforms, title, articleBody, articleSlug);
        break;

      case 'github_pages':
        publishedUrl = await publishToGitHubPages(seoPlatforms, setupData, title, articleBody, articleSlug);
        break;

      case 'notion':
        publishedUrl = await publishToNotion(seoPlatforms, title, articleBody);
        break;

      case 'blogger':
        publishedUrl = await publishToBlogger(seoPlatforms, title, articleBody);
        break;

      case 'google_docs':
        publishedUrl = await publishToGoogleDocs(seoPlatforms, title, articleBody);
        break;

      default:
        return NextResponse.json({ error: `Platform '${platform}' not supported` }, { status: 400 });
    }

    // Update content entry in seo_data
    const contentList = (seoData.content_published as Array<JsonObject>) ?? [];
    const updated = contentList.map((entry) => {
      if ((published_at && entry.published_at === published_at && entry.title === title) ||
          (!published_at && entry.title === title && entry.status === 'approved')) {
        return {
          ...entry,
          url: publishedUrl,
          status: 'published',
          platform,
          published_live_at: new Date().toISOString(),
        };
      }
      return entry;
    });

    // If no existing entry was found, add a new one
    const wasUpdated = updated.some((e) => e.url === publishedUrl);
    if (!wasUpdated) {
      updated.push({
        title,
        url: publishedUrl,
        status: 'published',
        platform,
        published_at: published_at || new Date().toISOString(),
        published_live_at: new Date().toISOString(),
      });
    }

    await supabase
      .from('agency_clients')
      .update({
        settings: {
          ...settings,
          seo_data: { ...seoData, content_published: updated },
        },
      })
      .eq('id', clientId);

    console.log(`[seo/publish] Published to ${platform}: ${publishedUrl}`);
    return NextResponse.json({ ok: true, platform, url: publishedUrl });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[seo/publish] ${platform} error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


// ── TELEGRAPH ───────────────────────────────────────────────────────────

async function publishToTelegraph(
  settings: JsonObject,
  clientId: string,
  title: string,
  body: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  let telegraphToken = (settings.telegraph_token || asObject(settings.seo_platforms).telegraph_token) as string | undefined;

  if (!telegraphToken) {
    const accountRes = await fetch('https://api.telegra.ph/createAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_name: 'KyraSEO', author_name: 'Kyra SEO Worker' }),
    });
    const account = await accountRes.json() as { ok: boolean; result?: { access_token: string } };
    if (!account.ok || !account.result?.access_token) throw new Error('Failed to create Telegraph account');
    telegraphToken = account.result.access_token;
    await supabase
      .from('agency_clients')
      .update({ settings: { ...settings, telegraph_token: telegraphToken } })
      .eq('id', clientId);
  }

  const content = htmlToTelegraphNodes(body || `<p>${title}</p>`);
  const pageRes = await fetch('https://api.telegra.ph/createPage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: telegraphToken, title, content, return_content: false }),
  });
  const page = await pageRes.json() as { ok: boolean; result?: { url: string } };
  if (!page.ok || !page.result?.url) throw new Error('Telegraph page creation failed');
  return page.result.url;
}


// ── WORDPRESS.COM ───────────────────────────────────────────────────────

async function publishToWordPress(
  seoPlatforms: JsonObject,
  title: string,
  body: string,
  slug: string,
): Promise<string> {
  const token = process.env.KYRA_WORDPRESS_TOKEN;
  if (!token) throw new Error('WordPress not configured — KYRA_WORDPRESS_TOKEN missing');

  const siteId = seoPlatforms.wordpress_site_id || process.env.KYRA_WORDPRESS_SITE_ID;
  if (!siteId) throw new Error('WordPress site ID not configured');

  const res = await fetch(`https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/posts/new`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      content: body,
      slug,
      status: 'publish',
      categories: seoPlatforms.wordpress_category_id ? [seoPlatforms.wordpress_category_id] : undefined,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`WordPress publish failed: ${res.status} ${errBody.slice(0, 200)}`);
  }

  const post = await res.json() as { URL?: string };
  if (!post.URL) throw new Error('WordPress returned no URL');
  return post.URL;
}


// ── GITHUB PAGES ────────────────────────────────────────────────────────

async function publishToGitHubPages(
  seoPlatforms: JsonObject,
  setupData: JsonObject,
  title: string,
  body: string,
  slug: string,
): Promise<string> {
  const token = process.env.KYRA_GITHUB_TOKEN;
  if (!token) throw new Error('GitHub not configured — KYRA_GITHUB_TOKEN missing');

  const owner = seoPlatforms.github_owner as string;
  const repo = seoPlatforms.github_repo as string;
  if (!owner || !repo) throw new Error('GitHub repo not provisioned');

  // Build full HTML page with schema markup
  const schemaScript = generateBusinessSchema({
    name: (setupData.clinic_name || setupData.clinicName || setupData.business_name || '') as string,
    address: (setupData.address || '') as string,
    city: (setupData.city || '') as string,
    state: (setupData.state || '') as string,
    zip: (setupData.zip || '') as string,
    phone: (setupData.phone || '') as string,
    website: (setupData.website || '') as string,
    industry: (setupData.industry || '') as string,
    services: (setupData.services || []) as string[],
  });

  const htmlPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${schemaScript}
  <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:2rem;line-height:1.6;color:#333}h1{color:#1a1a1a}</style>
</head>
<body>
  <article>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </article>
</body>
</html>`;

  const filePath = `posts/${slug}.html`;
  const contentBase64 = Buffer.from(htmlPage).toString('base64');

  // Check if file already exists (to get SHA for update)
  let sha: string | undefined;
  const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (checkRes.ok) {
    const existing = await checkRes.json() as { sha?: string };
    sha = existing.sha;
  }

  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Publish: ${title}`,
      content: contentBase64,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errBody = await putRes.text().catch(() => '');
    throw new Error(`GitHub publish failed: ${putRes.status} ${errBody.slice(0, 200)}`);
  }

  const pagesUrl = seoPlatforms.github_pages_url || `https://${owner}.github.io/${repo}`;
  return `${pagesUrl}/${filePath}`;
}


// ── NOTION ──────────────────────────────────────────────────────────────

async function publishToNotion(
  seoPlatforms: JsonObject,
  title: string,
  body: string,
): Promise<string> {
  const token = process.env.KYRA_NOTION_TOKEN;
  if (!token) throw new Error('Notion not configured — KYRA_NOTION_TOKEN missing');

  const databaseId = seoPlatforms.notion_database_id || process.env.KYRA_NOTION_DATABASE_ID;
  if (!databaseId) throw new Error('Notion database not configured');

  // Convert body to plain text for Notion paragraph blocks
  const plainText = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const chunks = plainText.match(/.{1,2000}/g) || [plainText];

  const children = chunks.map((chunk) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: chunk } }],
    },
  }));

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
      },
      children: children.slice(0, 100), // Notion limit
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Notion publish failed: ${res.status} ${errBody.slice(0, 200)}`);
  }

  const page = await res.json() as { url?: string };
  if (!page.url) throw new Error('Notion returned no URL');
  return page.url;
}


// ── BLOGGER ─────────────────────────────────────────────────────────────

async function publishToBlogger(
  seoPlatforms: JsonObject,
  title: string,
  body: string,
): Promise<string> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('Blogger not configured — GOOGLE_SERVICE_ACCOUNT_JSON missing');

  const blogId = seoPlatforms.blogger_blog_id as string;
  if (!blogId) throw new Error('Blogger blog not provisioned');

  const token = await getGoogleServiceAccessToken(['https://www.googleapis.com/auth/blogger']);

  const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ kind: 'blogger#post', title, content: body }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Blogger publish failed: ${res.status} ${errBody.slice(0, 200)}`);
  }

  const post = await res.json() as { url?: string };
  if (!post.url) throw new Error('Blogger returned no URL');
  return post.url;
}


// ── GOOGLE DOCS ─────────────────────────────────────────────────────────

async function publishToGoogleDocs(
  seoPlatforms: JsonObject,
  title: string,
  body: string,
): Promise<string> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('Google Docs not configured — GOOGLE_SERVICE_ACCOUNT_JSON missing');

  const token = await getGoogleServiceAccessToken([
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
  ]);

  // Create document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text().catch(() => '');
    throw new Error(`Google Docs create failed: ${createRes.status} ${errBody.slice(0, 200)}`);
  }

  const doc = await createRes.json() as { documentId?: string };
  if (!doc.documentId) throw new Error('Google Docs returned no ID');

  // Insert content (plain text from HTML)
  const plainText = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        insertText: {
          location: { index: 1 },
          text: plainText,
        },
      }],
    }),
  });

  // Make publicly readable
  const folderId = seoPlatforms.google_docs_folder_id as string;

  // Move to folder if available
  if (folderId) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${doc.documentId}?addParents=${folderId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Share publicly
  await fetch(`https://www.googleapis.com/drive/v3/files/${doc.documentId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'anyone', role: 'reader' }),
  });

  return `https://docs.google.com/document/d/${doc.documentId}/view`;
}


// ── HELPERS ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function htmlToTelegraphNodes(html: string): unknown[] {
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const blocks: unknown[] = [];
  const blockRegex = /<(h[1-6]|p|ul|ol|li|blockquote|pre)[^>]*>([\s\S]*?)<\/\1>/gi;
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
  }

  if (blocks.length === 0) {
    const text = clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = text.match(/.{1,500}(\s|$)/g) || [text];
    for (const s of sentences) {
      if (s.trim()) blocks.push({ tag: 'p', children: [s.trim()] });
    }
  }

  return blocks.length > 0 ? blocks : [{ tag: 'p', children: [clean.replace(/<[^>]+>/g, '').trim().slice(0, 500)] }];
}
