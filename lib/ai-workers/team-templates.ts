// ── Team Template Definitions ────────────────────────────────────────────────
// Pre-built team combos for common agency use cases.
// Shown as "Quick Start Teams" in the AI Workers tab when Team Mode is enabled.

export interface TeamMember {
  worker_id: string;
  role: 'specialist' | 'background';
  triggers: string[];
}

export interface WorkerTeamConfig {
  enabled: boolean;
  primary_worker_id: string;
  members: TeamMember[];
  handoff_style: 'seamless' | 'announced';
}

export interface TeamTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  primary: string; // worker_id
  members: TeamMember[];
  handoff_style: 'seamless' | 'announced';
  industries: string[]; // suggested industries
}

export const TEAM_TEMPLATES: TeamTemplate[] = [
  {
    id: 'full-service-front-desk',
    name: 'Full-Service Front Desk',
    emoji: '🏢',
    description: 'Complete front desk: receptionist handles calls, routes to booking specialist and sales qualifier.',
    primary: 'phone-receptionist',
    members: [
      { worker_id: 'appointment-setter', role: 'specialist', triggers: ['book', 'schedule', 'appointment', 'calendar', 'available'] },
      { worker_id: 'sales-qualifier', role: 'specialist', triggers: ['pricing', 'cost', 'how much', 'interested', 'services', 'quote'] },
    ],
    handoff_style: 'seamless',
    industries: ['dental', 'medical', 'legal', 'consulting'],
  },
  {
    id: 'sales-machine',
    name: 'Sales Machine',
    emoji: '💰',
    description: 'Aggressive lead conversion: qualifier finds buyers, setter books them, tracker monitors pipeline.',
    primary: 'sales-qualifier',
    members: [
      { worker_id: 'appointment-setter', role: 'specialist', triggers: ['book', 'schedule', 'meet', 'call', 'demo'] },
      { worker_id: 'pipeline-tracker', role: 'background', triggers: [] },
    ],
    handoff_style: 'seamless',
    industries: ['saas', 'consulting', 'agency', 'b2b'],
  },
  {
    id: 'real-estate-team',
    name: 'Real Estate Team',
    emoji: '🏠',
    description: 'Real estate powerhouse: qualifier screens buyers/sellers, setter books viewings, scout finds listings.',
    primary: 'real-estate-qualifier',
    members: [
      { worker_id: 'appointment-setter', role: 'specialist', triggers: ['book', 'tour', 'viewing', 'showing', 'schedule'] },
      { worker_id: 'listing-scout', role: 'background', triggers: [] },
    ],
    handoff_style: 'seamless',
    industries: ['real-estate'],
  },
  {
    id: 'ecommerce-support-team',
    name: 'E-Commerce Support',
    emoji: '🛒',
    description: 'Full customer support: handles orders, recovers carts, manages reviews.',
    primary: 'ecommerce-support',
    members: [
      { worker_id: 'abandoned-cart', role: 'specialist', triggers: ['cart', 'checkout', 'forgot', 'purchase', 'buy'] },
      { worker_id: 'review-responder', role: 'specialist', triggers: ['review', 'feedback', 'complaint', 'rating'] },
    ],
    handoff_style: 'seamless',
    industries: ['ecommerce', 'retail'],
  },
  {
    id: 'agency-ops',
    name: 'Agency Operations',
    emoji: '🏗️',
    description: 'Internal agency ops: content creation, competitor monitoring, client reporting.',
    primary: 'ai-marketing-worker',
    members: [
      { worker_id: 'competitor-intelligence', role: 'specialist', triggers: ['competitor', 'market', 'pricing', 'landscape'] },
      { worker_id: 'client-reporter', role: 'background', triggers: [] },
    ],
    handoff_style: 'seamless',
    industries: ['agency', 'marketing'],
  },
];
