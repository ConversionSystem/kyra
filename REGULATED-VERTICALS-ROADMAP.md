# Kyra — Regulated-Vertical Strategy & Roadmap

**Positioning:** The AI workforce platform for regulated industries where GHL, HubSpot, and horizontal SaaS can't legally or operationally compete.

**Sequence:** Cannabis (Months 1–6) → Clinics/Medspas/Dental/Vet (Months 7–12) → Legal (Months 13–18) → Financial Services (Months 19–24).

**Date:** 2026-04-20
**Status:** Strategic proposal
**Owner:** Steve / Angel

---

## 1. Executive Summary

Kyra's strongest structural advantage is **container-per-client isolation with persistent memory + HITL risk gating + prompt-injection defense + vertical-aware AI personas**. These are the exact primitives regulated industries must have, and that horizontal platforms (GHL, HubSpot, Zapier) either cannot or will not build because the regulatory blast radius is too high for their generalist strategy.

**The play:** Own four verticals sequentially, starting with cannabis. Each vertical shares 80% of the core platform and layers ~20% vertical-specific compliance/integration code. The platform that ships compliance as a product — not an afterthought — wins.

**The 3-year revenue shape:** 600 paying customers × $600 ACV blended = ~$4.3M ARR by Month 36, at 70%+ gross margin, without venture capital.

---

## 2. Market Analysis

### Why regulated verticals

| Dimension | Regulated verticals | Horizontal SaaS (GHL etc.) |
|---|---|---|
| Incumbent feature parity | Low — regulated specifics are always "coming soon" | High |
| Ad platform access | Banned/restricted (Meta, Google) | Open |
| Urgency to automate | Very high (labor-intensive intake, follow-up) | Moderate |
| Switching cost once live | Very high (audit logs, compliance setup) | Low |
| Willingness to pay for compliance | High ($500–$2K/mo acceptable) | Low ($97–$297/mo) |
| Vendor lock-in defensibility | Data + audit history + integrations | Just data |

### TAM — serviceable with Kyra's product shape

| Vertical | US count | Addressable | ACV target | Potential ARR |
|---|---:|---:|---:|---:|
| Cannabis dispensaries + delivery | ~15,000 retail | ~6,000 | $1,200/mo | ~$86M |
| Dental / medspa / chiro / vet | ~300,000 | ~40,000 | $600/mo | ~$288M |
| Small law firms (< 20 attorneys) | ~450,000 | ~50,000 | $700/mo | ~$420M |
| RIA / financial advisors | ~275,000 | ~30,000 | $900/mo | ~$324M |
| **Combined** | **~1.04M** | **~126K** | **~$700 avg** | **~$1.1B** |

Even 1% penetration of the combined addressable market = $11M ARR. 5% = $55M.

### Why cannabis *first*

1. **Proven deployment:** Purple Lotus Delivery is already running on Kyra in production (per `docs/blackleaf-kyra-sms-overview.md`). De-risked reference customer.
2. **Smallest dominant-able market:** 15K dispensaries is a sales-reachable universe. Domination is tractable.
3. **Highest per-customer urgency:** Banned from Meta, Google Ads, Gmail smart features, iOS Business Connect — they actively hunt for alternative channels.
4. **Clearest compliance surface:** State-by-state rules are public, testable, enumerable. Not opaque like HIPAA interpretation.
5. **Integration moat already half-built:** Jane inventory (Algolia direct-query, 4ms), Onfleet dispatch, multi-channel router, HITL review gate.
6. **GHL will never build this.** Cannabis-compliant messaging is a regulatory minefield HighLevel's general counsel will block forever. This is a permanent gap.

### Why *not* SEO or voice-first first (re-evaluation)

Cannabis > voice receptionist when you constrain to "defensible moat that persists for 5 years," because:

- Voice receptionist has commoditizing competitors (Air AI, Dialpad Ai, Verse, Hello Patients) with deeper capital.
- Cannabis + regulated = structural lock on incumbents. Nobody can easily catch up.
- Regulated verticals compound (clinics uses 80% of cannabis stack; legal uses 70% of clinics stack).

---

## 3. The Compliance Moat — what Kyra already has vs. must build

### Already built (inventory of existing Kyra code)

