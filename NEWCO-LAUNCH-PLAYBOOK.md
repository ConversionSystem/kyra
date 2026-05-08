# NewCo Launch Playbook — Spinning Out the Regulated-Vertical Product from Kyra

**Working title:** NewCo (naming options in §3)
**Parent:** Kyra (`kyra.conversionsystem.com` / future `meetkyra.com`)
**Strategic posture:** Independent sibling company, shared founders, separate cap table, cross-licensed IP, isolated brand + liability + banking.
**Target first-customer close:** Week 8.
**Target $1M ARR:** Month 18.
**Target SOC 2 Type I:** Month 9.

This document is the complete operational blueprint. Execute sequentially where marked `[seq]`, in parallel where marked `[par]`.

---

## Table of Contents

1. [Strategic Rationale — Why Separate](#1-strategic-rationale--why-separate)
2. [What Stays in Kyra, What Moves to NewCo](#2-what-stays-in-kyra-what-moves-to-newco)
3. [Naming & Brand](#3-naming--brand)
4. [Legal Entity & Cap Table](#4-legal-entity--cap-table)
5. [IP License Between Kyra and NewCo](#5-ip-license-between-kyra-and-newco)
6. [Financial Foundation](#6-financial-foundation)
7. [Compliance Foundation](#7-compliance-foundation)
8. [Technical Architecture](#8-technical-architecture)
9. [Product Definition (v0, v1, v2)](#9-product-definition)
10. [Team & Equity](#10-team--equity)
11. [Go-to-Market](#11-go-to-market)
12. [90-Day Execution Plan](#12-90-day-execution-plan)
13. [12-Month Operating Cadence](#13-12-month-operating-cadence)
14. [Kyra ↔ NewCo Operating Agreement](#14-kyra--newco-operating-agreement)
15. [Appendix A — Master Checklist](#appendix-a--master-checklist)
16. [Appendix B — Vendor Stack](#appendix-b--vendor-stack)
17. [Appendix C — Policy Document Templates](#appendix-c--policy-document-templates)

---

## 1. Strategic Rationale — Why Separate

### Why NewCo cannot live inside Kyra

| Reason | Consequence |
|---|---|
| **Cannabis = MRB-adjacent risk** | Stripe, most banks, some insurance carriers, some investors will refuse to serve Kyra if cannabis is listed as a product line. Even as cannabis-ancillary SaaS, the mere association triggers underwriting scrutiny across every banking and payments relationship. |
| **Brand confusion** | Kyra sells to agencies serving local-service businesses. NewCo sells directly to dispensaries, clinics, law firms, RIAs. Different buyers, different channels, different pricing, different compliance posture. One website can't do both without diluting both. |
| **Compliance surface** | HIPAA BAA, SOC 2, FINRA 17a-4, state cannabis licensing — these create a regulatory footprint that dramatically increases governance overhead and slows Kyra's core product velocity. Contain the regulatory surface inside one entity. |
| **Valuation structure** | Regulated-vertical SaaS commands 2-3x the ARR multiple of horizontal AI SaaS. Separate entities preserve NewCo's clean vertical-SaaS valuation story for future capital or exit. |
| **Operational focus** | A single team serving both loses to focused competitors on both sides. Separation forces each team to win its own market. |

### Why it's viable to separate

| Asset | Status |
|---|---|
| Production-grade container-per-client architecture | Already built in Kyra (`lib/ovh/*`) |
| Encrypted secrets vault | Already built (`lib/secrets/`) |
| HITL action engine with audit | Already built (`lib/ghl/action-engine.ts`) |
| Prompt-injection defense | Already built (`lib/security/`) |
| Multi-channel message router | Already built (`lib/channels/router.ts`) |
| Onfleet delivery stack | Already built (`lib/onfleet/`) |
| 5-provider voice abstraction | Already built (`lib/voice/`) |
| Reference customer (Purple Lotus) | Already live |
| Founders know the market | Yes |

**Kyra has accidentally built the exact platform primitives a vertical compliance SaaS needs.** The spin-out extracts these primitives into a shared core library, forks the application layer into two products, and runs each independently.

### Hypothesis testing — a separation-readiness check

Before executing, confirm all three must be true:

- [ ] You (Steve + Angel) are willing to run both companies for 12+ months or choose one as primary and hire a GM for the other.
- [ ] Purple Lotus (and ideally 1–2 other warm intros) will sign a 6-month pilot on NewCo within 30 days of entity formation.
- [ ] You can afford $30–60K in NewCo formation + initial cash (legal, incorporation, banking, insurance, initial infra, first hire). Bootstrapable from Kyra revenue or a small founder investment.

If any one is false: don't spin out yet. Build the cannabis vertical inside Kyra for 6 more months, prove it, then spin out with traction.

---

## 2. What Stays in Kyra, What Moves to NewCo

### Stays in Kyra (horizontal AI platform for agencies)

- Agency-tenant multi-client dashboard (`app/(dashboard)/agency/*`)
- CRM, pipeline, campaigns, funnels, email marketing, website builder
- GHL integration at the agency level
- The 50+ programmatic industry landing pages (collapsed to core horizontal verticals)
- `meetkyra.com` domain
- Existing agency customers
- Existing Stripe platform
- Generic "Business-in-a-Box" orchestrator
- The 15 cron jobs (minus any vertical-specific)
- SEO/GEO Command Center as a Kyra agency feature

### Moves to NewCo (regulated verticals: cannabis, clinics, legal, financial)

- A fork of the per-client container orchestration (OVH provisioner + nginx + router sidecar — **same VPS** can host both, isolated at container level)
- New compliance engine (cannabis rules, HIPAA, etc.)
- New SMS cascade (Bandwidth + Telnyx + channel fallback)
- New vertical integrations (Dutchie, Treez, Alpine IQ, Aeropay, Clio, Redtail, etc.)
- New ICP-specific dashboard
- Purple Lotus and any dispensary pilots
- A new brand + domain
- A new Stripe account (or alternative for cannabis-ancillary)
- Dedicated compliance personnel + policies

### Shared between Kyra and NewCo (via shared npm packages)

- `@corp/core-container` — OVH provisioner client, session key helpers
- `@corp/core-secrets` — AES-256-GCM vault
- `@corp/core-security` — prompt-injection defense, output scanning
- `@corp/core-channels` — channel router primitives (not vertical configs)
- `@corp/core-voice` — 5-provider voice abstraction
- `@corp/core-ai` — Claude/OpenAI wrappers, model router
- `@corp/core-supabase` — factory + middleware patterns
- `@corp/core-billing` — credit engine primitives (each app has its own `CREDIT_COSTS`)

**Ownership of shared packages:** Kyra parent entity holds the copyright; NewCo licenses under a perpetual, royalty-free internal-use license (see §5).

---

## 3. Naming & Brand

### Naming criteria

1. Works across **all four verticals** (cannabis, clinics, legal, financial) — not cannabis-specific
2. Signals **AI + compliance/defense + precision** — not just "AI"
3. Available `.com` or `.ai` domain + USPTO clearance in classes 9 (software) and 42 (SaaS)
4. No cringe, no puns, memorable in a sales call
5. Prefer single-word or two-syllable

### Proposed names (ranked, then validate trademarks)

| Rank | Name | Metaphor | Reasoning |
|---|---|---|---|
| 1 | **Aegis** | Ancient shield | Protection, defense. Works for every regulated vertical. Aegis.ai / aegis.so potentially available; USPTO has filings but mostly in narrow classes. |
| 2 | **Rampart** | Castle wall | Defensive moat. Strong, specific. Less crowded in SaaS trademark space. |
| 3 | **Warrant** | Legal authorization | Double meaning: "this AI action is warranted" + "warrant" as legal instrument. Clean. |
| 4 | **Keystone** | Arch's central stone | Foundational, structural. Works metaphorically for "the stone that holds compliance together." |
| 5 | **Concord** | Agreement | Compliance + harmony. Classical feel. Some retail conflicts (Concord Records, Concord Foods). |
| 6 | **Parity** | Alignment | "In parity with regulation." Minimal and technical. Some crypto conflicts. |
| 7 | **Kyra Compliant** / **Kyra Vertical** | Parent brand leverage | Only if the cannabis-brand-dilution risk for Kyra parent is deemed acceptable. Fastest to market but structurally inferior. |

### Week 1 naming task

- [ ] Trademark clearance via **LegalZoom** or a cheap IP attorney ($500–$1,500) for top 3 names across US + Canada in classes 9, 35, 42
- [ ] Domain purchase for top 3: `.com`, `.ai`, `.co`
- [ ] Social handle reservation: `@{name}ai` across X, LinkedIn, Instagram, YouTube, GitHub org

**Default assumption for the rest of this document:** NewCo = **Aegis**. Substitute your chosen name throughout.

### Brand positioning (one-liner variants)

- "The AI workforce platform built for regulated industries."
- "AI employees that know your compliance rules before you do."
- "Where AI and regulation agree."

### Visual identity (commission in Week 2)

- Logo + wordmark: $1,500–$5,000 via 99designs / Looka / a freelancer on Dribbble.
- Typography, color palette. Prefer: deep navy or graphite + single accent (muted sage, legal-blue, or oxblood). Avoid the cannabis green trope — the brand transcends a single vertical.
- Brand guidelines doc (8–12 pages) delivered by Week 4.

---

## 4. Legal Entity & Cap Table

### Entity structure

**Aegis, Inc.** — Delaware C-corp. Standard for US SaaS, supports future fundraise, standard investor-friendly structure, zero state income tax at the entity level.

### Formation checklist

- [ ] **[seq]** Engage corporate counsel. **Recommended firms:** Gunderson Dettmer, Goodwin, Orrick (large) or Stripe Atlas + Clerky + LegalZoom (startup-tier). Budget: $3,500 via Clerky or $2,500 via Stripe Atlas; $8K–$15K via boutique counsel.
- [ ] **[seq]** Incorporate in Delaware. Obtain Certificate of Incorporation.
- [ ] **[seq]** Register as foreign entity in operating state (likely California — consult re: Texas or Nevada if relocation preferred for cannabis tax posture).
- [ ] **[seq]** Apply for EIN via IRS Form SS-4 (can be same-day online).
- [ ] **[seq]** Adopt bylaws + board resolutions (Clerky/Atlas auto-generates).
- [ ] **[seq]** Issue founder stock with **83(b) election filed within 30 days of grant**. This is non-negotiable; miss this and pay full tax on vested equity at fair-market each year.
- [ ] **[seq]** Cap table administration: **Carta** or **Pulley**. Both offer free tier for early-stage.
- [ ] **[seq]** EIN + operating agreement triggers bank account eligibility.
- [ ] **[par]** Register trademarks for chosen name (Class 9 + 42), logo.
- [ ] **[par]** Register domains (see §3).

**Timeline:** Entity live in 7–14 days from engagement.

### Cap table (proposed — adjust after discussion)

| Holder | Shares | % | Notes |
|---|---:|---:|---|
| Common stock authorized | 10,000,000 | — | Standard for early-stage |
| Steve (founder) | 4,000,000 | 40% | 4-year vest, 1-year cliff, standard |
| Angel (founder) | 4,000,000 | 40% | 4-year vest, 1-year cliff, standard |
| Employee Stock Option Pool | 1,500,000 | 15% | For first 5–10 hires; unallocated at formation |
| Kyra parent entity | 500,000 | 5% | Consideration for IP license (see §5) |

**Alternative:** if Kyra parent owns more of NewCo's IP (e.g., the entire OVH stack transfers), bump Kyra parent to 15–20% and reduce founder shares proportionally. This is a conversation between you and Angel to decide, grounded in which assets actually transfer.

**Founder vesting resets** on NewCo even though you've already worked on Kyra — this is standard and protects against a co-founder departing in Year 1.

### Board

- **Directors at formation:** Steve + Angel (2-person board). Add independent director at Series Seed or Year 2.
- **Observer rights:** None at formation. If Kyra parent holds 15%+, consider granting Kyra an observer seat.

### Equity grants for first hires

See §10 for specific ranges. Fold into the 15% option pool.

---

## 5. IP License Between Kyra and NewCo

### The problem

The existing Kyra codebase contains primitives NewCo needs (container orchestration, secrets vault, prompt-injection defense, etc.). You (Steve + Angel) developed these while Kyra was the sole entity. Transferring ownership cleanly protects both entities from future disputes.

### The solution: "IP Contribution + Cross-License Agreement"

Drafted by counsel; boilerplate for SaaS spin-outs.

**Core terms:**

1. **Kyra parent retains all IP rights** to the existing codebase as of the spin-out date.
2. Kyra parent **licenses specified modules** (see §2 shared packages list) to NewCo under a **perpetual, royalty-free, non-exclusive, non-transferable** license for NewCo's internal use only.
3. NewCo **owns outright any derivative works** it builds on top of the shared packages.
4. **Changes to shared packages** are contributed back to Kyra parent (bidirectional patches — think Apache-2.0 style contribution, but between two related companies).
5. **Consideration:** Kyra parent receives 5% common stock in NewCo at formation (per cap table above) OR a one-time lump-sum of $50K (founders choose based on Kyra's capital needs).
6. **Termination:** license survives any change-of-control or dissolution of either entity.
7. **Warranties:** Kyra parent warrants it has the right to license; no other indemnification.

**Cost to draft:** $2,500–$5,000 via startup counsel.

### What NOT to share — clean boundaries

These stay Kyra-only, never ported to NewCo:

- GHL integration (`lib/ghl/*`) — not relevant to NewCo verticals except as reference
- Agency tenancy model (`lib/agency/*`) — NewCo uses a simplified single-tenant-per-customer model
- Kyra's marketing surface (pitch decks, industry landing pages, blog)
- Kyra's customer list
- Kyra's Stripe account, Supabase project, Vercel project, OVH VPS (NewCo gets its own)

### Data separation (critical for cannabis)

- NewCo customers' data **never** touches Kyra's Supabase.
- NewCo uses its own Supabase project from Day 1.
- Shared engineers (you + Angel) have access to both, but code + keys are isolated.
- BAA, DPA, and MSA with customers references **NewCo only** — Kyra parent is never mentioned to customers.

---

## 6. Financial Foundation

### Banking

**Cannabis-ancillary SaaS status** — NewCo sells software to cannabis businesses but never touches cannabis product, inventory, or payments. This is low-scrutiny compared to "cannabis-touching" MRBs, but still requires disclosure and the right banking partner.

**Primary business checking:**

| Option | Cannabis-ancillary friendly? | Pros | Cons |
|---|---|---|---|
| **Mercury** | ✅ Yes | Startup-friendly, clean API, fast onboarding, FDIC-insured via partners | Must disclose cannabis clients during onboarding; approval not guaranteed |
| **Brex** | ⚠️ Restricted | Fast, credit line | More cannabis-averse |
| **Relay** | ✅ Yes | Explicitly OK with cannabis-ancillary | Smaller feature set |
| **First Citizens (formerly SVB)** | ⚠️ Case-by-case | Bank of record for most SaaS | Underwriting-heavy |
| **Chase Business** | ⚠️ No disclosure = risk | Branch access | Will close account if cannabis relationship discovered |
| **Safe Harbor Financial / Bloom / Herring** | ✅ (for MRB-touching) | Overkill for ancillary | Higher fees |

**Recommendation:** **Mercury** primary + **Relay** backup. Disclose cannabis-ancillary status honestly during onboarding.

### Corporate card

**Brex** or **Ramp** once you have $50K+ deposits. Both issue without personal guarantee based on bank balance.

### Payment processing (customer billing → NewCo)

**Critical distinction:** NewCo collects its own SaaS fees from dispensaries, clinics, etc. NewCo is **not** processing cannabis sales. Customer pays NewCo for software; customer's own customers pay via separate cannabis-compliant processor (Aeropay, Hypur) that NewCo integrates with.

| Option | Works for NewCo? | Notes |
|---|---|---|
| **Stripe** | ⚠️ Risky | Will close account if they learn about cannabis customer concentration. Viable ONLY if cannabis customers < 25% of revenue AND properly disclosed. Use for clinics/legal/financial from Day 1. |
| **Stripe Connect with cannabis-friendly underwriting** | ⚠️ No longer available broadly | Was possible pre-2023; not anymore. |
| **Adyen** | ✅ Yes | Higher volume threshold ($100K+/mo). Stricter but stable. |
| **NMI** | ✅ Yes | Gateway, works with cannabis-ancillary MIDs. |
| **Authorize.Net** | ✅ Yes | Legacy but reliable. |
| **Direct ACH via Plaid** | ✅ Yes | For enterprise-tier customers only. |
| **Invoice + wire** | ✅ Yes | Enterprise-tier fallback. |

**Recommendation for first 50 customers:**
- Clinics, legal, financial → **Stripe** (disclosed, segregated, under the 25% cannabis concentration rule).
- Cannabis customers → **Invoiced via NMI or ACH/wire** until volume justifies Adyen.
- Re-evaluate at $100K MRR.

### Accounting

- **Bookkeeping:** **Pilot** ($400/mo), **Bench** ($249/mo), or **Puzzle** ($40/mo startup tier).
- **Year-end filings + tax:** same accountant.
- **Accounting software:** **QuickBooks Online** (ubiquitous, required by most bookkeepers).
- **Chart of accounts:** SaaS-standard, with added categories for (a) vertical-specific revenue, (b) compliance costs (SOC 2 audit, insurance), (c) IP license fee to Kyra if structured as cash.

### Insurance

| Policy | Coverage | Estimated annual premium | When to buy |
|---|---|---:|---|
| **General Liability** | $1M / $2M aggregate | $800–$1,500 | Week 4 |
| **Professional Liability / E&O** | $1M | $1,200–$3,000 | Week 4 |
| **Cyber Liability** | $1M aggregate | $2,500–$5,000 | Week 6 — required by enterprise customers |
| **D&O** | $1M | $1,500–$3,500 | Month 6 or before first outside capital |
| **Workers' Comp** | State-required | $500–$1,500 | When first employee hired |
| **EPLI** (employment practices) | $1M | $800–$1,500 | Month 6 |

**Brokers:** **Embroker**, **Founder Shield**, **Vouch** — all startup-focused; will bundle and underwrite cannabis-ancillary correctly.

**Disclose cannabis-ancillary status** on every application. Non-disclosure voids coverage.

### Initial capital

**Minimum viable spin-out:** $35–60K runway for first 6 months before first customer revenue flows.

| Line item | Low | High |
|---|---:|---:|
| Incorporation + legal | $3,500 | $12,000 |
| Trademark + domains | $2,000 | $4,500 |
| Insurance (first-year premiums) | $7,000 | $15,000 |
| Accounting setup | $500 | $1,500 |
| Infrastructure (Supabase Pro, Vercel Pro, OVH, domains, 6 months) | $2,000 | $4,000 |
| Branding (logo, site, positioning) | $3,000 | $8,000 |
| First hire (Implementation Specialist, 3 months contract) | $18,000 | $25,000 |
| Marketing + events (MJBizCon 2026, Hall of Flowers) | $5,000 | $15,000 |
| Buffer | $5,000 | $10,000 |
| **Total** | **$46,000** | **$95,000** |

**Sources:**
- Founder contributions (convert to notes or straight equity).
- Loan from Kyra parent to NewCo — documented, interest-bearing (AFR minimum), repayable from NewCo revenue.
- Friends & family round ($100–250K).
- SAFE from a pre-seed angel (e.g., **Harlem Capital**, **Poseidon** for cannabis, **Greycroft**, **Costanoa**).
- Revenue-based financing post-launch via **Capchase** or **Pipe** once at $10K+ MRR.

**Recommended:** start with founder capital + Kyra-parent loan, then convert to SAFE at a $3–5M post-money cap when NewCo has 5 paying customers. This preserves dilution.

---

## 7. Compliance Foundation

NewCo's brand is "compliance-first." Your own compliance must be visibly first-class.

### Immediate (Weeks 1–4)

- [ ] **Privacy Policy** — published on NewCo domain. Template: Iubenda or Termly ($9–$49/mo) or draft via counsel.
- [ ] **Terms of Service** — SaaS MSA template via Clerky or Common Paper.
- [ ] **Data Processing Agreement (DPA)** — for customers handling PII/PHI; template from Common Paper or counsel.
- [ ] **Sub-processor list** — public page listing Supabase, Vercel, OVH, Anthropic, OpenAI, Bandwidth, Resend, etc.
- [ ] **Cookie consent** — standard banner (Iubenda covers this).
- [ ] **Information Security Policy** (internal) — 4–8 pages, owned by Steve. Free template via **SecureFrame** or **Vanta Prep**.
- [ ] **Acceptable Use Policy** — forbids customers from processing plant-touching cannabis transactions through NewCo software (keeps NewCo clearly ancillary).

### Month 1–3

- [ ] **Engage SOC 2 prep platform** — **Vanta** ($7,500/yr), **Drata** ($7,500/yr), or **SecureFrame** ($6,500/yr). All will guide you through policies, controls, vendor management, access reviews.
- [ ] **Complete SOC 2 policies** — ~30 required policies, mostly templated. 40–80 hours of founder time.
- [ ] **HIPAA compliance posture** — even if first customers are cannabis, HIPAA readiness lets you onboard clinic customers in Month 7 without delay. **HIPAA-ready via AWS Business Associate Agreement (BAA)** isn't required since you're on Supabase/Vercel — but you need BAAs with Supabase (they sign), Vercel (Enterprise tier signs, $2K/mo min), Anthropic (signs at $10K/yr MCC tier).
- [ ] **State cannabis compliance research** — for each state where your first 10 customers operate, document the AI-relevant rules (SMS content restrictions, age gate, advertising rules, data retention). Store in `lib/compliance/cannabis-rules.ts` (see `REGULATED-VERTICALS-ROADMAP.md` §5).

### Month 4–9

- [ ] **SOC 2 Type I audit** — $10–20K auditor fee via Vanta-partnered auditors (A-LIGN, Prescient Assurance). Certificate issued ~Month 9.
- [ ] **BAA workflow for clinics** — self-service signing via DocuSign API. Required before first clinic customer.
- [ ] **Penetration test** — **Cobalt** ($8–15K) or **HackerOne** ($15–30K). Required for SOC 2 Type II and enterprise deals.

### Month 9–18

- [ ] **SOC 2 Type II audit** — 6-month observation period then audit; $15–25K.
- [ ] **HIPAA audit or attestation** via third-party auditor (Compass IT Compliance, A-LIGN).
- [ ] **17a-4 vendor certification** (for financial vertical) — partner with **Smarsh** or **Global Relay** for the archival portion.
- [ ] **State cannabis licenses** — NOT required as SaaS-only ancillary, but confirm per-state. Some states (Oregon, Nevada) require any tech vendor touching transaction data to register.

### Document inventory (Month 3 target)

Stored in NewCo's internal drive, linked from a public trust center page:

- Privacy Policy
- Terms of Service / MSA template
- DPA template
- Sub-processor list
- Information Security Policy
- Acceptable Use Policy
- Business Continuity Plan (BCP)
- Incident Response Plan
- Vendor Management Policy
- Access Control Policy
- Password Policy
- Data Classification Policy
- Data Retention Policy
- Change Management Policy
- Employee Confidentiality Agreement
- Background Check Policy
- Risk Assessment Report (annual)
- Penetration Test Report (annual)
- SOC 2 Report (when available)

---

## 8. Technical Architecture

### Repository strategy

**Decision: monorepo with pnpm workspaces, split applications.**

```
newco-platform/
├── packages/
│   ├── core-container/       ← extracted from Kyra's lib/ovh + lib/agency/container
│   ├── core-secrets/         ← extracted from Kyra's lib/secrets
│   ├── core-security/        ← extracted from Kyra's lib/security
│   ├── core-channels/        ← extracted from Kyra's lib/channels
│   ├── core-voice/           ← extracted from Kyra's lib/voice
│   ├── core-ai/              ← extracted from Kyra's lib/ai
│   ├── core-supabase/        ← extracted from Kyra's lib/supabase
│   ├── core-compliance/      ← NEW — state rules engine, content rewriter, consent
│   ├── core-integrations/    ← NEW — Dutchie, Treez, Alpine IQ, Aeropay
│   └── ui-primitives/        ← tab bar, copy button, timeAgo (kill the Kyra duplicates while we're here)
├── apps/
│   └── newco/                ← the Next.js app (like Kyra's main app)
├── infra/
│   ├── provisioner/          ← can be a fork of Kyra's provisioner, or shared
│   ├── nginx/
│   └── terraform/            ← if you go that route for OVH
└── docs/
```

### Package strategy — publish privately via GitHub Packages

- Each `@newco/core-*` is a separate semver-versioned package.
- Private GitHub Packages org (`@newco`). Kyra can also consume them via a cross-org token if the shared-package model (§2) is used.
- CI runs full test suite on every package change.

### Infrastructure

| Layer | Choice | Cost (initial) | Rationale |
|---|---|---:|---|
| **Application hosting** | Vercel Pro | $20/mo per seat + usage | Same stack as Kyra, zero learning curve |
| **Database** | Supabase Pro ($25/mo) | $25/mo | BAA-ready, familiar, Postgres + Auth + Storage + RLS |
| **Container substrate** | OVH VPS (same physical server as Kyra, different Docker network) | $80/mo current | Already paid; isolate via Docker + Traefik per-host routing |
| **CDN** | Cloudflare | $0 (free tier) | Standard |
| **Object storage** | Supabase Storage | included | Audit exports, document uploads |
| **Monitoring** | Better Stack (formerly Logtail) | $30/mo | Logs + uptime |
| **Error tracking** | Sentry | $26/mo | Standard |
| **Email** | Resend | $20/mo + usage | Transactional from `no-reply@{newco}.ai` |
| **Status page** | Better Stack Status | included above | Public trust signal |
| **Secrets** | Vercel env + Doppler | $20/mo (Doppler Team) | Cross-env secret rotation |
| **Analytics** | PostHog | Free tier → $450/mo | Product + marketing |

**Total monthly infra cost at launch: ~$200–300.** Scales to ~$1–2K at 50 customers.

### Domain strategy

- **Primary product:** `{newco}.ai` (assume `aegis.ai`)
- **Marketing:** same domain (`aegis.ai` / `aegis.ai/cannabis`, `aegis.ai/clinics` etc.)
- **API:** `api.aegis.ai`
- **Docs:** `docs.aegis.ai`
- **Status:** `status.aegis.ai`
- **Trust center:** `trust.aegis.ai`
- **Per-customer subdomain:** `{customer}.aegis.ai` for their portal (mirrors Kyra's Traefik per-client subdomain pattern)
- **Customer gateway:** `{client-id}.gw.aegis.ai` (matches Kyra's container pattern)

**Register early:** `.com`, `.ai`, `.co`, `.app`, `.so`. Defensive registrations ~$200 total.

### Code migration sequence (Weeks 3–6)

```
Week 3: Extract `core-secrets` → publish as @newco/core-secrets@0.1.0
Week 3: Extract `core-security` → publish as @newco/core-security@0.1.0
Week 3: Extract `core-ai` → publish as @newco/core-ai@0.1.0
Week 4: Extract `core-channels` → publish as @newco/core-channels@0.1.0
Week 4: Extract `core-voice` → publish as @newco/core-voice@0.1.0
Week 4: Extract `core-supabase` → publish as @newco/core-supabase@0.1.0
Week 5: Extract `core-container` (OVH provisioner client) → @newco/core-container@0.1.0
Week 5: Scaffold `apps/newco` Next.js app. Install packages.
Week 6: Build `core-compliance` package (new — state rules engine for cannabis starting with CA).
Week 6: Build `core-integrations/dutchie.ts` (first vertical integration).
```

Parallel track: keep Kyra running on the unextracted code for now. Migrate Kyra to consume the `@newco/core-*` packages in a later phase (Month 4–6) — pays back tech debt on both sides.

### Database schema for NewCo

Fresh Supabase project. Borrow schema patterns from Kyra but start clean. Tables Day 1:

- `customers` (NewCo's tenants — not agencies, but businesses directly)
- `customer_users` (staff at each customer)
- `customer_contacts` (the customer's customers — "contacts" unified across verticals)
- `conversations` + `messages` (channel-agnostic)
- `customer_memory` (per-contact structured memory — borrow from Kyra)
- `knowledge_documents` + `client_knowledge` (borrow)
- `integrations` (per-customer OAuth for Dutchie, Jane, etc.)
- `secrets` (AES-256-GCM vault — borrow)
- `compliance_rules_overrides` (per-customer overrides on state defaults)
- `consent_records` (opt-in/opt-out history with immutable audit trail)
- `audit_log` (everything the AI does, who approved, when)
- `action_proposals` + `action_log` (HITL — borrow from Kyra)
- `channels_config` per customer
- `sms_delivery_log` (cross-provider delivery receipts)
- `billing_*` tables (NewCo's own billing — separate from Kyra)
- `credits` (if using credit model — consider flat subscription instead for NewCo)

**RLS from Day 1 on every table.** Learn from Kyra's gap list.

### Hosting cost posture vs Kyra

Because NewCo customers are direct SMBs (not agencies), the "one container per end-client" math changes:

- Kyra: 1 agency has N clients (workers) → N containers.
- NewCo: 1 customer = 1 container. Simpler math, lower overhead per dollar of ARR.

At 100 NewCo customers: 100 containers on a single OVH VPS is feasible (~1.5GB memory each = 150GB — fits on one larger server or 2 mid-sized).

---

## 9. Product Definition

### v0 — Closed alpha (Weeks 5–8, cannabis only, Purple Lotus + 2 others)

Feature set (ruthlessly minimal):

- Single customer dashboard (one NewCo account per dispensary)
- Unified inbox: SMS + web chat + voice (Retell or Kyra Native)
- AI replies with compliance content rewriter active
- Dutchie menu sync (read-only)
- Jane Algolia fallback (already built)
- Onfleet delivery dispatch (already built)
- HITL review queue for any message flagged medium/high risk
- Consent opt-in / opt-out management
- Audit export (ZIP of conversations + consent + actions)
- California state rules only
- Emergency one-click "pause AI" toggle (humans take over)

**Explicitly NOT in v0:**
- Website builder
- Email campaigns
- Funnels
- Loyalty (Alpine IQ integration is v1)
- Multi-location
- Multi-state
- Pipelines / outbound sales
- Cannabis Business Profile posts

### v1 — General availability (Month 4, cannabis)

Add:
- Treez + Flowhub POS integrations
- Alpine IQ loyalty sync
- Aeropay payment-link generation
- Weedmaps + Leafly review response
- Metrc state-tracking integration
- Multi-state rules (at least CA, CO, MA, NY, IL, MI)
- Multi-location support
- Reorder nudge autopilot
- Budtender training module
- Customer-facing portal (their staff can train the AI, review queued messages)
- Self-service state expansion

### v2 — Clinics launch (Month 7)

Add:
- BAA self-service signing
- Jane practice management (dual-use for clinics — already have partial)
- Dentrix / Open Dental integrations
- HIPAA-aware logging
- Insurance verification (Nirvana or Change Healthcare)
- Appointment waitlist AI
- PHI-redacted telemetry toggles

### Pricing

**Cannabis tier (v0–v1):**

| Plan | Monthly | Includes |
|---|---:|---|
| Starter | $499 | 1 location, unified inbox, 1 POS integration, CA rules only, 2K messages/mo |
| Growth | $1,299 | Up to 3 locations, 2 POS, multi-state, Alpine IQ, Onfleet, 10K messages/mo, HITL queue |
| Enterprise | $2,999 | Unlimited locations, all integrations, priority support, custom SOUL, SOC 2 report access, dedicated Slack channel |

**Clinics tier (v2):**

| Plan | Monthly | Includes |
|---|---:|---|
| Solo | $399 | 1 practitioner, unified inbox, HIPAA BAA |
| Group | $899 | Up to 5 practitioners, insurance verification, 1 PM system integration |
| Multi-location | $1,999 | Unlimited practitioners, multiple PM systems, SSO |

**Charge monthly, 1-year commit discount 15%, pilot discount 50% for first 3 months on first 10 customers per vertical.**

### Unit economics target

- Blended ACV: $1,100/mo × 12 = $13,200/yr
- CAC target (cannabis direct): $1,500 (events + content + outbound)
- Payback: 1.4 months gross
- Gross margin: 75%+
- Net dollar retention target: 110% (Year 2)

---

## 10. Team & Equity

### Founders

- **Steve** — CEO, product, engineering. 40%.
- **Angel** — CRO, sales, compliance operations. 40%.
- 4-year vest with 1-year cliff, standard.

### Hire #1 — Implementation & Compliance Specialist (Month 1)

**Profile:** former dispensary ops manager OR cannabis-tech account manager (Springbig, Alpine IQ, Dutchie alum ideal). Knows cannabis compliance viscerally. Has opinions about what dispensaries need.

**Comp:** $85–110K base + 0.5–1.0% equity (4-year vest, 1-year cliff). Contract-to-hire first 3 months.

**Responsibilities:**
- Onboard first 20 customers
- Own state compliance configs (CA, then CO, MA, NY, IL, MI)
- Own Dutchie + Alpine IQ integration specs (engineering builds, this role scopes)
- Customer success for cannabis book
- MJBizCon / Hall of Flowers presence

**Sourcing:** Cannabis industry LinkedIn, Canna-Recruiter.com, direct outreach to Springbig/Alpine IQ/Dutchie support team alumni.

### Hire #2 — Full-stack Engineer (Month 4)

**Profile:** senior Next.js + TypeScript + Postgres. Ideally has one prior startup + one enterprise shop. Comfortable with compliance-heavy work.

**Comp:** $150–185K base + 0.5–1.25% equity.

**Responsibilities:**
- SMS cascade (Bandwidth, Telnyx, Sakari adapter layer)
- Integrations pipeline (Dutchie, Treez, Flowhub, Metrc, Alpine IQ, Aeropay)
- HIPAA prep for clinics vertical (Month 7)
- SOC 2 controls implementation

### Hire #3 — Head of Compliance (Month 9)

**Profile:** licensed attorney (healthcare or regulatory practice) OR former in-house compliance at a fintech/healthtech. HIPAA + FINRA literacy required. Cannabis knowledge a plus.

**Comp:** $170–220K base + 0.5–1.0% equity. Could be fractional via **Pali Partners** or **Compliance.ai** advisory firms first.

**Responsibilities:**
- Own SOC 2 Type II completion
- Own HIPAA posture
- Own FINRA prep for financial vertical
- Customer compliance questions ("can the AI send this in Oregon?")
- Regulatory liaison

### Hire #4 — Customer Success Lead (Month 10)

**Profile:** 2–4 years SaaS CS. Vertical SaaS preferred.

**Comp:** $95–125K base + 0.25–0.5% equity.

**Responsibilities:**
- Post-onboarding ownership for cannabis book (50+ customers by then)
- NPS, expansion, churn metrics
- Renewals

### Hire #5 — Sales Development Rep (Month 11, optional)

Only hire if outbound sales motion is working and founders are capacity-constrained. Otherwise Angel continues as solo AE.

### Hire #6 — Clinics Implementation Specialist (Month 7)

Mirror of Hire #1 for clinics vertical. Former medspa / dental practice manager.

### Team-size ceiling

**Stay under 10 people through end of Year 2.** Compliance-first SaaS rewards operational discipline, not headcount. If ARR is growing but you feel like you need more people, the problem is usually unclear product scope, not throughput.

### Kyra team allocation

Steve and Angel split time across both companies. Rough target:

- **Month 1–3:** Angel 80% NewCo, Steve 50% NewCo
- **Month 4–6:** Angel 90% NewCo, Steve 70% NewCo
- **Month 7+:** Both 80% NewCo, 20% Kyra (or hire Kyra GM)

If you can't afford to spend 70%+ on NewCo, don't spin it out. Operating a serious regulated-SaaS company part-time does not work.

---

## 11. Go-to-Market

### ICP — First 20 customers (cannabis)

**Ideal Customer Profile (dispensary)**
- Single-state operator (simpler compliance onboarding)
- 1–5 retail locations OR 1 delivery operator
- $2M–$15M annual revenue (they have budget but aren't bureaucratic enterprises)
- Using Dutchie or Treez POS (primary integrations)
- Located in CA, CO, MA, NY, IL, or MI (states with mature rules engines)
- Has an existing SMS program that's hitting carrier blocking (pain is acute)

**Disqualifying signals:**
- Multi-state operator with > 10 locations (too complex for v0/v1)
- Still paper-based (not ready)
- Pure wholesale (wrong end-customer)
- Ownership in legal jeopardy (compliance spillover risk)

### First 10 customers — source (Week 4–12)

Warm intros via:

- **Purple Lotus** (Steve + Angel's existing relationship) — guaranteed customer #1, referral source for 3–5 more in their network
- **Dutchie app marketplace** — list as integration partner; submit partner application Week 4
- **Alpine IQ partner directory** — submit Week 5
- **Cannabis SaaS LinkedIn ecosystem** — Steve and Angel each cold outreach to 50 dispensary owners/COOs they share connections with (aim 10% reply rate → 10 conversations)
- **Purple Lotus case study** — publish by Week 8, publicize via cannabis press (MJBizDaily, Green Market Report, Cannabis Business Times)
- **MJBizCon 2026** (Las Vegas, Nov 2026) — book booth ($15K) or co-sponsor partner booth

### Sales motion

**Deal velocity target: 30 days from first call to signed contract for first 10.**

| Stage | Activity | Duration |
|---|---|---|
| Prospect | Angel outbound / Purple Lotus intro | Day 0 |
| Discovery call | 45 min — pain, current stack, compliance concerns | Week 1 |
| Demo | Live demo with their actual menu (Dutchie API synced) | Week 2 |
| Pilot offer | 60-day free pilot (50% discount on months 3–5, then standard) | Week 3 |
| Onboarding | 1 week from contract to live — Implementation Specialist owns | Week 4 |

### Content & SEO (compounds slowly but permanently)

- **Weekly blog posts** — cannabis SMS compliance guide per state, AI for dispensaries deep-dives, state rule updates, regulatory news commentary
- **SEO targeting:** "cannabis dispensary AI," "dispensary chatbot compliance," "cannabis SMS alternative to Springbig," "Dutchie AI integration"
- **Comparison pages:** NewCo vs Springbig (with caveat — don't attack, position adjacent), NewCo vs Alpine IQ, NewCo vs Ruby (for when clinics launches)
- **Public case studies:** Purple Lotus → each subsequent customer → every 6 weeks add one
- **LinkedIn:** Angel posts 3x/week, Steve 1x/week; customer story amplification
- **Podcast tour:** target **The Green Rush**, **CannaInsider**, **Business of Cannabis** by Month 4

### Events (Year 1)

| Event | Date | Cost | Role |
|---|---|---:|---|
| Benzinga Cannabis Capital Conference | April 2026 | $1,500 attend | Networking only |
| MJBizCon | Nov 2026 | $15K booth + $10K travel | Primary annual event |
| Hall of Flowers | Fall 2026 | $5K | Networking |
| CannaCon | Regional throughout year | $2K each × 2 | Low-touch visibility |

### Partnership / channel strategy

Year 1 target — 3 signed partner agreements:

1. **Cannabis accounting firms** — Dope CFO, Bridge West, GreenGrowth CPAs. Refer clients; we pay 20% of Year 1 revenue as referral fee.
2. **Cannabis tech consultancies** — Frontier Green, High Yield Insights, Marijuana Venture. White-label tier at 50% rev share.
3. **POS partners** — Dutchie + Treez direct partner listings with co-marketing.

### Year 1 GTM metrics target

| Quarter | Customers | MRR | New logos/quarter | CAC | Gross margin |
|---|---:|---:|---:|---:|---:|
| Q1 | 3 | $3K | 3 | $500 (warm intros) | 60% |
| Q2 | 12 | $14K | 9 | $1,200 | 70% |
| Q3 | 30 | $38K | 18 | $1,500 | 72% |
| Q4 | 55 | $75K | 25 | $1,800 | 75% |

---

## 12. 90-Day Execution Plan

Week-by-week. Owner annotated.

### Week 1

- [ ] **[S]** Decide final name (review top 3 with 1-hour session) and check trademark/domain availability.
- [ ] **[S]** Engage incorporation service (Clerky or Stripe Atlas).
- [ ] **[S]** Sign corporate formation papers; file 83(b) elections.
- [ ] **[A]** Schedule Purple Lotus v0 alpha kickoff call (alpha commitment, SOW).
- [ ] **[A]** Draft list of 50 warm-outreach dispensaries (Steve + Angel contacts overlap).
- [ ] **[S+A]** Decide equity split + Kyra parent consideration.
- [ ] **[S]** Draft IP license agreement w/ counsel.

### Week 2

- [ ] **[S]** Open Mercury account; fund with initial capital.
- [ ] **[S]** Register trademarks (top 2 names for defense).
- [ ] **[S]** Purchase domains, set up DNS.
- [ ] **[A]** Commission logo + brand identity (Looka or freelancer).
- [ ] **[A]** Start designing meetkyra-sibling landing page (1-page placeholder).
- [ ] **[S]** Set up Supabase Pro project, Vercel Pro project, GitHub org.
- [ ] **[S]** Scaffold monorepo with pnpm workspaces.

### Week 3

- [ ] **[S]** Extract `@newco/core-secrets`, `@newco/core-security`, `@newco/core-ai` packages.
- [ ] **[S]** Publish to GitHub Packages.
- [ ] **[A]** Draft v0 SOW with Purple Lotus (50% alpha discount, 60-day terms, mutual press release).
- [ ] **[A]** Start 50-dispensary outbound sequence (LinkedIn + email, 10/day).
- [ ] **[S]** Finalize IP license; sign.
- [ ] **[S]** Set up Doppler for secrets management, Sentry, Better Stack.

### Week 4

- [ ] **[S]** Extract `@newco/core-channels`, `@newco/core-voice`, `@newco/core-supabase`.
- [ ] **[S]** Scaffold `apps/newco` Next.js app; install packages; deploy empty app to Vercel.
- [ ] **[S]** Open Stripe account (disclose cannabis-ancillary + < 25% revenue concentration plan).
- [ ] **[S]** Purchase insurance: General Liability + E&O. Cyber by Week 6.
- [ ] **[A]** Interview Implementation Specialist candidates (target 5 interviews by Week 6).
- [ ] **[A]** Finalize branding kit from designer.
- [ ] **[S+A]** Publish placeholder landing page with "Coming soon — AI for regulated industries. Join waitlist" form.

### Week 5

- [ ] **[S]** Extract `@newco/core-container` (OVH provisioner client wrapper).
- [ ] **[S]** Provision separate Docker network on existing OVH VPS for NewCo containers.
- [ ] **[S]** Build `@newco/core-compliance` package — start with `cannabis-rules.ts` for California only.
- [ ] **[A]** Close Implementation Specialist hire.
- [ ] **[A]** Submit Dutchie partner application.
- [ ] **[A]** Submit Alpine IQ partner application.

### Week 6

- [ ] **[S]** Build `@newco/core-integrations/dutchie.ts` MVP — menu sync only.
- [ ] **[S]** Scaffold NewCo Supabase schema (customers, contacts, conversations, consent, audit_log, secrets).
- [ ] **[S]** Purchase Cyber Liability insurance.
- [ ] **[IS]** (New hire starts.) Onboard; review Purple Lotus account; start v0 config.
- [ ] **[A]** First 3 discovery calls with cold-outreach dispensaries.

### Week 7

- [ ] **[S]** Build minimal NewCo dashboard: unified inbox + customer switcher + audit log viewer.
- [ ] **[IS]** Build first CA compliance-rule config with Steve.
- [ ] **[A]** Convert 1–2 discovery calls to pilot commitment ($500/mo signed for 60-day).
- [ ] **[S+IS]** Deploy Purple Lotus alpha — their existing Kyra account is migrated or mirrored to NewCo.

### Week 8

- [ ] **[IS]** Purple Lotus v0 LIVE on NewCo. Milestone: first paid customer.
- [ ] **[S]** Set up SOC 2 prep via Vanta.
- [ ] **[S]** Write Information Security Policy + Acceptable Use Policy.
- [ ] **[A]** Publish Purple Lotus case study on website + LinkedIn + cannabis press outreach.
- [ ] **[S+A]** Review first 30 days post-launch: what's working, what's painful, kill list.

### Week 9

- [ ] **[S]** Add Treez integration.
- [ ] **[IS]** Onboard customer #2.
- [ ] **[A]** Book MJBizCon 2026 booth if calendar allows and target revenue proves warranted.
- [ ] **[S]** Write Privacy Policy + ToS + DPA.

### Week 10

- [ ] **[S]** Add Bandwidth SMS provider. First cannabis SMS sent through NewCo's own stack.
- [ ] **[IS]** Onboard customer #3.
- [ ] **[A]** Apply to 2 cannabis-industry media outlets for product coverage.

### Week 11

- [ ] **[S]** Alpine IQ integration live.
- [ ] **[S]** Aeropay payment-link generation live.
- [ ] **[IS]** Customer #4.
- [ ] **[A]** First partnership conversation with a cannabis accounting firm.

### Week 12

- [ ] **[S+A]** 90-day review: revenue vs target, product gaps, customer feedback, hiring plan.
- [ ] **[S]** Publish v1 roadmap based on customer input.
- [ ] **[S]** Ship audit export feature.
- [ ] **[IS]** Customer #5.

### End-of-90-day target

- 5 paying cannabis customers
- $8–12K MRR
- Entity formed, banking live, insurance in place
- SOC 2 prep engaged
- 1 published case study
- 2 integrations live (Dutchie + Alpine IQ)
- 1 employee hired

**If short of 3 paying customers by Week 12:** halt, review, consider merging back into Kyra or pivoting vertical priority (clinics first instead).

---

## 13. 12-Month Operating Cadence

### Weekly

- **Monday AM** — 30 min founder sync: last week's wins/losses, this week's top 3 priorities, blockers.
- **Wednesday PM** — 30 min product review: bug triage, shipping decisions, customer tickets.
- **Friday PM** — 30 min GTM review: pipeline, demos scheduled, content shipped, partnership progress.

### Monthly

- Metrics review against plan (customers, MRR, CAC, gross margin, NPS, churn)
- Financial review with bookkeeper
- Compliance review (SOC 2 progress, incidents, vendor updates)
- 1:1 with each hire
- Board update email to Kyra parent entity (as minority holder)

### Quarterly

- Strategy review: on track vs plan, tripwires, course corrections
- Pricing review (after 3 months of data)
- Hiring review (next 2 hires confirmed, job specs open)
- SOC 2 progress (at start of Month 7, audit should be scheduled)

---

## 14. Kyra ↔ NewCo Operating Agreement

Practical day-to-day separation to avoid commingling.

### Founder time

- Steve + Angel track hours roughly per week; quarterly rebalance if imbalanced.
- Major Kyra decisions in Kyra Slack; NewCo decisions in NewCo Slack. No cross-posting of customer data.

### Shared services

- **Legal counsel:** same firm, separate matters, separate engagement letters per entity.
- **Accountant:** same firm, separate books.
- **Insurance broker:** same broker, separate policies per entity.

### Technical

- **Shared infrastructure:** OVH VPS same physical server BUT separate Docker networks, separate Traefik router, separate secrets, separate Supabase projects.
- **No customer data crosses** between entities. Ever. Not for demos, not for migrations.
- **Shared packages** published under `@newco` namespace; Kyra consumes them via NPM scoped auth token (reciprocal license per §5).

### Marketing & brand

- **Zero explicit co-marketing** in Year 1. Kyra doesn't mention NewCo; NewCo doesn't mention Kyra. This is critical: if cannabis compliance story lands on NewCo's customers and they discover Kyra parent is serving unrelated markets, it undermines NewCo's "we're the compliance specialist" positioning. And if Kyra's customers see cannabis branding, underwriting and banking risk rises.
- **Founders can appear at Kyra events OR NewCo events, not both at same show.**

### Customer overlap

- If a Kyra agency customer wants to sell to a dispensary, they can resell NewCo as a white-label partner (separate contract, rev share). No auto-provisioning across entities.

### Dispute resolution

- IP disputes go to an independent advisor (name one at entity formation).
- Revenue / rev-share disputes go to the accounting firm's managing partner.
- Nothing in the operating agreement prevents either entity from suing the other, but the operating agreement pre-commits to 30-day mediation first.

---

## Appendix A — Master Checklist

High-level execution order. Numbered. Check off as done.

### A. Legal & Entity (Week 1–3)

- [ ] 1. Choose entity name (complete trademark + domain clearance)
- [ ] 2. File Certificate of Incorporation (Delaware C-corp)
- [ ] 3. Foreign entity registration (operating state)
- [ ] 4. Apply for EIN
- [ ] 5. Adopt bylaws
- [ ] 6. Issue founder stock
- [ ] 7. File 83(b) elections within 30 days of grant
- [ ] 8. Cap table setup (Carta or Pulley)
- [ ] 9. Register trademarks
- [ ] 10. Register domains
- [ ] 11. Draft + sign IP license agreement with Kyra parent
- [ ] 12. Draft + sign founder employment agreements with NewCo

### B. Financial (Week 2–4)

- [ ] 13. Open Mercury business checking
- [ ] 14. Open backup Relay account
- [ ] 15. Fund initial capital ($35–60K)
- [ ] 16. Engage bookkeeper (Pilot / Puzzle)
- [ ] 17. Set up QuickBooks Online
- [ ] 18. Purchase General Liability + E&O insurance
- [ ] 19. Purchase Cyber Liability insurance (Week 6)
- [ ] 20. Set up Stripe account (disclose cannabis-ancillary status)
- [ ] 21. Set up NMI or ACH payment fallback for cannabis customers

### C. Brand & Web (Week 1–6)

- [ ] 22. Commission logo + brand identity
- [ ] 23. Publish placeholder landing page
- [ ] 24. Reserve social handles
- [ ] 25. Design full marketing site (by Week 8)
- [ ] 26. Write positioning + messaging foundation
- [ ] 27. Set up email (`{name}@newco.ai`, `hello@newco.ai`) via Google Workspace

### D. Infrastructure (Week 3–6)

- [ ] 28. Set up Supabase Pro project
- [ ] 29. Set up Vercel Pro project
- [ ] 30. Set up Cloudflare DNS
- [ ] 31. Set up GitHub org + private packages
- [ ] 32. Scaffold monorepo
- [ ] 33. Extract 7 shared packages
- [ ] 34. Scaffold Next.js app
- [ ] 35. Deploy empty app to Vercel
- [ ] 36. Provision OVH Docker network for NewCo
- [ ] 37. Set up Sentry, Better Stack, Doppler, Resend, PostHog

### E. Product v0 (Week 5–8)

- [ ] 38. Build core-compliance package (CA rules first)
- [ ] 39. Build Dutchie integration
- [ ] 40. Build unified inbox dashboard
- [ ] 41. Build HITL review queue UI
- [ ] 42. Build audit export
- [ ] 43. Build consent manager
- [ ] 44. Migrate Purple Lotus to NewCo
- [ ] 45. Launch closed alpha with 3 customers

### F. Compliance (Month 1–9)

- [ ] 46. Draft + publish Privacy Policy
- [ ] 47. Draft + publish Terms of Service
- [ ] 48. Draft DPA template
- [ ] 49. Publish sub-processor list
- [ ] 50. Write Information Security Policy (internal)
- [ ] 51. Engage Vanta / Drata / SecureFrame
- [ ] 52. Complete SOC 2 policy set (30+ policies)
- [ ] 53. Set up BAA workflow for future HIPAA
- [ ] 54. SOC 2 Type I audit (Month 9)

### G. Team (Month 1–12)

- [ ] 55. Hire Implementation Specialist (Month 1)
- [ ] 56. Hire Full-stack Engineer (Month 4)
- [ ] 57. Hire Head of Compliance (Month 9)
- [ ] 58. Hire Customer Success Lead (Month 10)
- [ ] 59. Hire Clinics Implementation Specialist (Month 7)

### H. Go-to-Market (Week 4–Month 12)

- [ ] 60. Purple Lotus case study published
- [ ] 61. Dutchie partner listing approved
- [ ] 62. Alpine IQ partner listing approved
- [ ] 63. First 5 paying customers (Week 12)
- [ ] 64. First 20 paying customers (Month 6)
- [ ] 65. First 50 paying customers (Month 9)
- [ ] 66. MJBizCon booth (Month 11)
- [ ] 67. 3 partnership agreements signed (Month 12)

---

## Appendix B — Vendor Stack

Everything NewCo consumes, grouped.

### Infrastructure
- Supabase Pro — $25/mo
- Vercel Pro — $20/mo per seat
- OVH VPS — shared with Kyra, cost-allocated
- Cloudflare — free tier

### Dev tools
- GitHub Team — $44/mo (shared with Kyra or separate)
- Doppler Team — $20/mo
- Sentry — $26/mo
- Better Stack — $30/mo
- PostHog — free → $450/mo

### Business / operations
- Mercury — free
- Relay — free
- Stripe — transaction fees
- NMI — gateway fees
- Pilot bookkeeping — $400/mo
- QuickBooks Online — $85/mo
- Google Workspace — $14/user/mo
- DocuSign — $45/mo
- Notion — $10/mo per seat
- Slack — $8.75/mo per active user
- Linear — $10/mo per seat
- Carta — free at < 25 stakeholders

### Compliance
- Vanta / Drata — $7,500/yr
- Iubenda — $49/mo
- Cobalt pentest — $10K once per year
- A-LIGN audit — $15K once per year
- Common Paper (contract templates) — $499/yr

### Insurance
- Embroker broker — fees embedded in premiums
- Total annual premiums — $13K–$30K depending on stage

### Sales & marketing
- Apollo.io or Clay — $99–$200/mo
- Hypefury or Typefully — $20/mo (social scheduling)
- Webflow — $29/mo if not building marketing on Next.js
- Calendly — $16/mo per seat
- Loom — $8/mo per seat

### Product integrations (eventual)
- Dutchie, Treez, Flowhub, Jane, Metrc — integration costs mostly dev time, some have revenue share
- Alpine IQ — partner integration, no direct cost
- Aeropay — revenue share
- Bandwidth, Telnyx, Sakari — per-message SMS fees
- Resend — transactional email, $20+/mo
- Retell AI, Vapi, Synthflow — per-voice-minute
- Anthropic — model API fees
- OpenAI — model API fees

**Total monthly vendor cost at launch:** ~$1,200–$1,800. At 50 customers: ~$4–6K.

---

## Appendix C — Policy Document Templates

The 30 policies SOC 2 requires, in priority order. Draft in Notion; link from a public trust center as applicable.

1. Information Security Policy
2. Acceptable Use Policy
3. Access Control Policy
4. Password Policy
5. Data Classification Policy
6. Data Retention & Destruction Policy
7. Data Protection & Privacy Policy
8. Incident Response Plan
9. Business Continuity / Disaster Recovery Plan
10. Change Management Policy
11. Vendor Management Policy
12. Risk Assessment Policy
13. Security Awareness & Training Policy
14. Remote Access Policy
15. Bring-Your-Own-Device (BYOD) Policy
16. Encryption Policy
17. Logging & Monitoring Policy
18. Backup Policy
19. Configuration Management Policy
20. Secure Development Policy
21. Code Review Policy
22. Release Management Policy
23. Patch Management Policy
24. Vulnerability Management Policy
25. Penetration Testing Policy
26. Physical Security Policy
27. Employment Practices Policy
28. Background Check Policy
29. Termination Policy
30. Whistleblower Policy

Vanta / Drata / SecureFrame auto-generate templates for all 30 once engaged. Customize per your operations, sign them, review annually.

---

_End of playbook. Review quarterly. Update live as execution teaches you what's wrong._
