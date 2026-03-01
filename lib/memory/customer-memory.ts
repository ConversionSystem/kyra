/**
 * Customer Memory — Kyra Knowledge Graph
 * 
 * Builds and maintains a structured knowledge base about each customer.
 * After every conversation, the AI extracts key facts and stores them.
 * On the next conversation, these facts are injected into context.
 * 
 * This is the moat. No chatbot remembers customers. Kyra does.
 * 
 * Structure per customer:
 * {
 *   name: "Sarah Johnson",
 *   phone: "+15551234567",
 *   email: "sarah@example.com",
 *   firstContact: "2026-02-15",
 *   lastContact: "2026-03-01",
 *   totalInteractions: 12,
 *   tags: ["regular", "prefers-mornings", "dental-anxiety"],
 *   facts: [
 *     { fact: "Prefers morning appointments before 10am", source: "conversation", date: "2026-02-15" },
 *     { fact: "Has dental anxiety - be gentle and reassuring", source: "conversation", date: "2026-02-15" },
 *     { fact: "Insurance: Aetna PPO", source: "conversation", date: "2026-02-20" },
 *     { fact: "Daughter's name is Emma (age 7)", source: "conversation", date: "2026-03-01" },
 *   ],
 *   appointments: [
 *     { date: "2026-02-20", service: "Cleaning", status: "completed" },
 *     { date: "2026-03-15", service: "Crown follow-up", status: "scheduled" },
 *   ],
 *   sentiment: "positive",
 *   lifetimeValue: 1050,
 *   notes: "VIP customer - always leave 5-star reviews"
 * }
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

export interface CustomerFact {
  fact: string;
  source: 'conversation' | 'manual' | 'ai-extracted';
  date: string;
}

export interface CustomerAppointment {
  date: string;
  service: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

export interface CustomerMemory {
  contactId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  firstContact: string;
  lastContact: string;
  totalInteractions: number;
  tags: string[];
  facts: CustomerFact[];
  appointments: CustomerAppointment[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  lifetimeValue: number;
  notes: string | null;
}

/**
 * Get or create customer memory for a contact.
 */
export async function getCustomerMemory(
  clientId: string,
  contactId: string,
): Promise<CustomerMemory | null> {
  const supabase = createServiceClientWithoutCookies();

  const { data } = await supabase
    .from('customer_memory')
    .select('*')
    .eq('client_id', clientId)
    .eq('contact_id', contactId)
    .single();

  if (!data) return null;

  return {
    contactId: data.contact_id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    firstContact: data.first_contact,
    lastContact: data.last_contact,
    totalInteractions: data.total_interactions,
    tags: (data.tags as string[]) ?? [],
    facts: (data.facts as CustomerFact[]) ?? [],
    appointments: (data.appointments as CustomerAppointment[]) ?? [],
    sentiment: data.sentiment ?? 'unknown',
    lifetimeValue: data.lifetime_value ?? 0,
    notes: data.notes,
  };
}

/**
 * Update customer memory after a conversation.
 * Merges new facts, updates interaction count, and refreshes last contact.
 */
