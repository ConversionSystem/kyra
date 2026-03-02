import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { exportContactsCsv, exportDealsCsv } from '@/lib/crm/export';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'contacts';
  const date = new Date().toISOString().split('T')[0];

  try {
    if (type === 'deals') {
      const csv = await exportDealsCsv(result.agency.id);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="deals-${date}.csv"`,
        },
      });
    }

    const csv = await exportContactsCsv(result.agency.id);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="contacts-${date}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
