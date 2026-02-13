// ============================================================================
// Container Routing Helpers — Phase 1
//
// Manages per-client session keys and system context for OpenClaw containers.
// Each agency client gets its own isolated session via a unique sessionKey.
// ============================================================================

import { AgencyClient, AgencyTemplate } from './types';

/**
 * Get the OpenClaw session key for an agency client.
 * Each client gets its own isolated container session.
 */
export function getSessionKeyForClient(clientId: string): string {
  return `agent:client:${clientId}`;
}

/**
 * Get the OpenClaw session key for an individual (non-agency) user.
 */
export function getSessionKeyForUser(userId: string): string {
  return `agent:main:${userId}`;
}

/**
 * Build system context object for an agency client.
 * This gets passed to the OpenClaw bridge so the container knows
 * which client it's serving and can tailor its behavior.
 */
export function getSystemContextForClient(
  client: AgencyClient,
  template?: AgencyTemplate | null
): Record<string, unknown> {
  const context: Record<string, unknown> = {
    clientId: client.id,
    clientName: client.name,
    clientSlug: client.slug,
    industry: client.industry,
    status: client.status,
  };

  if (template) {
    context.templateId = template.id;
    context.templateName = template.name;
    context.templateIndustry = template.industry;
    // The soul_template will be used later when we bootstrap per-client SOUL.md
    if (template.soul_template) {
      context.soulTemplate = template.soul_template;
    }
    if (template.skills?.length) {
      context.skills = template.skills;
    }
  }

  // Container config overrides (custom settings from the agency)
  if (client.container_config && Object.keys(client.container_config).length > 0) {
    context.containerConfig = client.container_config;
  }

  return context;
}

/**
 * Build the system prompt prefix for an agency client.
 * This is injected before the normal system context to give
 * the AI identity and behavioral instructions for this client.
 */
export function getSystemPromptForClient(
  client: AgencyClient,
  template?: AgencyTemplate | null
): string {
  const lines: string[] = [
    `You are an AI assistant for "${client.name}".`,
    `Industry: ${client.industry || 'General'}`,
  ];

  if (template?.soul_template) {
    lines.push('', '--- Template Instructions ---', template.soul_template);
  }

  return lines.join('\n');
}
