// ============================================================================
// Smart Lead Capture — Extract contact info from web chat conversations
//
// After a few exchanges, the AI naturally captures visitor information.
// Extracted leads are auto-saved to CRM + web_chat_leads table.
//
// Flow:
// 1. Visitor chats via widget → conversation builds
// 2. After engagement detected (2+ exchanges), AI asks for info naturally
// 3. After AI gets name/email/phone, extraction runs on the full conversation
// 4. Lead saved to CRM contact + web_chat_leads
// 5. Agency gets notified via webhook (optional)
// ============================================================================

import { createClient as createSupabase } from '@supabase/supabase-js';

export interface ExtractedLead {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null; // What they're interested in
  urgency: 'hot' | 'warm' | 'cold';
  source: string; // URL they chatted from (if known)
  conversationSummary: string;
}

export interface WebChatLead {
  id: string;
  agency_id: string;
  client_id: string;
  session_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  urgency: string;
  source_url: string | null;
  conversation_summary: string | null;
  conversation_history: Array<{ role: string; content: string }>;
  crm_contact_id: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: string;
}

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ── Extraction Patterns ────────────────────────────────────────────────────

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b|\+\d{1,3}[-.\s]?\d{4,14}/;
const NAME_PATTERNS = [
  /(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/m, // Standalone name on a line
];

/**
 * Extract contact information from conversation messages.
 * Returns extracted lead data or null if insufficient info found.
 */
export function extractLeadFromConversation(
  messages: Array<{ role: string; content: string }>,
): ExtractedLead | null {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  const allUserText = userMessages.join('\n');

  // Extract email
  const emailMatch = allUserText.match(EMAIL_REGEX);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;

  // Extract phone
  const phoneMatch = allUserText.match(PHONE_REGEX);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : null;

  // Extract name
  let firstName: string | null = null;
  let lastName: string | null = null;

  for (const pattern of NAME_PATTERNS) {
    for (const msg of userMessages) {
      const match = msg.match(pattern);
      if (match) {
        const parts = match[1].trim().split(/\s+/);
        firstName = parts[0] || null;
        lastName = parts.slice(1).join(' ') || null;
        break;
      }
    }
    if (firstName) break;
  }

  // Need at least one piece of contact info to create a lead
  if (!email && !phone && !firstName) return null;

  // Determine interest from conversation
  const interest = extractInterest(messages);

  // Determine urgency
  const urgency = determineUrgency(userMessages);

  // Summarize conversation
  const conversationSummary = summarizeConversation(messages);

  return {
    firstName,
    lastName,
    email,
    phone,
    interest,
    urgency,
    source: 'web_chat',
    conversationSummary,
  };
}

/**
 * Detect what the visitor is interested in based on their messages.
 */
function extractInterest(messages: Array<{ role: string; content: string }>): string | null {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  const text = userMessages.join(' ');

  const interestPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\b(price|pricing|cost|how much|rate|fee|afford|budget|quote)\b/i, label: 'Pricing inquiry' },
    { pattern: /\b(appointment|book|schedule|meeting|consult|visit|call)\b/i, label: 'Wants to schedule' },
    { pattern: /\b(service|help|need|looking for|interested in|want to)\b/i, label: 'Service inquiry' },
    { pattern: /\b(problem|issue|broken|fix|repair|help with|struggle)\b/i, label: 'Needs help/support' },
    { pattern: /\b(buy|purchase|order|get|subscribe|sign up|start)\b/i, label: 'Ready to buy' },
    { pattern: /\b(compare|alternative|vs|versus|better|difference)\b/i, label: 'Comparing options' },
    { pattern: /\b(demo|trial|try|test|sample|example)\b/i, label: 'Wants demo/trial' },
    { pattern: /\b(hours|location|open|close|address|directions|where)\b/i, label: 'Business info' },
  ];

  const found: string[] = [];
  for (const { pattern, label } of interestPatterns) {
    if (pattern.test(text)) found.push(label);
  }

  return found.length > 0 ? found.slice(0, 2).join(', ') : null;
}

