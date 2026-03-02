import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { getAgencyTags, saveAgencyTags, getTagCounts } from '@/lib/crm/tags';
import type { CrmTag } from '@/lib/crm/tags';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const [tags, counts] = await Promise.all([
    getAgencyTags(result.agency.id),
    getTagCounts(result.agency.id),
  ]);

  const tagsWithCounts = tags.map(t => ({ ...t, count: counts[t.name] || 0 }));
  return NextResponse.json({ tags: tagsWithCounts, counts });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const body = await req.json();
  const { action } = body as { action: 'create' | 'update' | 'delete'; tag?: CrmTag; tagId?: string };

  const tags = await getAgencyTags(result.agency.id);

  switch (action) {
    case 'create': {
      const { tag } = body;
      if (!tag?.name) return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
      const newTag: CrmTag = {
        id: crypto.randomUUID(),
        name: tag.name.trim(),
        color: tag.color || '#6366f1',
      };
      tags.push(newTag);
      await saveAgencyTags(result.agency.id, tags);
      return NextResponse.json(newTag);
    }

    case 'update': {
      const { tag } = body;
      if (!tag?.id) return NextResponse.json({ error: 'Tag ID required' }, { status: 400 });
      const idx = tags.findIndex(t => t.id === tag.id);
      if (idx < 0) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
      tags[idx] = { ...tags[idx], ...tag };
      await saveAgencyTags(result.agency.id, tags);
      return NextResponse.json(tags[idx]);
    }

    case 'delete': {
      const { tagId } = body;
      if (!tagId) return NextResponse.json({ error: 'Tag ID required' }, { status: 400 });
      const filtered = tags.filter(t => t.id !== tagId);
      await saveAgencyTags(result.agency.id, filtered);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
