# E2E Feature Verification Report

**Date:** 2026-02-13  
**Scope:** Phase 5 + Phase 6 features  

---

## Phase 5

### 1. Skills Toggle
**⚠️ PARTIAL — UI → DB works, but skills don't gate tool access in chat**

- **UI → API:** `app/(dashboard)/settings/skills/page.tsx` → `POST /api/skills` → upserts `user_skills` table ✅
- **API → DB:** `app/api/skills/route.ts` correctly reads/writes `user_skills` with plan checks ✅
- **DB → Chat:** `app/api/chat/route.ts:149` fetches enabled skills from `user_skills` table ✅
- **Chat → Tools:** `app/api/chat/route.ts:153` calls `getToolDefinitions(enabledSkillIds)` which maps skill IDs to Claude tool schemas ✅
- **Tool Execution:** `lib/tools/definitions.ts:executeToolCall` dispatches tool calls to implementations ✅
- **Skills Prompt:** `lib/skills/registry.ts:buildSkillsPrompt()` injects per-skill instructions into system prompt ✅

**Verdict: ✅ WORKS** — Full path verified. Toggling a skill changes which tools Claude can call and what prompt instructions are injected.

**Note:** API keys stored unencrypted (`app/api/skills/route.ts:87` — `TODO: encrypt before storing`).

---

### 2. Model Selection
**✅ WORKS — Full path verified**

- **UI → API:** Settings page → `POST /api/settings/model` → saves `preferred_model` in `users.settings` JSONB ✅
- **API → DB:** `app/api/settings/model/route.ts` merges into existing settings, validates against `['auto', 'claude-sonnet-4', 'claude-haiku']` ✅
- **DB → Chat:** `app/api/chat/route.ts:185` reads `user.settings?.preferred_model` ✅
- **Chat → Model:** `lib/ai/model-router.ts:resolveModelPreference()` maps preference to actual model ID ✅
  - `'auto'` → smart routing based on message complexity
  - `'claude-sonnet-4'` → `claude-sonnet-4-20250514`
  - `'claude-haiku'` → `claude-3-5-haiku-20241022`
- **Model used in API call:** Passed to `streamChat`/`streamChatWithTools` via `{ model: modelConfig.id }` ✅

---

### 3. Onboarding
**⚠️ PARTIAL — Saves profile data but does NOT write SOUL.md/USER.md**

- **UI → API:** `app/(dashboard)/onboarding/page.tsx` → `POST /api/onboarding` ✅
- **API → DB:** `app/api/onboarding/route.ts` saves `name`, `timezone`, `tone`, `role` to `users` table, sets `onboarding_complete: true` ✅
- **❌ MISSING:** No code writes `SOUL.md` or `USER.md` anywhere. Grep for `SOUL.md` and `USER.md` returns zero results in the codebase.
- **❌ MISSING:** The `settings` JSONB is overwritten (not merged) — `app/api/onboarding/route.ts:30` sets `updates.settings = settings` which would clobber any existing settings like `preferred_model`.

**Breaks:**
- `app/api/onboarding/route.ts:30` — overwrites `settings` instead of merging
- No SOUL.md/USER.md generation anywhere in codebase

---

### 4. Voice Messages
**✅ WORKS — Full Telegram voice path verified**

- **Telegram audio in:** `app/api/channels/telegram/webhook/route.ts:35` detects `msg.voice`, downloads file via Telegram API ✅
- **Transcription:** Calls `transcribeAudio()` from `lib/channels/whisper.ts` → OpenAI Whisper API ✅
- **Text processing:** Transcribed text sent through `processChannelMessage()` → gets AI response ✅
- **Voice reply:** Checks if user has TTS skill enabled, calls `textToSpeech()` from `lib/channels/voice.ts` → OpenAI TTS API, sends back via `sendVoice` ✅
- **Web API:** `POST /api/voice/transcribe` accepts multipart audio, transcribes, deducts credits ✅
- **Credit tracking:** Both transcription and TTS costs are deducted ✅

**Note:** Requires `OPENAI_API_KEY` env var. Web UI voice (VoiceButton component) uses the `/api/voice/transcribe` endpoint.

---

