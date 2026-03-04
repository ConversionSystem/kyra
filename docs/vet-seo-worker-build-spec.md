# Veterinary SEO/GEO Worker — Complete Build Spec

## Product Definition

**What:** A premium AI worker template inside Kyra that autonomously manages off-site SEO and GEO (Generative Engine Optimization) for veterinary clinics.

**Pricing:** $79/mo per vet SEO worker — on top of the agency's existing Kyra plan. Bundles all LLM tokens, external APIs, and infrastructure.

**Economics:**
- Kyra charges agency: $79/mo per vet SEO worker
- Kyra's cost: ~$10/mo per worker (LLM + APIs + infra)
- **Kyra margin: $69/mo per worker (87%)**
- Agency charges their vet client: $500-2,000/mo
- **Agency margin: $421-1,921/mo per client (84-96%)**

**Example:** Agency on Pro ($249/mo, 10 slots) deploys 5 regular AI workers + 5 vet SEO workers.
- Agency pays: $249 + (5 × $79) = $644/mo to Kyra
- Agency charges: 5 vet clients × $997/mo = $4,985/mo
- Agency profit: $4,341/mo

---

## What the Vet SEO Worker Does (Client-Facing)

Every month, for each vet clinic, the AI worker autonomously:

1. **GEO Visibility Testing** — Tests whether ChatGPT, Perplexity, and Gemini recommend the clinic when asked "best vet in [city]" across 20+ query variations. Tracks weekly trends.

2. **NAP Consistency Auditing** — Scrapes 15+ directories (Yelp, Google, Healthgrades, YellowPages, etc.) and flags any Name/Address/Phone mismatches.

3. **Content Creation** — Writes 15-20 pieces of SEO content: press releases, Web 2.0 articles, semantic authority stack pages. All locally optimized with Google Maps embeds, NAP data, and city references.

4. **Multi-Platform Publishing** — Posts content to WordPress.com, Blogger, Telegraph, Notion, Google Docs, Google Sites, and GitHub Pages. All via API — no fragile browser automation.

5. **Reddit Monitoring** — Watches city and pet subreddits daily for "best vet" discussions. Drafts helpful, natural recommendations. Agency reviews and posts.

6. **Outreach Scouting** — Finds pet/lifestyle/health blogs accepting guest posts in the clinic's city. Scores them. Drafts personalized pitch emails. Agency approves before send.

7. **Weekly SEO Report** — Compiles all activity into a client-ready report: GEO scores, content published, links built, Reddit mentions, NAP status.

---

## Technical Architecture

### Container Setup
```
1 OpenClaw container per vet client
├── Model: openai/gpt-4o (primary) + openai/gpt-4o-mini (cron tasks)
├── Template: vet-seo-worker
├── SOUL.md: Veterinary SEO specialist persona
├── Skills: 8 custom + 8 ClawHub
├── Cron jobs: 4 scheduled tasks
└── Channels: Dashboard (review queue) + optional Telegram
```

### Skills Architecture
```
vet-seo-worker/
├── skills/
│   ├── geo-tester/SKILL.md          ← Custom build
│   ├── nap-auditor/SKILL.md         ← Custom build
│   ├── seo-content-writer/SKILL.md  ← Custom build
│   ├── web20-publisher/SKILL.md     ← Custom build (uses ClawHub deps)
│   ├── semantic-stacker/SKILL.md    ← Custom build (uses ClawHub deps)
│   ├── outreach-scout/SKILL.md      ← Custom build (uses ClawHub deps)
│   ├── ugc-monitor/SKILL.md         ← Custom build (uses ClawHub dep)
│   └── seo-reporter/SKILL.md        ← Custom build
├── templates/
│   ├── SOUL.md                       ← Vet SEO persona
│   ├── press-release-prompt.md       ← PR generation prompt
│   ├── web20-article-prompt.md       ← Article generation prompt
│   ├── stack-content-prompt.md       ← Authority stack prompt
│   ├── outreach-pitch-prompt.md      ← Email pitch prompt
│   └── ugc-reply-prompt.md           ← Reddit reply prompt
└── config/
    ├── vet-directories.json          ← 20 vet-specific directories
    ├── geo-queries.json              ← 25+ GEO test queries
    ├── subreddits.json               ← City + pet subreddits to monitor
    └── web20-platforms.json          ← Publishing platform configs
```

