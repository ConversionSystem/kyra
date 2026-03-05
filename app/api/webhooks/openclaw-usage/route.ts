import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deductCredits } from "@/lib/billing/credit-engine";
import { resolveAgencyApiKey } from "@/lib/billing/byok";

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

  if (!clientId || !count || count < 1) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "missing supabase env" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, supabaseKey);
  const { data: client, error } = await admin
    .from("agency_clients")
    .select("agency_id")
    .eq("id", clientId)
    .single();

  if (error || !client?.agency_id) {
    return NextResponse.json({ error: "client not found" }, { status: 404 });
  }

  // BYOK bypass: if the agency uses their own API key, don't charge platform credits
  const resolved = await resolveAgencyApiKey(client.agency_id).catch(() => null);
  if (resolved?.isByok) {
    return NextResponse.json({ ok: true, deducted: 0, reason: "byok" });
  }

  for (let i = 0; i < count; i++) {
    await deductCredits(client.agency_id, "chat.message", {
      description: `Terminal message (${clientId})`,
    });
  }

  return NextResponse.json({ ok: true, deducted: count });
}
