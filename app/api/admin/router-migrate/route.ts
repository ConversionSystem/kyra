import { NextRequest, NextResponse } from 'next/server';
import { requireMaster } from '@/lib/auth/admin';
import { migrateAllContainersToRouter, getRouterStatus } from '@/lib/ovh/provisioner';

// Bearer secret bypass (for ops scripts) OR master email via Supabase session
async function checkAuth(req: NextRequest): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.MASTER_SECRET}`) return null;
  const auth = await requireMaster();
  if (!auth.ok) return auth.response;
  return null;
}

// GET /api/admin/router-migrate — check router status + preview what would migrate
export async function GET(req: NextRequest) {
  const denial = await checkAuth(req);
  if (denial) return denial;

  const [status, preview] = await Promise.all([
    getRouterStatus(),
    migrateAllContainersToRouter(true), // dry run
  ]);

  return NextResponse.json({ router: status, preview });
}

// POST /api/admin/router-migrate — run the migration
export async function POST(req: NextRequest) {
  const denial = await checkAuth(req);
  if (denial) return denial;

  const result = await migrateAllContainersToRouter(false);
  if (!result) {
    return NextResponse.json({ error: 'Migration failed — provisioner unreachable' }, { status: 502 });
  }

  return NextResponse.json(result);
}
