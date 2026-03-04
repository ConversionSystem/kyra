import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClient } from '@/lib/agency/queries';

export const dynamic = 'force-dynamic';

const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'http://15.204.91.157:9090';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';

// Memory files to read/write from the container
const MEMORY_FILES = [
  { name: 'SOUL.md', path: 'SOUL.md', containerPath: '/home/node/.openclaw/workspace/SOUL.md' },
  { name: 'MEMORY.md', path: 'MEMORY.md', containerPath: '/home/node/.openclaw/workspace/MEMORY.md' },
  { name: 'AGENTS.md', path: 'AGENTS.md', containerPath: '/home/node/.openclaw/workspace/AGENTS.md' },
];

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agency/clients/[id]/memory
 * Read memory files from the client's OpenClaw container via the VPS provisioner.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const client = await getAgencyClient(id);
  if (!client || client.agency_id !== result.agency.id) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Get container name from client ID
  const containerName = `kyra-cl-${client.id}`;

  const files = await Promise.all(
    MEMORY_FILES.map(async (file) => {
      try {
        const content = await readContainerFile(containerName, file.containerPath);
        return { name: file.name, path: file.path, content, exists: true };
      } catch {
        return { name: file.name, path: file.path, content: '', exists: false };
      }
    }),
  );

  return NextResponse.json({ files, container: containerName });
}

/**
 * PUT /api/agency/clients/[id]/memory
 * Write a memory file to the client's OpenClaw container.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const client = await getAgencyClient(id);
  if (!client || client.agency_id !== result.agency.id) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const body = await request.json();
  const { path, content } = body;

  if (!path || typeof content !== 'string') {
    return NextResponse.json({ error: 'Missing path or content' }, { status: 400 });
  }

  // Validate path is one of the allowed files
  const memFile = MEMORY_FILES.find((f) => f.path === path);
  if (!memFile) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const containerName = `kyra-cl-${client.id}`;

  try {
    await writeContainerFile(containerName, memFile.containerPath, content);
    return NextResponse.json({ ok: true, path: memFile.path });
  } catch (err) {
    console.error('[memory] Failed to write file:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Write failed' },
      { status: 500 },
    );
  }
}

// ── Provisioner Communication ─────────────────────────────────────────────────

/**
 * Read a file from inside a container via the provisioner.
 * Calls: GET /api/containers/:name/file?path=...
 */
async function readContainerFile(containerName: string, filePath: string): Promise<string> {
  const url = `${PROVISIONER_URL}/api/containers/${encodeURIComponent(containerName)}/file?path=${encodeURIComponent(filePath)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${PROVISIONER_SECRET}`,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error('File not found');
    const text = await res.text().catch(() => '');
    throw new Error(`Provisioner read failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.content || '';
}

/**
 * Write a file to a container via the provisioner.
 * Calls: PUT /api/containers/:name/file
 */
async function writeContainerFile(
  containerName: string,
  filePath: string,
  content: string,
): Promise<void> {
  const url = `${PROVISIONER_URL}/api/containers/${encodeURIComponent(containerName)}/file`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${PROVISIONER_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: filePath, content }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Provisioner write failed (${res.status}): ${text}`);
  }
}