### ClawHub Dependencies (Install)
```bash
clawhub install firecrawl-search      # NAP scraping + outreach
clawhub install google-sheets         # Data tracking + export
clawhub install google-docs           # Semantic stack publishing
clawhub install google-drive          # Asset storage
clawhub install notion                # Semantic stack publishing
clawhub install reddit-readonly       # UGC monitoring
clawhub install wordpress-pro         # Web 2.0 publishing
clawhub install github-pages-auto-deploy  # Semantic stack publishing
```

### Cron Schedule
```
geo-tester:      Every Monday 6:00 AM (client timezone)
nap-auditor:     Every Wednesday 6:00 AM
ugc-monitor:     Every day 8:00 AM + 4:00 PM
seo-reporter:    Every Friday 5:00 PM
```

### API Keys (Managed by Kyra — shared across all vet SEO workers)
```
FIRECRAWL_API_KEY=fc-...          # $19/mo starter plan (3,000 credits)
PERPLEXITY_API_KEY=pplx-...       # Pay-per-use (~$0.50/client/mo)
OPENAI_API_KEY=sk-...             # Already have (GEO testing queries)
GOOGLE_SERVICE_ACCOUNT=...         # For Sheets, Docs, Sites, Blogger
```

---

## Build Plan — Phase by Phase

### Phase 1: Foundation (Days 1-3)

#### 1.1 Premium Template Infrastructure
**Files to create/modify:**
- `lib/billing/premium-templates.ts` — Define premium template types, pricing, billing logic
- `app/api/stripe/premium-template/route.ts` — Stripe checkout for $79/mo recurring
- `app/api/webhooks/stripe/route.ts` — Handle premium template subscription events
- `lib/agency/types.ts` — Add `premium_templates` field to agency schema
- Migration: `premium_template_subscriptions` table (agency_id, client_id, template_type, stripe_subscription_id, status, created_at)

**Premium template billing flow:**
1. Agency selects "Vet SEO Worker" template when creating client
2. Dashboard shows: "This is a premium template — $79/mo per client, billed separately"
3. On confirm: Stripe checkout for $79/mo recurring subscription
4. On payment success: provision container with vet-seo-worker template
5. Subscription tied to specific client_id — cancel client = cancel subscription

#### 1.2 Vet SEO Worker Template (SOUL.md + Config)
**Create:** `templates/vet-seo-worker/`

SOUL.md persona:
```markdown
# Veterinary SEO Worker

You are an autonomous SEO specialist for veterinary clinics. You run 24/7 inside a Kyra container, executing off-site SEO and GEO optimization tasks.

## Your Mission
Increase [CLINIC_NAME]'s visibility in both traditional search engines AND AI-powered search (ChatGPT, Perplexity, Gemini). You do this by:
- Publishing optimized content across multiple platforms
- Building semantic authority stacks on high-trust domains
- Monitoring and maintaining NAP consistency
- Tracking AI citation rates (GEO scores)
- Finding and pursuing quality backlink opportunities
- Monitoring community discussions for organic recommendation opportunities

## Your Client
- Clinic: [CLINIC_NAME]
- Address: [ADDRESS]
- Phone: [PHONE]
- Website: [WEBSITE]
- GBP URL: [GBP_URL]
- Lead Veterinarian: [VET_NAME]
- Services: [SERVICES]
- Target Keywords: [KEYWORDS]
- City/Region: [CITY]

## Rules
- NEVER auto-post to Reddit, Quora, or social media — always queue for human review
- NEVER send outreach emails without human approval
- ALWAYS use the review queue for content that will be published
- ALWAYS maintain consistent NAP data across all platforms
- Content must be unique per platform — no duplicate content
- Include Google Maps embed in all Web 2.0 and stack content
- Reference specific city neighborhoods and landmarks for local relevance
```

