// ============================================================================
// Worker Capability Registry — Phase 2: Modular Worker System
//
// Maps each worker role to its allowed/denied capabilities, risk level,
// and behavioral constraints. This is the foundation for tool scoping
// and runtime enforcement.
// ============================================================================

import { ROLE_WORKERS, type RoleWorker } from './role-workers';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkerCapabilities {
  /** What this worker CAN do (capability strings) */
  allowed: string[];
  /** What this worker explicitly CANNOT do */
  denied: string[];
  /** Max tokens per response (cost control) */
  maxResponseTokens: number;
  /** Whether this worker can initiate outbound messages */
  canInitiateOutbound: boolean;
  /** Whether this worker can access billing/pricing info */
  canAccessPricing: boolean;
  /** Risk level (affects human review requirements) */
  riskLevel: 'low' | 'medium' | 'high';
}

export type CapabilityProfile =
  | 'customer-facing-sales'
  | 'customer-facing-support'
  | 'customer-facing-booking'
  | 'marketing'
  | 'operations'
  | 'internal-hr'
  | 'internal-finance'
  | 'internal-analytics'
  | 'internal-creative'
  | 'internal-data'
  | 'internal-it';

// ── Capability Profiles ───────────────────────────────────────────────────────

const CAPABILITY_PROFILES: Record<CapabilityProfile, WorkerCapabilities> = {
  // Customer-facing sales: can qualify, book, create deals
  'customer-facing-sales': {
    allowed: [
      'respond_to_messages',
      'qualify_leads',
      'book_appointments',
      'create_deals',
      'tag_contacts',
      'escalate_to_human',
      'search_contacts',
      'web_search',
    ],
    denied: [
      'modify_settings',
      'access_admin',
      'send_bulk_messages',
      'modify_billing',
      'access_other_customer_data',
      'delete_contacts',
      'modify_pipelines',
    ],
    maxResponseTokens: 1024,
    canInitiateOutbound: true,
    canAccessPricing: false,
    riskLevel: 'medium',
  },

  // Customer-facing support: can respond, tag, escalate
  'customer-facing-support': {
    allowed: [
      'respond_to_messages',
      'tag_contacts',
      'escalate_to_human',
      'web_search',
    ],
    denied: [
      'modify_settings',
      'access_admin',
      'send_bulk_messages',
      'modify_billing',
      'create_deals',
      'access_other_customer_data',
      'delete_contacts',
      'modify_pipelines',
    ],
    maxResponseTokens: 800,
    canInitiateOutbound: false,
    canAccessPricing: false,
    riskLevel: 'low',
  },

  // Customer-facing booking: can book, respond, tag
  'customer-facing-booking': {
    allowed: [
      'respond_to_messages',
      'book_appointments',
      'tag_contacts',
      'escalate_to_human',
      'web_search',
    ],
    denied: [
      'modify_settings',
      'access_admin',
      'send_bulk_messages',
      'modify_billing',
      'create_deals',
      'access_other_customer_data',
      'delete_contacts',
      'modify_pipelines',
    ],
    maxResponseTokens: 800,
    canInitiateOutbound: false,
    canAccessPricing: false,
    riskLevel: 'low',
  },

  // Marketing: can generate content, research, draft posts
  'marketing': {
    allowed: [
      'generate_content',
      'research_keywords',
      'draft_posts',
      'web_search',
      'create_reports',
      'tag_contacts',
    ],
    denied: [
      'respond_to_live_customers',
      'modify_billing',
      'send_customer_messages',
      'access_admin',
      'delete_contacts',
      'modify_pipelines',
      'book_appointments',
    ],
    maxResponseTokens: 2048,
    canInitiateOutbound: false,
    canAccessPricing: false,
    riskLevel: 'low',
  },

  // Operations: can monitor, report, alert
  'operations': {
    allowed: [
      'monitor_systems',
      'generate_reports',
      'send_alerts',
      'web_search',
      'tag_contacts',
      'create_reports',
    ],
    denied: [
      'respond_to_customers_directly',
      'modify_billing',
      'access_admin',
      'send_customer_messages',
      'delete_contacts',
      'modify_pipelines',
    ],
    maxResponseTokens: 2048,
    canInitiateOutbound: false,
    canAccessPricing: false,
    riskLevel: 'low',
  },

  // Internal HR: can manage internal workflows
  'internal-hr': {
    allowed: [
      'manage_internal_workflows',
      'book_appointments',
      'tag_contacts',
      'send_messages',
      'create_reports',
      'escalate_to_human',
    ],
    denied: [
      'access_customer_data',
      'respond_to_customers_directly',
      'modify_billing',
      'access_admin',
      'create_deals',
      'delete_contacts',
    ],
    maxResponseTokens: 1024,
    canInitiateOutbound: true,
    canAccessPricing: false,
    riskLevel: 'low',
  },

  // Internal finance: can track invoices, expenses
  'internal-finance': {
    allowed: [
      'track_invoices',
      'track_expenses',
      'send_messages',
      'create_reports',
      'tag_contacts',
      'escalate_to_human',
    ],
    denied: [
      'access_customer_data',
      'respond_to_customers_directly',
      'access_admin',
      'create_deals',
      'delete_contacts',
      'book_appointments',
    ],
    maxResponseTokens: 1024,
    canInitiateOutbound: true,
    canAccessPricing: true,
    riskLevel: 'medium',
  },

  // Internal analytics: can analyze data, create reports
  'internal-analytics': {
    allowed: [
      'analyze_data',
      'create_reports',
      'web_search',
      'tag_contacts',
    ],
    denied: [
      'respond_to_customers_directly',
      'modify_billing',
      'access_admin',
      'send_customer_messages',
      'delete_contacts',
      'modify_pipelines',
      'book_appointments',
    ],
    maxResponseTokens: 2048,
    canInitiateOutbound: false,
    canAccessPricing: false,
    riskLevel: 'low',
  },

  // Internal creative: can write content, scripts
  'internal-creative': {
    allowed: [
      'generate_content',
      'create_reports',
      'web_search',
    ],
    denied: [
      'respond_to_customers_directly',
      'modify_billing',
      'access_admin',
      'send_customer_messages',
      'delete_contacts',
      'modify_pipelines',
      'book_appointments',
      'tag_contacts',
      'create_deals',
    ],
    maxResponseTokens: 4096,
    canInitiateOutbound: false,
    canAccessPricing: false,
    riskLevel: 'low',
  },

  // Internal data: can query, clean, visualize
  'internal-data': {
    allowed: [
      'analyze_data',
      'create_reports',
      'web_search',
    ],
    denied: [
      'respond_to_customers_directly',
      'modify_billing',
      'access_admin',
      'send_customer_messages',
      'delete_contacts',
      'modify_pipelines',
      'book_appointments',
      'tag_contacts',
      'create_deals',
    ],
    maxResponseTokens: 2048,
    canInitiateOutbound: false,
    canAccessPricing: false,
    riskLevel: 'low',
  },

  // IT operations: full internal access, cross-tool workflows
  'internal-it': {
    allowed: [
      'manage_internal_workflows',
      'monitor_systems',
      'generate_reports',
      'web_search',
      'send_messages',
      'escalate_to_human',
      'tag_contacts',
    ],
    denied: [
      'respond_to_customers_directly',
      'modify_billing',
      'delete_contacts',
      'create_deals',
    ],
    maxResponseTokens: 2048,
    canInitiateOutbound: true,
    canAccessPricing: false,
    riskLevel: 'medium',
  },
};