### 5. Web Search
**✅ WORKS — Dual-path verified**

- **Path 1 (No tools enabled):** `app/api/chat/route.ts:159-175` — pre-flight `needsWebSearch()` heuristic → `webSearch()` via Brave API → results injected as context ✅
- **Path 2 (Skills enabled):** When `web_search` skill is enabled → `getToolDefinitions()` includes `web_search` tool → Claude decides when to call it → `executeToolCall('web_search')` → `webSearch()` ✅
- **Implementation:** `lib/tools/web-search.ts` — Brave Search API with query extraction and result formatting ✅
- **Fallback:** Returns empty results with error message if `BRAVE_API_KEY` not set (graceful degradation) ✅

**Requires:** `BRAVE_API_KEY` env var.

---

## Phase 6

### 6. Cron/Automations
**⚠️ PARTIAL — DB + OpenClaw sync attempted, but depends on OpenClaw gateway API**

- **UI → API:** `app/(dashboard)/automations/page.tsx` → `POST /api/automations` ✅
- **API → DB:** Creates record in `automations` table with cron schedule, plan limits enforced ✅
- **DB → OpenClaw:** `lib/automations/executor.ts:syncAutomationToOpenClaw()` POSTs to `OPENCLAW_GATEWAY_URL/api/cron` ✅
- **CRUD:** Update (`PATCH`), delete, and trigger (`/run`) endpoints exist in `lib/automations/executor.ts` ✅
- **Per-automation routes:** `app/api/automations/[id]/route.ts` and `app/api/automations/[id]/run/route.ts` exist ✅

**⚠️ Issues:**
- Sync to OpenClaw is wrapped in try/catch and **fails silently** — automation is created in DB even if cron job creation fails (`app/api/automations/route.ts:94-97`)
- No verification that the OpenClaw gateway cron API actually exists or matches the expected contract
- If OpenClaw sync fails, the automation has no `openclaw_job_id` and will never actually run

---

### 7. Discord
**✅ WORKS — Full webhook + channel router path verified**

- **Webhook endpoint:** `app/api/channels/discord/webhook/route.ts` — handles Discord interactions with Ed25519 signature verification ✅
- **Connection flow:** User generates token in Settings → sends `!connect <token>` in Discord → verified via `user_channels` table ✅
- **Message routing:** Resolves Discord user → Kyra user via `user_channels` → `processChannelMessage()` → Claude API → `sendDiscordMessage()` ✅
- **Discord API:** `lib/channels/discord.ts` — sends messages via Discord REST API with 2000 char limit ✅
- **Channel router:** `lib/channels/router.ts` — shared processing for all channels (Telegram, WhatsApp, Discord) ✅

**Requires:** `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID` env vars. Needs a Discord bot set up with interactions endpoint pointing to this webhook.

**⚠️ Note:** Channel router doesn't use skills/tools or custom instructions — it uses a hardcoded simple system prompt. Discord users don't get the same feature-rich experience as web users.

---

### 8. Browser Tool
**✅ WORKS — Full path verified**

- **API endpoint:** `app/api/browser/route.ts` — plan-gated (business/max), skill-check required ✅
- **Skill registration:** `lib/skills/registry.ts` — `browser` skill with `browse_url` tool ✅
- **Tool definition:** `lib/tools/definitions.ts` — `browse_url` tool schema registered, maps to `browseUrl()` ✅
- **Implementation:** `lib/tools/browser-tool.ts` — fetch + Readability extraction, optional Cloudflare Browser Rendering screenshots, CSS selector extraction ✅
- **Chat integration:** When browser skill enabled, Claude can call `browse_url` tool via `streamChatWithTools` ✅

**Note:** Screenshot functionality requires Cloudflare Browser Rendering binding (`globalThis.env.BROWSER`). Without it, falls back to text-only extraction (which is essentially the same as `web_fetch`).

---

### 9. Image Understanding
**✅ WORKS — Full path verified**

