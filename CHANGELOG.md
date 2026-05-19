# Changelog

## [0.3.1] - 2026-05-19

### Fixed

- **Widget no longer goes dark after a transient billing lookup.** The
  platform-owner credit-bypass and the paid-BYOK credit skip no longer get
  poisoned by a momentary database hiccup, so the chat widget keeps
  answering instead of returning the "please call us" canned message.
- **Platform-owner agencies stay un-billed even under load.** The
  admin-agency check now caches only confirmed results, retries safely
  instead of stampeding the auth service on a cold start, and a
  downgraded paid+BYOK agency can no longer keep skipping the credit gate.

### Removed

- **Deleted the disabled duplicate Stripe webhook route**
  (`/api/stripe/webhooks`) and its orphaned handler library. It granted no
  monthly credits; the strategy doc that pointed operators at it has been
  corrected to the live route (`/api/webhooks/stripe`).

### Added

- Regression test suite for the credit gate (admin cache-poisoning,
  BYOK fail-safe) and a DB migration adding a unique index that prevents
  duplicate Stripe credit-grant audit rows.

## [0.3.0] - 2026-02-09

### Added — Phase 2B: OpenClaw Gateway Integration

- **OpenClaw-powered chat route** (`app/api/chat/openclaw/route.ts`)  
  New route that sends user messages through OpenClaw Gateway instead of direct Claude API.  
  Each user gets an isolated session (`kyra-user-{userId}`) with full context injection.

- **Feature flag system** (`lib/config/features.ts`)  
  Toggle between direct Claude and OpenClaw routing via `KYRA_USE_OPENCLAW` env var.  
  Enable expanded skill ecosystem via `KYRA_OPENCLAW_SKILLS`.

- **Session manager** (`lib/openclaw/sessions.ts`)  
  Per-user session lifecycle management with 30-min timeout, context injection on first  
  message, health checking with 30s cache, and graceful session destruction on errors.

- **Enhanced OpenClaw system prompt** (`lib/openclaw/prompts.ts`)  
  When running through OpenClaw with skills enabled, the AI knows about: web search,  
  URL fetching, weather, file operations, sub-agent spawning, email, and browser control.

- **Automatic fallback to direct Claude** when OpenClaw Gateway is unavailable.  
  Zero downtime — if the gateway is down, requests seamlessly fall back to the existing  
  direct Claude API path.

- **Main route delegation** — `app/api/chat/route.ts` checks the feature flag and  
  delegates to the OpenClaw handler when enabled. Existing direct path untouched.

### Changed

- Updated `.env.example` with `KYRA_USE_OPENCLAW` and `KYRA_OPENCLAW_SKILLS` variables
- `lib/openclaw/client.ts` — default values for URL/API key to prevent crashes on missing env