| Primitive | Status | Location |
|---|---|---|
| Per-client Docker container isolation | ✅ Production | `lib/ovh/provisioner.ts` |
| AES-256-GCM encrypted secrets vault (per-client) | ✅ Production | `lib/secrets/crypto.ts` |
| HITL action engine with risk tiers + audit trail | ✅ Production | `lib/ghl/action-engine.ts`, `ghl_action_proposals` table |
| Prompt-injection 3-layer defense | ✅ Production | `lib/security/prompt-injection.ts` |
| Output-leak scanner (SOUL.md, keys, IPs, PII redactor) | ✅ Production | `lib/security/prompt-injection.ts:97-109` |
| Per-contact conversation memory | ✅ Production | `lib/memory/customer-memory.ts` |
| Knowledge extraction with dedup | ✅ Production | `lib/knowledge/extractor.ts` |
| Multi-channel router (SMS/WhatsApp/email/voice/web) | ✅ Production | `lib/channels/router.ts` |
| 5-provider voice abstraction | ✅ Production | `lib/voice/provider.ts` |
| Onfleet delivery dispatch stack | ✅ Production | `lib/onfleet/` |
| Per-client SOUL.md persona injection | ✅ Production | `lib/agency/workspace.ts`, `lib/agency/container.ts` |
| Jane (cannabis inventory) Algolia integration | ✅ Production | `lib/integrations/jane.ts` |
| Review-gate for HITL on AI outbound | ✅ Production | `lib/ghl/review-gate.ts` |
| TCPA quiet-hours gating | ✅ Production | `lib/onfleet/notification-gate.ts` |

This is a **remarkable starting position**. Most competitors would need 18 months to ship these primitives.

### Must build (compliance-specific, per vertical)

| Primitive | Required for | Effort |
|---|---|---:|
| State-by-state compliance rules engine | Cannabis | 3 weeks |
| Age verification + ID upload flow | Cannabis | 2 weeks |
| Proprietary SMS routing layer (not Springbig, not Blackleaf) | Cannabis | 4 weeks |
| Audit export / regulatory reporting generator | All | 3 weeks |
| Consent manager (opt-in / opt-out / record retention) | All | 2 weeks |
| HIPAA-grade logging toggles | Clinics | 4 weeks |
| BAA workflow + per-customer BAA signing | Clinics | 2 weeks |
| Privilege-preserving memory (conflict checks) | Legal | 6 weeks |
| Retention & litigation hold | Legal | 4 weeks |
| FINRA/SEC archival + 17a-4 compliance | Financial | 8 weeks |
| Vertical-specific POS/EHR/practice-management integrations | All | Ongoing |

---

## 4. SMS Strategy (explicitly without Springbig or Blackleaf)

### The cannabis SMS problem

Tier-1 US carriers (Verizon, T-Mobile, AT&T) block content referencing cannabis keywords regardless of 10DLC registration. Springbig and Blackleaf previously solved this with direct carrier relationships. **Without them, Kyra's strategy is multi-pronged:**

### Primary: Direct A2P 10DLC via carrier-tolerant providers

Build `lib/sms/providers/` with adapter pattern (already partially present per `lib/sms/providers.ts`). Implement:

| Provider | Cannabis tolerance | A2P 10DLC | API quality | Recommendation |
|---|---|---|---|---|
| **Bandwidth** | Neutral — brand-dependent | Native | Excellent | **Primary provider.** Direct carrier connections, mature 10DLC flow, iMessage Business program (launching). |
| **Telnyx** | Neutral | Native | Excellent | **Fallback provider.** Competitive pricing, global reach. |
| **Sakari** | Cannabis-aware | Via TCR | Good | Niche fallback for dispensary clients where Bandwidth fails. |
| **Tatango** | Cannabis-dedicated | Via TCR | API-limited | Emergency fallback, high cost. |
| **Plivo** | Neutral | Native | Good | Third fallback. |

**Implementation:** `lib/sms/providers/{bandwidth,telnyx,sakari}.ts` implementing the existing `SmsProvider` interface (already defined in `lib/sms/types.ts`). The `createProvider(config)` factory (already in `lib/sms/providers.ts`) becomes the cascade — try primary → fallback → emergency, with per-client config.

### Secondary: Channel fallback cascade

When SMS is suppressed, Kyra's existing multi-channel router (`lib/channels/router.ts`) automatically cascades:

1. **SMS** (via Bandwidth/Telnyx with carrier-specific content rewriting)
2. **RCS** — Rich Communication Services (Google-supported) — cannabis content often passes
3. **iMessage Business** — Bandwidth's iMessage Business Chat (cannabis content allowed on Apple's rails)
4. **WhatsApp Business** — cannabis allowed for licensed retailers with brand verification
5. **Push notifications** via native app (future) or PWA web push
6. **Email** — Resend or SendGrid; cannabis allowed with proper sender verification
7. **Web chat widget** (already built) — session preserved per contact

Every channel ingests into the same `client_conversations` table so the AI has unified history. This cross-channel coherence is the moat.

### Tertiary: Compliance-aware content rewriter

Build `lib/compliance/content-rewriter.ts`:
- Pre-flight scan of every outbound message against vertical-specific blocklists (cannabis: avoid "buy weed," "marijuana," "delivery tonight," emojis like 🌿/💚).
- AI rewrites borderline content to compliance-safe phrasing.
- Attempts carrier delivery; if bounced (via Bandwidth delivery receipts), auto-cascade to next channel.
- Logs every rewrite for audit.

