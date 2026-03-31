import { NextRequest, NextResponse } from "next/server";
import { requireAgencyMember } from "@/lib/agency/middleware";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  await params; // consume params
  const authResult = await requireAgencyMember();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error.message }, { status: authResult.error.status });
  }
  const configured = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
  return NextResponse.json({ configured });
}