#### 1.3 GEO Tester Skill (Custom Build)
```
Skills: web_search (built-in), web_fetch (built-in)
APIs: Perplexity API, OpenAI API
```

**What it does:**
- Runs 25 query variations against ChatGPT and Perplexity:
  - "Best veterinarian in [city]"
  - "Emergency vet near [address]"
  - "Top rated animal hospital [city]"
  - "Best vet for [service] in [city]" (dental, surgery, wellness, exotic)
  - "Veterinarian recommendations [city] [neighborhood]"
- Parses each response for: clinic name mentioned (Y/N), position in list, exact quote
- Calculates GEO Score: % of queries where clinic is cited
- Stores results in tracking data (Supabase or local files)
- Compares to previous week — shows trend (↑↓→)

#### 1.4 NAP Auditor Skill (Custom Build)
```
ClawHub deps: firecrawl-search
```

**What it does:**
- Scrapes 15 directories using Firecrawl:
  - Yelp, Google Business, Facebook, YellowPages, Healthgrades
  - VetRatingz, PetDesk, AVMA Find-a-Vet, BringFido
  - BBB, Manta, Superpages, CitySearch, Angi, Nextdoor
- Extracts: Name, Address, Phone, Website, Hours from each
- Compares against master NAP data
- Flags mismatches with specific details: "Yelp shows phone (402) 555-0123 but correct is (402) 555-0456"
- Generates fix-it action list sorted by directory authority

### Phase 2: Content Engine (Days 4-7)

#### 2.1 SEO Content Writer Skill (Custom Build)
```
Skills: None (pure LLM)
```

**Content types and prompts:**

**Press Releases (500 words, AP Style):**
- Input: clinic name, city, service angle, vet name, NAP, GBP URL
- Output: Headline, dateline, body (3 paragraphs), quote from doctor, boilerplate, 2-3 hyperlinks
- Queued to review queue with label "Press Release — [Clinic] — [Angle]"

**Web 2.0 Articles (700 words, locally optimized):**
- Input: clinic NAP, target keyword, city, neighborhood
- Output: SEO-optimized article with H2s, Google Maps iframe embed, NAP block, 3 internal links, city/neighborhood references
- Each article unique — different angle per platform

**Semantic Stack Pages (500-1,000 words, authority-focused):**
- Input: clinic NAP, service focus, related stacks for interlinking
- Output: Comprehensive location page with: full NAP, embedded map, driving directions from 3 landmarks, service descriptions, structured data suggestion
- Interlinks to all other stack pages for the same clinic

#### 2.2 Web 2.0 Publisher Skill (Custom Build)
```
ClawHub deps: wordpress-pro, notion
Custom APIs: Blogger v3, Telegraph
```

**Publishing flow per article:**
1. Content Writer creates article → review queue
2. Agency approves (or edits) in Kyra dashboard
3. On approval: Publisher skill distributes to assigned platform
4. Platforms (round-robin per article):
   - WordPress.com — REST API via wordpress-pro skill
   - Blogger — Google Blogger API v3 (OAuth2 via service account)
   - Telegraph.ph — Telegraph API (no auth, instant publish)
   - Notion — Notion API via notion skill (public page)
5. Records live URL in tracking data
6. Verifies URL is accessible via web_fetch

#### 2.3 Semantic Stack Builder Skill (Custom Build)
```
ClawHub deps: google-docs, github-pages-auto-deploy, notion
Custom APIs: Google Sites API
```