- **Chat with image:** `app/api/chat/route.ts:219-225` — when `image_url` is provided, builds a vision content array with `type: 'image'` ✅
- **Image upload:** `app/api/files/upload/route.ts` — uploads images to Supabase Storage, returns public URL ✅
- **Skill tool:** `lib/tools/definitions.ts` — `analyze_image` tool calls `analyzeImage()` ✅
- **Implementation:** `lib/tools/image-analysis.ts` — sends image to Claude Vision (claude-sonnet-4) with optional prompt ✅
- **Skill registration:** `image_understanding` skill in registry with `analyze_image` tool ✅

**Two paths work:**
1. Direct image attachment in chat message (via `image_url` parameter) — always works ✅
2. Tool-based analysis (when `image_understanding` skill enabled) — Claude can analyze image URLs ✅

---

### 10. File Upload
**✅ WORKS — Full path verified**

- **UI:** `app/(dashboard)/files/page.tsx` exists ✅
- **Upload API:** `app/api/files/route.ts` POST — uploads to Supabase Storage, creates `user_files` record, plan-based limits ✅
- **List/Delete API:** GET and DELETE in same route ✅
- **Chat integration:** `app/api/chat/route.ts:181-193` — when `file_ids` provided, fetches file metadata and injects `[ATTACHED FILES]` context ✅
- **Tool:** `read_file` tool in `lib/tools/definitions.ts` — fetches file from storage via signed URL, extracts text via `extractTextFromFile()` ✅
- **File processor:** `lib/tools/file-processor.ts` — supports text, CSV, Markdown, JSON, HTML, PDF (basic extraction) ✅
- **Skill registration:** `file_upload` skill with `read_file` tool ✅

---

### 11. Custom Instructions
**❌ BROKEN — API saves to DB but chat route never reads them**

- **UI → API:** Settings page → `PUT /api/settings/instructions` → saves `custom_instructions_knowledge` and `custom_instructions_style` to `users` table ✅
- **Prompt support:** `lib/ai/prompts.ts:20,91-92` — `getSystemPrompt()` accepts `customInstructions` parameter and renders them ✅
- **❌ BREAK:** `app/api/chat/route.ts:170` calls `getSystemPrompt(memories, reminders, calendarEvents)` with only 3 arguments — **never passes `customInstructions`**
- **❌ BREAK:** The chat route never fetches `custom_instructions_knowledge` or `custom_instructions_style` from the user profile. The `userProfile` SELECT is `select('*')` so the data is available, but it's never extracted or passed.
- **❌ BREAK:** Channel router (`lib/channels/router.ts`) also never reads custom instructions.

**File:line references:**
- `app/api/chat/route.ts:170` — `getSystemPrompt(memories, reminders, calendarEvents)` missing 4th arg
- `lib/ai/prompts.ts:20` — `customInstructions` parameter exists but is never used by any caller

---

## Summary

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Skills Toggle | ✅ WORKS | API keys stored unencrypted (TODO) |
| 2 | Model Selection | ✅ WORKS | Full auto-routing + manual preference |
| 3 | Onboarding | ⚠️ PARTIAL | Saves to DB but no SOUL.md/USER.md; overwrites settings |
| 4 | Voice Messages | ✅ WORKS | Telegram voice fully wired; web transcription works |
| 5 | Web Search | ✅ WORKS | Dual-path: pre-flight + tool-based |
| 6 | Cron/Automations | ⚠️ PARTIAL | DB works; OpenClaw sync fails silently |
| 7 | Discord | ✅ WORKS | Missing skills/custom instructions in channel router |
| 8 | Browser Tool | ✅ WORKS | Screenshots need Cloudflare binding |
| 9 | Image Understanding | ✅ WORKS | Two paths: direct + tool-based |
| 10 | File Upload | ✅ WORKS | Full upload → read → AI analysis path |
| 11 | Custom Instructions | ❌ BROKEN | Saved to DB but never read by chat route |

### Critical Fixes Needed

1. **Custom Instructions (P0):** Wire `customInstructions` from user profile into `getSystemPrompt()` call in `app/api/chat/route.ts:170`
2. **Onboarding settings overwrite (P1):** Merge settings instead of overwriting in `app/api/onboarding/route.ts:30`
3. **Channel router parity (P2):** `lib/channels/router.ts` uses a minimal system prompt — doesn't include skills, custom instructions, memories, or model preference. Discord/Telegram/WhatsApp users get a degraded experience.
