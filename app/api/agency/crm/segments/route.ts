import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { getSegments, saveSegments } from '@/lib/crm/segments';
import type { CrmSegment } from '@/lib/crm/segments';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const segments = await getSegments(result.agency.id);
  return NextResponse.json({ segments });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const body = await req.json();
  const { action } = body as { action: 'save' | 'delete'; segment?: CrmSegment; segmentId?: string };

  const segments = await getSegments(result.agency.id);

  switch (action) {
    case 'save': {
      const { segment } = body;
      if (!segment?.name) return NextResponse.json({ error: 'Segment name required' }, { status: 400 });

      const existing = segments.findIndex(s => s.id === segment.id);
      if (existing >= 0) {
        segments[existing] = { ...segments[existing], ...segment };
      } else {
        segments.push({
          ...segment,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        });
      }
      await saveSegments(result.agency.id, segments);
      return NextResponse.json({ ok: true, segments });
    }

    case 'delete': {
      const { segmentId } = body;
      const filtered = segments.filter(s => s.id !== segmentId);
      await saveSegments(result.agency.id, filtered);
      return NextResponse.json({ ok: true, segments: filtered });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
