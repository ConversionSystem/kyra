import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import {
  getClientKnowledgeEntries,
  deleteKnowledgeEntry,
  type KnowledgeCategory,
} from '@/lib/knowledge/extractor';

export const dynamic = 'force-dynamic';

// GET — list all extracted knowledge for a client (paginated)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  const { agency } = auth.data;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const category = url.searchParams.get('category') as KnowledgeCategory | null;

  try {
    const result = await getClientKnowledgeEntries(clientId, agency.id, {
      limit,
      offset,
      category: category || undefined,
    });

    return NextResponse.json({
      entries: result.entries,
      total: result.total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[knowledge-engine] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch knowledge' },
      { status: 500 },
    );
  }
}

// DELETE — remove a specific knowledge entry by id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  const { agency } = auth.data;

  const body = await req.json().catch(() => ({}));
  const entryId = (body as { entryId?: string }).entryId;

  if (!entryId) {
    return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
  }

  try {
    await deleteKnowledgeEntry(entryId, clientId, agency.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[knowledge-engine] DELETE error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete entry' },
      { status: 500 },
    );
  }
}
