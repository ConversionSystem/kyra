import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deductCredits } from "@/lib/billing/credit-engine";
import { resolveAgencyApiKey } from "@/lib/billing/byok";
import { getCreditsForModel, DEFAULT_MODEL_ID } from "@/lib/billing/model-credits";

const WEBHOOK_SECRET = "kyra-usage-2026";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const xSecret = req.headers.get("x-kyra-secret") || "";

  if (auth !== `Bearer ${WEBHOOK_SECRET}` && xSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clientId = body.client_id as string | undefined;
  const count = Number(body.count || 0);
  // Optional: model override from the router (for future per-query accuracy)
  const modelOverride = body.model as string | undefined;

  if (!clientId || !count || count < 1) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "missing supabase env" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, supabaseKey);

  // Fetch client + their selected AI model
  const { data: client, error } = await admin
    .from("agency_clients")
    .select("agency_id, ai_model")
    .eq("id", clientId)
    .single();

  if (error || !client?.agency_id) {
    return NextResponse.json({ error: "client not found" }, { status: 404 });
  }

  // BYOK bypass: only skip credits for paid plans using their own API key.
  const resolved = await resolveAgencyApiKey(client.agency_id).catch(() => null);
  if (resolved?.skipCredits) {
    return NextResponse.json({ ok: true, deducted: 0, reason: "byok_paid" });
  }

  // Resolve credit cost: use model override (from router) > client setting > default
  const modelId = modelOverride || client.ai_model || DEFAULT_MODEL_ID;
  const creditsPerTurn = getCreditsForModel(modelId);
  const totalCredits = count * creditsPerTurn;

  for (let i = 0; i < totalCredits; i++) {
    await deductCredits(client.agency_id, "chat.message", {
      description: `AI turn · ${modelId} · ${clientId}`,
    });
  }

  return NextResponse.json({
    ok: true,
    deducted: totalCredits,
    model: modelId,
    credits_per_turn: creditsPerTurn,
    turns: count,
  });
}
