import crypto from 'crypto';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface PlatformStatus {
  platform: string;
  status: 'ready' | 'pending' | 'unavailable';
  url?: string;
  reason?: string;
}

type JsonObject = Record<string, unknown>;

type SEOPlatformSettings = {
  telegraph_token?: string;
  wordpress_site_id?: string;
  wordpress_category_id?: number | string;
  github_owner?: string;
  github_repo?: string;
  github_pages_url?: string;
  notion_database_id?: string;
  notion_page_id?: string;
  notion_page_url?: string;
  blogger_blog_id?: string;
  blogger_blog_url?: string;
  google_docs_folder_id?: string;
};

const PLATFORM_ORDER = [
  'telegraph',
  'wordpress',
  'github_pages',
  'notion',
  'blogger',
  'google_docs',
  'google_sites',
] as const;

const PLATFORM_KEY_MISSING_REASON = 'Platform API key not configured';

function asObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null ? (value as JsonObject) : {};
}

function parsePlatformSettings(settings: JsonObject): SEOPlatformSettings {
  return asObject(settings.seo_platforms) as SEOPlatformSettings;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function hasGoogleServiceAccountJson(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

function getWordPressSiteId(platforms: SEOPlatformSettings): string | undefined {
  return (
    safeString(platforms.wordpress_site_id) ||
    process.env.KYRA_WORDPRESS_SITE_ID ||
    process.env.KYRA_WORDPRESS_SITE ||
    undefined
  );
}

function getNotionDatabaseId(platforms: SEOPlatformSettings): string | undefined {
  return safeString(platforms.notion_database_id) || process.env.KYRA_NOTION_DATABASE_ID || undefined;
}

export function getPlatformStatusesFromSettings(settings: JsonObject): PlatformStatus[] {
  const platforms = parsePlatformSettings(settings);

  const telegraphReady = Boolean(platforms.telegraph_token || safeString(settings.telegraph_token));

  const wordpressToken = Boolean(process.env.KYRA_WORDPRESS_TOKEN);
  const wordpressReady = wordpressToken && Boolean(getWordPressSiteId(platforms) && platforms.wordpress_category_id);

  const githubToken = Boolean(process.env.KYRA_GITHUB_TOKEN);
  const githubReady = githubToken && Boolean(platforms.github_owner && platforms.github_repo);

  const notionToken = Boolean(process.env.KYRA_NOTION_TOKEN);
  const notionReady = notionToken && Boolean(getNotionDatabaseId(platforms) && platforms.notion_page_id);

  const googleReady = hasGoogleServiceAccountJson();
  const bloggerReady = googleReady && Boolean(platforms.blogger_blog_id);
  const docsReady = googleReady && Boolean(platforms.google_docs_folder_id);

  const statuses: PlatformStatus[] = [
    {
      platform: 'telegraph',
      status: telegraphReady ? 'ready' : 'pending',
      reason: telegraphReady ? undefined : 'Auto-setup pending',
    },
    {
      platform: 'wordpress',
      status: !wordpressToken ? 'unavailable' : wordpressReady ? 'ready' : 'pending',
      reason: !wordpressToken
        ? PLATFORM_KEY_MISSING_REASON
        : wordpressReady
          ? undefined
          : 'Auto-setup pending',
    },
    {
      platform: 'github_pages',
      status: !githubToken ? 'unavailable' : githubReady ? 'ready' : 'pending',
      url: githubReady ? platforms.github_pages_url : undefined,
      reason: !githubToken
        ? PLATFORM_KEY_MISSING_REASON
        : githubReady
          ? undefined
          : 'Auto-setup pending',
    },
    {
      platform: 'notion',
      status: !notionToken ? 'unavailable' : notionReady ? 'ready' : 'pending',
      url: notionReady ? platforms.notion_page_url : undefined,
      reason: !notionToken
        ? PLATFORM_KEY_MISSING_REASON
        : notionReady
          ? undefined
          : 'Auto-setup pending',
    },
    {
      platform: 'blogger',
      status: !googleReady ? 'unavailable' : bloggerReady ? 'ready' : 'pending',
      url: bloggerReady ? platforms.blogger_blog_url : undefined,
      reason: !googleReady
        ? PLATFORM_KEY_MISSING_REASON
        : bloggerReady
          ? undefined
          : 'Auto-setup pending',
    },
    {
      platform: 'google_docs',
      status: !googleReady ? 'unavailable' : docsReady ? 'ready' : 'pending',
      reason: !googleReady
        ? PLATFORM_KEY_MISSING_REASON
        : docsReady
          ? undefined
          : 'Auto-setup pending',
    },
    {
      platform: 'google_sites',
      status: 'unavailable',
      reason: 'Coming Soon',
    },
  ];

  return PLATFORM_ORDER.map((id) => statuses.find((s) => s.platform === id)!).filter(Boolean);
}

function parseGoogleServiceAccount(): { client_email: string; private_key: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');

  const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

function base64Url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function getGoogleServiceAccessToken(scopes: string[]): Promise<string> {
  const sa = parseGoogleServiceAccount();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();

  const signature = signer
    .sign(sa.private_key)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const assertion = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || 'Failed to get Google access token');
  }

  return tokenJson.access_token;
}

export async function provisionPlatforms(clientId: string, clinicName: string, city: string): Promise<PlatformStatus[]> {
  const supabase = createServiceClientWithoutCookies();

  const { data: clientRow } = await supabase
    .from('agency_clients')
    .select('id, settings')
    .eq('id', clientId)
    .single();

  if (!clientRow) {
    return [
      {
        platform: 'telegraph',
        status: 'unavailable',
        reason: 'Client not found',
      },
    ];
  }

  const settings = asObject(clientRow.settings);
  const seoPlatforms = parsePlatformSettings(settings);

  // ── Telegraph ─────────────────────────────────────────────────────────
  if (!seoPlatforms.telegraph_token && !safeString(settings.telegraph_token)) {
    try {
      const accountRes = await fetch('https://api.telegra.ph/createAccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          short_name: slugify(clinicName || 'kyra-seo') || 'kyra-seo',
          author_name: `${clinicName || 'Kyra'} SEO`,
        }),
      });
      const account = (await accountRes.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { access_token?: string };
      };
      if (account.ok && account.result?.access_token) {
        seoPlatforms.telegraph_token = account.result.access_token;
        settings.telegraph_token = account.result.access_token;
      }
    } catch {
      // Non-fatal; surfaced as pending in computed statuses.
    }
  }

  // ── WordPress.com ───────────────────────────────────────────────────
  if (process.env.KYRA_WORDPRESS_TOKEN && !seoPlatforms.wordpress_category_id) {
    const siteId = getWordPressSiteId(seoPlatforms);
    if (siteId) {
      try {
        const categoryName = `${clinicName} ${city}`.trim() || clinicName || `Kyra SEO ${clientId}`;
        const categoryRes = await fetch(`https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/categories/new`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.KYRA_WORDPRESS_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            name: categoryName,
            description: `Auto-provisioned category for ${clinicName}`,
          }),
        });

        if (categoryRes.ok) {
          const category = (await categoryRes.json()) as { ID?: number };
          seoPlatforms.wordpress_site_id = siteId;
          if (category.ID) seoPlatforms.wordpress_category_id = category.ID;
        }
      } catch {
        // Keep pending.
      }
    }
  }

  // ── GitHub Pages ─────────────────────────────────────────────────────
  if (process.env.KYRA_GITHUB_TOKEN && !(seoPlatforms.github_owner && seoPlatforms.github_repo)) {
    try {
      const repoName = `kyra-seo-${clientId}`;

      let owner = process.env.KYRA_GITHUB_OWNER;
      if (!owner) {
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${process.env.KYRA_GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
          },
        });
        if (userRes.ok) {
          const user = (await userRes.json()) as { login?: string };
          owner = user.login;
        }
      }

      if (owner) {
        await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.KYRA_GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: repoName,
            description: `Kyra SEO content for ${clinicName}`,
            private: false,
            auto_init: true,
          }),
        });

        await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.KYRA_GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: { branch: 'main', path: '/' },
          }),
        });

        seoPlatforms.github_owner = owner;
        seoPlatforms.github_repo = repoName;
        seoPlatforms.github_pages_url = `https://${owner}.github.io/${repoName}`;
      }
    } catch {
      // Keep pending.
    }
  }

  // ── Notion ───────────────────────────────────────────────────────────
  if (process.env.KYRA_NOTION_TOKEN && !seoPlatforms.notion_page_id) {
    const databaseId = getNotionDatabaseId(seoPlatforms);
    if (databaseId) {
      try {
        const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
          headers: {
            Authorization: `Bearer ${process.env.KYRA_NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
          },
        });

        let titleProperty = 'Name';
        if (dbRes.ok) {
          const db = (await dbRes.json()) as { properties?: Record<string, { type?: string }> };
          const titleKey = Object.entries(db.properties || {}).find(([, value]) => value?.type === 'title')?.[0];
          if (titleKey) titleProperty = titleKey;
        }

        const pageRes = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.KYRA_NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: {
              [titleProperty]: {
                title: [{ text: { content: `${clinicName} SEO Workspace` } }],
              },
            },
          }),
        });

        if (pageRes.ok) {
          const page = (await pageRes.json()) as { id?: string; url?: string };
          if (page.id) seoPlatforms.notion_page_id = page.id;
          if (page.url) seoPlatforms.notion_page_url = page.url;
          seoPlatforms.notion_database_id = databaseId;
        }
      } catch {
        // Keep pending.
      }
    }
  }

  // ── Blogger ──────────────────────────────────────────────────────────
  if (hasGoogleServiceAccountJson() && !seoPlatforms.blogger_blog_id) {
    try {
      const token = await getGoogleServiceAccessToken(['https://www.googleapis.com/auth/blogger']);
      const blogRes = await fetch('https://www.googleapis.com/blogger/v3/blogs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${clinicName} Updates`,
          description: `SEO content stack for ${clinicName} in ${city}`,
        }),
      });

      if (blogRes.ok) {
        const blog = (await blogRes.json()) as { id?: string; url?: string };
        if (blog.id) seoPlatforms.blogger_blog_id = blog.id;
        if (blog.url) seoPlatforms.blogger_blog_url = blog.url;
      }
    } catch {
      // Keep pending.
    }
  }

  // ── Google Docs (Drive folder) ──────────────────────────────────────
  if (hasGoogleServiceAccountJson() && !seoPlatforms.google_docs_folder_id) {
    try {
      const token = await getGoogleServiceAccessToken(['https://www.googleapis.com/auth/drive']);
      const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${clinicName} SEO Content`,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (folderRes.ok) {
        const folder = (await folderRes.json()) as { id?: string };
        if (folder.id) seoPlatforms.google_docs_folder_id = folder.id;
      }
    } catch {
      // Keep pending.
    }
  }

  settings.seo_platforms = seoPlatforms;
  settings.seo_data = {
    ...asObject(settings.seo_data),
    platform_statuses: getPlatformStatusesFromSettings(settings),
    platform_last_provisioned_at: new Date().toISOString(),
  };

  await supabase
    .from('agency_clients')
    .update({ settings })
    .eq('id', clientId);

  return getPlatformStatusesFromSettings(settings);
}