This is a reusable primitive across all four verticals.

### Compliance: opt-in, opt-out, retention

- **Opt-in:** double opt-in via form or keyword (`JOIN` / `YES`). Kyra stores `consent_source`, `consent_ip`, `consent_timestamp`, `consent_text` on every contact record.
- **Opt-out:** `STOP` / `UNSUBSCRIBE` keywords + auto-propagation across all channels (SMS opt-out cascades to email + WhatsApp).
- **Retention:** per-vertical retention rules (cannabis 2 years, healthcare 6 years, legal 7 years, financial 7 years per 17a-4). Stored in `compliance_retention_rules` table.
- **Audit export:** one-click ZIP of conversation history + consent records for regulatory review.

---

## 5. Product Architecture — Cannabis Vertical

### The dispensary AI worker (pitch)

> "Your dispensary's AI staff that takes calls, books deliveries, answers menu questions, processes online orders, sends compliant reorder reminders, responds to reviews, and trains new budtenders — running 24/7 with full audit trails."

### Core capabilities per dispensary

| Capability | Built? | Cannabis-specific requirement |
|---|---|---|
| Menu chat / product recommendations | ✅ (Jane) | Link to Dutchie/Treez/Flowhub as well |
| Voice ordering | ✅ | Age verification at call start |
| SMS delivery notifications | ⚠️ | Build on Bandwidth/Telnyx |
| Age-gated intake | ❌ | Build |
| Delivery dispatch | ✅ (Onfleet) | Metrc manifest integration |
| Review response | ✅ | Compliance-safe language |
| Reorder nudges | ✅ (autopilot) | Vertical-aware timing rules |
| Loyalty sync | ⚠️ | Alpine IQ / Paytender integrations (no Springbig) |
| Compliance reporting | ❌ | Build |
| Budtender training | ❌ | Build knowledge-base auto-train |

### Vertical-specific integrations

| Integration | Purpose | Effort | Priority |
|---|---|---:|---|
| **Dutchie** | POS + menu sync | 2 weeks | P0 (market-share leader) |
| **Treez** | POS + menu sync | 2 weeks | P0 |
| **Flowhub** | POS + menu sync | 2 weeks | P1 |
| **Leaflogix / Meadow** | POS | 2 weeks | P2 |
| **Jane** | Menu (already have) | — | ✅ |
| **Leaflink** | Wholesale B2B | 3 weeks | P2 |
| **Metrc** | State tracking | 4 weeks | P1 (mandatory in most states) |
| **Alpine IQ** | Loyalty / messaging | 3 weeks | P0 (Springbig replacement) |
| **Weedmaps** | Listings + reviews | 2 weeks | P1 |
| **Leafly** | Listings + reviews | 2 weeks | P1 |
| **Aeropay** | Cannabis-compliant ACH | 3 weeks | P0 (payment layer) |
| **Hypur** | Cannabis payments | 2 weeks | P2 |
| **Dutchie Pay** | POS-native payments | 2 weeks | P2 |

### State compliance engine

`lib/compliance/cannabis-rules.ts` — a data-driven rules engine with per-state configuration:

```ts
// Example shape — not final
export const STATE_RULES: Record<StateCode, CannabisStateRules> = {
  CA: {
    minAge: 21,
    maxDeliveryGrams: 28,     // adult-use daily limit
    manifestRequired: true,   // Metrc
    deliveryRadius: 'unlimited',
    promotions: { discountsAllowed: true, freeAllowed: false },
    hours: { earliest: '06:00', latest: '22:00' },
    packagingRules: ['child_resistant', 'tamper_evident'],
    advertisingRestrictions: ['no_cartoons', 'no_pediatric_imagery', 'age_gate_required'],
    sms: { requiresDoubleOptIn: true, forbiddenWords: [...] },
  },
  CO: { /* ... */ },
  // ...
};
```

The AI persona reads this at request-time; every AI reply passes through `validateAgainstStateRules(content, state)` pre-send.

### Per-dispensary container config (extends existing `container_config`)

```jsonc
{
  "vertical": "cannabis",
  "state": "CA",
  "licenses": {
    "retail": "C10-0000442-LIC",
    "delivery": "C9-0000178-LIC",
    "metrc": "LIC-xxxx"
  },
  "pos": { "provider": "dutchie", "location_id": "...", "api_key": "ENCRYPTED" },
  "payments": { "provider": "aeropay", "merchant_id": "..." },
  "loyalty": { "provider": "alpine_iq", "account_id": "..." },
  "compliance": {
    "retention_days": 730,
    "age_verification_required": true,
    "manifest_auto_generate": true
  }
}
```

