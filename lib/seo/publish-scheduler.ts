/**
 * Publish Scheduler — Off-site content queue for SEO authority building
 *
 * Queues content for publishing to 7 platforms (Telegraph, WordPress,
 * GitHub Pages, Notion, Blogger, Google Docs, Google Sites).
 *
 * Uses lib/seo/platform-provisioner.ts for actual publishing.
 * Processes queue via hourly cron job.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { deductCredits } from '@/lib/billing/credit-engine';
import { getGoogleServiceAccessToken } from './platform-provisioner';

// ── Types ────────────────────────────────────────────────────────────────

export interface QueuedContent {
  id: string;
  site_id: string;
  client_id: string | null;
  content_type: string;
  title: string;
  body: string;
  target_platform: string;
  scheduled_at: string;
  status: string;
  attempts: number;
  last_error: string | null;
  published_url: string | null;
}

export interface QueueResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface ProcessResult {
  processed: number;
  published: number;
  failed: number;
  results: Array<{ id: string; platform: string; success: boolean; url?: string; error?: string }>;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Queue content for publishing to a specific platform.
 * Deduplicates: won't queue if same title + platform already exists.
 */
export async function queueContent(
  siteId: string,
  contentType: string,
  title: string,
  body: string,
  platform: string,
  clientId?: string,
  scheduledAt?: Date,
): Promise<QueueResult> {
  const supabase = createServiceClientWithoutCookies();

  // Deduplication check
  const { data: existing } = await supabase
    .from('seo_publish_queue')
    .select('id')
    .eq('site_id', siteId)
    .eq('title', title)
    .eq('target_platform', platform)
    .in('status', ['pending', 'processing', 'published'])
    .limit(1);

  if (existing?.length) {
    return { success: false, error: 'Content already queued or published for this platform' };
  }

  const { data, error } = await supabase
    .from('seo_publish_queue')
    .insert({
      site_id: siteId,
      client_id: clientId || null,
      content_type: contentType,
      title,
      body,
      target_platform: platform,
      scheduled_at: (scheduledAt || new Date()).toISOString(),
      status: 'pending',
      attempts: 0,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data?.id };
}

/**
 * Process the publish queue. Called by hourly cron.
 * Picks up pending items where scheduled_at <= now and attempts < 3.
 */
export async function processQueue(limit: number = 10): Promise<ProcessResult> {
  const supabase = createServiceClientWithoutCookies();
  const now = new Date().toISOString();

  // Fetch pending items ready to publish
  const { data: items, error } = await supabase
    .from('seo_publish_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .lt('attempts', 3)
    .order('scheduled_at')
    .limit(limit);

  if (error || !items?.length) {
    return { processed: 0, published: 0, failed: 0, results: [] };
  }

  const results: ProcessResult['results'] = [];

  for (const item of items) {
    // Mark as processing
    await supabase
      .from('seo_publish_queue')
      .update({ status: 'processing', attempts: item.attempts + 1 })
      .eq('id', item.id);

    try {
      const publishResult = await publishToPlatform(
        item.target_platform,
        item.title,
        item.body,
        item.site_id,
        item.client_id,
      );

      if (publishResult.success) {
        // Update queue item
        await supabase
          .from('seo_publish_queue')
          .update({
            status: 'published',
            published_url: publishResult.url,
          })
          .eq('id', item.id);

        // Record in seo_published_content
        await supabase
          .from('seo_published_content')
          .insert({
            site_id: item.site_id,
            client_id: item.client_id,
            platform: item.target_platform,
            url: publishResult.url,
            title: item.title,
            content_type: item.content_type,
            word_count: item.body.split(/\s+/).length,
            published_at: new Date().toISOString(),
            status: 'published',
          });

        // Deduct credits for successful publish
        const agencyId = await getAgencyIdForSite(item.site_id);
        if (agencyId) {
          try {
            await deductCredits(agencyId, 'seo.content_publish', {
              clientId: item.client_id,
              description: `Content publish: ${item.target_platform} — ${item.title}`,
            });
          } catch { /* non-fatal */ }
        }

        results.push({
          id: item.id,
          platform: item.target_platform,
          success: true,
          url: publishResult.url,
        });
      } else {
        // Failed — will retry on next cron run (up to 3 attempts)
        await supabase
          .from('seo_publish_queue')
          .update({
            status: item.attempts + 1 >= 3 ? 'failed' : 'pending',
            last_error: publishResult.error,
          })
          .eq('id', item.id);

        results.push({
          id: item.id,
          platform: item.target_platform,
          success: false,
          error: publishResult.error,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from('seo_publish_queue')
        .update({
          status: item.attempts + 1 >= 3 ? 'failed' : 'pending',
          last_error: message,
        })
        .eq('id', item.id);

      results.push({
        id: item.id,
        platform: item.target_platform,
        success: false,
        error: message,
      });
    }
  }

  const published = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`[publish-scheduler] Processed ${results.length}: ${published} published, ${failed} failed`);

  return {
    processed: results.length,
    published,
    failed,
    results,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

async function getAgencyIdForSite(siteId: string): Promise<string | null> {
  const supabase = createServiceClientWithoutCookies();
  const { data } = await supabase
    .from('client_sites')
    .select('agency_id')
    .eq('id', siteId)
    .single();
  return data?.agency_id ?? null;
}

// ── Platform Publishing ──────────────────────────────────────────────────

interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function getClientPlatformSettings(
  clientId: string | null,
): Promise<Record<string, unknown>> {
  if (!clientId) return {};
  const supabase = createServiceClientWithoutCookies();
  const { data } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();
  if (!data?.settings || typeof data.settings !== 'object') return {};
  const settings = data.settings as Record<string, unknown>;
  return (typeof settings.seo_platforms === 'object' && settings.seo_platforms !== null
    ? settings.seo_platforms
    : {}) as Record<string, unknown>;
}

async function publishToPlatform(
  platform: string,
  title: string,
  body: string,
  siteId: string,
  clientId: string | null,
): Promise<PublishResult> {
  const platforms = await getClientPlatformSettings(clientId);

  switch (platform) {
    case 'telegraph':
      return publishToTelegraph(title, body, platforms);
    case 'wordpress':
      return publishToWordPress(title, body, platforms);
    case 'github_pages':
      return publishToGitHubPages(title, body, platforms);
    case 'notion':
      return publishToNotion(title, body, platforms);
    case 'blogger':
      return publishToBlogger(title, body, platforms);
    case 'google_docs':
      return publishToGoogleDocs(title, body, platforms);
    case 'google_sites':
      return { success: false, error: 'Google Sites publishing is not yet available' };
    default:
      return { success: false, error: `Unknown platform "${platform}"` };
  }
}

// ── Telegraph ──────────────────────────────────────────────────────────────

async function publishToTelegraph(
  title: string,
  body: string,
  platforms: Record<string, unknown>,
): Promise<PublishResult> {
  try {
    // Reuse existing account token or create one
    let token =
      process.env.TELEGRAPH_ACCESS_TOKEN ||
      (typeof platforms.telegraph_token === 'string' ? platforms.telegraph_token : undefined);

    if (!token) {
      const accountRes = await fetch('https://api.telegra.ph/createAccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          short_name: 'Kyra SEO',
          author_name: 'Kyra AI',
          author_url: 'https://kyra.conversionsystem.com',
        }),
      });

      if (!accountRes.ok) {
        return { success: false, error: 'Failed to create Telegraph account' };
      }

      const accountData = (await accountRes.json()) as { result?: { access_token?: string } };
      token = accountData.result?.access_token;
    }

    if (!token) return { success: false, error: 'No access token for Telegraph' };

    // Convert body to Telegraph content format (simple paragraphs)
    const content = body.split('\n\n').map(paragraph => ({
      tag: 'p',
      children: [paragraph.trim()],
    }));

    // Create page
    const pageRes = await fetch('https://api.telegra.ph/createPage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: token,
        title,
        content,
        return_content: false,
      }),
    });

    if (!pageRes.ok) {
      return { success: false, error: 'Failed to create Telegraph page' };
    }

    const pageData = (await pageRes.json()) as { result?: { url?: string } };
    const url = pageData.result?.url;

    if (!url) return { success: false, error: 'No URL returned from Telegraph' };
    return { success: true, url };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── WordPress.com ──────────────────────────────────────────────────────────

async function publishToWordPress(
  title: string,
  body: string,
  platforms: Record<string, unknown>,
): Promise<PublishResult> {
  try {
    const wpToken = process.env.KYRA_WORDPRESS_TOKEN;
    if (!wpToken) return { success: false, error: 'KYRA_WORDPRESS_TOKEN not configured' };

    const siteId =
      (typeof platforms.wordpress_site_id === 'string' ? platforms.wordpress_site_id : '') ||
      process.env.KYRA_WORDPRESS_SITE_ID ||
      process.env.KYRA_WORDPRESS_SITE;
    if (!siteId) return { success: false, error: 'WordPress site ID not configured' };

    const categoryId = platforms.wordpress_category_id;

    const postBody: Record<string, unknown> = {
      title,
      content: body,
      status: 'publish',
    };
    if (categoryId) {
      postBody.categories = [categoryId];
    }

    const res = await fetch(
      `https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/posts/new`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${wpToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, error: `WordPress publish failed (${res.status}): ${errText}` };
    }

    const data = (await res.json()) as { URL?: string };
    if (!data.URL) return { success: false, error: 'No URL returned from WordPress' };
    return { success: true, url: data.URL };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── GitHub Pages ───────────────────────────────────────────────────────────

async function publishToGitHubPages(
  title: string,
  body: string,
  platforms: Record<string, unknown>,
): Promise<PublishResult> {
  try {
    const ghToken = process.env.KYRA_GITHUB_TOKEN;
    if (!ghToken) return { success: false, error: 'KYRA_GITHUB_TOKEN not configured' };

    const owner = typeof platforms.github_owner === 'string' ? platforms.github_owner : '';
    const repo = typeof platforms.github_repo === 'string' ? platforms.github_repo : '';
    if (!owner || !repo) return { success: false, error: 'GitHub Pages repo not provisioned' };

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const filePath = `posts/${slug}.html`;
    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body><h1>${title}</h1>${body.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('\n')}</body></html>`;

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Publish: ${title}`,
          content: Buffer.from(htmlContent).toString('base64'),
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, error: `GitHub Pages publish failed (${res.status}): ${errText}` };
    }

    const pagesUrl = typeof platforms.github_pages_url === 'string'
      ? platforms.github_pages_url
      : `https://${owner}.github.io/${repo}`;
    const url = `${pagesUrl}/${filePath}`;
    return { success: true, url };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Notion ─────────────────────────────────────────────────────────────────

async function publishToNotion(
  title: string,
  body: string,
  platforms: Record<string, unknown>,
): Promise<PublishResult> {
  try {
    const notionToken = process.env.KYRA_NOTION_TOKEN;
    if (!notionToken) return { success: false, error: 'KYRA_NOTION_TOKEN not configured' };

    const parentPageId = typeof platforms.notion_page_id === 'string' ? platforms.notion_page_id : '';
    if (!parentPageId) return { success: false, error: 'Notion workspace page not provisioned' };

    // Create a child page under the provisioned workspace page
    const paragraphs = body.split('\n\n').filter(p => p.trim());
    const children = paragraphs.map(p => ({
      object: 'block' as const,
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: p.trim() } }],
      },
    }));

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { page_id: parentPageId },
        properties: {
          title: { title: [{ text: { content: title } }] },
        },
        children: children.slice(0, 100), // Notion API limit
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, error: `Notion publish failed (${res.status}): ${errText}` };
    }

    const page = (await res.json()) as { url?: string };
    if (!page.url) return { success: false, error: 'No URL returned from Notion' };
    return { success: true, url: page.url };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Blogger ────────────────────────────────────────────────────────────────