export async function updateCustomerMemory(
  clientId: string,
  contactId: string,
  update: {
    name?: string;
    phone?: string;
    email?: string;
    newFacts?: CustomerFact[];
    newTags?: string[];
    newAppointment?: CustomerAppointment;
    sentiment?: 'positive' | 'neutral' | 'negative';
    notes?: string;
    revenueAdded?: number;
  },
): Promise<void> {
  const supabase = createServiceClientWithoutCookies();
  const now = new Date().toISOString();

  // Get existing memory
  const existing = await getCustomerMemory(clientId, contactId);

  if (existing) {
    // Merge
    const mergedTags = [...new Set([...existing.tags, ...(update.newTags ?? [])])];
    const mergedFacts = [...existing.facts, ...(update.newFacts ?? [])];
    const mergedAppointments = [...existing.appointments];
    if (update.newAppointment) mergedAppointments.push(update.newAppointment);

    // Cap facts at 50 (keep most recent)
    const cappedFacts = mergedFacts.slice(-50);

    await supabase
      .from('customer_memory')
      .update({
        name: update.name ?? existing.name,
        phone: update.phone ?? existing.phone,
        email: update.email ?? existing.email,
        last_contact: now,
        total_interactions: existing.totalInteractions + 1,
        tags: mergedTags,
        facts: cappedFacts,
        appointments: mergedAppointments,
        sentiment: update.sentiment ?? existing.sentiment,
        lifetime_value: existing.lifetimeValue + (update.revenueAdded ?? 0),
        notes: update.notes ?? existing.notes,
        updated_at: now,
      })
      .eq('client_id', clientId)
      .eq('contact_id', contactId);
  } else {
    // Create new
    await supabase
      .from('customer_memory')
      .insert({
        client_id: clientId,
        contact_id: contactId,
        name: update.name ?? null,
        phone: update.phone ?? null,
        email: update.email ?? null,
        first_contact: now,
        last_contact: now,
        total_interactions: 1,
        tags: update.newTags ?? [],
        facts: update.newFacts ?? [],
        appointments: update.newAppointment ? [update.newAppointment] : [],
        sentiment: update.sentiment ?? 'unknown',
        lifetime_value: update.revenueAdded ?? 0,
        notes: update.notes ?? null,
        updated_at: now,
      });
  }
}

/**
 * Format customer memory into context for the AI prompt.
 * This gets injected into the system prompt so the AI knows the customer.
 */
export function formatMemoryForPrompt(memory: CustomerMemory): string {
  const lines: string[] = [];

  lines.push('=== CUSTOMER CONTEXT (from previous interactions) ===');

  if (memory.name) lines.push(`Name: ${memory.name}`);
  if (memory.phone) lines.push(`Phone: ${memory.phone}`);
  if (memory.email) lines.push(`Email: ${memory.email}`);
  lines.push(`Interactions: ${memory.totalInteractions} conversations`);
  lines.push(`First contact: ${new Date(memory.firstContact).toLocaleDateString()}`);
  lines.push(`Last contact: ${new Date(memory.lastContact).toLocaleDateString()}`);

  if (memory.tags.length > 0) {
    lines.push(`Tags: ${memory.tags.join(', ')}`);
  }

  if (memory.sentiment !== 'unknown') {
    lines.push(`Overall sentiment: ${memory.sentiment}`);
  }

  if (memory.facts.length > 0) {
    lines.push('');
    lines.push('Known facts about this customer:');
    // Show most recent facts first (up to 15)
    const recentFacts = memory.facts.slice(-15);
    for (const f of recentFacts) {
      lines.push(`  • ${f.fact}`);
    }
  }

  if (memory.appointments.length > 0) {
    lines.push('');
    lines.push('Appointment history:');
    // Show last 5 appointments
    const recentAppts = memory.appointments.slice(-5);
    for (const a of recentAppts) {
      lines.push(`  • ${a.date} — ${a.service} (${a.status})`);
    }
  }

  if (memory.notes) {
    lines.push('');
    lines.push(`Note: ${memory.notes}`);
  }

  lines.push('');
  lines.push('Use this context to personalize your responses. Reference their history naturally.');
  lines.push('=== END CUSTOMER CONTEXT ===');

  return lines.join('\n');
}

/**
 * Extract facts from a conversation using AI.
 * Called after each conversation to build the knowledge graph.
 */