**Stack creation per clinic:**
1. Google Docs — Public document with full location content + embedded map
2. Google Sites — Full site page with NAP, services, map, testimonials section
3. Notion — Public database entry with structured NAP data + content blocks
4. GitHub Pages — Static HTML page with schema markup + map embed
5. Telegraph — Long-form location guide with embedded map
6. All 5+ pages interlinked to each other + to clinic website
7. Each page has unique content angle (same data, different structure/focus)

### Phase 3: Monitoring & Outreach (Days 8-10)

#### 3.1 Reddit UGC Monitor Skill (Custom Build)
```
ClawHub deps: reddit-readonly
```

**Monitoring config (per city):**
- City subreddits: r/[city], r/[city]pets (if exists)
- General: r/dogs, r/cats, r/AskVet, r/pets, r/veterinarian
- Keywords: "vet", "veterinarian", "animal hospital", "pet doctor", "emergency vet", clinic name

**Workflow:**
1. Scan target subreddits via reddit-readonly skill (daily cron, 2x/day)
2. Filter posts by: keyword match + city/location mention + recency (< 48hrs)
3. Score relevance: high (direct "looking for vet in [city]"), medium (pet health discussion in city sub), low (tangential)
4. For high+medium: Claude drafts a helpful, natural reply that mentions the clinic organically
5. Draft queued to Kyra review queue with: subreddit, post URL, post title, draft text, confidence score
6. Agency/VA reviews and manually posts approved replies
7. NEVER auto-post — always human in the loop

#### 3.2 Outreach Scout Skill (Custom Build)
```
ClawHub deps: firecrawl-search
```

**Scout workflow:**
1. Search for outreach targets using web_search:
   - "[city] pet blog"
   - "veterinary guest post write for us"
   - "[city] lifestyle blog pets animals"
   - "pet care blog accepting contributions"
   - "[city] local business blog"
2. For each candidate: Firecrawl scrapes the site
3. Claude scores on: topical fit (pets/vet/lifestyle), content freshness (last post < 90 days), engagement (comments, social shares), domain quality
4. Top 10 candidates stored with: URL, contact email (if found), score, reasoning
5. Displayed in Kyra dashboard — agency marks APPROVED targets
6. On approval: Claude drafts personalized pitch email referencing a specific recent post
7. Draft queued to review queue — agency sends manually or approves for Gmail send

#### 3.3 SEO Reporter Skill (Custom Build)
```
Skills: None (reads internal data)
```

**Weekly report contents:**
1. **GEO Score Card** — Citation rate across ChatGPT/Perplexity, trend vs last week
2. **Content Published** — List of all new pages/articles with live URLs
3. **Link Building** — Outreach status, any new backlinks detected
4. **NAP Status** — Any inconsistencies found, fixes needed
5. **Reddit Activity** — Relevant threads found, drafts pending review
6. **Action Items** — What the agency needs to do this week (approve drafts, fix NAP issues, review outreach targets)

Report format: Markdown → rendered in Kyra dashboard + optional email to agency

### Phase 4: Dashboard & Billing (Days 11-14)

#### 4.1 SEO Dashboard Tab (Client Detail Page)
Add a new "SEO" tab to the client detail view (alongside Chat, Personality, Settings, etc.)

**Sections:**
- **GEO Score** — Big number + sparkline trend chart (last 8 weeks)
- **Content Pipeline** — Cards showing: drafted → in review → published, with platform icons
- **NAP Health** — Green/yellow/red status per directory
- **Outreach Pipeline** — Found → Approved → Pitched → Won
- **Reddit Queue** — Pending drafts awaiting review
- **Weekly Report** — Latest report inline or downloadable

#### 4.2 Premium Template Billing UI
- On client creation: template picker shows "Vet SEO Worker" with "$79/mo premium" badge
- Billing page: shows premium template subscriptions separately from base plan
- Manage: pause, cancel, or switch premium templates per client

#### 4.3 Setup Wizard for Vet SEO Worker
When agency selects the vet SEO template:

