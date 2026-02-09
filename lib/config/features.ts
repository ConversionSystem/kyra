/**
 * Feature flags for Kyra
 * 
 * Toggle between direct Claude API and OpenClaw Gateway routing.
 * Set KYRA_USE_OPENCLAW=true to route chat through OpenClaw.
 */

export const features = {
  /** Route chat through OpenClaw Gateway instead of direct Claude API */
  useOpenClaw: process.env.KYRA_USE_OPENCLAW === 'true',

  /** Enable OpenClaw skill ecosystem (web search, file ops, sub-agents, etc.) */
  openclawSkills: process.env.KYRA_OPENCLAW_SKILLS === 'true',
};