// ── Worker → Profile Mapping ──────────────────────────────────────────────────
// Maps each worker ID to its capability profile based on the worker's role.

const WORKER_PROFILE_MAP: Record<string, CapabilityProfile> = {
  // Customer-facing sales
  'sales-qualifier': 'customer-facing-sales',
  'sdr-outbound': 'customer-facing-sales',
  'real-estate-qualifier': 'customer-facing-sales',
  'pipeline-tracker': 'customer-facing-sales', // internal but sales-focused

  // Customer-facing support
  'community-manager': 'customer-facing-support',
  'whatsapp-support': 'customer-facing-support',
  'ecommerce-support': 'customer-facing-support',
  'nps-recovery': 'customer-facing-support',
  'abandoned-cart': 'customer-facing-support',
  'review-responder': 'customer-facing-support',
  'feature-request-manager': 'customer-facing-support',
  'client-success-manager': 'customer-facing-support',
  'language-tutor': 'customer-facing-support',
  'student-tutor': 'customer-facing-support',
  'voicemail-transcriber': 'customer-facing-support',

  // Customer-facing booking
  'appointment-setter': 'customer-facing-booking',
  'intake-specialist': 'customer-facing-booking',
  'phone-receptionist': 'customer-facing-booking',
  'wellness-receptionist': 'customer-facing-booking',
  'restaurant-host': 'customer-facing-booking',
  'legal-intake': 'customer-facing-booking',
  'meeting-scheduler': 'customer-facing-booking',
  'saas-onboarding-flow': 'customer-facing-booking',
  'interview-screener': 'customer-facing-booking',

  // Marketing
  'social-media-manager': 'marketing',
  'brand-monitor': 'marketing',
  'email-sequence': 'marketing',
  'content-repurposer': 'marketing',
  'seo-writer': 'marketing',
  'newsletter-curator': 'marketing',
  'reddit-prospector': 'marketing',
  'influencer-outreach': 'marketing',
  'competitor-intelligence': 'marketing',
  'competitor-pricing': 'marketing',
  'pricing-optimizer': 'marketing',
  'product-lister': 'marketing',
  'ai-marketing-worker': 'marketing',

  // Operations
  'social-scout': 'operations',
  'brand-voice': 'operations',
  'churn-sentinel': 'operations',
  'inventory-manager': 'operations',
  'personal-crm': 'operations',
  'listing-scout': 'operations',
  'market-analyzer-realestate': 'operations',

  // HR
  'hr-recruiter': 'internal-hr',
  'hr-onboarding': 'internal-hr',
  'performance-reviewer': 'internal-hr',

  // Finance
  'invoice-manager': 'internal-finance',
  'expense-tracker': 'internal-finance',
  'financial-forecaster': 'internal-finance',
  'tax-preparer': 'internal-finance',
  'accounts-payable': 'internal-finance',
  'fraud-detector-basic': 'internal-finance',

  // Analytics
  'researcher': 'internal-analytics',
  'weekly-reporter': 'internal-analytics',
  'revenue-analyst': 'internal-analytics',
  'data-analyst': 'internal-analytics',
  'ab-test-analyst': 'internal-analytics',
  'client-reporter': 'internal-analytics',
  'usage-analytics-agent': 'internal-analytics',

  // Creative
  'objection-handler': 'internal-creative',
  'copywriter': 'internal-creative',
  'video-scripter': 'internal-creative',
  'podcast-producer': 'internal-creative',
  'proposal-writer': 'internal-creative',
  'release-notes-writer': 'internal-creative',
  'ai-policy-writer': 'internal-creative',

  // Data
  'sql-assistant': 'internal-data',
  'report-generator': 'internal-data',
  'dashboard-builder': 'internal-data',
  'data-cleaner': 'internal-data',

  // IT
  'it-operations-specialist': 'internal-it',

  // Compliance / Security
  'gdpr-auditor': 'operations',
  'security-phishing-detector': 'operations',
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the capability profile name for a worker ID.
 * Falls back to 'internal-analytics' for unknown workers (safe default).
 */
export function getCapabilityProfileName(workerId: string): CapabilityProfile {
  return WORKER_PROFILE_MAP[workerId] ?? 'internal-analytics';
}

/**
 * Get full capability details for a worker by ID.
 */
export function getWorkerCapabilities(workerId: string): WorkerCapabilities {
  const profileName = getCapabilityProfileName(workerId);
  return { ...CAPABILITY_PROFILES[profileName] };
}

/**
 * Get the capability profile definition by name.
 */
export function getCapabilityProfile(profile: CapabilityProfile): WorkerCapabilities {
  return { ...CAPABILITY_PROFILES[profile] };
}

/**
 * Check if a worker has a specific capability.
 */
export function workerCan(workerId: string, capability: string): boolean {
  const caps = getWorkerCapabilities(workerId);
  if (caps.denied.includes(capability)) return false;
  return caps.allowed.includes(capability);
}

/**
 * Generate SOUL.md restriction lines for a worker's denied capabilities.
 * Used to inject behavioral constraints into the worker's system prompt.
 */
export function generateCapabilityRestrictions(workerId: string): string {
  const caps = getWorkerCapabilities(workerId);
  const profileName = getCapabilityProfileName(workerId);

  const lines: string[] = [
    `## Capability Restrictions (Profile: ${profileName})`,
    '',
  ];

  // Human-readable denied capability descriptions
  const DENIAL_DESCRIPTIONS: Record<string, string> = {
    'modify_settings': 'You CANNOT modify system settings or configurations',
    'access_admin': 'You CANNOT access admin panels or administrative functions',
    'send_bulk_messages': 'You CANNOT send bulk or mass messages',
    'modify_billing': 'You CANNOT access or modify billing information',
    'access_other_customer_data': 'You CANNOT access other customers\' data — only the current conversation',
    'delete_contacts': 'You CANNOT delete contacts or customer records',
    'modify_pipelines': 'You CANNOT modify sales pipelines or pipeline stages',
    'respond_to_live_customers': 'You CANNOT respond directly to live customer conversations',
    'respond_to_customers_directly': 'You CANNOT respond directly to customer conversations',
    'send_customer_messages': 'You CANNOT send messages to customers',
    'access_customer_data': 'You CANNOT access customer data — you handle internal workflows only',
    'book_appointments': 'You CANNOT book appointments',
    'create_deals': 'You CANNOT create deals or opportunities',
    'tag_contacts': 'You CANNOT tag contacts',
  };

  for (const denied of caps.denied) {
    const desc = DENIAL_DESCRIPTIONS[denied];
    if (desc) {
      lines.push(`- ${desc}`);
    }
  }

  if (!caps.canInitiateOutbound) {
    lines.push('- You CANNOT initiate outbound messages — only respond to incoming ones');
  }

  if (!caps.canAccessPricing) {
    lines.push('- You CANNOT access or discuss internal pricing or billing information');
  }

  lines.push(`- Maximum response length: ${caps.maxResponseTokens} tokens`);
  lines.push(`- Risk level: ${caps.riskLevel} — ${caps.riskLevel === 'high' ? 'all actions require human review' : caps.riskLevel === 'medium' ? 'sensitive actions may require human review' : 'standard operation'}`);

  return lines.join('\n');
}

/**
 * Get all available capability profiles.
 */
export function getAllProfiles(): Record<CapabilityProfile, WorkerCapabilities> {
  // Return deep copies
  const result: Record<string, WorkerCapabilities> = {};
  for (const [key, value] of Object.entries(CAPABILITY_PROFILES)) {
    result[key] = { ...value, allowed: [...value.allowed], denied: [...value.denied] };
  }
  return result as Record<CapabilityProfile, WorkerCapabilities>;
}

/**
 * Get the profile mapping for all workers.
 */
export function getWorkerProfileMap(): Record<string, CapabilityProfile> {
  return { ...WORKER_PROFILE_MAP };
}
