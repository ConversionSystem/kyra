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
      const publishResult = await publishToplatform(
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

async function publishToplatform(
  platform: string,
  title: string,
  body: string,
  siteId: string,
  clientId: string | null,
): Promise<PublishResult> {
  switch (platform) {
    case 'telegraph':
      return publishToTelegraph(title, body);
    default:
      return { success: false, error: `Platform "${platform}" not yet implemented in publish-scheduler` };
  }
}

/**
 * Publish to Telegraph (telegra.ph) — instant, no auth needed for first post.
 */
async function publishToTelegraph(title: string, body: string): Promise<PublishResult> {
  try {
    // Create account if needed
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
    const token = accountData.result?.access_token;
    if (!token) return { success: false, error: 'No access token from Telegraph' };

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
