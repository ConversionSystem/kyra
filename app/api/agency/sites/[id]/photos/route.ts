import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Helper: verify the site belongs to the user's agency. Returns the site row or null.
 */
async function verifySiteOwnership(siteId: string, agencyId: string) {
  const supabase = createServiceClientWithoutCookies();
  const { data } = await supabase
    .from('client_sites')
    .select('id, photos')
    .eq('id', siteId)
    .eq('agency_id', agencyId)
    .single();
  return data;
}

/**
 * GET /api/agency/sites/[id]/photos
 * List photos for a site (from the photos JSONB column).
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const site = await verifySiteOwnership(siteId, auth.data.agency.id);
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: site.photos || [] });
}

/**
 * POST /api/agency/sites/[id]/photos
 * Upload a photo to Supabase Storage and add it to the site's photos array.
 * Expects multipart/form-data with a "file" field, plus optional "alt" and "placement" text fields.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const site = await verifySiteOwnership(siteId, auth.data.agency.id);
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
      { status: 400 }
    );
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg';
  const storagePath = `sites/${siteId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('site-assets')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[sites/photos] Upload failed:', uploadError);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('site-assets')
    .getPublicUrl(storagePath);

  const alt = (formData.get('alt') as string) || '';
  const placement = (formData.get('placement') as string) || '';

  const newPhoto = {
    url: urlData.publicUrl,
    alt,
    placement,
    storage_path: storagePath, // keep for deletion
  };

  // Append to photos array
  const currentPhotos = (site.photos as unknown[]) || [];
  const updatedPhotos = [...currentPhotos, newPhoto];

  const { error: updateError } = await supabase
    .from('client_sites')
    .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
    .eq('id', siteId);

  if (updateError) {
    console.error('[sites/photos] Failed to update photos:', updateError);
    return NextResponse.json({ error: 'Photo uploaded but failed to update site record' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: newPhoto }, { status: 201 });
}

/**
 * DELETE /api/agency/sites/[id]/photos
 * Remove a photo. Body: { url: string } — matches the photo URL to remove.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id: siteId } = await params;

  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 });
  }

  const site = await verifySiteOwnership(siteId, auth.data.agency.id);
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const currentPhotos = (site.photos as Array<{ url: string; storage_path?: string }>) || [];
  const photoToRemove = currentPhotos.find((p) => p.url === body.url);

  if (!photoToRemove) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  const supabase = createServiceClientWithoutCookies();

  // Remove from storage if we have the path
  if (photoToRemove.storage_path) {
    await supabase.storage
      .from('site-assets')
      .remove([photoToRemove.storage_path]);
  }

  // Remove from photos array
  const updatedPhotos = currentPhotos.filter((p) => p.url !== body.url);

  const { error } = await supabase
    .from('client_sites')
    .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
    .eq('id', siteId);

  if (error) {
    console.error('[sites/photos] Failed to update photos:', error);
    return NextResponse.json({ error: 'Failed to remove photo' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { deleted: true } });
}
