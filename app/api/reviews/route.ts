/**
 * Review Generation API
 * 
 * GET  /api/reviews?clientId=xxx          — Get review stats
 * POST /api/reviews                        — Trigger review request for a contact
 * POST /api/reviews { action: "respond" }  — Process customer's review response
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createReviewRequest,
  updateReviewRequest,
  getReviewStats,
  buildReviewRequestMessage,
  buildPositiveReviewMessage,
  buildNegativeResponseMessage,
  buildOwnerAlert,
  parseReviewResponse,
  type ReviewConfig,
  type ReviewRequest,
} from '@/lib/reviews/review-engine';

export const dynamic = 'force-dynamic';

// GET — Review stats
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await sb
    .from('agency_members')
    .select('agency_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const clientId = req.nextUrl.searchParams.get('clientId');
  const stats = await getReviewStats(membership.agency_id, clientId ?? undefined);

  return NextResponse.json({ stats });
}

// POST — Trigger review request or process response
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  
  const body = await req.json();
  const { action } = body;

  // ── Trigger new review request ──────────────────────────────────────
  if (action === 'send' || !action) {
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientId, contactId, contactName, contactPhone, contactEmail, service } = body;

    if (!contactId || !contactName) {
      return NextResponse.json({ error: 'contactId and contactName required' }, { status: 400 });
    }

    const { data: membership } = await sb
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) return NextResponse.json({ error: 'No agency' }, { status: 404 });

    // Get agency settings for review config
    const { data: agency } = await sb
      .from('agencies')
      .select('name, settings')
      .eq('id', membership.agency_id)
      .single();

    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    const reviewSettings = (settings.reviews ?? {}) as Record<string, unknown>;

    const config: ReviewConfig = {
      enabled: true,
      googleReviewUrl: reviewSettings.google_url as string | undefined,
      yelpUrl: reviewSettings.yelp_url as string | undefined,
      facebookUrl: reviewSettings.facebook_url as string | undefined,
      customUrl: reviewSettings.custom_url as string | undefined,
      delayMinutes: (reviewSettings.delay_minutes as number) ?? 60,
      followUpHours: (reviewSettings.follow_up_hours as number) ?? 24,
      ownerPhone: reviewSettings.owner_phone as string | undefined,
      ownerEmail: reviewSettings.owner_email as string | undefined,
      businessName: agency?.name ?? 'our business',
    };

    const entityId = clientId ?? membership.agency_id;

    // Create the request
    const requestId = await createReviewRequest({
      agencyId: membership.agency_id,
      clientId: entityId,
      contactId,
      contactName,
      contactPhone,
      contactEmail,
      service,
      status: 'sent',
      sentAt: new Date().toISOString(),
    });

    if (!requestId) {
      return NextResponse.json({ error: 'Failed to create review request' }, { status: 500 });
    }

    // Generate the message
    const message = buildReviewRequestMessage(config, contactName, service);

    return NextResponse.json({
      requestId,
      message,
      config: {
        businessName: config.businessName,
        hasGoogleUrl: !!config.googleReviewUrl,
        hasYelpUrl: !!config.yelpUrl,
      },
    });
  }

  // ── Process customer response ───────────────────────────────────────
  if (action === 'respond') {
    const { requestId, customerMessage, agencyId } = body;

    if (!requestId || !customerMessage) {
      return NextResponse.json({ error: 'requestId and customerMessage required' }, { status: 400 });
    }

    // Parse the response
    const { rating, sentiment } = parseReviewResponse(customerMessage);

    // Get agency settings
    const { data: agency } = await sb
      .from('agencies')
      .select('name, settings')
      .eq('id', agencyId)
      .maybeSingle();

    const settings = (agency?.settings ?? {}) as Record<string, unknown>;
    const reviewSettings = (settings.reviews ?? {}) as Record<string, unknown>;

    const config: ReviewConfig = {
      enabled: true,
      googleReviewUrl: reviewSettings.google_url as string | undefined,
      yelpUrl: reviewSettings.yelp_url as string | undefined,
      facebookUrl: reviewSettings.facebook_url as string | undefined,
      customUrl: reviewSettings.custom_url as string | undefined,
      delayMinutes: 60,
      followUpHours: 24,
      ownerPhone: reviewSettings.owner_phone as string | undefined,
      businessName: agency?.name ?? 'our business',
    };

    let replyMessage: string;
    let newStatus: string;

    if (sentiment === 'positive') {
      replyMessage = buildPositiveReviewMessage(config, body.contactName ?? 'there');
      newStatus = 'positive';
    } else if (sentiment === 'negative') {
      replyMessage = buildNegativeResponseMessage(config, body.contactName ?? 'there');
      newStatus = 'escalated';

      // Build owner alert
      const ownerAlert = buildOwnerAlert(
        body.contactName ?? 'Unknown',
        body.contactPhone,
        customerMessage,
        body.service,
      );

      // Return owner alert alongside reply
      return NextResponse.json({
        replyMessage,
        ownerAlert,
        rating,
        sentiment,
        status: newStatus,
      });
    } else {
      // Neutral — still ask for review but gently
      replyMessage = `Thanks for the feedback! We're always looking to improve. If you have a moment, a quick review would help us a lot. 🙏`;
      newStatus = 'positive'; // Treat neutral as soft positive
    }

    // Update the request
    await updateReviewRequest(requestId, {
      status: newStatus as ReviewRequest['status'],
      rating,
      feedback: customerMessage,
      respondedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      replyMessage,
      rating,
      sentiment,
      status: newStatus,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