export async function extractFactsFromConversation(
  customerMessage: string,
  aiResponse: string,
  existingFacts: CustomerFact[],
): Promise<{
  newFacts: CustomerFact[];
  detectedName?: string;
  detectedPhone?: string;
  detectedEmail?: string;
  detectedSentiment?: 'positive' | 'neutral' | 'negative';
  detectedTags?: string[];
}> {
  // Simple rule-based extraction (fast, no API call needed)
  const result: {
    newFacts: CustomerFact[];
    detectedName?: string;
    detectedPhone?: string;
    detectedEmail?: string;
    detectedSentiment?: 'positive' | 'neutral' | 'negative';
    detectedTags?: string[];
  } = {
    newFacts: [],
    detectedTags: [],
  };

  const now = new Date().toISOString().split('T')[0];
  const combined = `${customerMessage}\n${aiResponse}`.toLowerCase();

  // Detect name patterns
  const namePatterns = [
    /(?:my name is|i'm|this is|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:name(?:'s| is)?)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  for (const pattern of namePatterns) {
    const match = customerMessage.match(pattern);
    if (match) {
      result.detectedName = match[1].trim();
      break;
    }
  }

  // Detect phone (7-11 digits, with optional separators)
  const phoneMatch = customerMessage.match(/\b(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/) ||
    customerMessage.match(/\b(\d{3}[-.]?\d{4})\b/);
  if (phoneMatch) {
    result.detectedPhone = phoneMatch[1];
  }

  // Detect email
  const emailMatch = customerMessage.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) {
    result.detectedEmail = emailMatch[0];
  }

  // Detect sentiment
  const negativeWords = ['angry', 'frustrated', 'terrible', 'worst', 'horrible', 'ridiculous', 'unacceptable', 'furious', 'disgusted'];
  const positiveWords = ['thank', 'great', 'awesome', 'perfect', 'love', 'amazing', 'wonderful', 'excellent', 'appreciate'];
  const negCount = negativeWords.filter(w => combined.includes(w)).length;
  const posCount = positiveWords.filter(w => combined.includes(w)).length;
  if (negCount > posCount && negCount > 0) result.detectedSentiment = 'negative';
  else if (posCount > negCount && posCount > 0) result.detectedSentiment = 'positive';
  else result.detectedSentiment = 'neutral';

  // Extract appointment-related facts
  if (combined.includes('appointment') || combined.includes('book') || combined.includes('schedule')) {
    result.detectedTags?.push('appointment-interest');
  }

  // Extract preference facts
  if (combined.includes('morning') || combined.includes('am')) {
    const existingPref = existingFacts.some(f => f.fact.toLowerCase().includes('morning'));
    if (!existingPref) {
      result.newFacts.push({ fact: 'Prefers morning appointments', source: 'ai-extracted', date: now });
    }
  }
  if (combined.includes('afternoon') || combined.includes('pm')) {
    const existingPref = existingFacts.some(f => f.fact.toLowerCase().includes('afternoon'));
    if (!existingPref) {
      result.newFacts.push({ fact: 'Prefers afternoon appointments', source: 'ai-extracted', date: now });
    }
  }

  // Extract service mentions
  const serviceKeywords = ['cleaning', 'repair', 'consultation', 'checkup', 'emergency', 'maintenance', 'installation', 'replacement'];
  for (const service of serviceKeywords) {
    if (combined.includes(service)) {
      const existing = existingFacts.some(f => f.fact.toLowerCase().includes(service));
      if (!existing) {
        result.newFacts.push({ fact: `Inquired about ${service}`, source: 'ai-extracted', date: now });
        result.detectedTags?.push(service);
      }
    }
  }

  // Extract insurance mentions
  const insuranceMatch = customerMessage.match(/(?:insurance|plan|coverage)(?:\s+is|\s*:)?\s+(\w+(?:\s+\w+)?)/i);
  if (insuranceMatch) {
    const existing = existingFacts.some(f => f.fact.toLowerCase().includes('insurance'));
    if (!existing) {
      result.newFacts.push({ fact: `Insurance: ${insuranceMatch[1]}`, source: 'ai-extracted', date: now });
    }
  }

  // Extract referral source
  const referralPatterns = ['google', 'yelp', 'friend', 'neighbor', 'facebook', 'instagram', 'zillow', 'referral'];
  for (const src of referralPatterns) {
    if (combined.includes(src) && combined.includes('found') || combined.includes('heard')) {
      const existing = existingFacts.some(f => f.fact.toLowerCase().includes('found us'));
      if (!existing) {
        result.newFacts.push({ fact: `Found us via ${src}`, source: 'ai-extracted', date: now });
        result.detectedTags?.push(`source-${src}`);
      }
    }
  }

  // Detect urgency
  if (combined.includes('emergency') || combined.includes('urgent') || combined.includes('asap') || combined.includes('right away')) {
    result.detectedTags?.push('urgent');
  }

  // Pricing interest
  if (combined.includes('price') || combined.includes('cost') || combined.includes('how much') || combined.includes('quote')) {
    result.detectedTags?.push('pricing-interest');
  }

  return result;
}
