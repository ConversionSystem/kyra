import { NextRequest, NextResponse } from "next/server";
import { requireAgencyMember } from '@/lib/agency/middleware';
import OpenAI from "openai";

// SECURITY: Added auth check — this endpoint was previously unauthenticated,
// allowing anyone to exhaust OpenAI API credits without authorization.
export async function POST(req: NextRequest) {
  const auth = await requireAgencyMember();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { type, industry, city, yearsInBusiness, businessName, license, rating, reviewCount } = await req.json();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompts: Record<string, string> = {
    differentiator: `You are writing for a real business website. Create exactly 3 specific, compelling differentiators for:
- Business: "${businessName}"
- Industry: ${industry}
- Location: ${city}
${yearsInBusiness ? `- Years in business: ${yearsInBusiness}` : ""}
${license ? `- License/Certification: ${license}` : ""}
${rating ? `- Google rating: ${rating}/5 (${reviewCount || "many"} reviews)` : ""}

Rules:
- Each 10-20 words, specific to THIS business
- Use their actual years, location, and credentials
- NO generic phrases like "committed to excellence" or "quality service"
- Sound like a real human wrote it, not AI
- Reference their industry specifics

Return ONLY a JSON array: ["differentiator 1", "differentiator 2", "differentiator 3"]`,

    tagline: `Create 3 punchy taglines for:
- Business: "${businessName}"
- Industry: ${industry}
- Location: ${city}
${yearsInBusiness ? `- ${yearsInBusiness} years in business` : ""}

Rules:
- 4-7 words each, memorable and specific
- Avoid clichés: "Quality you can trust", "Excellence in service", "Your local experts"
- Make it industry-relevant and distinctive
- Could use the location, years, or a strong action

Return ONLY a JSON array: ["tagline 1", "tagline 2", "tagline 3"]`,
  };

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompts[type] || prompts.differentiator }],
      temperature: 0.8,
      max_tokens: 250,
    });
    const text = res.choices[0]?.message?.content || "[]";
    const suggestions = JSON.parse(text.match(/\[[\s\S]*?\]/)?.[0] || "[]");
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
