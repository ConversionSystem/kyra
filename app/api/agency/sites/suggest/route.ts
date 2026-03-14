import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const { type, industry, city, yearsInBusiness, businessName } = await req.json();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompts: Record<string, string> = {
    differentiator: `Give exactly 3 short compelling differentiators (10-20 words each) for a ${industry} business called "${businessName}" in ${city}. ${yearsInBusiness ? `They have ${yearsInBusiness} years experience.` : ""} Be specific, not generic. Return ONLY a JSON array: ["d1", "d2", "d3"]`,
    tagline: `Give exactly 3 short taglines (5-8 words each) for a ${industry} business called "${businessName}" in ${city}. Punchy and memorable. Return ONLY a JSON array: ["t1", "t2", "t3"]`,
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
