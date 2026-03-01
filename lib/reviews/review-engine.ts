/**
 * Review Generation Engine
 * 
 * After service completion, automatically:
 * 1. Sends customer a "How was your experience?" text
 * 2. If positive → sends Google/Yelp review link
 * 3. If negative → escalates to owner BEFORE they post publicly
 * 4. Tracks review stats per business
 * 
 * This replaces $200-500/month reputation management tools (Podium, Birdeye).
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface ReviewConfig {
  enabled: boolean;
  googleReviewUrl?: string;       // Direct Google review link
  yelpUrl?: string;               // Yelp business page
  facebookUrl?: string;           // Facebook reviews page
  customUrl?: string;             // Any other review platform
  delayMinutes: number;           // Wait time after service (default: 60)
  followUpHours: number;          // Second reminder if no response (default: 24)
  ownerPhone?: string;            // Where to send negative feedback alerts
  ownerEmail?: string;
  businessName: string;
  autoRespondToGoogle?: boolean;  // Auto-respond to Google reviews
}

export interface ReviewRequest {
  id?: string;
  agencyId: string;
  clientId: string;
  contactId: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  service?: string;
  status: 'pending' | 'sent' | 'positive' | 'negative' | 'review_clicked' | 'no_response' | 'escalated';
  sentAt?: string;
  respondedAt?: string;
  rating?: number;
  feedback?: string;
  reviewPlatform?: string;
  createdAt?: string;
}

/**
 * Generate the initial review request message.
 */
export function buildReviewRequestMessage(config: ReviewConfig, contactName: string, service?: string): string {
  const firstName = contactName.split(' ')[0] || 'there';
  const serviceText = service ? ` for your ${service}` : '';
  
  return [
    `Hi ${firstName}! 👋`,
    '',
    `Thanks for choosing ${config.businessName}${serviceText}! We'd love to hear how it went.`,
    '',
    `On a scale of 1-5, how would you rate your experience?`,
    '',
    `Reply with a number (1-5) or just tell us what you thought!`,
  ].join('\n');
}

/**
 * Generate the positive review redirect message.
 */
export function buildPositiveReviewMessage(config: ReviewConfig, contactName: string): string {
  const firstName = contactName.split(' ')[0] || 'there';
  const links: string[] = [];
  
  if (config.googleReviewUrl) links.push(`⭐ Google: ${config.googleReviewUrl}`);
  if (config.yelpUrl) links.push(`📝 Yelp: ${config.yelpUrl}`);
  if (config.facebookUrl) links.push(`👍 Facebook: ${config.facebookUrl}`);
  if (config.customUrl) links.push(`🔗 Review: ${config.customUrl}`);
  
  // Default to just asking if no links configured
  if (links.length === 0) {
    return [
      `That's wonderful to hear, ${firstName}! Thank you so much! 🎉`,
      '',
      `If you have a moment, we'd really appreciate a review online — it helps other customers find us.`,
      '',
      `Thank you for your support! 🙏`,
    ].join('\n');
  }

  return [
    `That's wonderful to hear, ${firstName}! Thank you so much! 🎉`,
    '',
    `Would you mind sharing that experience online? It really helps us:`,
    '',
    ...links,
    '',
    `Even a quick sentence makes a huge difference. Thank you! 🙏`,
  ].join('\n');
}

/**
 * Generate the negative feedback response (empathy + escalation).
 */
export function buildNegativeResponseMessage(config: ReviewConfig, contactName: string): string {
  const firstName = contactName.split(' ')[0] || 'there';
  
  return [
    `${firstName}, I'm really sorry to hear that. Your experience matters to us, and we want to make this right.`,
    '',
    `I've flagged this for our team, and someone will reach out to you personally within the hour.`,
    '',
    `Is there anything specific you'd like us to address? We're listening.`,
  ].join('\n');
}

/**
 * Generate the owner escalation alert for negative feedback.
 */
export function buildOwnerAlert(contactName: string, contactPhone: string | undefined, feedback: string, service?: string): string {
  return [
    `⚠️ NEGATIVE FEEDBACK ALERT`,
    '',
    `Customer: ${contactName}${contactPhone ? ` (${contactPhone})` : ''}`,
    service ? `Service: ${service}` : '',
    `Feedback: "${feedback}"`,
    '',
    `Action needed: Reach out within 1 hour to resolve before they post publicly.`,
    `This is your chance to turn it around — most unhappy customers become loyal if addressed quickly.`,
  ].filter(Boolean).join('\n');
}

