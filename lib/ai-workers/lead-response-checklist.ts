// ============================================================================
// Lead Response Checklist — Structured Process for AI Workers
//
// Inspired by gstack's /review checklist methodology. Instead of letting
// AI workers freestyle responses, we give them a structured checklist that
// ensures every lead interaction captures the right information and moves
// toward conversion.
//
// This is injected into the system prompt of AI workers that handle
// inbound leads (Sales Rep, Receptionist, Customer Service, etc.)
// ============================================================================

export interface ChecklistConfig {
  industry: string;
  businessName: string;
  services: string[];
  bookingUrl?: string;
  phone?: string;
  hasCalendar?: boolean;
}

/**
 * Generate the lead response checklist for a given industry/business.
 * Injected into AI worker system prompts for structured lead handling.
 */
export function generateLeadResponseChecklist(config: ChecklistConfig): string {
  const { industry, businessName, services, bookingUrl, phone, hasCalendar } = config;

  const serviceList = services.length > 0
    ? services.map(s => `  - ${s}`).join('\n')
    : '  - General services';

  const bookingInstruction = bookingUrl
    ? `Offer the booking link: ${bookingUrl}`
    : hasCalendar
      ? 'Offer to check available appointment times'
      : phone
        ? `Suggest calling ${phone} to schedule`
        : 'Ask for their preferred date/time to schedule';

  return `## Lead Response Checklist — ${businessName}

When responding to any inbound lead, follow this checklist in order.
Do NOT skip steps. Each step builds on the previous one.

### Step 1: Acknowledge & Identify (first 2 sentences)
- [ ] Thank them for reaching out to ${businessName}
- [ ] Identify what they need — restate their request in your own words
- [ ] If unclear, ask ONE clarifying question (not three)

### Step 2: Qualify the Lead (next 2-3 sentences)
- [ ] Confirm the service they need is something ${businessName} offers:
${serviceList}
- [ ] Ask about timing — when do they need this done?
- [ ] Ask about location — where is the property/project? (for ${industry} businesses)

### Step 3: Provide Value (before asking for anything)
- [ ] Share ONE specific, helpful detail about the service they asked about
- [ ] Mention relevant experience (years in business, number of projects, certifications)
- [ ] If applicable, give a ballpark timeline or what to expect

### Step 4: Capture Contact Info (only after providing value)
- [ ] If you don't have their name — ask for it naturally
- [ ] If you don't have their phone — ask: "What's the best number to reach you?"
- [ ] If you don't have their email — ask only if needed for sending quotes/estimates

### Step 5: Move to Next Action
- [ ] ${bookingInstruction}
- [ ] Set a clear expectation: "You'll hear back within [X hours/minutes]"
- [ ] End with a specific next step, not a vague "let us know"

### Rules
- NEVER say "How can I help you?" as the opening — they already told you what they need
- NEVER list all services unprompted — focus on what THEY asked about
- NEVER use more than 3 sentences before asking a question — conversations, not monologues
- NEVER end a message without a clear next step or question
- ALWAYS use the customer's name after they give it
- ALWAYS be specific to ${businessName}, not generic
- Respond within the persona and voice of ${businessName}
- Keep responses under 80 words unless the customer asks a detailed question
`;
}

/**
 * Generate a shorter checklist for follow-up messages (not first contact).
 */
export function generateFollowUpChecklist(config: ChecklistConfig): string {
  return `## Follow-Up Checklist — ${config.businessName}

When following up with an existing lead:

1. **Reference the previous conversation** — mention what they asked about
2. **Provide the update they're waiting for** (quote, availability, answer)
3. **Ask if they have questions** — one question, not a list
4. **Propose the next step** — specific action with a timeline
5. **Keep it under 50 words** — follow-ups should be brief

NEVER start with "Just checking in" or "Following up" — start with the actual update.
`;
}
