import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { migrateAllContainersToRouter, getRouterStatus } from '@/lib/ovh/provisioner';

// Simple master-only auth check
async function isMaster(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.MASTER_SECRET}`) return true;

  const supabase = createServiceClientWithoutCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const masterEmails = (process.env.MASTER_EMAILS || 'angel@conversionsystem.com').split(',');
  return masterEmails.includes(user.email || '');
}

// GET /api/admin/router-migrate — check router status + preview what would migrate
export async function GET(req: NextRequest) {
  if (!await isMaster(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [status, preview] = await Promise.all([
    getRouterStatus(),
    migrateAllContainersToRouter(true), // dry run
  ]);

  return NextResponse.json({ router: status, preview });
}

// POST /api/admin/router-migrate — run the migration
export async function POST(req: NextRequest) {
  if (!await isMaster(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await migrateAllContainersToRouter(false);
  if (!result) {
    return NextResponse.json({ error: 'Migration failed — provisioner unreachable' }, { status: 502 });
  }

  return NextResponse.json(result);
}
