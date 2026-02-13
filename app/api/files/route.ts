import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Plan } from '@/lib/billing/plans';

const FILE_LIMITS: Record<Plan, number> = {
  free: 5,
  starter: 50,
  business: 200,
  max: 1000,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/files — Upload a file
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await serviceClient
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    const plan = (profile?.plan || 'free') as Plan;
    const limit = FILE_LIMITS[plan];

    // Check file count limit
    const { count } = await serviceClient
      .from('user_files')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: `File limit reached (${limit} files on ${plan} plan). Upgrade for more.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    const storagePath = `${user.id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { error: uploadError } = await serviceClient.storage
      .from('user-files')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Insert record into user_files table
    const { data: fileRecord, error: insertError } = await serviceClient
      .from('user_files')
      .insert({
        user_id: user.id,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (insertError) {
      console.error('DB insert error:', insertError);
      // Clean up storage on DB failure
      await serviceClient.storage.from('user-files').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 });
    }

    return NextResponse.json(fileRecord, { status: 201 });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/files — List user files
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await serviceClient
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    const plan = (profile?.plan || 'free') as Plan;
    const limit = FILE_LIMITS[plan];

    const { data: files, error } = await serviceClient
      .from('user_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('File list error:', error);
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }

    return NextResponse.json({ files: files || [], limit, plan });
  } catch (error) {
    console.error('File list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/files?id=<fileId> — Delete a file
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = request.nextUrl.searchParams.get('id');
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Get file record (verify ownership)
    const { data: file, error: fetchError } = await serviceClient
      .from('user_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from storage
    await serviceClient.storage.from('user-files').remove([file.storage_path]);

    // Delete from DB
    await serviceClient
      .from('user_files')
      .delete()
      .eq('id', fileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