All secret values go through `lib/secrets/` AES-256-GCM vault — already built.

---

## 6. Expansion Path — Clinics, Legal, Financial

### Vertical 2: Clinics / Medspa / Dental / Chiro / Vet (Months 7–12)

**What carries over from cannabis (80%):** container isolation, encrypted secrets, audit trail, HITL, compliance-aware AI, channel cascade, consent management, Onfleet (for mobile services).

**What's clinic-specific (20%):**
- HIPAA Business Associate Agreement workflow — self-service BAA signing tied to plan tier
- PHI-aware logging toggles (redact PHI from telemetry, allow full-fidelity for audit export only)
- Integrations: Jane (practice management), Dentrix, Open Dental, ChiroHD, eClinicalWorks
- Insurance verification flows (Nirvana Health, Change Healthcare)
- Appointment waitlist AI (fill cancellations — huge ROI for clinics)
- Reminder cadence compliant with state medical board rules (some states restrict SMS)

**Product:** "AI front desk for clinics" — takes calls, books appointments, reminds patients, handles reschedules, answers FAQs, collects intake forms. Priced $800–$1,500/mo.

**Moat:** HIPAA-grade per-patient container memory is unique. GHL won't sign BAAs; HubSpot charges $15K+/yr for HIPAA tier.

### Vertical 3: Small Law Firms (Months 13–18)

**What carries over (70%):** same core primitives.

**What's legal-specific:**
- **Attorney-client privilege preservation** — memory can be marked "privileged" and excluded from any export except to named attorneys in the firm.
- **Conflict-of-interest check** — before engaging a new lead, run contact against existing client graph. Built on existing `customer_memory` + Pinecone vector similarity.
- **Retention & litigation hold** — automatic hold triggers on `lit_hold_active=true`, suspends deletion until released.
- **IOLTA accounting separation** (if payments involved).
- Integrations: Clio, MyCase, PracticePanther, Filevine, Lexicata, Ruby (call answering — compete with), Smith.ai (compete with).
- **Ethical wall** UI — attorneys can flag a matter as walled; AI cannot cross-reference.

**Product:** "AI intake specialist for law firms" — qualifies leads, runs conflict checks, books consultations, gathers intake data, sends engagement letters. $700–$2,000/mo. Replaces answering services ($500–$2K/mo for Ruby/Smith.ai).

**Moat:** Privilege-aware memory is technically novel. Smith.ai doesn't have it; they're humans with notes.

### Vertical 4: Financial Services / RIA (Months 19–24)

**What carries over (60%):** core primitives plus privilege-preserving memory pattern from legal.

**What's financial-specific:**
- **17a-4 compliant archival** — WORM (write-once-read-many) storage for all communications; SEC-examinable export.
- **FINRA/SEC advertising rule compliance** — every AI message pre-screened against Regulation BI + FINRA Rule 2210.
- **Suitability checks** — AI cannot recommend specific securities without advisor oversight; HITL hard-required.
- Integrations: Redtail CRM, Wealthbox, Salesforce Financial Services Cloud, eMoney, MoneyGuidePro, Orion.
- **KYC/AML** workflows (LexisNexis, Plaid Identity).

**Product:** "AI administrative assistant for RIAs" — schedules reviews, sends compliant follow-ups, gathers KYC, prepares quarterly letters. $1,000–$2,500/mo.

**Moat:** 17a-4 archival + FINRA-screened content generator is a specialized compliance product.

---

## 7. Phased Roadmap

### Phase 0 — Kill list (Month 0, 2 weeks)

Before building, **delete ~30% of the codebase** that doesn't serve this strategy. This is discipline, not optional.

- [ ] Delete `components/landing/*` (all orphaned)
- [ ] Delete `components/onboarding/{guided-tour, launch-progress}.tsx` (orphaned)
- [ ] Delete `components/agency/VoiceCommandButton.tsx` (layout comment already says removed)
- [ ] Delete `components/pipelines/PipelineProgress.tsx` (orphan)
- [ ] Delete `components/chat/WakingUpIndicator.tsx` (orphan)
- [ ] Delete `components/open-control-ui-button.tsx` (orphan)
- [ ] Delete `components/marketing/testimonial-placeholder.tsx`
- [ ] Delete `lib/openclaw/*` after migrating 3 legacy routes (or kill the routes)
- [ ] Delete `lib/email/sequences.ts` (DEPRECATED stub)
- [ ] Delete all 5 type files in `types/` (aspirational, stale Plan union)
- [ ] Delete 4 duplicate pitch deck pages (keep 1: `/pitch/[agencyId]/[industry]`)
- [ ] Delete `/api/admin/orphaned-users`, `/api/admin/health-check` — unauth info leaks
- [ ] Delete `/api/billing/checkout` and `/api/billing/portal` stubs
- [ ] Delete `/api/stripe/webhooks` (disabled duplicate)
- [ ] Delete `/api/webhooks/onfleet` legacy forwarder
- [ ] Delete `app/march-16/`, `app/india/` if events are past
- [ ] Delete `/api/playground/chat` (broken — OpenAI URL + OpenRouter slug)

