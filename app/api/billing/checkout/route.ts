import { NextRequest, NextResponse } from 'next/server';

// Billing checkout disabled during beta — all plans are free
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Billing is disabled during the beta. All features are free.' },
    { status: 400 }
  );
}
