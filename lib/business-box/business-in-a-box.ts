/**
 * Business-in-a-Box — Complete AI Business Setup
 * 
 * The "Kit experience in 60 seconds":
 * 1. Pick your industry
 * 2. Enter your business details
 * 3. One click → AI worker is deployed with:
 *    - Personality configured
 *    - All relevant agents enabled
 *    - Autopilot schedule active
 *    - Review generation ready
 *    - Payment collection configured
 *    - Web chat widget ready
 *    - Customer memory active
 * 
 * This is the culmination of priorities #1-9.
 */

export interface BusinessBoxConfig {
  // Step 1: Industry
  industry: string;
  packageId?: string;       // If from home services packages
  templateId?: string;       // If from template store

  // Step 2: Business Details
  businessName: string;
  ownerName: string;
  city: string;
  phone?: string;
  email?: string;
  website?: string;

  // Step 3: Services
  services: string;          // Multiline services + pricing
  businessHours: string;
  specialOffer?: string;

  // Step 4: AI Config
  aiName: string;
  tone: 'professional' | 'friendly' | 'casual' | 'luxury';
  reviewLink?: string;       // Google review link
  bookingUrl?: string;       // Scheduling link
}

export interface BoxDeployResult {
  success: boolean;
  deployed: {
    personality: boolean;
    agents: number;
    autopilot: number;
    reviewEngine: boolean;
    paymentCollection: boolean;
    customerMemory: boolean;
    webChat: boolean;
  };
  embedCode: string;
  nextSteps: string[];
}

export const INDUSTRY_OPTIONS = [
  { id: 'plumbing', label: 'Plumbing', emoji: '🔧', packageId: 'plumbing-pro' },
  { id: 'hvac', label: 'HVAC', emoji: '❄️', packageId: 'hvac-pro' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡', packageId: 'electrical-pro' },
  { id: 'cleaning', label: 'Cleaning', emoji: '🧹', packageId: 'cleaning-pro' },
  { id: 'landscaping', label: 'Landscaping', emoji: '🌿', packageId: 'landscaping-pro' },
  { id: 'roofing', label: 'Roofing', emoji: '🏠', packageId: 'roofing-pro' },
  { id: 'dental', label: 'Dental', emoji: '🦷', templateId: 'dental' },
  { id: 'real-estate', label: 'Real Estate', emoji: '🏡', templateId: 'real-estate' },
  { id: 'medspa', label: 'Med Spa', emoji: '💆', templateId: 'medspa' },
  { id: 'law-firm', label: 'Law Firm', emoji: '⚖️', templateId: 'law-firm' },
  { id: 'auto-repair', label: 'Auto Repair', emoji: '🚗', templateId: 'auto-repair' },
  { id: 'gym', label: 'Gym & Fitness', emoji: '🏋️', templateId: 'gym' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍕', templateId: 'restaurant' },
  { id: 'photography', label: 'Photography', emoji: '📸', templateId: 'photography' },
  { id: 'other', label: 'Other', emoji: '🏢' },
];

export const TONE_OPTIONS = [
  { id: 'professional' as const, label: 'Professional', emoji: '👔', description: 'Formal, trustworthy, corporate' },
  { id: 'friendly' as const, label: 'Friendly', emoji: '😊', description: 'Warm, approachable, helpful' },
  { id: 'casual' as const, label: 'Casual', emoji: '🤙', description: 'Relaxed, conversational, fun' },
  { id: 'luxury' as const, label: 'Luxury', emoji: '✨', description: 'Elegant, premium, sophisticated' },
];

/**
 * Build a generic SOUL.md for industries without a pre-built template.
 */
export function buildGenericSoul(config: BusinessBoxConfig): string {
  const toneMap = {
    professional: 'You are professional, polished, and thorough.',
    friendly: 'You are warm, friendly, and genuinely helpful. Use a conversational tone.',
    casual: 'You are relaxed and casual — like a friend who happens to be an expert.',
    luxury: 'You are elegant, refined, and make every interaction feel premium.',
  };

  return `You are ${config.aiName}, the AI assistant for ${config.businessName}${config.city ? ` in ${config.city}` : ''}.

${toneMap[config.tone]}

## About ${config.businessName}
Owner: ${config.ownerName}
${config.website ? `Website: ${config.website}` : ''}
${config.email ? `Email: ${config.email}` : ''}
${config.phone ? `Phone: ${config.phone}` : ''}

## Services & Pricing
${config.services}

## Business Hours
${config.businessHours}

${config.specialOffer ? `## Current Offer\n${config.specialOffer}` : ''}

## Key Rules
- Always collect: customer name, phone number, and what they need
- Be helpful and knowledgeable about our services
- For pricing questions: provide ranges and say "exact pricing depends on the specific situation"
- Try to book an appointment or schedule a call
- If unsure about something, say "Let me check with ${config.ownerName} and get back to you"
${config.bookingUrl ? `- Booking link: ${config.bookingUrl}` : ''}
${config.reviewLink ? `- After good service, ask for a review: ${config.reviewLink}` : ''}`;
}

/**
 * Calculate the deployment summary string.
 */
export function getDeploySummary(result: BoxDeployResult): string {
  const items = [];
  if (result.deployed.personality) items.push('✅ AI Personality configured');
  if (result.deployed.agents > 0) items.push(`✅ ${result.deployed.agents} AI agents enabled`);
  if (result.deployed.autopilot > 0) items.push(`✅ ${result.deployed.autopilot} autopilot actions scheduled`);
  if (result.deployed.reviewEngine) items.push('✅ Review generation ready');
  if (result.deployed.paymentCollection) items.push('✅ Payment collection ready');
  if (result.deployed.customerMemory) items.push('✅ Customer memory active');
  if (result.deployed.webChat) items.push('✅ Web chat widget ready');
  return items.join('\n');
}