/**
 * Determine lead urgency based on message signals.
 */
function determineUrgency(userMessages: string[]): 'hot' | 'warm' | 'cold' {
  const text = userMessages.join(' ').toLowerCase();

  // Hot signals
  const hotSignals = /\b(urgent|asap|today|tomorrow|right away|immediately|need now|this week|ready to|let's go|sign me up|book now)\b/i;
  if (hotSignals.test(text)) return 'hot';

  // Warm signals (specific intent)
  const warmSignals = /\b(interested|schedule|appointment|quote|pricing|how much|when can|available|book|demo)\b/i;
  if (warmSignals.test(text)) return 'warm';

  // Cold (just browsing)
  return 'cold';
}

/**
 * Create a brief summary of the conversation.
 */
function summarizeConversation(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  if (userMessages.length === 0) return 'No messages';

  // First user message is usually the primary intent
  const firstMsg = userMessages[0].slice(0, 150);
  const msgCount = userMessages.length;

  return `${msgCount} message${msgCount > 1 ? 's' : ''}. Started with: "${firstMsg}"`;
}

/**
 * Save an extracted lead to the database + CRM.
 * Returns the lead ID or null on failure.
 */
export async function saveWebChatLead(
  agencyId: string,
  clientId: string,
  sessionId: string,
  lead: ExtractedLead,
  history: Array<{ role: string; content: string }>,
  sourceUrl?: string,
): Promise<{ leadId: string; crmContactId: string | null } | null> {
  const supabase = getSupabase();

  // 1. Check for duplicate (same session or same email within 24h)
  if (lead.email) {
    const { data: existing } = await supabase
      .from('web_chat_leads')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('email', lead.email)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing?.length) {
      return { leadId: existing[0].id, crmContactId: null };
    }
  }

  // Same session check
  const { data: sessionDupe } = await supabase
    .from('web_chat_leads')
    .select('id, crm_contact_id')
    .eq('session_id', sessionId)
    .limit(1);

  if (sessionDupe?.length) {
    // Update existing lead with new info
    const updates: Record<string, unknown> = {};
    if (lead.email) updates.email = lead.email;
    if (lead.phone) updates.phone = lead.phone;
    if (lead.firstName) updates.first_name = lead.firstName;
    if (lead.lastName) updates.last_name = lead.lastName;
    if (lead.interest) updates.interest = lead.interest;
    updates.urgency = lead.urgency;
    updates.conversation_history = history;
    updates.conversation_summary = lead.conversationSummary;

    await supabase
      .from('web_chat_leads')
      .update(updates)
      .eq('id', sessionDupe[0].id);

    return { leadId: sessionDupe[0].id, crmContactId: sessionDupe[0].crm_contact_id };
  }

  // 2. Create CRM contact (if we have email or phone)
  let crmContactId: string | null = null;

  if (lead.email || lead.phone) {
    try {
      // Check for existing CRM contact
      let contactQuery = supabase
        .from('crm_contacts')
        .select('id')
        .eq('agency_id', agencyId);

      if (lead.email) {
        contactQuery = contactQuery.eq('email', lead.email);
      } else if (lead.phone) {
        contactQuery = contactQuery.eq('phone', lead.phone);
      }

      const { data: existingContact } = await contactQuery.limit(1);

      if (existingContact?.length) {
        crmContactId = existingContact[0].id;
      } else {
        // Create new CRM contact
        const { data: newContact } = await supabase
          .from('crm_contacts')
          .insert({
            agency_id: agencyId,
            first_name: lead.firstName || 'Web',
            last_name: lead.lastName || 'Visitor',
            email: lead.email,
            phone: lead.phone,
            source: 'web_chat',
            stage: lead.urgency === 'hot' ? 'opportunity' : 'lead',
            tags: ['web-chat', `urgency-${lead.urgency}`],
            custom_fields: { interest: lead.interest || null, captured_by: 'web_chat' },
          })
          .select('id')
          .single();

        if (newContact) {
          crmContactId = newContact.id;

          // Log activity on the new contact
          await supabase.from('crm_activities').insert({
            agency_id: agencyId,
            contact_id: crmContactId,
            type: 'web_chat',
            subject: 'Web Chat Lead Captured',
            body: lead.conversationSummary,
            direction: 'inbound',
            channel: 'web_chat',
            actor: 'system',
            actor_name: 'AI Chat Widget',
            metadata: {
              urgency: lead.urgency,
              interest: lead.interest,
              source_url: sourceUrl,
            },
          }).then(({ error }) => {
            if (error) console.error('[lead-capture] CRM activity error:', error.message);
          });
        }
      }
    } catch (err) {
      console.error('[lead-capture] CRM contact creation error:', err);
    }
  }

  // 3. Insert web_chat_leads record
  const { data: newLead, error: leadErr } = await supabase
    .from('web_chat_leads')
    .insert({
      agency_id: agencyId,
      client_id: clientId,
      session_id: sessionId,
      first_name: lead.firstName,
      last_name: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      interest: lead.interest,
      urgency: lead.urgency,
      source_url: sourceUrl,
      conversation_summary: lead.conversationSummary,
      conversation_history: history,
      crm_contact_id: crmContactId,
      status: 'new',
    })
    .select('id')
    .single();

  if (leadErr) {
    // Table might not exist yet — degrade gracefully
    if (leadErr.message?.includes('does not exist') || leadErr.code === '42P01') {
      console.warn('[lead-capture] web_chat_leads table not created yet — skipping lead save');
      return crmContactId ? { leadId: 'crm-only', crmContactId } : null;
    }
    console.error('[lead-capture] Save error:', leadErr);
    return crmContactId ? { leadId: 'crm-only', crmContactId } : null;
  }

  return { leadId: newLead?.id || 'unknown', crmContactId };
}

