// ============================================================================
// Container Routing Helpers — Phase 1
//
// Manages per-client session keys and system context for OpenClaw containers.
// Each agency client gets its own isolated session via a unique sessionKey.
// ============================================================================

import type { AgencyClient, AgencyTemplate } from './types';

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
 *
 * Optionally includes GHL context (message channel, contact name)
 * when called from the webhook handler.
 */
export function getSystemPromptForClient(
  client: AgencyClient,
  template?: AgencyTemplate | null,
  ghlContext?: { messageType?: string; contactName?: string },
): string {
  const lines: string[] = [];
  const cc = (client.container_config || {}) as Record<string, unknown>;

  // ── Core identity: persona from container_config, then template, then generic ──
  if (cc.persona && typeof cc.persona === 'string') {
    lines.push(cc.persona as string);
  } else if (template?.system_prompt_prefix) {
    lines.push(template.system_prompt_prefix);
  } else {
    lines.push(
      `You are an AI assistant for "${client.name}".`,
      `Industry: ${client.industry || 'General'}`,
    );
  }

  // ── Detailed instructions from container_config ──
  if (cc.instructions && typeof cc.instructions === 'string') {
    lines.push('', cc.instructions as string);
  }

  // ── Business hours ──
  if (cc.business_hours && typeof cc.business_hours === 'object') {
    const bh = cc.business_hours as { enabled?: boolean; start?: string; end?: string; timezone?: string };
    if (bh.enabled && bh.start && bh.end) {
      lines.push(``, `Business hours: ${bh.start} – ${bh.end} (${bh.timezone || 'local'})`);
    }
  }

  // ── Booking link ──
  if (cc.calendar_url && typeof cc.calendar_url === 'string') {
    lines.push(`Booking link: ${cc.calendar_url}`);
  }

  // ── Language ──
  if (cc.response_language && typeof cc.response_language === 'string' && cc.response_language !== 'English') {
    lines.push(`Always respond in ${cc.response_language}.`);
  }

  if (ghlContext) {
    if (ghlContext.messageType) {
      lines.push(
        `You are responding to customer messages via ${ghlContext.messageType} through GoHighLevel CRM.`,
      );
    }
    if (ghlContext.contactName) {
      lines.push(`The customer's identifier is: ${ghlContext.contactName}`);
    }
    lines.push(
      'Keep responses helpful, professional, and concise.',
      'When you don\'t know something specific about the business, be honest and offer to connect them with a team member.',
    );
  }

  if (template?.soul_template) {
    lines.push('', '--- Template Instructions ---', template.soul_template);
  }

  return lines.join('\n');
}