**Also: rotate the leaked JWT** in `scripts/backfill-templates.js:15`. This is P0. Regardless of strategy.

**Also: resolve `app/ai-for/[niche]` + `app/ai-for/[slug]` route conflict.** Next.js won't build otherwise.

**Also: fix fail-open webhooks** (`/api/webhooks/ghl`, `/api/crm/webhook`, `/api/ghl/webhook` — mirror `lib/auth/cron.ts` fail-closed pattern).

Outcome: smaller, stable, credible codebase to build on.

### Phase 1 — Cannabis foundation (Months 1–2)

**Goal:** 5 paying dispensaries on an opinionated cannabis product.

- [ ] Build `lib/compliance/` with `cannabis-rules.ts` (state engine), `content-rewriter.ts`, `consent-manager.ts`, `audit-exporter.ts`
- [ ] Build `lib/sms/providers/bandwidth.ts` — primary A2P 10DLC provider
- [ ] Build `lib/sms/providers/telnyx.ts` — fallback provider
- [ ] Build `lib/sms/cascade.ts` — automatic channel fallback (SMS → RCS → iMessage → WhatsApp → email → web chat)
- [ ] Build `lib/integrations/dutchie.ts` — POS + menu sync
- [ ] Build `lib/integrations/alpine-iq.ts` — loyalty (replaces Springbig in stack)
- [ ] Build `lib/integrations/aeropay.ts` — cannabis-compliant payments
- [ ] Add `vertical` column to `agency_clients` + tenancy rules
- [ ] Age-verification flow: ID upload, Persona/Onfido, `client_knowledge` entry
- [ ] Ship `CannabisComplianceCard` dashboard widget (state rules, audit export, consent summary)
- [ ] Rewrite `app/page.tsx` hero to single cannabis pitch. Kill all 50 industry templates from primary nav.
- [ ] Launch `meetkyra.com` with the cannabis-only positioning. 1 website, 1 pitch deck, 1 template.

**Acceptance criteria:** 5 dispensaries live, running inbound SMS + voice + web chat, with Dutchie POS sync and Onfleet delivery dispatch. Audit export generates a valid compliance ZIP in < 10 seconds.

### Phase 2 — Cannabis growth (Months 3–4)

**Goal:** 20 paying dispensaries; $20K MRR.

- [ ] Build `lib/integrations/{treez,flowhub,metrc,weedmaps,leafly}.ts`
- [ ] Multi-state support (rule engine → per-customer state resolution)
- [ ] Multi-location support for chains (Cookies, MedMen-like)
- [ ] Cannabis-specific SOUL.md templates (budtender persona, delivery ops persona, review responder)
- [ ] Review response workflow with state-specific language gating
- [ ] Reorder nudges based on purchase history (via Dutchie)
- [ ] Budtender training: auto-ingest product menu, generate Q&A, quiz generator
- [ ] Public case study page for Purple Lotus (quantified results — calls answered, delivery time reduction, reorder lift)
- [ ] 3 industry events: MJBizCon (November), Hall of Flowers, Benzinga Cannabis Capital Conference
- [ ] Partnerships: Dutchie app marketplace listing, Alpine IQ integrations directory, Leafly/Weedmaps partner programs

**Acceptance criteria:** 20 paying, $1K+/mo ACV each. 1 multi-location chain live. Listed in 3 cannabis-tech directories.

### Phase 3 — Cannabis dominance (Months 5–6)

**Goal:** 50 paying dispensaries; $50K MRR; category leadership.

- [ ] Ship Metrc integration (state tracking — mandatory for seed-to-sale compliance in most regulated states)
- [ ] Build `lib/compliance/regulatory-reporter.ts` — one-click quarterly/annual reports per state
- [ ] White-label for cannabis agencies (cannabis-tech consultancies who resell to dispensaries)
- [ ] Dedicated cannabis SDK + API for Dutchie/Treez embedding
- [ ] iMessage Business Chat go-live (via Bandwidth) — major wedge vs SMS-only competitors
- [ ] WhatsApp Business API activation (licensed-retailer verified)
- [ ] Cannabis industry content flywheel: weekly blog, MJBizDaily columns, Cannabis Business Times contributions
- [ ] Launch "Cannabis AI Index" — monthly report ranking industry automation (SEO + PR)

**Acceptance criteria:** 50 paying. Category recognition: referenced in 5+ cannabis industry publications. 2 major agency partners reselling white-label.

