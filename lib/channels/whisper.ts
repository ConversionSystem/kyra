/**
 * Whisper — Audio Transcription for Kyra
 *
 * Uses OpenAI Whisper API to transcribe voice messages and audio files.
 */

import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return openaiInstance;
}

/**
 * Transcribe audio using OpenAI Whisper API
 * Returns the transcription text.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options?: {
    language?: string; // ISO 639-1 language code (e.g. 'en', 'es')
    filename?: string; // Original filename for format hint
  }
): Promise<string> {
  const openai = getOpenAI();

  // Whisper expects a File-like object with a name
  const filename = options?.filename || 'audio.ogg';
  const file = new File([new Uint8Array(audioBuffer)], filename, {
    type: getMimeType(filename),
  });

  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: options?.language,
  });

  return response.text;
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/m4a',
    webm: 'audio/webm',
    mp4: 'audio/mp4',
  };
  return mimeTypes[ext || ''] || 'audio/ogg';
}
