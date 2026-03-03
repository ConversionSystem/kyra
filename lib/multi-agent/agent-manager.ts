/**
 * Multi-Agent Manager — Department AI Workers
 * 
 * Businesses get specialized AI workers per department:
 * - Front Desk AI — answers calls, books appointments
 * - Sales AI — follows up with leads, sends quotes
 * - Support AI — handles complaints, processes returns
 * - Collections AI — payment reminders, invoice follow-ups
 * - Review AI — post-service follow-ups, review generation
 * 
 * Each agent has its own personality, knowledge, and tools.
 * Managed from one unified dashboard.
 */

export interface AgentRole {
  id: string;
  name: string;
  emoji: string;
  description: string;
  defaultPersonality: string;
  suggestedTools: string[];
  triggerKeywords: string[];    // When to route to this agent
  priority: number;             // Higher = checked first for routing
}

export const AGENT_ROLES: AgentRole[] = [
  {
    id: 'front-desk',
    name: 'Front Desk',
    emoji: '📞',
    description: 'Answers calls and messages, books appointments, handles walk-in questions.',
    defaultPersonality: 'You are a friendly, professional front desk receptionist. Greet everyone warmly, answer common questions, and book appointments efficiently.',
    suggestedTools: ['book_appointment', 'tag_contact'],
    triggerKeywords: ['appointment', 'book', 'schedule', 'available', 'hours', 'location', 'directions', 'open', 'walk-in', 'when', 'address', 'cancel', 'reschedule'],
    priority: 50,
  },
  {
    id: 'sales',
    name: 'Sales',
    emoji: '💰',
    description: 'Follows up with leads, handles pricing questions, closes deals.',
    defaultPersonality: 'You are a helpful, consultative sales professional. Understand the customer\'s needs, present solutions, handle objections, and guide them to a decision without being pushy.',
    suggestedTools: ['create_opportunity', 'tag_contact', 'send_payment_link'],
    triggerKeywords: ['price', 'cost', 'quote', 'estimate', 'package', 'plan', 'discount', 'deal', 'buy', 'purchase', 'interested', 'charge', 'how much', 'pricing', 'rate', 'rates', 'afford'],
    priority: 60,
  },
  {
    id: 'support',
    name: 'Customer Support',
    emoji: '🛠️',
    description: 'Handles questions, resolves issues, processes complaints.',
    defaultPersonality: 'You are a patient, empathetic customer support specialist. Listen carefully, acknowledge frustrations, solve problems efficiently, and always follow up.',
    suggestedTools: ['tag_contact', 'escalate_to_human'],
    triggerKeywords: ['problem', 'issue', 'broken', 'not working', 'complaint', 'refund', 'return', 'help', 'wrong', 'mistake', 'disappointed', 'unhappy', 'terrible', 'horrible', 'fix', 'resolve', 'frustrated', 'angry', 'damage'],
    priority: 70,
  },
  {
    id: 'collections',
    name: 'Collections',
    emoji: '💳',
    description: 'Sends payment reminders, follows up on invoices, handles billing questions.',
    defaultPersonality: 'You are a professional but friendly billing specialist. Send payment reminders politely, answer billing questions clearly, and offer payment plans when appropriate.',
    suggestedTools: ['send_payment_link', 'tag_contact'],
    triggerKeywords: ['invoice', 'payment', 'bill', 'owe', 'balance', 'receipt', 'pay', 'overdue'],
    priority: 65,
  },
  {
    id: 'review',
    name: 'Review Manager',
    emoji: '⭐',
    description: 'Post-service follow-ups, review generation, reputation management.',
    defaultPersonality: 'You are a warm, appreciative customer success specialist. Thank customers for their business, ask about their experience, and guide happy customers to leave reviews.',
    suggestedTools: ['tag_contact'],
    triggerKeywords: ['review', 'feedback', 'experience', 'rate', 'rating', 'google', 'yelp'],
    priority: 40,
  },
  {
    id: 'content',
    name: 'Content Creator',
    emoji: '✍️',
    description: 'Repurposes conversations into social posts, emails, blog content, and FAQs.',
    defaultPersonality: 'You are a creative content strategist. Take customer conversations, reviews, FAQs, and business insights and turn them into engaging social media posts, email newsletters, blog outlines, and FAQ pages. Always match the brand voice.',
    suggestedTools: [],
    triggerKeywords: ['content', 'blog', 'post', 'social media', 'newsletter', 'email blast', 'write', 'article', 'caption', 'linkedin', 'facebook', 'instagram', 'repurpose', 'faq'],
    priority: 30,
  },
];

/**
 * Route a message to the most appropriate agent based on content.
 */
export function routeToAgent(message: string): AgentRole {
  const lower = message.toLowerCase();
  
  // Score each agent
  const scores = AGENT_ROLES.map(agent => {
    const keywordHits = agent.triggerKeywords.filter(kw => lower.includes(kw)).length;
    return {
      agent,
      score: keywordHits * 10 + (keywordHits > 0 ? agent.priority : 0),
    };
  });

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Return highest scoring agent, default to front desk
  return scores[0].score > 0 ? scores[0].agent : AGENT_ROLES[0];
}

/**
 * Build a combined system prompt that includes the agent's role.
 */
export function buildAgentPrompt(
  basePrompt: string,
  agent: AgentRole,
  businessName: string,
): string {
  return [
    basePrompt,
    '',
    `=== YOUR ROLE: ${agent.name} ===`,
    agent.defaultPersonality,
    `You are the ${agent.name} specialist for ${businessName}.`,
    `Focus on: ${agent.description}`,
    '=== END ROLE ===',
  ].join('\n');
}

export interface AgentConfig {
  agencyId: string;
  agents: Array<{
    roleId: string;
    enabled: boolean;
    customPersonality?: string;
    customTools?: string[];
  }>;
}

/**
 * Get default agent configuration (all agents enabled with defaults).
 */
export function getDefaultAgentConfig(): Array<{ roleId: string; enabled: boolean }> {
  return AGENT_ROLES.map(r => ({
    roleId: r.id,
    enabled: r.id === 'front-desk', // Only front desk enabled by default
  }));
}