async function publishToBlogger(
  title: string,
  body: string,
  platforms: Record<string, unknown>,
): Promise<PublishResult> {
  try {
    const blogId = typeof platforms.blogger_blog_id === 'string' ? platforms.blogger_blog_id : '';
    if (!blogId) return { success: false, error: 'Blogger blog not provisioned' };

    let token: string;
    try {
      token = await getGoogleServiceAccessToken(['https://www.googleapis.com/auth/blogger']);
    } catch (e) {
      return { success: false, error: `Google auth failed: ${e instanceof Error ? e.message : String(e)}` };
    }

    const res = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'blogger#post',
          title,
          content: body.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('\n'),
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, error: `Blogger publish failed (${res.status}): ${errText}` };
    }

    const post = (await res.json()) as { url?: string };
    if (!post.url) return { success: false, error: 'No URL returned from Blogger' };
    return { success: true, url: post.url };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Google Docs ────────────────────────────────────────────────────────────

async function publishToGoogleDocs(
  title: string,
  body: string,
  platforms: Record<string, unknown>,
): Promise<PublishResult> {
  try {
    const folderId = typeof platforms.google_docs_folder_id === 'string' ? platforms.google_docs_folder_id : '';
    if (!folderId) return { success: false, error: 'Google Docs folder not provisioned' };

    let token: string;
    try {
      token = await getGoogleServiceAccessToken([
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
      ]);
    } catch (e) {
      return { success: false, error: `Google auth failed: ${e instanceof Error ? e.message : String(e)}` };
    }

    // Create a Google Doc in the provisioned folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: title,
        mimeType: 'application/vnd.google-apps.document',
        parents: [folderId],
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => '');
      return { success: false, error: `Google Docs create failed (${createRes.status}): ${errText}` };
    }

    const file = (await createRes.json()) as { id?: string };
    if (!file.id) return { success: false, error: 'No file ID returned from Google Drive' };

    // Insert content into the doc
    const paragraphs = body.split('\n\n').filter(p => p.trim());
    const requests = paragraphs.reverse().map(p => ({
      insertText: {
        location: { index: 1 },
        text: p.trim() + '\n\n',
      },
    }));

    if (requests.length > 0) {
      await fetch(`https://docs.googleapis.com/v1/documents/${file.id}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
    }

    const url = `https://docs.google.com/document/d/${file.id}/edit`;
    return { success: true, url };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
