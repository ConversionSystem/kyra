/**
 * WordPress REST API Client
 *
 * Manages posts on self-hosted WordPress sites using Application Passwords.
 * Each client stores credentials in container_config:
 *   wordpress_url, wordpress_username, wordpress_app_password
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface WPConfig {
  wordpress_url: string;
  wordpress_username: string;
  wordpress_app_password: string;
}

export interface WPPost {
  id: number;
  title: string;
  slug: string;
  status: string;
  url: string;
  date: string;
  excerpt: string;
}

export interface WPPublishResult {
  id: number;
  url: string;
  status: string;
}

export interface WPResponse<T> {
  mock: boolean;
  data: T;
  message?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getBaseUrl(config: WPConfig): string {
  return config.wordpress_url.replace(/\/+$/, '');
}

function getAuthHeader(config: WPConfig): string {
  return 'Basic ' + Buffer.from(`${config.wordpress_username}:${config.wordpress_app_password}`).toString('base64');
}

function isConfigured(config: Partial<WPConfig> | null | undefined): config is WPConfig {
  return !!config?.wordpress_url && !!config?.wordpress_username && !!config?.wordpress_app_password;
}

// ── Mock Data ────────────────────────────────────────────────────────────

function mockPosts(): WPPost[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: 1000 + i,
    title: `Mock Post ${i + 1}`,
    slug: `mock-post-${i + 1}`,
    status: i === 0 ? 'draft' : 'publish',
    url: `https://example.com/mock-post-${i + 1}`,
    date: new Date(Date.now() - i * 86400000).toISOString(),
    excerpt: `This is a mock post excerpt for testing.`,
  }));
}

// ── Public API ───────────────────────────────────────────────────────────

export async function publishPost(
  config: Partial<WPConfig> | null | undefined,
  post: {
    title: string;
    content: string;
    slug?: string;
    status: 'publish' | 'draft';
    categories?: number[];
    tags?: number[];
    meta?: {
      yoast_title?: string;
      yoast_description?: string;
      yoast_focus_keyword?: string;
    };
    featured_image_url?: string;
  },
): Promise<WPResponse<WPPublishResult>> {
  if (!isConfigured(config)) {
    return {
      mock: true,
      data: { id: 9999, url: 'https://example.com/mock-post', status: post.status },
      message: 'WordPress not configured. Add wordpress_url, wordpress_username, and wordpress_app_password to client config.',
    };
  }

  const base = getBaseUrl(config);
  const body: Record<string, unknown> = {
    title: post.title,
    content: post.content,
    status: post.status,
  };
  if (post.slug) body.slug = post.slug;
  if (post.categories) body.categories = post.categories;
  if (post.tags) body.tags = post.tags;
  if (post.meta) body.meta = post.meta;

  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(config),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`WordPress publish failed: ${res.status} ${err.slice(0, 200)}`);
  }

  const result = (await res.json()) as { id: number; link: string; status: string };
  return {
    mock: false,
    data: { id: result.id, url: result.link, status: result.status },
  };
}

export async function listPosts(
  config: Partial<WPConfig> | null | undefined,
  options?: { status?: string; per_page?: number; page?: number },
): Promise<WPResponse<WPPost[]>> {
  if (!isConfigured(config)) {
    return { mock: true, data: mockPosts(), message: 'WordPress not configured. Using mock data.' };
  }

  const base = getBaseUrl(config);
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  params.set('per_page', String(options?.per_page ?? 20));
  params.set('page', String(options?.page ?? 1));

  const res = await fetch(`${base}/wp-json/wp/v2/posts?${params}`, {
    headers: { Authorization: getAuthHeader(config) },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`WordPress list failed: ${res.status} ${err.slice(0, 200)}`);
  }

  const posts = (await res.json()) as Array<{
    id: number;
    title: { rendered: string };
    slug: string;
    status: string;
    link: string;
    date: string;
    excerpt: { rendered: string };
  }>;

  return {
    mock: false,
    data: posts.map((p) => ({
      id: p.id,
      title: p.title.rendered,
      slug: p.slug,
      status: p.status,
      url: p.link,
      date: p.date,
      excerpt: p.excerpt.rendered.replace(/<[^>]+>/g, '').trim(),
    })),
  };
}

export async function getPost(
  config: Partial<WPConfig> | null | undefined,
  id: number,
): Promise<WPResponse<WPPost>> {
  if (!isConfigured(config)) {
    return {
      mock: true,
      data: { id, title: 'Mock Post', slug: 'mock-post', status: 'publish', url: 'https://example.com/mock', date: new Date().toISOString(), excerpt: 'Mock excerpt' },
      message: 'WordPress not configured. Using mock data.',
    };
  }

  const base = getBaseUrl(config);
  const res = await fetch(`${base}/wp-json/wp/v2/posts/${id}`, {
    headers: { Authorization: getAuthHeader(config) },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`WordPress get post failed: ${res.status} ${err.slice(0, 200)}`);
  }

  const p = (await res.json()) as {
    id: number;
    title: { rendered: string };
    slug: string;
    status: string;
    link: string;
    date: string;
    excerpt: { rendered: string };
  };

  return {
    mock: false,
    data: {
      id: p.id,
      title: p.title.rendered,
      slug: p.slug,
      status: p.status,
      url: p.link,
      date: p.date,
      excerpt: p.excerpt.rendered.replace(/<[^>]+>/g, '').trim(),
    },
  };
}