### Phase 4 — Expansion prep + Clinics launch (Months 7–10)

**Goal:** 100 cannabis + 15 clinics; $130K MRR.

Modularize compliance:

- [ ] Extract `lib/compliance/rules-engine.ts` from cannabis-specific to vertical-agnostic (cannabis-rules, hipaa-rules become child configs)
- [ ] Build HIPAA primitives: `lib/compliance/hipaa/` — PHI redactor, BAA workflow, access logs, breach-notification shell
- [ ] Clinics integrations: **Jane** (now dual-use for practice mgmt, not just cannabis menu), **Dentrix Ascend**, **ChiroHD**, **Open Dental**
- [ ] Self-service BAA signing via DocuSign API
- [ ] Insurance verification flow (Nirvana or Change Healthcare)
- [ ] Appointment waitlist AI
- [ ] New pitch: "AI front desk for clinics" — fresh page, no cannabis messaging on this surface
- [ ] Industry events: ADHA, ADA, AVMA depending on sub-vertical

**Acceptance criteria:** 15 clinics live. Self-service BAA generates in < 5 min.

### Phase 5 — Clinics scale + Legal prep (Months 11–14)

**Goal:** 150 cannabis + 50 clinics + 10 law firms; $230K MRR.

- [ ] Expand clinic integrations: Dentrix (Henry Schein), eClinicalWorks, Phreesia
- [ ] Build `lib/compliance/legal/` — privilege-preserving memory, conflict-check engine, litigation hold, ethical walls
- [ ] Integrations: Clio, MyCase, PracticePanther
- [ ] Legal pitch page; compete with Ruby + Smith.ai on pricing and capability
- [ ] Litigation retention rules per state bar
- [ ] Attorney pilot: 3 firms, 60-day free pilot → 10 paying

**Acceptance criteria:** 10 firms live. Privilege-aware memory demo-able.

### Phase 6 — Legal scale + Financial prep (Months 15–18)

**Goal:** 200 cannabis + 150 clinics + 40 law firms + 10 RIAs; $370K MRR.

- [ ] Build `lib/compliance/financial/` — 17a-4 archival, FINRA content screener, KYC/AML flows
- [ ] Integrations: Redtail, Wealthbox, Orion
- [ ] FINRA-qualified pilot program (with partner compliance firm for co-signature)
- [ ] SEC 17a-4 vendor certification process

**Acceptance criteria:** 10 RIAs live on pilot. 17a-4 compliance vendor-certified.

### Phase 7 — Four-vertical scale (Months 19–24)

**Goal:** 600 paying customers, blended $600 ACV, $360K MRR, $4.3M ARR.

- [ ] Per-vertical customer success team (1 CSM per vertical when vertical hits 50 customers)
- [ ] Vertical-specific conferences sponsorships (MJBizCon, ADA, ABA, Schwab IMPACT)
- [ ] Partner channel: accounting firms (cannabis accountants), medical supply vendors, bar associations, RIA custodians
- [ ] Launch "regulated industries developer platform" — public API for compliance-aware AI

---

## 8. Pricing & Unit Economics

### Per-vertical pricing

| Vertical | Starter | Pro | Enterprise |
|---|---:|---:|---:|
| Cannabis | $499/mo (1 location) | $1,499/mo (up to 3 locations) | $2,999/mo (multi-location) |
| Clinics | $399/mo (1 practitioner) | $899/mo (up to 5) | $1,999/mo (multi-location) |
| Legal | $499/mo (solo) | $999/mo (up to 5 attorneys) | $2,499/mo (up to 20) |
| Financial | $799/mo (solo advisor) | $1,499/mo (up to 5) | $2,999/mo (up to 20) |

### Unit economics per customer (blended)

- **ACV:** $720/mo × 12 = $8,640
- **Cost to serve:** ~$180/mo (container + LLM + SMS + integrations). 75% gross margin.
- **CAC target:** $2,000 blended (cannabis events + content). Payback ~3.5 months.
- **LTV (36-mo retention assumption):** $26K gross, $19.4K net.
- **LTV:CAC:** 9.7x.

### Path to $10M ARR

| Quarter | Customers | Blended ACV | MRR | ARR |
|---|---:|---:|---:|---:|
| Q1 | 5 | $1,200 | $6K | $72K |
| Q2 | 20 | $1,200 | $24K | $288K |
| Q3 | 50 | $1,100 | $55K | $660K |
| Q4 | 115 | $1,000 | $115K | $1.38M |
| Q5 | 250 | $850 | $213K | $2.55M |
| Q6 | 400 | $780 | $312K | $3.74M |
| Q7 | 550 | $720 | $396K | $4.75M |
| Q8 | 750 | $700 | $525K | $6.3M |
| Q9 | 970 | $700 | $679K | $8.1M |
| Q10 | **1200** | **$700** | **$840K** | **$10.1M** |