/**
 * Fire a webhook notification for a new web chat lead.
 */
export async function notifyLeadWebhook(
  agencyId: string,
  lead: ExtractedLead,
  leadId: string,
): Promise<void> {
  const supabase = getSupabase();

  // Check if agency has a webhook URL configured
  const { data: agency } = await supabase
    .from('agencies')
    .select('settings')
    .eq('id', agencyId)
    .single();

  const webhookUrl = (agency?.settings as Record<string, unknown>)?.web_lead_webhook_url as string;

  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'web_chat_lead',
        lead_id: leadId,
        name: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Anonymous',
        email: lead.email,
        phone: lead.phone,
        interest: lead.interest,
        urgency: lead.urgency,
        summary: lead.conversationSummary,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error('[lead-capture] Webhook delivery failed:', err);
  }
}

/**
 * Build lead capture instructions for the AI system prompt.
 * This guides the AI to naturally collect contact info.
 */
export function getLeadCapturePrompt(exchangeCount: number): string {
  if (exchangeCount < 2) {
    // Too early — don't ask for info yet
    return '';
  }

  if (exchangeCount < 4) {
    return `
## Lead Capture (Be Natural)
After answering the visitor's question, naturally guide toward getting their contact info.
DO NOT ask for all info at once. Be conversational. Examples:
- "I'd love to help you further! What's the best name for you?"
- "Want me to send you more details? What's your email?"
- "Shall I have someone follow up with you on this?"
Do NOT be pushy. If they don't want to share, that's fine.`;
  }

  return `
## Lead Capture (Active)
The visitor has been engaged for several messages. If you haven't already, try to get:
- Their name (if not given)
- Email or phone (for follow-up)
Be warm and natural: "By the way, if you'd like us to follow up on this, what's the best email to reach you?"
If they've already provided info, don't ask again. Focus on being helpful.`;
}
