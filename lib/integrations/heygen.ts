/**
 * HeyGen Video API Client (v2)
 *
 * Creates AI avatar videos from scripts.
 * Requires HEYGEN_API_KEY env var.
 */

const HEYGEN_API = 'https://api.heygen.com';

// ── Types ────────────────────────────────────────────────────────────────

export interface VideoCreateResult {
  videoId: string;
  status: string;
}

export interface VideoStatus {
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface HeyGenResponse<T> {
  mock: boolean;
  data: T;
  message?: string;
}

// ── Config ───────────────────────────────────────────────────────────────

function getApiKey(): string | null {
  return process.env.HEYGEN_API_KEY || null;
}

function isConfigured(): boolean {
  return !!process.env.HEYGEN_API_KEY;
}

// ── Public API ───────────────────────────────────────────────────────────

export async function createVideo(params: {
  script: string;
  avatarId?: string;
  voiceId?: string;
  backgroundUrl?: string;
}): Promise<HeyGenResponse<VideoCreateResult>> {
  if (!isConfigured()) {
    return {
      mock: true,
      data: { videoId: 'mock-video-' + Date.now(), status: 'processing' },
      message: 'HeyGen not configured. Add HEYGEN_API_KEY to your environment.',
    };
  }

  const apiKey = getApiKey()!;

  const body: Record<string, unknown> = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: params.avatarId || 'default',
        },
        voice: {
          type: 'text',
          input_text: params.script,
          ...(params.voiceId ? { voice_id: params.voiceId } : {}),
        },
        ...(params.backgroundUrl
          ? { background: { type: 'image', value: params.backgroundUrl } }
          : {}),
      },
    ],
  };

  const res = await fetch(`${HEYGEN_API}/v2/video/generate`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`HeyGen create failed: ${res.status} ${err.slice(0, 200)}`);
  }

  const result = (await res.json()) as { data?: { video_id?: string } };
  const videoId = result.data?.video_id;
  if (!videoId) throw new Error('HeyGen returned no video ID');

  return { mock: false, data: { videoId, status: 'processing' } };
}

export async function getVideoStatus(
  videoId: string,
): Promise<HeyGenResponse<VideoStatus>> {
  if (!isConfigured()) {
    return {
      mock: true,
      data: {
        status: 'completed',
        videoUrl: `https://example.com/mock-video/${videoId}.mp4`,
        thumbnailUrl: `https://example.com/mock-video/${videoId}-thumb.jpg`,
      },
      message: 'HeyGen not configured. Using mock data.',
    };
  }

  const apiKey = getApiKey()!;

  const res = await fetch(`${HEYGEN_API}/v1/video_status.get?video_id=${videoId}`, {
    headers: { 'X-Api-Key': apiKey },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`HeyGen status failed: ${res.status} ${err.slice(0, 200)}`);
  }

  const result = (await res.json()) as {
    data?: { status?: string; video_url?: string; thumbnail_url?: string };
  };

  const status = result.data?.status === 'completed'
    ? 'completed'
    : result.data?.status === 'failed'
      ? 'failed'
      : 'processing';

  return {
    mock: false,
    data: {
      status: status as VideoStatus['status'],
      videoUrl: result.data?.video_url,
      thumbnailUrl: result.data?.thumbnail_url,
    },
  };
}
