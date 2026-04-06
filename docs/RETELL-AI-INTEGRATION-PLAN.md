# Retell AI Integration Plan — Kyra Voice Platform
*Created: Apr 6, 2026*

## Overview
Replace current Twilio-based voice system with Retell AI as Kyra's primary AI voice provider. Retell handles speech-to-text, LLM response, text-to-speech, and telephony — all in one API. No more building voice pipelines ourselves.

## Why Retell AI
- **All-in-one**: STT + LLM + TTS + telephony in a single platform
- **Sub-second latency**: <800ms voice response time
- **Phone numbers**: Buy/manage numbers directly via API
- **Inbound + Outbound**: Both call directions supported
- **Knowledge Base**: Native RAG — upload docs, the AI uses them in calls
- **Function Calling**: AI can book appointments, transfer calls, update CRM during call
- **Conversation Flow**: Visual flow builder for structured conversations
- **Analytics**: Call duration, sentiment, resolution tracking built-in
- **Webhooks**: Real-time call events (started, ended, analyzed)
- **Web Calls**: Browser-based calls (no phone needed — embed on website)
- **Batch Calls**: Outbound campaign calling at scale
- **Voice Cloning**: Custom voices from audio samples
- **QA Dashboard**: AI-powered call quality analysis

## Architecture

### Current (Twilio)
```
Inbound Call → Twilio → /api/voice/twilio/webhook → TwiML gather
  → Whisper STT → LLM → ElevenLabs TTS → Twilio Play → Caller
```
Complex. 4 services. Latency issues. Manual pipeline management.

### New (Retell AI)
```
Inbound Call → Retell → Retell Agent (LLM + voice + knowledge) → Caller
Kyra Dashboard → Retell API → Create/manage agents + numbers
Webhooks → /api/voice/retell/webhook → Log to CRM, update conversations
```
One service. Sub-second. Retell handles the entire voice pipeline.

## Integration Points

### 1. Retell API Client (lib/voice/retell.ts)
- Create/update/delete agents
- Buy/manage phone numbers
- Create outbound calls
- Create web calls (for widget embedding)
- Manage knowledge bases
- Fetch call logs + analytics

### 2. Voice Dashboard (client Settings > Voice)
- Toggle voice on/off per client
- Buy a phone number (via Retell API)
- Configure voice agent: name, voice, personality, knowledge
- View call logs with transcripts
- Outbound call launcher
- Call analytics

### 3. Webhooks (/api/voice/retell/webhook)
- call_started: log to conversations
- call_ended: log duration, save transcript
- call_analyzed: sentiment, summary → CRM
- function_call: book appointment, escalate, etc.

### 4. Function Calling (during calls)
- book_appointment: creates booking in Kyra + GHL
- transfer_call: connects to human
- check_hours: returns business hours
- get_pricing: returns service prices
- create_lead: adds to CRM
- send_sms: sends follow-up SMS after call

### 5. Web Call Widget
- Embed a "Call Us" button on websites
- Browser-to-AI voice call (no phone needed)
- Uses Retell Web SDK

## Data Model Changes

### agency_clients.container_config.voice_config
```json
{
  "enabled": true,
  "provider": "retell",
  "retell_agent_id": "agent_xxx",
  "retell_phone_number_id": "pn_xxx", 
  "phone_number": "+14085551234",
  "voice_id": "retell-Cimo",
  "voice_model": "eleven_flash_v2_5",
  "language": "en-US",
  "knowledge_base_id": "kb_xxx",
  "webhook_url": "https://kyra.conversionsystem.com/api/voice/retell/webhook",
  "functions_enabled": true
}
```

### Environment Variables Needed
```
RETELL_API_KEY=key_xxx           # Retell API key
```

## Implementation Order

### Phase 1: Core Library + Webhook (Ship first)
1. `lib/voice/retell.ts` — API client (create agent, buy number, make call, etc.)
2. `app/api/voice/retell/webhook/route.ts` — Webhook handler
3. `app/api/voice/retell/create-agent/route.ts` — Create Retell agent for client
4. `app/api/voice/retell/phone-numbers/route.ts` — Buy/list numbers
5. `app/api/voice/retell/calls/route.ts` — Create outbound call, list calls

### Phase 2: Dashboard UI
6. Update `voice-sub-tab.tsx` — Replace Twilio UI with Retell UI
7. Add call log viewer with transcripts
8. Add outbound call launcher
9. Add voice agent configuration (voice, speed, emotion, etc.)

### Phase 3: Advanced Features
10. Web call widget (browser-based calling)
11. Batch outbound calling
12. Function calling (book appointments, CRM updates during call)
13. Knowledge base sync (auto-push training data to Retell KB)
14. Call analytics dashboard

## Retell API Reference (Key Endpoints)

Base URL: https://api.retellai.com
Auth: Bearer token (API key)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /create-agent | POST | Create voice agent |
| /get-agent/{id} | GET | Get agent details |
| /update-agent/{id} | PATCH | Update agent |
| /delete-agent/{id} | DELETE | Delete agent |
| /create-phone-number | POST | Buy phone number |
| /list-phone-numbers | GET | List numbers |
| /delete-phone-number/{id} | DELETE | Release number |
| /create-phone-call | POST | Make outbound call |
| /create-web-call | POST | Create browser call |
| /get-call/{id} | GET | Get call details |
| /list-calls | GET | List calls |
| /create-knowledge-base | POST | Create KB |
| /add-knowledge-base-sources/{id} | POST | Add docs to KB |

## Cost Structure
- Per-minute pricing (voice + LLM + telephony bundled)
- Phone numbers: ~$2/mo each
- Kyra charges clients via Voice Add-on ($79/mo for 300 min)
- Margin depends on Retell's per-minute rate vs our $79/300min price

## Migration Path
1. New clients get Retell by default
2. Existing Twilio clients continue working (provider: 'twilio' in voice_config)
3. Migration tool: reads existing Twilio config → creates Retell agent + transfers number
4. Eventually deprecate Twilio path

## Angel's Setup Steps
1. Create Retell account at dashboard.retellai.com
2. Add payment method
3. Complete KYC verification (required for outbound calls)
4. Generate API key (Dashboard → Settings → API Keys)
5. Share API key with Steve to add as RETELL_API_KEY env var
