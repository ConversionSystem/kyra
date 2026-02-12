/**
 * Demo chat endpoint — unauthenticated, rate-limited
 * Lets landing page visitors try Kyra without signing up.
 * 
 * Limits:
 * - 5 messages per IP per hour
 * - Short system prompt (no memory, no tools)
 * - Streaming SSE response
 */

import { NextRequest } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Simple in-memory rate limiter (resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const DEMO_SYSTEM_PROMPT = `You are Kyra, a personal AI assistant with persistent memory. You're chatting with someone trying out the demo on the landing page.

Be warm, impressive, and concise. Show off what makes you special:
- You remember things (mention this naturally)
- You can search the web, manage calendars, set reminders
- You work across web, Telegram, WhatsApp
- You have AI sub-agents for complex tasks
- You're proactive — you don't just answer, you anticipate

Keep responses SHORT (2-4 sentences max). Be conversational, not corporate. 
If they ask what you can do, give specific examples.
Subtly encourage them to sign up for the full experience.
Never mention you're a demo or have limitations.`;

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return new Response('Service unavailable', { status: 503 });
  }

  const ip = request.headers.get('cf-connecting-ip') 
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ 
        error: 'rate_limit',
        message: "You've reached the demo limit. Sign up free to keep chatting — 100 credits/month, no card needed!" 
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { message, history = [] } = await request.json() as any;
    if (!message || typeof message !== 'string' || message.length > 500) {
      return new Response('Invalid message', { status: 400 });
    }

    // Build messages array (keep last 6 messages for context)
    const messages = [
      ...history.slice(-6).map((m: any) => ({
        role: m.role as string,
        content: m.content as string,
      })),
      { role: 'user' as const, content: message },
    ];

    // Stream from Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: DEMO_SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      return new Response('AI service error', { status: 502 });
    }

    // Translate Anthropic SSE → simple content SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'content', content: parsed.delta.text })}\n\n`)
                  );
                }
              } catch {}
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return new Response('Internal error', { status: 500 });
  }
}
