/**
 * Home Services Package — Pre-built bundles for service businesses
 * 
 * Each package combines:
 * - Industry template (personality)
 * - Autopilot schedule (proactive actions)
 * - Agent configuration (which departments to enable)
 * - Recommended channels
 * - Setup checklist
 * 
 * One-click activation: picks template + configures autopilot + enables agents.
 */

export interface ServicePackage {
  id: string;
  name: string;
  emoji: string;
  industry: string;
  tagline: string;
  description: string;
  templateId: string;           // Maps to industry-templates.ts
  enabledAgents: string[];      // Maps to agent-manager.ts role IDs
  autopilotPreset: string;      // Which autopilot variant
  recommendedChannels: string[];
  features: string[];           // Bullet points for the card
  setupSteps: Array<{
    step: number;
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
    estimated: string;
  }>;
}

export const HOME_SERVICE_PACKAGES: ServicePackage[] = [
  {
    id: 'plumbing-pro',
    name: 'Plumbing Pro',
    emoji: '🔧',
    industry: 'Plumbing',
    tagline: 'Never miss an emergency call again',
    templateId: 'plumbing',
    description: 'Complete AI receptionist for plumbing businesses. Handles emergencies 24/7, books routine service calls, and follows up on estimates.',
    enabledAgents: ['front-desk', 'sales', 'collections'],
    autopilotPreset: 'home-services',
    recommendedChannels: ['sms', 'web-chat', 'google-business'],
    features: [
      '24/7 emergency dispatch',
      'Automatic estimate follow-ups',
      'Post-service review requests',
      'Invoice payment reminders',
      'Seasonal maintenance reminders',
    ],
    setupSteps: [
      { step: 1, title: 'Customize Your AI', description: 'Fill in your business details, services, and pricing', actionLabel: 'Open Template', actionHref: '/agency/templates', estimated: '5 min' },
      { step: 2, title: 'Connect SMS', description: 'Connect your GHL phone number for SMS conversations', actionLabel: 'Set Up Channel', actionHref: '/agency/channels', estimated: '2 min' },
      { step: 3, title: 'Enable Autopilot', description: 'Turn on automated follow-ups and review requests', actionLabel: 'Configure', actionHref: '/agency/autopilot', estimated: '1 min' },
      { step: 4, title: 'Add Web Chat', description: 'Install the chat widget on your website', actionLabel: 'Get Embed Code', actionHref: '/agency', estimated: '3 min' },
    ],
  },
  {
    id: 'hvac-pro',
    name: 'HVAC Pro',
    emoji: '❄️',
    industry: 'HVAC',
    tagline: 'Capture every seasonal lead automatically',
    templateId: 'hvac',
    description: 'AI dispatcher that handles emergency calls, books seasonal tune-ups, and nurtures maintenance plan signups year-round.',
    enabledAgents: ['front-desk', 'sales', 'support'],
    autopilotPreset: 'home-services',
    recommendedChannels: ['sms', 'web-chat', 'google-business'],
    features: [
      '24/7 emergency dispatch with safety tips',
      'Seasonal tune-up campaigns (spring AC, fall heating)',
      'Maintenance plan upsell automation',
      'Post-service review requests',
      'Energy efficiency tips for customer nurture',
    ],
    setupSteps: [
      { step: 1, title: 'Customize Your AI', description: 'Add your services, pricing, and emergency protocols', actionLabel: 'Open Template', actionHref: '/agency/templates', estimated: '5 min' },
      { step: 2, title: 'Connect SMS', description: 'Link your business phone for instant AI responses', actionLabel: 'Set Up Channel', actionHref: '/agency/channels', estimated: '2 min' },
      { step: 3, title: 'Enable Autopilot', description: 'Automated seasonal campaigns and follow-ups', actionLabel: 'Configure', actionHref: '/agency/autopilot', estimated: '1 min' },
      { step: 4, title: 'Add Web Chat', description: 'Capture leads from your website 24/7', actionLabel: 'Get Embed Code', actionHref: '/agency', estimated: '3 min' },
    ],
  },
  {
    id: 'electrical-pro',
    name: 'Electrical Pro',
    emoji: '⚡',
    industry: 'Electrical',
    tagline: 'Professional responses for every service call',
    templateId: 'plumbing', // Uses plumbing template as base (same structure)
    description: 'AI receptionist for electricians. Handles service requests, provides safety guidance, and books inspections.',
    enabledAgents: ['front-desk', 'sales'],
    autopilotPreset: 'home-services',
    recommendedChannels: ['sms', 'web-chat'],
    features: [
      'Emergency electrical dispatch',
      'Safety-first messaging (turn off breaker instructions)',
      'Inspection scheduling',
      'Estimate follow-ups',
      'Referral program nurture',
    ],
    setupSteps: [
      { step: 1, title: 'Customize Your AI', description: 'Set up your services, rates, and safety protocols', actionLabel: 'Open Template', actionHref: '/agency/templates', estimated: '5 min' },
      { step: 2, title: 'Connect SMS', description: 'Enable instant AI responses to customer texts', actionLabel: 'Set Up Channel', actionHref: '/agency/channels', estimated: '2 min' },
      { step: 3, title: 'Enable Autopilot', description: 'Automated follow-ups and review requests', actionLabel: 'Configure', actionHref: '/agency/autopilot', estimated: '1 min' },
      { step: 4, title: 'Add Web Chat', description: 'Capture service requests from your website', actionLabel: 'Get Embed Code', actionHref: '/agency', estimated: '3 min' },
    ],
  },
  {
    id: 'cleaning-pro',
    name: 'Cleaning Pro',
    emoji: '🧹',
    industry: 'Cleaning',
    tagline: 'Book more recurring cleanings on autopilot',
    templateId: 'plumbing', // Base template
    description: 'AI booking assistant for cleaning companies. Handles quotes, books recurring services, and upsells deep cleans.',
    enabledAgents: ['front-desk', 'sales', 'review'],
    autopilotPreset: 'home-services',
    recommendedChannels: ['sms', 'web-chat', 'whatsapp'],
    features: [
      'Instant quote calculator (sq ft + rooms)',
      'Recurring booking management',
      'Deep clean upsell automation',
      'Post-clean review requests',
      'Referral discount campaigns',
    ],
    setupSteps: [
      { step: 1, title: 'Customize Your AI', description: 'Add your services, pricing tiers, and service areas', actionLabel: 'Open Template', actionHref: '/agency/templates', estimated: '5 min' },
      { step: 2, title: 'Connect SMS', description: 'Start receiving and responding to booking requests', actionLabel: 'Set Up Channel', actionHref: '/agency/channels', estimated: '2 min' },
      { step: 3, title: 'Enable Autopilot', description: 'Auto-send review requests and rebooking reminders', actionLabel: 'Configure', actionHref: '/agency/autopilot', estimated: '1 min' },
      { step: 4, title: 'Add Web Chat', description: 'Let visitors book cleanings from your website', actionLabel: 'Get Embed Code', actionHref: '/agency', estimated: '3 min' },
    ],
  },
  {
    id: 'landscaping-pro',
    name: 'Landscaping Pro',
    emoji: '🌿',
    industry: 'Landscaping',
    tagline: 'Grow your client base while you work outside',
    templateId: 'plumbing', // Base template
    description: 'AI assistant for landscaping and lawn care. Books estimates, manages seasonal schedules, and nurtures recurring clients.',
    enabledAgents: ['front-desk', 'sales'],
    autopilotPreset: 'home-services',
    recommendedChannels: ['sms', 'web-chat'],
    features: [
      'Free estimate scheduling',
      'Seasonal service campaigns (spring cleanup, fall prep)',
      'Weather-aware scheduling suggestions',
      'Photo request for accurate quotes',
      'Recurring service management',
    ],
    setupSteps: [
      { step: 1, title: 'Customize Your AI', description: 'Add your services, seasonal offerings, and service area', actionLabel: 'Open Template', actionHref: '/agency/templates', estimated: '5 min' },
      { step: 2, title: 'Connect SMS', description: 'Respond to estimate requests instantly', actionLabel: 'Set Up Channel', actionHref: '/agency/channels', estimated: '2 min' },
      { step: 3, title: 'Enable Autopilot', description: 'Seasonal campaigns and rebooking reminders', actionLabel: 'Configure', actionHref: '/agency/autopilot', estimated: '1 min' },
      { step: 4, title: 'Add Web Chat', description: 'Capture leads from your website', actionLabel: 'Get Embed Code', actionHref: '/agency', estimated: '3 min' },
    ],
  },
  {
    id: 'roofing-pro',
    name: 'Roofing Pro',
    emoji: '🏠',
    industry: 'Roofing',
    tagline: 'Convert storm leads before they call someone else',
    templateId: 'plumbing',
    description: 'AI sales assistant for roofers. Handles storm damage inquiries, books inspections, and follows up on estimates.',
    enabledAgents: ['front-desk', 'sales', 'collections'],
    autopilotPreset: 'home-services',
    recommendedChannels: ['sms', 'web-chat', 'google-business'],
    features: [
      'Storm damage lead capture',
      'Free inspection scheduling',
      'Insurance claim guidance',
      'Estimate follow-up automation',
      'Financing option presentation',
    ],
    setupSteps: [
      { step: 1, title: 'Customize Your AI', description: 'Set up services, financing options, and inspection process', actionLabel: 'Open Template', actionHref: '/agency/templates', estimated: '5 min' },
      { step: 2, title: 'Connect SMS', description: 'Respond to leads faster than any competitor', actionLabel: 'Set Up Channel', actionHref: '/agency/channels', estimated: '2 min' },
      { step: 3, title: 'Enable Autopilot', description: 'Estimate follow-ups and payment reminders', actionLabel: 'Configure', actionHref: '/agency/autopilot', estimated: '1 min' },
      { step: 4, title: 'Add Web Chat', description: 'Capture storm damage leads from your site', actionLabel: 'Get Embed Code', actionHref: '/agency', estimated: '3 min' },
    ],
  },
];

/**
 * Get a package by ID.
 */
export function getPackage(id: string): ServicePackage | undefined {
  return HOME_SERVICE_PACKAGES.find(p => p.id === id);
}
