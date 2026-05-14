// ============================================================================
// /api/agency/sites/[id]/logo  — Logo upload / delete (Sprint 3, 2026-05-14)
//
// Dedicated endpoint for the site logo. We don't reuse /photos because:
//   - The photos array is for hero/gallery imagery used inside section
//     templates; mixing in a logo would pollute the gallery UI.
//   - The logo is a single-value field (`logo_url` on client_sites), so the
//     storage + DB update flow is materially simpler.
//
// Storage path: sites/{siteId}/logo-{timestamp}.{ext}  (timestamped so the
// public URL changes on replace, defeating Vercel/Edge CDN caches).
//
// Auth: requireAgencyMember + per-site agency ownership check (same pattern
// as /photos route).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function verifyOwnership(siteId: string, agencyId: string) {
  const supabase = createServiceClientWithoutCookies();
  const { data } = await supabase
    .from('client_sites')
    .select('id, logo_url')
    .eq('id', siteId)
    .eq('agency_id', agencyId)
    .single();
  return data;
}

/**
 * POST  multipart/form-data { file: File }
 * Uploads a new logo, sets `logo_url`, and (best-effort) deletes the prior
 * logo from storage so we don't pile up orphaned objects.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const site = await verifyOwnership(siteId, auth.data.agency.id);
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 }); }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // SVG accepted for logos specifically — common for brand assets and
  // renders crisp at any size. Photos endpoint blocks SVG (XSS risk for
  // user-supplied gallery imagery) but here the agency owns the brand.
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Allowed types: JPEG, PNG, WebP, SVG' }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Logo too large (max 4MB)' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();
  const ext = file.type === 'image/svg+xml' ? 'svg' : (file.name.split('.').pop() || 'png');
  const storagePath = `sites/${siteId}/logo-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('site-assets')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error('[sites/logo] upload failed', uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(storagePath);
  const newLogoUrl = urlData.publicUrl;

  const { error: updateErr } = await supabase
    .from('client_sites')
    .update({ logo_url: newLogoUrl, updated_at: new Date().toISOString() })
    .eq('id', siteId);
  if (updateErr) {
    console.error('[sites/logo] DB update failed', updateErr);
    return NextResponse.json({ error: 'Upload OK but DB update failed' }, { status: 500 });
  }

  // Best-effort cleanup of the previous logo. Match storage path from URL —
  // if the prior logo was uploaded via this endpoint, the URL contains the
  // path after `/site-assets/`. We don't await failure; orphans are harmless.
  if (site.logo_url && site.logo_url.includes('/site-assets/')) {
    const m = site.logo_url.match(/\/site-assets\/(.+)$/);
    if (m && m[1] !== storagePath) {
      await supabase.storage.from('site-assets').remove([m[1]]).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, data: { logo_url: newLogoUrl } }, { status: 201 });
}

/**
 * DELETE → clears `logo_url` and removes the storage object (best-effort).
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const site = await verifyOwnership(siteId, auth.data.agency.id);
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const supabase = createServiceClientWithoutCookies();

  if (site.logo_url && site.logo_url.includes('/site-assets/')) {
    const m = site.logo_url.match(/\/site-assets\/(.+)$/);
    if (m) await supabase.storage.from('site-assets').remove([m[1]]).catch(() => {});
  }

  const { error } = await supabase
    .from('client_sites')
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq('id', siteId);
  if (error) {
    console.error('[sites/logo] delete DB update failed', error);
    return NextResponse.json({ error: 'Failed to clear logo' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