/**
 * Parse customer response to determine sentiment.
 * Returns rating 1-5 or sentiment analysis.
 */
export function parseReviewResponse(message: string): { rating: number; sentiment: 'positive' | 'negative' | 'neutral' } {
  const trimmed = message.trim();
  
  // Direct number rating
  const numMatch = trimmed.match(/^([1-5])$/);
  if (numMatch) {
    const rating = parseInt(numMatch[1]);
    return {
      rating,
      sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
    };
  }

  // Star emoji counting
  const starCount = (trimmed.match(/⭐/g) || []).length;
  if (starCount >= 1 && starCount <= 5) {
    return {
      rating: starCount,
      sentiment: starCount >= 4 ? 'positive' : starCount <= 2 ? 'negative' : 'neutral',
    };
  }

  // Keyword-based sentiment
  const lower = trimmed.toLowerCase();
  const positiveWords = ['great', 'amazing', 'awesome', 'perfect', 'excellent', 'love', 'wonderful', 'fantastic', 'best', 'happy', 'thank', 'good', 'pleased', 'satisfied', 'recommend', '10/10', '5/5'];
  const negativeWords = ['terrible', 'horrible', 'awful', 'worst', 'bad', 'poor', 'disappointed', 'angry', 'frustrated', 'unacceptable', 'rude', 'late', 'never again', 'waste', '1/5', '0/10'];

  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;

  if (posCount > negCount) return { rating: posCount >= 3 ? 5 : 4, sentiment: 'positive' };
  if (negCount > posCount) return { rating: negCount >= 3 ? 1 : 2, sentiment: 'negative' };
  return { rating: 3, sentiment: 'neutral' };
}

/**
 * Create a review request in the database.
 */
export async function createReviewRequest(request: ReviewRequest): Promise<string | null> {
  const supabase = createServiceClientWithoutCookies();
  
  const { data, error } = await supabase
    .from('review_requests')
    .insert({
      agency_id: request.agencyId,
      client_id: request.clientId,
      contact_id: request.contactId,
      contact_name: request.contactName,
      contact_phone: request.contactPhone ?? null,
      contact_email: request.contactEmail ?? null,
      service: request.service ?? null,
      status: request.status,
      sent_at: request.sentAt ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[reviews] Failed to create review request:', error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Update a review request status.
 */
export async function updateReviewRequest(
  id: string,
  update: Partial<Pick<ReviewRequest, 'status' | 'rating' | 'feedback' | 'respondedAt' | 'reviewPlatform'>>,
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  
  await supabase
    .from('review_requests')
    .update({
      ...(update.status && { status: update.status }),
      ...(update.rating !== undefined && { rating: update.rating }),
      ...(update.feedback && { feedback: update.feedback }),
      ...(update.respondedAt && { responded_at: update.respondedAt }),
      ...(update.reviewPlatform && { review_platform: update.reviewPlatform }),
    })
    .eq('id', id);
}

/**
 * Get review stats for a business.
 */
export async function getReviewStats(agencyId: string, clientId?: string): Promise<{
  totalSent: number;
  totalResponded: number;
  positiveCount: number;
  negativeCount: number;
  avgRating: number;
  reviewClickCount: number;
  responseRate: number;
}> {
  const supabase = createServiceClientWithoutCookies();
  const entityId = clientId ?? agencyId;

  const { data } = await supabase
    .from('review_requests')
    .select('status, rating')
    .eq('client_id', entityId);

  const requests = data ?? [];
  const totalSent = requests.length;
  const responded = requests.filter(r => ['positive', 'negative', 'review_clicked', 'escalated'].includes(r.status));
  const positiveCount = requests.filter(r => r.status === 'positive' || r.status === 'review_clicked').length;
  const negativeCount = requests.filter(r => r.status === 'negative' || r.status === 'escalated').length;
  const reviewClickCount = requests.filter(r => r.status === 'review_clicked').length;
  
  const ratings = requests.filter(r => r.rating != null).map(r => r.rating as number);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;

  return {
    totalSent,
    totalResponded: responded.length,
    positiveCount,
    negativeCount,
    avgRating: Math.round(avgRating * 10) / 10,
    reviewClickCount,
    responseRate: totalSent > 0 ? Math.round((responded.length / totalSent) * 100) : 0,
  };
}
