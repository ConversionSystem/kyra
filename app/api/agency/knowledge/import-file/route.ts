// ============================================================================
// POST /api/agency/knowledge/import-file
//
// Accepts a file upload (multipart/form-data), extracts text per file type,
// and saves a `knowledge_documents` row with the extracted content.
//
// Existed because: the dashboard's Training tab "Add File" form previously
// wrote a metadata-only entry to `agency_clients.settings.knowledge_sources`
// (a JSON column the widget RAG never reads). Files were displayed in the
// dashboard but were INVISIBLE to the AI — bot answered every question
// generically because it had no actual training content.
//
// Supported extraction:
//   txt / md / csv  → file.text() (browser/Node native)
//   docx            → mammoth (extracts paragraphs from Word XML)
//   pdf             → not yet (returns 415 with guidance to convert)
//
// On success, returns the created knowledge_document row. The same auto-sync
// trigger from the main /api/agency/knowledge POST handler fires, so the
// new content reaches both the embedded widget RAG (read-time) and OpenClaw
// (file-write) immediately.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireAgencyMember } from '@/lib/agency/middleware';
import { getGatewayByAgencyId, getGatewayByClientId } from '@/lib/ovh/gateway-resolver';
import {
  loadKnowledgeForAgency,
  loadKnowledgeForClient,
  pushKnowledgeToGateway,
  markSynced,
} from '@/lib/knowledge/sync-to-gateway';

export const dynamic = 'force-dynamic';
// Allow up to 10MB uploads (matches the dashboard's stated limit). Body
// parsing for FormData is built into Next 15.
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_CONTENT_CHARS = 50_000;  // matches /import-url truncation

export async function POST(request: NextRequest) {
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  const { agency } = auth.data;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data body' }, { status: 400 });
  }

  const file = formData.get('file');
  const clientId = (formData.get('clientId') as string | null) || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 413 });
  }

  // Extract text by extension. Mime types are unreliable across browsers, so
  // we trust the extension first — the dashboard already filters extensions
  // before upload.
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  let content = '';

  try {
    if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      content = await file.text();
    } else if (ext === 'docx') {
      // mammoth runs in Node, expects a Buffer. Returns plain text with
      // paragraphs separated by newlines (good enough for RAG).
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
      if (result.messages?.length) {
        // mammoth surfaces non-fatal warnings (image dropped, style ignored).
        // Log them but continue — the text we got is usable.
        console.warn(`[import-file] mammoth warnings for ${name}:`, result.messages.map(m => m.message).slice(0, 5));
      }
    } else if (ext === 'pdf') {
      return NextResponse.json(
        {
          error: 'PDF extraction is not yet supported on the server. Please convert to .txt / .md / .docx, or paste the text content directly using the Manual Knowledge form below.',
          hint: 'pdf_not_supported',
        },
        { status: 415 },
      );
    } else {
      return NextResponse.json(
        { error: `Unsupported file extension: .${ext}. Accepted: txt, md, csv, docx.` },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error('[import-file] extraction failed:', err);
    return NextResponse.json(
      { error: `Couldn't extract text from ${name}: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 500 },
    );
  }

  content = content.trim();
  if (content.length < 30) {
    return NextResponse.json(
      { error: 'Extracted content too short — file may be empty, image-only, or password-protected.' },
      { status: 400 },
    );
  }
  if (content.length > MAX_CONTENT_CHARS) {
    content = content.slice(0, MAX_CONTENT_CHARS) + '\n\n[Truncated]';
  }

  const supabase = createServiceClientWithoutCookies();

  // Drop the .extension from the title so it reads cleanly in the AI prompt.
  const title = name.replace(/\.[^.]+$/, '').trim() || name;

  const { data, error } = await supabase
    .from('knowledge_documents')
    .insert({
      agency_id: agency.id,
      client_id: clientId,
      title,
      content,
      source_type: 'file',
      file_name: name,
      mime_type: file.type || null,
      char_count: content.length,
      enabled: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[import-file] DB insert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-sync to the OpenClaw gateway (mirrors the trigger in
  // /api/agency/knowledge POST). Fire-and-forget so we don't block the
  // upload response on the gateway round-trip.
  setImmediate(async () => {
    try {
      const supabase2 = createServiceClientWithoutCookies();
      const gateway = clientId
        ? await getGatewayByClientId(clientId)
        : await getGatewayByAgencyId(agency.id);
      if (!gateway) return;
      const bundle = clientId
        ? await loadKnowledgeForClient(supabase2, agency.id, clientId)
        : await loadKnowledgeForAgency(supabase2, agency.id);
      const push = await pushKnowledgeToGateway(gateway, bundle, { wakeAi: false });
      if (push.ok) await markSynced(supabase2, bundle.documentIds);
      else console.warn('[import-file] gateway push failed:', push.error);
    } catch (err) {
      console.warn('[import-file] auto-sync failed:', err instanceof Error ? err.message : err);
    }
  });

  return NextResponse.json({
    document: data,
    extracted: { chars: content.length, title, filename: name },
  });
}
