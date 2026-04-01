// ============================================================================
// Worker Tool Scoping — Phase 2: Modular Worker System
//
// Maps GHL tools to worker roles. Instead of every worker getting every tool,
// each worker only gets the tools relevant to their capability profile.
// ============================================================================

import { ROLE_WORKERS } from './role-workers';
import { getCapabilityProfileName, type CapabilityProfile } from './capabilities';

// ── GHL Tool Categories ───────────────────────────────────────────────────────

/** All known GHL tools that can be scoped to workers */
export const GHL_TOOLS = {
  // Booking tools
  get_available_slots: 'booking',
  book_appointment: 'booking',

  // Contact tools
  tag_contact: 'contact',
  add_contact_note: 'contact',
  search_contacts: 'contact',

  // Pipeline tools
  create_opportunity: 'pipeline',

  // Communication tools
  send_message: 'communication',
  escalate_to_human: 'communication',

  // Search/Research tools
  web_search: 'research',
  web_fetch: 'research',
} as const;

export type GHLToolName = keyof typeof GHL_TOOLS;
export type ToolCategory = 'booking' | 'contact' | 'pipeline' | 'communication' | 'research';

// ── Profile → Tool Category Mapping ───────────────────────────────────────────

/** Which tool categories each capability profile has access to */
const PROFILE_TOOL_ACCESS: Record<CapabilityProfile, ToolCategory[]> = {
  'customer-facing-sales': ['booking', 'contact', 'pipeline', 'communication', 'research'],
  'customer-facing-support': ['contact', 'communication', 'research'],
  'customer-facing-booking': ['booking', 'contact', 'communication', 'research'],
  'marketing': ['contact', 'research'],
  'operations': ['contact', 'communication', 'research'],
  'internal-hr': ['booking', 'contact', 'communication'],
  'internal-finance': ['contact', 'communication'],
  'internal-analytics': ['contact', 'research'],
  'internal-creative': ['research'],
  'internal-data': ['research'],
  'internal-it': ['contact', 'communication', 'research'],
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the scoped GHL tools for a worker by ID.
 *
 * Returns only the tool names this worker type should have access to,
 * intersected with the tools suggested by the role persona in the deploy route.
 *
 * @param workerId - The role ID from role-workers.ts
 * @returns Array of GHL tool names this worker can use
 */
export function getScopedToolsForWorker(workerId: string): string[] {
  const profile = getCapabilityProfileName(workerId);
  const allowedCategories = PROFILE_TOOL_ACCESS[profile] ?? ['research'];

  // Get all tools from allowed categories
  const allowedTools = new Set<string>();
  for (const [tool, category] of Object.entries(GHL_TOOLS)) {
    if (allowedCategories.includes(category as ToolCategory)) {
      allowedTools.add(tool);
    }
  }

  // Also check the role's suggestedTools from the deploy route persona
  // This ensures we don't give a worker tools that weren't in their persona
  const role = ROLE_WORKERS.find(r => r.id === workerId);
  if (!role) {
    return Array.from(allowedTools);
  }

  // The role-workers.ts has high-level tool names like "Books Appointments"
  // Map those to GHL tool names for reference
  const roleToolMapping: Record<string, string[]> = {
    'Books Appointments': ['book_appointment', 'get_available_slots'],
    'Tags Contacts': ['tag_contact'],
    'Creates Deals': ['create_opportunity'],
    'Escalates to Human': ['escalate_to_human'],
    'Sends Messages': ['send_message'],
    'Web Search': ['web_search'],
    'Web Intelligence': ['web_search', 'web_fetch'],
    'Reviews Content': [],
    'Creates Reports': [],
    'Reads Analytics': [],
    'Sends Reports': ['send_message'],
    'Sends Alerts': ['send_message'],
  };

  // Build the set of GHL tools this role claims in role-workers.ts
  const roleClaimedTools = new Set<string>();
  for (const toolLabel of role.tools) {
    const mapped = roleToolMapping[toolLabel];
    if (mapped) {
      for (const t of mapped) roleClaimedTools.add(t);
    }
  }

  // Intersection: only tools that are both profile-allowed AND role-claimed
  // Exception: escalate_to_human is always available (safety mechanism)
  const scoped: string[] = [];
  for (const tool of allowedTools) {
    if (tool === 'escalate_to_human' || roleClaimedTools.has(tool)) {
      scoped.push(tool);
    }
  }

  return scoped;
}

/**
 * Get tool categories allowed for a given capability profile.
 */
export function getToolCategoriesForProfile(profile: CapabilityProfile): ToolCategory[] {
  return [...(PROFILE_TOOL_ACCESS[profile] ?? [])];
}

/**
 * Check if a specific tool is allowed for a worker.
 */
export function isToolAllowedForWorker(workerId: string, toolName: string): boolean {
  const scopedTools = getScopedToolsForWorker(workerId);
  return scopedTools.includes(toolName);
}

/**
 * Get a human-readable summary of what tools a worker has access to.
 * Useful for debugging and the dashboard.
 */
export function getToolScopeSummary(workerId: string): {
  profile: CapabilityProfile;
  categories: ToolCategory[];
  tools: string[];
  deniedTools: string[];
} {
  const profile = getCapabilityProfileName(workerId);
  const categories = getToolCategoriesForProfile(profile);
  const tools = getScopedToolsForWorker(workerId);

  const allTools = Object.keys(GHL_TOOLS);
  const deniedTools = allTools.filter(t => !tools.includes(t));

  return { profile, categories, tools, deniedTools };
}
