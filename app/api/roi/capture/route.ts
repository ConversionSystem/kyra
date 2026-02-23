// POST /api/roi/capture — capture ROI calculator lead → GHL webhook for nurture sequence

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, industry, monthlyLeads, avgDealValue, currentCloseRate,
          kyraPrice, monthlyGain, roi, daysToROI } = body;

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  // Send to GHL via SIGNUP_WEBHOOK_URL (or a dedicated ROI lead webhook)
  const webhookUrl = process.env.SIGNUP_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'roi_calculator_lead',
          email,
          industry,
          monthlyLeads,
          avgDealValue,
          currentCloseRate,
          kyraPrice,
          estimatedMonthlyGain: monthlyGain,
          roiPercent: roi,
          daysToBreakEven: daysToROI,
          submittedAt: new Date().toISOString(),
          // These let you personalize the GHL follow-up:
          roiSummary: `${industry} business — ${monthlyLeads} leads/mo — estimated +$${monthlyGain.toLocaleString()}/mo with Kyra`,
        }),
      });
    } catch {
      console.warn('[roi/capture] Webhook failed — continuing');
    }
  }

  return NextResponse.json({ ok: true });
}
