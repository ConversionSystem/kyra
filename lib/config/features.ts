/**
 * Feature flags for Kyra
 * 
 * Toggle between direct Claude API and OpenClaw Gateway routing.
 * Set KYRA_USE_OPENCLAW=true to route chat through OpenClaw.
 */

export const features = {
  /** Route chat through Kyra Worker (multi-tenant Cloudflare sandboxes) — default when configured */
  useWorker: process.env.KYRA_USE_WORKER === 'true',

  /** Route chat through OpenClaw Gateway on Mac mini (legacy tunnel approach) */
  useOpenClaw: process.env.KYRA_USE_OPENCLAW === 'true',

  /** Enable OpenClaw skill ecosystem (web search, file ops, sub-agents, etc.) */
  openclawSkills: process.env.KYRA_OPENCLAW_SKILLS === 'true',
};
