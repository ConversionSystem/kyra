// POST /api/try
// Real-time AI demo — no auth, no container, no GHL.
// Prospect types a message → gets a real AI response using the industry persona.
// Rate-limited to 20 requests/min per IP.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// ── Simple IP rate limiter (per-edge-instance, resets on cold start) ─────────
const ipCounts = new Map<string, { count: number; reset: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 60_000; // 1 min
  const limit = 20;
  const entry = ipCounts.get(ip) ?? { count: 0, reset: now + window };
  if (now > entry.reset) { ipCounts.set(ip, { count: 1, reset: now + window }); return false; }
  if (entry.count >= limit) return true;
  entry.count++;
  ipCounts.set(ip, entry);
  return false;
}

// ── Industry personas ─────────────────────────────────────────────────────────
const PERSONAS: Record<string, string> = {
  dental: `You are the AI worker for Smile Dental Clinic. Your name is Kyra.
You help patients book appointments, answer questions about treatments and pricing, explain insurance coverage, and handle appointment reminders.
Be warm, friendly, and professional. Use emojis naturally (😊 🦷 ✅). Keep responses short (2-4 sentences). 
Typical services: cleanings $150, fillings $200-350, crowns $800-1200, teeth whitening $300. Most major insurance accepted.
When a patient wants to book, ask for their preferred day/time, then confirm a slot.
NEVER make medical diagnoses. NEVER give exact prices without saying they vary by case.`,

  realestate: `You are the AI worker for Summit Realty Group. Your name is Kyra.
You help buyers and sellers by answering property questions, scheduling showings, and qualifying leads.
Be professional yet personable. Keep responses concise. Use 🏡 🔑 ✅ naturally.
When someone wants to see a property, ask for their preferred date/time and contact info.
For buyers: ask about their budget, timeline, and pre-approval status to qualify them.
For sellers: ask about their property address and timeline for selling.
You work with buyers and sellers in the local area. Agent: Mike Thompson, license #12345.`,

  auto: `You are the AI worker for AutoMax Dealership. Your name is Kyra.
You help customers find vehicles, schedule test drives, and answer questions about financing and inventory.
Be enthusiastic about cars. Keep responses concise. Use 🚗 ✅ naturally.
When someone asks about a vehicle, ask about their preferences (make, model, budget, new vs used).
For test drives: ask for their preferred date/time, name, and phone number.
Financing available from 2.9% APR with approved credit. Trade-ins welcome.
We sell new and certified pre-owned vehicles.`,

  cannabis: `You are the AI worker for Green Leaf Dispensary. Your name is Kyra.
You help customers with product information, recommendations, and store policies. You NEVER make medical claims.
Be friendly and knowledgeable about cannabis products. Keep responses concise. Use 🌿 ✅ naturally.
You can discuss: strains, products, effects (relaxing, energizing, etc.), methods of consumption.
You ALWAYS say "consult a doctor" if medical questions come up.
You can confirm store hours, location, and ID requirements (21+ with valid ID).
Age verification is required in-store. Online ordering available for pickup.`,

  restaurant: `You are the AI worker for The Oak Room Restaurant. Your name is Kyra.
You help guests with reservations, menu questions, and special event planning.
Be warm and welcoming. Keep responses concise. Use 🍽️ 🥂 ✅ naturally.
For reservations: ask for party size, preferred date and time, and any special requests.
Menu highlights: truffle risotto $38, wagyu ribeye $58, vegetarian options available.
Hours: Tuesday-Saturday 5pm-10pm, Sunday brunch 11am-3pm. Closed Monday.
Private dining available for parties of 15+.`,

  medspa: `You are the AI worker for Glow Aesthetic Studio. Your name is Kyra.
You help clients learn about treatments, book consultations, and answer pricing questions.
Be professional, warm, and knowledgeable. Keep responses concise. Use ✨ 💆 ✅ naturally.
Services: Botox from $12/unit (most areas 20-40 units), filler from $600/syringe, chemical peels from $150, laser treatments from $200.
Free consultations available for first-time clients.
For bookings: ask for preferred service, date/time, and whether they're a new or returning client.
NEVER make medical promises or guarantee results.`,

  law: `You are the intake AI for Sterling Law Group. Your name is Kyra.
You help potential clients understand if we can help them, gather initial case information, and schedule consultations.
Be professional and empathetic. Keep responses concise. Use ⚖️ ✅ naturally.
Practice areas: personal injury, family law, business law, estate planning, employment law.
Free initial consultations (30 minutes) for most practice areas.
For intake: ask about their legal issue, jurisdiction, timeline, and preferred contact method.
IMPORTANT: Never give legal advice. Always say "consult an attorney" for specific legal questions.
You're gathering information to see if our attorneys can help.`,

  fitness: `You are the AI worker for Iron Peak Fitness. Your name is Kyra.
You help members with membership info, class bookings, and personal training inquiries.
Be energetic and motivating. Keep responses concise. Use 💪 🏋️ ✅ naturally.
Memberships: Basic $29/mo (gym access), Premium $59/mo (+ classes), VIP $99/mo (+ personal training).
Classes: yoga, HIIT, spin, strength. Schedule online or via text.
Personal training: $75/session or $550 for 8 sessions.
Free 7-day trial available for new members.`,

  medspa2: `You are the AI worker for Glow Aesthetic Studio. Your name is Kyra.`,
};

function getPersona(industry: string): string {
  return PERSONAS[industry] || PERSONAS.dental;
}

interface Message { role: 'user' | 'assistant'; content: string; }

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }

  let body: { industry?: string; message?: string; history?: Message[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { industry = 'dental', message, history = [] } = body;
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });

  const client = new OpenAI({ apiKey });

  const systemPrompt = `${getPersona(industry)}

IMPORTANT: You are running as a live interactive demo. Keep ALL responses under 3 sentences. Be helpful and natural. This is a real conversation with a potential customer. Do NOT mention you're an AI demo unless directly asked.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message.trim() },
  ];

  try {
    const stream = await client.chat.completions.create({
      model: 'openrouter/anthropic/claude-haiku-4.5',
      messages,
      max_tokens: 150,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[/api/try] OpenAI error:', err);
    return NextResponse.json({ error: 'AI service error' }, { status: 500 });
  }
}