**Step 1: Clinic Information**
- Clinic Name, Address, Phone, Website
- GBP URL, Lead Vet Name
- Services offered (checkboxes: dental, surgery, wellness, exotic, emergency, boarding)

**Step 2: Target Keywords**
- Auto-suggested based on city + services
- Agency can add/remove

**Step 3: Content Preferences**
- Tone: Professional / Friendly / Community-focused
- Focus services to highlight
- Any content restrictions

**Step 4: Confirm & Pay**
- Summary of what the SEO worker will do
- "$79/mo — billed monthly, cancel anytime"
- Stripe checkout

**Step 5: Worker Deployed**
- Container provisioned with vet-seo-worker template
- First GEO test runs immediately
- First NAP audit runs within 1 hour
- Content generation begins within 24 hours

---

## Files to Create/Modify (Complete List)

### New Files
```
# Premium template billing
lib/billing/premium-templates.ts
app/api/stripe/premium-template/route.ts
migrations/20260305001_premium_template_subscriptions.sql

# Vet SEO template
templates/vet-seo-worker/SOUL.md
templates/vet-seo-worker/config/geo-queries.json
templates/vet-seo-worker/config/vet-directories.json
templates/vet-seo-worker/config/subreddits.json
templates/vet-seo-worker/config/web20-platforms.json
templates/vet-seo-worker/prompts/press-release.md
templates/vet-seo-worker/prompts/web20-article.md
templates/vet-seo-worker/prompts/stack-content.md
templates/vet-seo-worker/prompts/outreach-pitch.md
templates/vet-seo-worker/prompts/ugc-reply.md

# Custom skills (8)
skills/geo-tester/SKILL.md
skills/nap-auditor/SKILL.md
skills/seo-content-writer/SKILL.md
skills/web20-publisher/SKILL.md
skills/semantic-stacker/SKILL.md
skills/outreach-scout/SKILL.md
skills/ugc-monitor/SKILL.md
skills/seo-reporter/SKILL.md

# Dashboard components
app/(dashboard)/agency/clients/[id]/seo-dashboard.tsx
app/api/agency/clients/[id]/seo/route.ts
app/api/agency/clients/[id]/seo/geo-scores/route.ts
app/api/agency/clients/[id]/seo/nap-status/route.ts

# Setup wizard
app/(dashboard)/agency/clients/new/seo-setup-wizard.tsx
```

### Modified Files
```
app/(dashboard)/agency/clients/[id]/client-detail-view.tsx  # Add SEO tab
app/(dashboard)/agency/clients/new/page.tsx                  # Template picker with premium badge
app/(dashboard)/agency/billing/billing-page-client.tsx        # Show premium subscriptions
app/api/webhooks/stripe/route.ts                              # Handle premium template webhooks
lib/agency/types.ts                                           # Premium template types
lib/billing/plans.ts                                          # Premium template definitions
```

---

## Timeline

| Phase | Days | What Ships |
|---|---|---|
| Phase 1: Foundation | Days 1-3 | Premium billing + GEO Tester + NAP Auditor + SOUL.md |
| Phase 2: Content Engine | Days 4-7 | Content Writer + Web 2.0 Publisher + Semantic Stacker |
| Phase 3: Monitoring & Outreach | Days 8-10 | Reddit Monitor + Outreach Scout + SEO Reporter |
| Phase 4: Dashboard & Billing | Days 11-14 | SEO Dashboard tab + Setup Wizard + Billing UI |
| **Total** | **14 days** | **Complete Vet SEO Worker** |

---

## Success Metrics (First 30 Days After Launch)

- [ ] 3+ agencies activate the Vet SEO Worker template
- [ ] GEO scores tracked for all active vet clients (baseline established)
- [ ] 50+ pieces of content published across platforms
- [ ] NAP audits running weekly with zero false positives
- [ ] Reddit monitoring catching relevant threads within 24 hours
- [ ] Agency NPS: "Would you recommend this to another agency?" > 8/10