Reachable with 2 operators + 3 hires (full-stack engineer, compliance/implementation specialist, customer success) by end of Year 2.

---

## 9. What to Kill — the discipline

**Kill because it's not regulated-vertical:**

- [ ] 50 generic industry landing pages (`/ai-for/[slug]`) — keep only cannabis/clinic/legal/financial
- [ ] Programmatic marketing surface in its current form — replace with 4 deep vertical pages
- [ ] `/try/[industry]`, `/demo/[industry]`, `/for/[industry]` — collapse into 1 per-vertical
- [ ] Generic "AI campaign generator," generic "funnel generator" — commodity GPT wrappers
- [ ] Business-in-a-Box generic orchestrator — rebuild as 4 vertical-specific orchestrators
- [ ] ⌘K command palette (already gone ✅)
- [ ] Voice command button (already orphaned ✅)
- [ ] 4 separate pitch decks → 1 shared `<Deck>` component with 4 content sets
- [ ] `app/openclaw/page.tsx`, `app/web-intelligence/page.tsx`, `app/zapier/page.tsx` — not relevant to regulated-vertical pitch
- [ ] `/api/webhooks/resend`, unsigned → either sign it or delete it
- [ ] All 7 stub redirect pages in `/agency/*` — convert to `next.config.js` 301 rewrites

**Kill because it's feature parity with tools we don't need to build:**

- [ ] `lib/campaigns/ai-campaign-engine.ts` — use SendGrid/Resend templates + AI in messages
- [ ] `lib/funnels/ai-funnel-builder.ts` — use Unbounce/Leadpages embeds
- [ ] `lib/email/marketing.ts` bulk sending — route through GHL for GHL agencies, Resend for direct
- [ ] `lib/sites/*` full builder — replace with opinionated vertical templates only (cannabis/clinic/legal/financial), no general-purpose builder

**Kill because tech debt:**

- [ ] `lib/openclaw/*` (3 importers — migrate + delete)
- [ ] `lib/billing/plans.ts:203-243` deprecated helpers
- [ ] `lib/security/prompt-injection.ts:289-331` deprecated helpers
- [ ] `types/*` all 5 files (aspirational, stale)
- [ ] Duplicate `set_updated_at` / `update_updated_at_column` triggers — pick one
- [ ] 4 hardcoded admin email allowlists — consolidate into `lib/auth/admin.ts`
- [ ] 2 model routers → 1

**Outcome:** Smaller codebase means faster ship cycles, fewer bugs, cleaner vertical separation. The `tasks/todo.md` SEO/GEO Command Center work is **also killed** — SEO is not cannabis's top pain.

---

## 10. Metrics, Targets, Risks

### Primary metrics (monthly review)

| Metric | Month 6 | Month 12 | Month 18 | Month 24 |
|---|---:|---:|---:|---:|
| Paying customers | 50 | 150 | 350 | 700 |
| MRR | $50K | $130K | $280K | $490K |
| Net revenue retention | 100% | 110% | 120% | 125% |
| CAC | $2,500 | $2,000 | $1,800 | $1,600 |
| Gross margin | 70% | 73% | 75% | 77% |
| Compliance audits passed | 5 | 20 | 60 | 150 |
| Platform uptime (per-customer) | 99.5% | 99.7% | 99.9% | 99.95% |

### Leading indicators (weekly review)

- Messages routed per day (volume)
- SMS delivery rate per carrier (cannabis specifically)
- Channel cascade fallback rate (when SMS fails, how often does email succeed?)
- HITL approval rate (higher = lower AI confidence → prompt engineering opportunity)
- Per-customer credit burn vs budget
- Integration reliability (POS sync failures, Dutchie API errors)

### Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cannabis SMS carrier blocking worsens | High | High | Multi-channel cascade (iMessage Business, RCS, WhatsApp, email). Reduce dependence on SMS to < 40% of total volume. |
| Federal cannabis rescheduling changes landscape | Medium | Medium (positive) | Monitor; accelerate if rescheduling passes (opens ad platforms → reduces our moat but increases market). |
| Incumbent (GHL, HubSpot) launches cannabis mode | Low | High | Move fast to HIPAA + legal — once multi-vertical, the moat is composite. |
| Key integration deprecates (Dutchie API change) | Medium | Medium | Maintain 2+ POS integrations at all times. |
| Regulatory change in one state | High | Low (per-event) | State rule engine is data-driven — update one config, all customers protected. |
| Kyra gets classified as "marijuana-related business" | Low | High | Structure as SaaS, no product touch; legal opinion before cannabis GTM; banking via fintech that serves cannabis-ancillary (Safe-haven, Hana). |
| PII/PHI breach | Medium | Critical | Annual SOC 2; encryption-at-rest on every token (not just `client_secrets`); quarterly penetration testing; per-customer audit trail. |
| 17a-4 / FINRA delays financial vertical | Medium | Medium | Partner with established compliance vendor (Smarsh, Global Relay) for archival side rather than building in-house. |

