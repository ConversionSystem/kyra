// Voice AI provider factory
// Returns the right adapter based on the configured provider

import { VapiClient } from './vapi';
import { SynthflowClient } from './synthflow';
import { RetellClient } from './retell';
import { KyraNativeClient } from './kyra-native';
import type { VoiceProvider, VoiceProviderClient, VoiceAssistantConfig } from './types';

export function getVoiceProvider(provider: VoiceProvider, apiKey: string): VoiceProviderClient {
  switch (provider) {
    case 'vapi':      return new VapiClient(apiKey);
    case 'synthflow': return new SynthflowClient(apiKey);
    case 'retell':    return new RetellClient(apiKey);
    case 'openclaw':  return new KyraNativeClient();
    default: throw new Error(`Unknown voice provider: ${provider}`);
  }
}

// ── System Prompt Builder ─────────────────────────────────────────────────────
// Builds the voice-optimized system prompt from the client's existing config

export interface ClientContext {
  name: string;          // business name
  aiName?: string;       // AI worker name e.g. "Alex"
  persona?: string;      // existing personality/instructions
  industry?: string;
  services?: string;
  hours?: string;
  bookingUrl?: string;
  phone?: string;
  address?: string;
}

export function buildVoiceSystemPrompt(ctx: ClientContext): string {
  return `You are ${ctx.aiName ?? 'Alex'}, an AI worker for ${ctx.name}.

ROLE: You answer inbound calls, qualify leads, book appointments, and provide helpful information about ${ctx.name}. You're warm, professional, and efficient. Keep responses concise — this is a phone call, not a chat.

BUSINESS CONTEXT:
- Business: ${ctx.name}
- Industry: ${ctx.industry ?? 'professional services'}
${ctx.services ? `- Services: ${ctx.services}` : ''}
${ctx.hours ? `- Hours: ${ctx.hours}` : '- Hours: Monday–Friday 9am–5pm'}
${ctx.bookingUrl ? `- Booking: ${ctx.bookingUrl}` : ''}
${ctx.phone ? `- Main number: ${ctx.phone}` : ''}
${ctx.address ? `- Location: ${ctx.address}` : ''}

PERSONALITY:
${ctx.persona ?? 'Friendly, professional, and helpful. You represent this business with pride.'}

CALL HANDLING:
1. Greet the caller warmly and identify yourself
2. Listen to understand why they're calling
3. Help them with their immediate need
4. If they want to book an appointment, take their name, preferred time, and contact number
5. If it's an emergency or they're upset, offer to have a team member call them back right away
6. Always end with a warm close and their next steps

IMPORTANT:
- This is a PHONE CALL — be conversational, not robotic
- Don't speak in bullet points or lists — use natural sentences
- If you don't know something, say "I'll have someone from our team follow up with you on that"
- Never make up information about pricing, availability, or policy
- If the caller is aggressive or abusive, calmly say "I'll have a team member reach out to assist you" and end the call`;
}

export function buildVoiceConfig(ctx: ClientContext): VoiceAssistantConfig {
  return {
    name: ctx.aiName ?? `${ctx.name} AI`,
    firstMessage: `Hi, thank you for calling ${ctx.name}! This is ${ctx.aiName ?? 'Alex'}, how can I help you today?`,
    systemPrompt: buildVoiceSystemPrompt(ctx),
    endCallMessage: `Thanks so much for calling ${ctx.name}. Have a wonderful day, and we'll be in touch!`,
    maxDurationSeconds: 600,     // 10 minute max
    silenceTimeoutSeconds: 30,
  };
}

// ── Provider display config ───────────────────────────────────────────────────

export const VOICE_PROVIDERS: Record<VoiceProvider, {
  name: string;
  description: string;
  pricing: string;
  bestFor: string;
  docsUrl: string;
  signupUrl: string;
}> = {
  openclaw: {
    name: 'Kyra Native',
    description: 'Built on Deepgram + OpenClaw TTS. No third-party account needed.',
    pricing: '~3 credits/min (vs $0.15+ elsewhere)',
    bestFor: 'Agencies who want one bill. Simplest setup.',
    docsUrl: '',
    signupUrl: '',
  },
  vapi: {
    name: 'VAPI',
    description: 'Most flexible, developer-friendly. Best API.',
    pricing: '~$0.05/min platform + voice/LLM costs (~$0.15-0.20/min all-in)',
    bestFor: 'Custom setups, developers, flexible configuration',
    docsUrl: 'https://docs.vapi.ai',
    signupUrl: 'https://dashboard.vapi.ai',
  },
  synthflow: {
    name: 'Synthflow',
    description: 'Best for agencies — white-label, unlimited subaccounts, flat pricing.',
    pricing: '$1,400/mo agency plan (6K min, 80 concurrent, unlimited subaccounts)',
    bestFor: 'Agencies managing 10+ clients, white-label requirements',
    docsUrl: 'https://docs.synthflow.ai',
    signupUrl: 'https://app.synthflow.ai',
  },
  retell: {
    name: 'Retell AI',
    description: 'Enterprise-grade, high concurrency, advanced analytics.',
    pricing: 'Pay-as-you-go $0.07+/min (~$0.13-0.31/min all-in)',
    bestFor: 'High call volume, enterprise, custom LLM integrations',
    docsUrl: 'https://docs.retellai.com',
    signupUrl: 'https://www.retellai.com',
  },
};
