import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createClient } from '@/lib/supabase/server';
import { listPosts, publishPost, WPConfig } from '@/lib/integrations/wordpress';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getWPConfig(containerConfig: Record<string, unknown>): Partial<WPConfig> {
  return {
    wordpress_url: (containerConfig.wordpress_url as string) || '',
    wordpress_username: (containerConfig.wordpress_username as string) || '',
    wordpress_app_password: (containerConfig.wordpress_app_password as string) || '',
  };
}

/**
 * GET /api/agency/clients/[id]/wordpress
 * List recent WordPress posts for a client.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params;

  const authResult = await requireAgencyMember();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }

  const { agency } = authResult.data;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, agency_id, container_config')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const wpConfig = getWPConfig((client.container_config as Record<string, unknown>) ?? {});

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const perPage = parseInt(searchParams.get('per_page') || '20', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  try {
    const result = await listPosts(wpConfig, { status, per_page: perPage, page });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/agency/clients/[id]/wordpress
 * Publish or draft a post to the client's WordPress site.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params;

  const authResult = await requireAgencyMember();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }

  const { agency } = authResult.data;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, agency_id, container_config')
    .eq('id', clientId)
    .eq('agency_id', agency.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const wpConfig = getWPConfig((client.container_config as Record<string, unknown>) ?? {});

  const body = await request.json();
  const { title, content, slug, status, categories, tags, meta } = body as {
    title?: string;
    content?: string;
    slug?: string;
    status?: 'publish' | 'draft';
    categories?: number[];
    tags?: number[];
    meta?: Record<string, string>;
  };

  if (!title || !content) {
    return NextResponse.json({ error: 'Missing title or content' }, { status: 400 });
  }

  try {
    const result = await publishPost(wpConfig, {
      title,
      content,
      slug,
      status: status || 'draft',
      categories,
      tags,
      meta,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
