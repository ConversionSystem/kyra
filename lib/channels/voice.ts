/**
 * Voice Engine — Text-to-Speech for Kyra
 * 
 * Uses OpenAI TTS API for voice responses.
 * Kyra can speak in web UI and messaging channels.
 */

import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return openaiInstance;
}

export type VoiceId = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

const DEFAULT_VOICE: VoiceId = 'nova'; // Warm, professional female voice — fits Kyra's personality

/**
 * Convert text to speech using OpenAI TTS
 * Returns audio as a Buffer (mp3)
 */
export async function textToSpeech(
  text: string,
  options?: {
    voice?: VoiceId;
    speed?: number; // 0.25 - 4.0, default 1.0
  }
): Promise<Buffer> {
  const openai = getOpenAI();
  
  // Truncate long text (TTS has a 4096 char limit)
  const truncated = text.length > 4000 ? text.substring(0, 3990) + '...' : text;
  
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: options?.voice || DEFAULT_VOICE,
    input: truncated,
    speed: options?.speed || 1.0,
    response_format: 'mp3',
  });
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Detect if a message should be responded to with voice
 */
export function shouldUseVoice(message: string, channelType?: string): boolean {
  // Voice channel always uses voice
  if (channelType === 'voice') return true;
  
  // Check for voice triggers in text
  const voiceTriggers = [
    /\b(read|say|speak|tell me|voice)\s+(this|that|it|aloud|out\s*loud)\b/i,
    /\bvoice\s+(response|reply|mode|on)\b/i,
  ];
  
  return voiceTriggers.some(r => r.test(message));
}
