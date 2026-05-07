// ============================================================================
// Default chat model for customer-conversation channels
//
// Aligned with the widget chat engine (app/api/widget/chat/route.ts
// WIDGET_MODEL) so the brand experience is consistent across every channel:
// embedded widget, GHL web chat, GHL SMS, FB Messenger, IG DM, WhatsApp,
// email, and the standalone Twilio SMS channel. Sonnet 4.6's KB grounding +
// tool-use is the single biggest quality lever we have for the productized
// concierge — using a different (cheaper, weaker) model in any one channel
// breaks that experience.
//
// Per-client overrides via clients.ai_model still take precedence — agencies
// can dial down to Haiku 4.5 for cost-sensitive traffic if they want.
//
// EXPLICITLY OUT OF SCOPE for this constant:
//   - Voice realtime (Retell, Vapi, Twilio gather): those paths stay on
//     gpt-4o-mini until we benchmark Sonnet 4.6 latency for live voice
//     turn-taking. A voice agent that thinks 4 seconds before responding
//     feels worse than one that's slightly less smart.
//   - Cron tasks (briefing, scheduled-tasks, terminal-credits): internal,
//     not customer-facing. Haiku 4.5 is fine there and 10× cheaper.
// ============================================================================

export const DEFAULT_CHAT_MODEL = 'openrouter/anthropic/claude-sonnet-4.6';