### Fatal-condition tripwires

Pull the plug / pivot triggers:

- < 3 paying cannabis customers by end of Month 3 with > $5K spent on acquisition
- < $20K MRR by Month 6
- Any data breach involving PHI or financial records
- Any customer enforcement action citing Kyra as non-compliant
- Churn > 5%/mo once at 50 customers

---

## 11. Team & Org

### Now (2 people)

Steve, Angel.

### Month 3 — +1 hire

**Compliance & Implementation Specialist** (cannabis-first). Former dispensary ops manager or cannabis-tech account manager. Remote. $80–120K + equity.

Responsibilities: onboard dispensaries, own Dutchie/Treez/Alpine IQ integrations, write state compliance configs, customer success for cannabis book of business.

### Month 6 — +1 hire

**Full-stack engineer** (Next.js + TypeScript + Postgres). $140–180K + equity. Focus: SMS cascade, integrations, compliance engine.

### Month 9 — +1 hire

**Head of Compliance** (vertical-agnostic, with healthcare background). Licensed attorney or former regulatory counsel preferred. $150–200K + equity. Owns BAA workflow, HIPAA policies, FINRA research.

### Month 12 — +2 hires

1. **Customer Success Lead** (first CSM, cannabis-dedicated)
2. **Second full-stack engineer** (clinics vertical lead)

### Year 2 — scale-selective

CSM per vertical at 50+ customers; engineers on ratio of 1:100 customers.

**Critical:** Never cross 10 people in Year 2. Regulated-vertical SaaS rewards operational excellence, not headcount.

---

## 12. Decision summary — what changes this week

1. **Pick this strategy or don't.** If yes, commit to 90-day cannabis focus. Everything else secondary.
2. **Execute Phase 0 kill list.** Delete 30% of the code in the next 2 weeks.
3. **Rotate the leaked JWT** (P0 regardless of strategy).
4. **Schedule 10 cannabis dispensary discovery calls** (warm intros via Purple Lotus).
5. **Start building `lib/compliance/cannabis-rules.ts`** — first state: California.
6. **Start building `lib/sms/providers/bandwidth.ts`** — primary SMS path.
7. **Rewrite `app/page.tsx` and `meetkyra.com` landing** to a single cannabis pitch.
8. **Deprecate these domains as pitch pages**: `web-intelligence`, `openclaw`, `zapier`, `get-demo`, 3 of 4 pitch decks.
9. **Publish 1 reference case study** — Purple Lotus quantified results.
10. **Submit to Dutchie App Directory and Alpine IQ partner directory** in Week 3.

---

## Appendix A — Why this beats competing head-on with GHL

| Dimension | Kyra (this strategy) | Kyra (GHL-clone strategy) |
|---|---|---|
| Feature surface required | Deep in 4 verticals | Wide across all industries |
| Time to defensible moat | 6 months (cannabis compliance lock-in) | 36+ months (feature parity race) |
| Competitive response from GHL | They can't follow (regulatory blast) | They add your features in 2 quarters |
| Customer willingness to pay | $500–$2,500/mo | $97–$297/mo |
| CAC viability | High ACV supports channel-sales CAC | Low ACV requires self-serve + viral |
| Differentiation story | "We're the compliant AI platform" | "We're like GHL but with better AI" |
| Fundability if needed | Vertical SaaS is VC-friendly ($10M+ checks) | Horizontal AI SaaS is crowded |

## Appendix B — Codebase leverage by phase

| Phase | Existing code reused | New code required |
|---|---:|---:|
| Phase 1 (cannabis foundation) | 85% | 15% |
| Phase 2 (cannabis growth) | 92% | 8% (per-POS integrations) |
| Phase 3 (cannabis dominance) | 95% | 5% (scale ops) |
| Phase 4 (clinics launch) | 80% | 20% (HIPAA + clinic integrations) |
| Phase 5 (clinics scale + legal prep) | 90% | 10% (privilege memory) |
| Phase 6 (legal scale + financial prep) | 85% | 15% (17a-4 + FINRA) |
| Phase 7 (four-vertical scale) | 95% | 5% (vertical-specific polish) |

**Conclusion:** Kyra's existing infrastructure carries ~85% of the work. The remaining ~15% per vertical is the compliance layer that is *also the moat*. The ratio is unusually favorable — because you already built the hard parts without realizing you were building for this market.

---

_End of strategy document. Tracked review cadence: weekly ops review, monthly metrics review, quarterly strategy review._
