# Kyra AI Website Builder — Comprehensive Analysis (v2)

*Revised: 2026-03-13 — Quality over quantity. Smarter LLM strategy. Self-hosted. No repo sprawl.*

---

## The Vision

Turn Kyra into an **AI-powered business-in-a-box**: a user goes through a 7-step wizard, and in under 5 minutes gets a **high-quality SEO-optimized website + trained AI worker** — deployed, live, ready to receive customers.

No other platform does this. Not GHL, not Wix, not Squarespace, not any AI chatbot platform. They all give you ONE thing. Kyra gives you everything.

---

## What We Already Have (Proven)

### HVAC San Mateo Build (our blueprint)
- **82 pages** generated from data in `lib/constants.ts`
- **Next.js 16 + Tailwind CSS v4 + App Router** on Vercel
- **Programmatic city×service pages** from a single `[city]/[service]/page.tsx` template
- **Shared components**: Navbar, Footer, CTA, schema markup
- **Kyra widget** embedded on every page
- **Total build time**: ~2 hours with 3 parallel AI agents
- **Hosting cost**: $0 (Vercel free tier for static sites)

### /get-started Wizard (our funnel)
- 5 steps: Business → Use Case → Details → Personality → Account
- Auto-scrapes website for training data
- Creates Solo agent with AI personality
- **Already live** at kyra.conversionsystem.com/get-started

### What's Missing: The Bridge
The wizard creates an AI worker. The HVAC build creates a website. **We need to connect them** — one wizard that outputs BOTH.

---

## Core Design Principle: Quality Over Quantity

The v1 analysis proposed "80+ pages for everyone." That's wrong.

**Google's Helpful Content Update** actively penalizes thin, AI-generated pages that exist for SEO volume. 60 city×service pages where "AC Repair in Burlingame" is 90% identical to "AC Repair in Belmont" works when you're the first — but at scale with 50 Kyra clients in the same industry, Google flags the pattern as a content farm.

**The revised approach:**
- **15-25 premium pages** at launch — every page genuinely useful, deeply written
- **Growth engine** that suggests new pages based on real Google Search Console data
- **Tiered LLM strategy** — premium models for hero pages, efficient models for structured content
- **Unique seed data required** — the wizard collects the business's real story, not just name+phone

**Fewer pages, better content, data-driven expansion.**

---

## Industry-Specific Page Counts (Realistic)

Not every business is a service-area HVAC company. Page count should match the business type.

| Industry | Launch Pages | Why | Expansion Potential |
|----------|-------------|-----|-------------------|
| **HVAC / Plumbing / Electrical** | 25-40 | Service-area business, needs geo pages for top 5-6 cities | +5 pages/month from Search Console data |
| **Dental / Medical / Legal** | 15-25 | Single location, needs service depth not geo spread | +2-3 pages/month (blog, new services) |
| **Restaurant** | 8-12 | Menu, about, catering, events, 2-3 location pages max | +1-2/month (seasonal menus, events) |
| **Real Estate** | 20-35 | Neighborhood pages matter, but quality > quantity | +5/month (new listings, market reports) |
| **Auto / Mechanic** | 25-40 | Similar to HVAC — service-area + many service types | +3-5/month |
| **Medical Spa** | 15-20 | Procedure-focused, single location usually | +2-3/month (new treatments, blog) |
| **Fitness / Gym** | 8-12 | Programs, schedule, trainers, about, 1-2 locations | +1-2/month (events, success stories) |
| **Veterinary** | 15-25 | Services + species specialties + 3-4 city pages | +2-3/month |
| **Cannabis** | 12-20 | Product categories, delivery, deals, 2-4 city pages | +2-3/month (new strains, promos) |
| **Consulting** | 8-12 | Services, case studies, about, contact | +2/month (case studies, thought leadership) |

**Structure for every industry (minimum viable site):**
- Homepage
- 3-5 service/product pages
- About page
- Contact page (with form)
- FAQ page (15-20 questions)
- Reviews/testimonials page
- **Only if service-area business:** 5-6 top city pages, 5-6 key city×service combos

---

## Tiered LLM Strategy

Different pages need different quality levels. Using GPT-4o-mini for everything produces mediocre, forgettable content. Using Claude Opus for everything is wasteful.

| Page Type | Model | Why | Approx Cost |
|-----------|-------|-----|-------------|
| **Homepage** | Claude Sonnet 4 | Best natural writing, warm tone, conversion-focused | ~$0.05 |
| **About page** | Claude Sonnet 4 | Storytelling — needs to feel human, not AI | ~$0.04 |
| **Service pages (5)** | GPT-4o | Strong, detailed, professional, good SEO structure | ~$0.03 each |
| **City pages (5-6)** | GPT-4o | Need genuine local differentiation | ~$0.02 each |
| **City×Service combos** | GPT-4o-mini + strong prompt | Acceptable quality, unique local references required | ~$0.005 each |
| **FAQ (20 questions)** | Claude Haiku | Fast, structured, factual | ~$0.01 |
| **Meta titles + descriptions** | Claude Haiku | Bulk structured output | ~$0.005 |
| **Schema markup** | Template (no LLM) | Deterministic — JSON-LD from business data, zero AI needed | $0.00 |
| **Contact/Reviews** | Template (no LLM) | Mostly structured data, minimal prose | $0.00 |

**Total per site: ~$0.30** (was $0.02 with all-mini — 15x more but still essentially free vs $29-99/mo revenue)

### Content Differentiation Rules

To prevent Google flagging 50 similar sites as a content farm:

1. **Unique seed data required**: Wizard must collect owner's name, years in business, personal story, real differentiator, specific neighborhoods served. This seeds every prompt.
2. **Temperature variation**: Each generation uses temperature 0.8-1.0 to ensure lexical diversity.
3. **No cross-client prompt reuse**: Prompts include business-specific context that makes identical output impossible.
4. **Photo requirement**: Wizard nudges (not forces) users to upload 3-5 real photos. Real photos = instant differentiation from every template site.
5. **Content fingerprinting**: Before deploying, run a similarity check against other Kyra-generated sites in the same industry+region. Flag if >60% similar.

---

## User Flow (7-Step Wizard)

```
Step 1: BUSINESS INFO
├── Business name
├── Industry (dropdown: HVAC, Dental, Legal, Restaurant, etc.)
├── Phone number
├── Address (auto-geocode for service area)
├── Years in business
├── Owner name + brief story (2-3 sentences — "What makes you different?")
├── Existing website URL (optional — we scrape and migrate content)
└── License / certification numbers

Step 2: SERVICES
├── Auto-suggested based on industry (e.g., HVAC → AC Repair, Heating, etc.)
├── User can add/remove/rename services
├── Brief description per service (optional — AI fills gaps)
├── Pricing info (optional: "Starting at $X")
└── Emergency/24-7 toggle

Step 3: SERVICE AREA (skip for single-location businesses)
├── Primary city (auto-filled from address)
├── Suggested nearby cities (radius-based from geocode, max 6)
├── User checkmarks which cities to include
├── Preview: "This will generate X pages"
└── Note: "You can add more cities later based on search demand"

Step 4: PHOTOS & BRAND
├── Photo upload (3-5 real photos strongly encouraged)
│   └── Fallback: curated industry stock from Unsplash
├── Logo upload (optional — text logo generated if skipped)
├── Color scheme (auto-extracted from logo, or pick preset)
├── Design style: Modern Dark / Clean Light / Bold / Minimal
└── Tagline (AI-suggested, user-editable)

Step 5: AI PERSONALITY
├── AI worker name (auto-suggested per industry)
├── Tone: Professional / Friendly / Casual
├── Capabilities (checkboxes: answer questions, book appointments,
│   capture leads, provide quotes, qualify leads)
├── Business hours
└── Booking URL (Calendly, GHL, etc.)

Step 6: CONTENT GENERATION (automatic — user sees progress bar)
├── Scrapes existing site for content migration (if URL provided)
├── AI generates all page content (tiered LLMs, parallel)
├── Generates FAQ from industry + business specifics
├── Creates meta descriptions and schema markup
├── Trains Kyra Knowledge Base automatically
└── ~45-90 seconds

Step 7: REVIEW & LAUNCH
├── Live preview of homepage (iframe)
├── Page list with edit buttons (can tweak any page before launch)
├── AI worker preview (live chat demo)
├── Page count summary + SEO health check
├── Custom domain instructions (or use free subdomain)
├── [Launch] button → deploys everything
└── Celebration screen with share links + "Growth Engine starts now"
```

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     KYRA DASHBOARD                            │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  /get-started │  │ /agency/sites │  │ /agency/clients/[id] │ │
│  │  (wizard)     │  │ (site mgmt)  │  │ /website (edit tab)  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘ │
└─────────┼──────────────────┼─────────────────────┼────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                           │
│                                                               │
│  ┌─────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  Content Engine  │  │  Template Engine│  │  Build Pipeline│ │
│  │  (Tiered LLMs)  │  │  (Assembly)     │  │  (Deploy)      │ │
│  │                  │  │                 │  │                │ │
│  │  Hero: Sonnet 4  │  │  • Industry     │  │  • Static      │ │
│  │  Services: 4o    │  │    templates    │  │    export      │ │
│  │  City: 4o-mini   │  │  • Component    │  │  • VPS nginx   │ │
│  │  Meta: Haiku     │  │    library      │  │  • Cloudflare  │ │
│  │  Schema: none    │  │  • Data files   │  │    DNS         │ │
│  │                  │  │    (constants)  │  │  • Widget embed│ │
│  └────────┬─────────┘  └───────┬────────┘  └───────┬────────┘ │
│           │                    │                    │          │
│           ▼                    ▼                    ▼          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Site Assembly Pipeline                      │  │
│  │                                                          │  │
│  │  1. Select industry template                            │  │
│  │  2. Inject business data → lib/constants.ts             │  │
│  │  3. Inject AI content → content/ data files (not code)  │  │
│  │  4. Inject branding → CSS variables / globals.css       │  │
│  │  5. Inject Kyra widget → layout.tsx                     │  │
│  │  6. Generate sitemap, robots.txt, schema (deterministic)│  │
│  │  7. next build → next export → static HTML/CSS/JS       │  │
│  │  8. Upload static files to VPS nginx                    │  │
│  │  9. Configure Cloudflare DNS + SSL                      │  │
│  │ 10. Train Kyra Knowledge Base from generated content    │  │
│  │ 11. Return live URL                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend (Wizard + Management)
| Component | Technology | Why |
|-----------|-----------|-----|
| Wizard UI | React + Tailwind (inside Kyra) | Already our stack |
| Live preview | iframe + static export preview | Show real pages before launch |
| Page editor | Notion-style inline editor | Click text, type, save. Not a code editor. |
| Domain manager | Cloudflare API integration | Auto-configure DNS |

### Content Engine (Tiered AI Generation)
| Component | Technology | Why |
|-----------|-----------|-----|
| Homepage + About | Claude Sonnet 4 | Natural, warm, conversion-focused prose |
| Service pages | GPT-4o | Detailed, professional, strong SEO structure |
| City pages | GPT-4o or GPT-4o-mini (based on plan) | Unique local content per city |
| FAQ generation | Claude Haiku | Fast, structured, factual |
| Meta titles/desc | Claude Haiku | Cheap bulk structured output |
| Content migration | Web scraper + GPT-4o | Extract and rewrite from existing sites |
| Schema markup | Template engine (no LLM) | Deterministic — just data mapping |
| Image curation | Unsplash API + user uploads | Real photos strongly preferred |

### Template Engine
| Component | Technology | Why |
|-----------|-----------|-----|
| Base framework | Next.js 16 + App Router | Static export for zero-cost hosting |
| Styling | Tailwind CSS v4 | Theming via CSS variables — one template, infinite brands |
| Templates | Monorepo with industry configs | No repo-per-client sprawl |
| Data layer | `lib/constants.ts` + `content/*.json` | Business data + AI content separated |
| Components | Shared component library | Navbar, Footer, CTA, Schema, Forms, Hero variants |
| Pages | Programmatic routes `[city]/[service]` | 1 template → N pages |

### Build Pipeline (Self-Hosted)
| Component | Technology | Why |
|-----------|-----------|-----|
| Build server | VPS (24 vCPU, 92GB RAM) | Already have it, barely utilized |
| Static export | `next build && next export` | Outputs pure HTML/CSS/JS |
| Web server | nginx (per-site server block) | Serve static files, zero overhead |
| SSL | Cloudflare (proxy mode) | Free, auto-renewed, no cert management |
| DNS | Cloudflare API | Programmatic A/CNAME records |
| Fallback | Vercel free tier | For overflow or if VPS is full |

**Why self-hosted over Vercel at scale:**
- Vercel free tier caps at limited projects + bandwidth
- 100 client sites on Vercel = billing headaches
- Our VPS has 92GB RAM serving ~60 containers using ~30GB — massive headroom
- Static HTML served by nginx = essentially zero CPU/RAM per site
- A single nginx instance can serve 1,000+ static sites without breaking a sweat

### Storage & State
| Component | Technology | Why |
|-----------|-----------|-----|
| Site configs | Supabase `client_sites` table | Store all wizard data + build state |
| Generated content | Supabase `site_pages` table | Cache AI content, track edits |
| Templates | Monorepo `/opt/kyra/site-templates/` | Single repo, all industries |
| Assets | Supabase Storage or `/opt/kyra/site-assets/` | Logos, user photos |
| Build artifacts | `/opt/kyra/sites/{client_id}/` on VPS | Static HTML output |
| Build queue | Supabase + cron | Async build processing |

---

## No Repo Sprawl: Monorepo + Build Service Architecture

**The problem with v1:** Creating a GitHub repo per client means 500 clients = 500 repos. Unmaintainable.

**The v2 approach:** One monorepo with parameterized templates. A build service clones the template locally, injects data, builds, exports static files, and uploads. No persistent repo per client.

```
/opt/kyra/site-templates/              ← Monorepo on VPS
├── shared/                            ← Shared across all industries
│   ├── components/
│   │   ├── navbar.tsx
│   │   ├── footer.tsx
│   │   ├── cta-section.tsx
│   │   ├── hero-variants/
│   │   │   ├── hero-dark.tsx
│   │   │   ├── hero-light.tsx
│   │   │   └── hero-bold.tsx
│   │   ├── schema-markup.tsx
│   │   ├── quote-form.tsx
│   │   └── review-card.tsx
│   ├── lib/
│   │   ├── constants.template.ts      ← Template with {{PLACEHOLDERS}}
│   │   └── seo.ts
│   └── styles/
│       └── globals.template.css       ← CSS variables for theming
│
├── industries/
│   ├── hvac/                          ← HVAC-specific config
│   │   ├── template.config.json       ← Page structure, services, defaults
│   │   ├── pages/                     ← HVAC page templates
│   │   └── content-prompts/           ← HVAC-specific AI prompts
│   ├── dental/
│   ├── legal/
│   ├── plumbing/
│   ├── restaurant/
│   └── ...
│
└── build-service/
    ├── builder.ts                     ← Assembles template + data → static export
    ├── deployer.ts                    ← Uploads to nginx, configures DNS
    └── content-generator.ts           ← Orchestrates tiered LLM calls
```

**Build flow:**
1. Copy template to `/tmp/build-{clientId}/`
2. Inject `constants.ts` from wizard data
3. Inject `content/*.json` from AI-generated content
4. Inject `globals.css` with brand colors
5. Run `next build && next export`
6. Copy `out/` to `/opt/kyra/sites/{domain}/`
7. Add nginx server block for the domain
8. Reload nginx (`nginx -s reload`)
9. Delete `/tmp/build-{clientId}/`

**Result:** Zero persistent repos. Zero GitHub API calls. Zero Vercel dependency. Pure static files served by nginx.

---

## Industry Templates (Starting Set — Phase 1)

Each template defines page structure, not page count. The wizard + AI handle the content.

| Industry | Core Pages | Optional Geo Pages | Design Preset |
|----------|-----------|-------------------|---------------|
| **HVAC** ✅ (built) | Home, 5 services, About, Contact, FAQ, Reviews | Top 5-6 cities × key services | Modern Dark + Red |
| **Plumbing** | Home, 5 services, About, Contact, FAQ, Reviews | Top 5-6 cities × key services | Clean Light + Blue |
| **Dental** | Home, 5 services, Team, About, Contact, FAQ | 2-3 nearby city pages | Clean Light + Teal |
| **Legal** | Home, 5 practice areas, Team, About, Contact, FAQ | 3-4 county/city pages | Professional Dark + Gold |

**Phase 2:** Auto, Med Spa, Real Estate, Restaurant
**Phase 3:** Remaining industries + custom template builder (user defines their own page structure)

---

## Content Generation Prompts

### Homepage Hero Copy (Claude Sonnet 4)
```
You are a conversion copywriter writing a homepage for a real local business.
This is NOT a template. Write as if you personally know this business.

Business: {business_name}
Owner: {owner_name}
Location: {primary_city}, {state}
Years in business: {years}
Their story: {owner_story}
License: {license}
Phone: {phone}
Rating: {rating}/5 ({review_count} reviews)

Write a homepage hero section:
1. H1 headline (max 10 words, includes city name, feels personal not corporate)
2. Subtitle (1 sentence — what a customer FEELS when they call, not a feature list)
3. 3 trust signals (real data: years, license, reviews — not generic "quality service")
4. CTA button text (action-oriented, specific)

Tone: {tone}. Write like a human who cares about this business.
No em dashes. No "we pride ourselves." No "your satisfaction is our priority."
No filler. Every word earns its place. Be specific to THIS business.
```

### Service Page Content (GPT-4o)
```
Write a service page for a real {industry} business. This must read like a human
wrote it who understands the trade — not like an AI marketing template.

Business: {business_name} | Owner: {owner_name}
Location: {city}, {state} | {years} years experience
Service: {service_name}
License: {license_info}
Phone: {phone}
Owner's note about this service: {service_description_from_wizard}

Include:
1. H1 with service name + city (SEO optimized, natural sounding)
2. Opening paragraph — what this service actually involves and when someone needs it.
   Write for the customer, not the technician. 3-4 sentences.
3. "What We Do" — 4-5 specific things, not vague ("We install Carrier and Trane systems
   up to 5-ton capacity" not "We provide quality installation services")
4. "Why {business_name}" — 3 reasons rooted in real differentiators (years, owner-operated,
   license type, specific brands serviced, response time)
5. "Signs You Need {service_name}" — 4-5 practical symptoms the customer recognizes
6. Clear CTA with phone number
7. Meta title (max 60 chars) and meta description (max 155 chars)

Tone: {tone}. Be specific. Use numbers. Reference the actual business.
No em dashes. No "don't hesitate to contact us." No generic filler.
```

### City Page Content (GPT-4o)
```
Write a city-specific service page for a local business expanding into a nearby city.

Business: {business_name} | Based in: {primary_city}
Serving: {target_city}, {state} ({distance} miles from base)
Service: {service_name}
County: {county}

CRITICAL: This page must be genuinely about {target_city}, not just {primary_city}
with the city name swapped. Research context:
- {target_city} population: ~{population}
- Character: {city_character} (residential suburban / downtown commercial / coastal / etc.)
- Climate considerations: {climate_note}
- Neighborhood reference: {neighborhood_or_landmark}

Include:
1. H1: "{service_name} in {target_city}, {state}"
2. Opening paragraph that actually mentions something specific about {target_city}
   (a neighborhood, the community character, local climate factor)
3. Services available in {target_city} — 3-4 bullets
4. Response time from {primary_city} and service commitment
5. Trust signal: "Serving {target_city} for {years}+ years from our {primary_city} office"
6. Meta title and description

If you can't say something genuinely specific to {target_city}, don't write the page.
Generic city pages hurt SEO more than having no page at all.
```

### FAQ Generation (Claude Haiku)
```
Generate 15-20 FAQs for a {industry} business in {city}, {state}.

Business: {business_name} | {years} years | License: {license}
Services: {services_list}
Hours: {hours}
Emergency: {yes/no}

Categories (mix evenly):
- Pricing/cost ("How much does X cost in {city}?")
- Service-specific ("Do you service {brand}? How long does X take?")
- Practical ("How often should I...? What's the difference between...?")
- Trust/local ("Are you licensed? How fast can you get here? Do you serve {nearby_city}?")

Each answer: 2-3 sentences. Include {business_name} naturally.
Be specific with numbers where possible ("typically $150-400" not "costs vary").
```

### Schema Markup (Template — No LLM)
```typescript
// Deterministic — generated from business data, zero AI
function generateSchema(site: ClientSite): string[] {
  return [
    generateLocalBusinessSchema(site),
    ...site.services.map(s => generateServiceSchema(site, s)),
    generateFAQSchema(site.faq),
    generateAggregateRatingSchema(site.rating, site.reviewCount),
    generateBreadcrumbSchema(site.pages),
  ];
}
```

---

## Photo Strategy

Stock photos kill trust. A site with real photos converts 2-3x better than one with Unsplash stock.

### Wizard Photo Collection
```
Step 4: PHOTOS & BRAND

📸 Upload photos of your business (strongly recommended)
   "Sites with real photos get 2x more leads than stock images"

   [Upload Photos]  ← drag & drop, max 10, auto-resized

   Suggested photos:
   ✓ Your team or storefront
   ✓ You working on a job
   ✓ Your van/truck/equipment
   ✓ A finished project
   ✓ Your license/certification

   ─── or ───

   ☐ Use curated stock photos for now (you can replace later)
      └── We'll select industry-appropriate images
```

### Image Processing Pipeline
1. User uploads → Supabase Storage → auto-resize to 3 sizes (hero, card, thumbnail)
2. If user skips → curate from Unsplash based on industry + design style
3. Images referenced in `content/*.json`, not hardcoded in templates
4. User can swap any image post-launch from the page editor

---

## The Growth Engine (Post-Launch)

The initial site is the hook. The Growth Engine is what keeps them paying monthly.

### How It Works
```
Month 1: Site launches with 15-25 pages
         ↓
Month 2: Google Search Console connected (prompted in dashboard)
         ↓
Month 3: Growth Engine analyzes search data:
         "You're getting impressions for 'emergency AC repair Foster City'
          but you don't have a page for it. Want me to create one?"
         ↓
         [Create Page] → AI generates → user reviews → auto-deploys
         ↓
Month 4+: Repeat. Plus:
         • Blog post suggestions based on trending queries
         • Competitor gap analysis ("They rank for X, you don't")
         • Performance reports ("Your Burlingame page got 47 clicks this month")
         • Seasonal suggestions ("Summer is coming — AC content push")
```

### Growth Engine Dashboard Widget
```
┌─────────────────────────────────────────────────────┐
│  📈 Growth Engine                          [Active] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🔥 Opportunities Found: 3                          │
│                                                     │
│  1. "furnace repair daly city" — 90 searches/mo     │
│     You don't have this page. [Create Now]          │
│                                                     │
│  2. "AC installation cost san mateo" — 140/mo       │
│     Your FAQ doesn't cover pricing. [Add FAQ]       │
│                                                     │
│  3. Blog: "5 Signs Your AC Needs Replacement"       │
│     Trending topic in your area. [Write Post]       │
│                                                     │
│  📊 This Month: +3 pages, +120 organic clicks       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

This is why quality beats quantity. 15 great pages that actually rank → Search Console data → data-driven expansion → compounding organic growth. Better than 80 mediocre pages that Google ignores.

---

## Data Model

### `client_sites` table
```sql
CREATE TABLE client_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES agency_clients(id),
  agency_id UUID REFERENCES agencies(id),

  -- Wizard data
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  phone TEXT,
  address JSONB,                -- { street, city, state, zip, lat, lng }
  owner_name TEXT,
  owner_story TEXT,             -- 2-3 sentences from wizard
  years_in_business INTEGER,
  license TEXT,
  services JSONB,               -- [{ name, slug, description, price_from }]
  cities JSONB,                 -- [{ name, slug, state, distance_mi }]
  hours JSONB,                  -- { mon: "8am-6pm", ... }
  rating DECIMAL(2,1),
  review_count INTEGER,

  -- Branding
  logo_url TEXT,
  photos JSONB,                 -- [{ url, alt, placement }]
  color_primary TEXT DEFAULT '#dc2626',
  color_secondary TEXT DEFAULT '#111827',
  design_style TEXT DEFAULT 'modern-dark',
  tagline TEXT,

  -- AI Personality
  ai_name TEXT,
  ai_tone TEXT DEFAULT 'professional',
  ai_capabilities JSONB,
  booking_url TEXT,

  -- Build state
  status TEXT DEFAULT 'draft',  -- draft|generating|building|deploying|live|error
  template_id TEXT,             -- 'hvac', 'dental', 'legal', etc.
  deploy_target TEXT DEFAULT 'vps', -- 'vps' or 'vercel'
  site_domain TEXT,             -- custom domain (e.g. hvacsanmateo.com)
  site_subdomain TEXT,          -- fallback: {slug}.sites.kyra.conversionsystem.com
  nginx_configured BOOLEAN DEFAULT false,
  ssl_active BOOLEAN DEFAULT false,

  -- Content
  page_count INTEGER DEFAULT 0,
  content_generated_at TIMESTAMPTZ,
  last_deployed_at TIMESTAMPTZ,

  -- Growth Engine
  search_console_connected BOOLEAN DEFAULT false,
  growth_suggestions JSONB,     -- cached suggestions from last analysis
  growth_last_analyzed TIMESTAMPTZ,

  -- Kyra integration
  widget_embedded BOOLEAN DEFAULT true,
  knowledge_synced BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_sites_client ON client_sites(client_id);
CREATE INDEX idx_client_sites_agency ON client_sites(agency_id);
CREATE INDEX idx_client_sites_status ON client_sites(status);
```

### `site_pages` table
```sql
CREATE TABLE site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES client_sites(id) ON DELETE CASCADE,

  slug TEXT NOT NULL,            -- '/services/ac-repair'
  page_type TEXT NOT NULL,       -- 'homepage'|'service'|'city'|'city_service'|'utility'|'blog'
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,

  -- Content (AI-generated, user-editable)
  hero_h1 TEXT,
  hero_subtitle TEXT,
  content_sections JSONB,       -- [{ heading, body, bullets }]
  faq JSONB,                    -- [{ question, answer }]
  schema_markup JSONB,

  -- Generation metadata
  llm_model TEXT,               -- which model generated this page
  generation_cost DECIMAL(6,4), -- track per-page cost
  generated_at TIMESTAMPTZ,

  -- User edits
  edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,

  -- Growth Engine
  source TEXT DEFAULT 'wizard', -- 'wizard'|'growth_engine'|'manual'
  search_volume INTEGER,        -- if created from Growth Engine suggestion
  impressions_30d INTEGER,      -- from Search Console
  clicks_30d INTEGER,

  UNIQUE(site_id, slug)
);

CREATE INDEX idx_site_pages_site ON site_pages(site_id);
CREATE INDEX idx_site_pages_type ON site_pages(page_type);
```

---

## Build Pipeline (Step by Step)

### Phase 1: Content Generation (~45-90 seconds)

```typescript
async function generateSiteContent(site: ClientSite): Promise<void> {
  const tasks: ContentTask[] = [];

  // ── TIER 1: Premium pages (Claude Sonnet 4) ──
  tasks.push({ page: 'homepage', model: 'claude-sonnet-4', prompt: homepagePrompt(site) });
  tasks.push({ page: 'about', model: 'claude-sonnet-4', prompt: aboutPrompt(site) });

  // ── TIER 2: Service pages (GPT-4o) ──
  for (const service of site.services) {
    tasks.push({ page: `services/${service.slug}`, model: 'gpt-4o', prompt: servicePrompt(site, service) });
  }

  // ── TIER 3: City pages (GPT-4o for quality) ──
  for (const city of site.cities) {
    tasks.push({ page: `${city.slug}`, model: 'gpt-4o', prompt: cityPrompt(site, city) });
    // Only generate city×service for top 2-3 services
    for (const service of site.services.slice(0, 3)) {
      tasks.push({ page: `${city.slug}/${service.slug}`, model: 'gpt-4o-mini', prompt: cityServicePrompt(site, city, service) });
    }
  }

  // ── TIER 4: Structured content (Claude Haiku / template) ──
  tasks.push({ page: 'faq', model: 'claude-haiku', prompt: faqPrompt(site) });
  tasks.push({ page: 'contact', model: 'template', data: contactData(site) });
  tasks.push({ page: 'reviews', model: 'template', data: reviewsData(site) });

  // ── Meta generation (bulk, Haiku) ──
  tasks.push({ page: '_meta', model: 'claude-haiku', prompt: metaPrompt(site) });

  // Execute in parallel batches of 10 (respect rate limits)
  await executeBatched(tasks, 10);
}
```

### Phase 2: Template Assembly (~10-15 seconds)

```typescript
async function assembleSite(site: ClientSite): Promise<string> {
  const buildDir = `/tmp/build-${site.id}`;

  // 1. Copy industry template
  await exec(`cp -r /opt/kyra/site-templates/industries/${site.template_id} ${buildDir}`);
  await exec(`cp -r /opt/kyra/site-templates/shared/* ${buildDir}/`);

  // 2. Inject business data → lib/constants.ts
  const constants = renderTemplate('constants.template.ts', site);
  await writeFile(`${buildDir}/lib/constants.ts`, constants);

  // 3. Inject AI-generated content → content/*.json
  const pages = await getPageContent(site.id);
  await writeFile(`${buildDir}/content/pages.json`, JSON.stringify(pages));

  // 4. Inject branding → CSS variables
  const css = renderCSS(site.color_primary, site.color_secondary, site.design_style);
  await writeFile(`${buildDir}/app/globals.css`, css);

  // 5. Inject Kyra widget → layout.tsx
  await injectWidget(buildDir, site.client_id);

  // 6. Generate sitemap + robots (deterministic)
  await generateSitemap(buildDir, site, pages);

  // 7. Build static export
  await exec(`cd ${buildDir} && npm install && next build`, { timeout: 120_000 });

  // 8. Output directory = static HTML
  return `${buildDir}/out`;  // or .next/static for SSG
}
```

### Phase 3: Deploy to VPS (~5-10 seconds)

```typescript
async function deploySite(site: ClientSite, outputDir: string): Promise<string> {
  const domain = site.site_domain || `${site.id.slice(0, 8)}.sites.kyra.conversionsystem.com`;
  const siteDir = `/opt/kyra/sites/${domain}`;

  // 1. Upload static files to VPS
  await exec(`rsync -az ${outputDir}/ ${siteDir}/`);

  // 2. Generate nginx server block
  const nginxConf = generateNginxConfig(domain, siteDir);
  await writeFile(`/opt/kyra/nginx/sites/${domain}.conf`, nginxConf);

  // 3. Reload nginx
  await exec('nginx -t && nginx -s reload');

  // 4. Configure Cloudflare DNS (if custom domain)
  if (site.site_domain) {
    await cloudflare.createDNSRecord(site.site_domain, VPS_IP);
    // Cloudflare proxy = auto SSL
  }

  // 5. Cleanup build dir
  await exec(`rm -rf /tmp/build-${site.id}`);

  // 6. Update DB
  await supabase.from('client_sites').update({
    status: 'live',
    last_deployed_at: new Date().toISOString(),
    nginx_configured: true,
    ssl_active: true,
  }).eq('id', site.id);

  return `https://${domain}`;
}
```

### Phase 4: Knowledge Sync (~5 seconds)

```typescript
async function syncKnowledge(site: ClientSite): Promise<void> {
  const pages = await getPageContent(site.id);

  // Compile key pages into knowledge (not every page — avoid noise)
  const keyPages = pages.filter(p =>
    ['homepage', 'service', 'utility'].includes(p.page_type)
  );

  const knowledge = keyPages.map(p => ({
    title: p.title,
    content: [p.hero_h1, p.hero_subtitle, ...p.content_sections.map(s => s.body)].join('\n'),
  }));

  for (const doc of knowledge) {
    await supabase.from('knowledge_documents').insert({
      agency_id: site.agency_id,
      client_id: site.client_id,
      title: doc.title,
      content: doc.content,
      source_type: 'website',
      enabled: true,
    });
  }

  await syncKnowledgeToContainer(site.client_id);
}
```

---

## nginx Config (Per Site)

```nginx
# /opt/kyra/nginx/sites/hvacsanmateo.com.conf
server {
    listen 80;
    server_name hvacsanmateo.com www.hvacsanmateo.com;

    root /opt/kyra/sites/hvacsanmateo.com;
    index index.html;

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback for Next.js static export
    location / {
        try_files $uri $uri.html $uri/ /404.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

With Cloudflare in proxy mode: auto SSL, auto CDN, DDoS protection. Zero cert management.

---

## The Page Editor (Post-Launch Editing UX)

The initial generation is a one-time wow moment. The ongoing editing experience determines retention.

### Notion-Style Inline Editing
```
┌─────────────────────────────────────────────────────┐
│  Editing: AC Repair in San Mateo          [Preview] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SEO                                                │
│  Title: [AC Repair San Mateo | Air Temp Co    ]     │
│  Description: [Professional AC repair in San M...]  │
│                                                     │
│  ── Hero ──────────────────────────────────         │
│  [Trusted AC Repair in San Mateo, CA      ]  ← h1  │
│  [Fast, reliable service from a family    ]  ← sub  │
│  [company with 36 years of experience.    ]         │
│                                                     │
│  ── What We Do ────────────────────────────         │
│  [Click any text block to edit. Changes are saved   │
│   automatically. Click "Regenerate" on any section  │
│   to have AI rewrite it.]                           │
│                                                     │
│  ── Actions ───────────────────────────────         │
│  [🤖 Regenerate Section] [📷 Change Image]         │
│  [↩️ Undo] [Publish Changes]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Key UX decisions:
- **Click text to edit** — no separate "edit mode"
- **Auto-save drafts** — never lose work
- **Section-level regeneration** — "Rewrite just this section" using the original prompt + user feedback
- **Publish = redeploy** — rebuilds only changed pages, not the whole site
- **Version history** — every publish creates a snapshot

---

## API Routes

```
POST   /api/agency/sites                     — Start wizard (create draft)
GET    /api/agency/sites                     — List all sites
GET    /api/agency/sites/[id]                — Get site details
PATCH  /api/agency/sites/[id]                — Update wizard data
DELETE /api/agency/sites/[id]                — Delete site + artifacts

POST   /api/agency/sites/[id]/generate       — Trigger content generation (tiered LLMs)
POST   /api/agency/sites/[id]/build          — Trigger template assembly + static export
POST   /api/agency/sites/[id]/deploy         — Upload to VPS + configure nginx + DNS
POST   /api/agency/sites/[id]/domain         — Configure custom domain

GET    /api/agency/sites/[id]/pages          — List all pages
GET    /api/agency/sites/[id]/pages/[slug]   — Get page content
PATCH  /api/agency/sites/[id]/pages/[slug]   — Save user edits
POST   /api/agency/sites/[id]/pages/[slug]/regenerate  — AI rewrite a page

POST   /api/agency/sites/[id]/preview        — Build + serve temporary preview
POST   /api/agency/sites/[id]/growth/analyze  — Run Growth Engine analysis
GET    /api/agency/sites/[id]/growth/suggestions — Get current suggestions

POST   /api/agency/sites/[id]/photos         — Upload photos
DELETE /api/agency/sites/[id]/photos/[photoId] — Delete photo
```

---

## Dashboard Integration

### "Website" Tab (in client detail view)

```
┌─────────────────────────────────────────────────────┐
│  Website                              [Edit Site]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ● Live  https://hvacsanmateo.com                  │
│  22 pages │ Deployed 2 hours ago                    │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │📄 Core   │ │📍 Local  │ │📝 Blog   │           │
│  │ 10 pages │ │ 8 pages  │ │ 4 posts  │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                     │
│  📈 Growth Engine  [3 suggestions]                  │
│  └─ "emergency AC repair foster city" (90/mo)       │
│  └─ "HVAC installation cost 2026" (trending)        │
│  └─ Add pricing FAQ section (140 impressions)       │
│                                                     │
│  SEO Health                                         │
│  ✅ Sitemap (22 URLs) ✅ Schema ✅ Meta tags        │
│  ⚠️  Connect Google Search Console for Growth data  │
│                                                     │
│  [Add Page] [Add City] [Redeploy] [Domain Settings] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Cost Analysis (Revised)

### Per Site (one-time generation)
| Item | Cost |
|------|------|
| AI content (tiered: Sonnet + 4o + 4o-mini + Haiku) | ~$0.30 |
| Static build (VPS CPU, ~60 seconds) | ~$0.001 |
| nginx config generation | $0.00 |
| Cloudflare DNS API call | $0.00 |
| **Total per site** | **~$0.30** |

### Per Site (monthly hosting)
| Item | Cost |
|------|------|
| VPS nginx serving (marginal cost per site) | ~$0.05 |
| Cloudflare proxy (free tier) | $0.00 |
| Kyra widget (already running) | $0.00 |
| Growth Engine analysis (1 Search Console API call/month) | $0.00 |
| **Total monthly per site** | **~$0.05** |

### Revenue vs Cost
| Plan | Monthly Revenue | Monthly Cost per Site | Margin |
|------|----------------|----------------------|--------|
| Solo Pro ($39, 1 site) | $39 | $0.05 | **99.9%** |
| Lite ($99, 1 site included) | $99 | $0.05 | **99.9%** |
| Pro ($249, 10 sites) | $249 | $0.50 | **99.8%** |
| Website add-on ($29) | $29 | $0.05 | **99.8%** |

### Scaling Math
| Sites | VPS Resources Needed | Infrastructure Cost |
|-------|---------------------|-------------------|
| 100 sites | ~2GB disk, negligible CPU/RAM | $0 (existing VPS) |
| 1,000 sites | ~20GB disk, still negligible | $0 (existing VPS) |
| 10,000 sites | ~200GB disk, second VPS | ~$50/mo |

Static HTML is the cheapest thing in computing. Our VPS can serve thousands of sites before we need to think about scaling.

---

## Competitive Moat Analysis

| Feature | Kyra | Wix | Squarespace | GHL | Duda |
|---------|------|-----|------------|-----|------|
| AI site generation | ✅ 5 min | ❌ | ❌ | ❌ | ❌ |
| Quality SEO pages | ✅ Tiered LLMs | Manual | Manual | ❌ | Manual |
| Growth Engine | ✅ Data-driven | Basic SEO tools | Basic | ❌ | ❌ |
| AI chat worker | ✅ Trained on site | Basic bot | ❌ | Basic bot | ❌ |
| CRM integration | ✅ Built-in | Plugin | Plugin | ✅ | Plugin |
| Voice AI | ✅ Built-in | ❌ | ❌ | ❌ | ❌ |
| White-label | ✅ | ❌ | ❌ | ✅ | ✅ |
| Agency multi-client | ✅ | ❌ | ❌ | ✅ | ✅ |
| Hosting cost | $0 (self-hosted) | $16+/mo | $16+/mo | $97+/mo | $19+/mo |
| Setup time | 5 min | Hours | Hours | Hours | Hours |
| Post-launch growth | ✅ Auto-suggests | Manual | Manual | ❌ | Manual |

**What no one else has:** Auto-generated quality website + trained AI worker + data-driven growth engine + CRM + voice. All in one platform. 5 minutes to live.

---

## Implementation Timeline

### Sprint 1 (Week 1): Foundation
- [ ] Create `client_sites` + `site_pages` DB tables + migrations
- [ ] Build 7-step wizard UI (extend /get-started)
- [ ] Build Content Engine with tiered LLM orchestration
- [ ] Parameterize HVAC template (extract into monorepo structure)
- [ ] Photo upload + storage pipeline

### Sprint 2 (Week 2): Pipeline
- [ ] Build service on VPS: template assembly → `next build` → static export
- [ ] nginx auto-configuration (server block generation + reload)
- [ ] Cloudflare API integration (DNS record creation)
- [ ] Progress tracking via Supabase real-time
- [ ] Auto-train Kyra Knowledge Base from generated content

### Sprint 3 (Week 3): Dashboard + Editor
- [ ] "Website" tab in client detail view
- [ ] Notion-style page editor (click to edit, auto-save, section regeneration)
- [ ] Site management list page
- [ ] SEO health dashboard
- [ ] Redeploy + domain configuration UI

### Sprint 4 (Week 4): Templates + Growth Engine
- [ ] Plumbing template
- [ ] Dental template
- [ ] Legal template
- [ ] Template selector in wizard
- [ ] Growth Engine: Search Console integration + suggestion algorithm
- [ ] Content similarity checker (prevent cross-client duplication)

### Sprint 5 (Week 5): Agency Features + Polish
- [ ] White-label site builder (agency branding)
- [ ] Client self-service editing
- [ ] Bulk site generation for agencies
- [ ] Analytics integration (GA4 auto-setup via Measurement Protocol)
- [ ] Preview system (live preview before deploy)
- [ ] Error handling, retry logic, monitoring

---

## Key Risks & Mitigations (Revised)

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI content reads generic | Low conversions, bad SEO | Tiered LLMs + mandatory unique seed data from wizard |
| Google flags similar sites | SEO penalty across clients | Content fingerprinting + similarity checker before deploy |
| Users don't upload photos | Sites look templated | Strong nudge in wizard + curated stock fallback |
| Build failures on VPS | User frustration | Retry logic + Vercel fallback + error notifications |
| Template maintenance burden | Outdated designs | Quarterly refresh + shared component library |
| Editing UX is clunky | Users abandon after launch | Invest heavily in Notion-style editor (Sprint 3) |
| VPS disk fills up | Deploys fail | Auto-archive sites inactive >90 days, monitor disk alerts |
| Custom domain DNS confusion | Users can't go live | Auto-Cloudflare or step-by-step DNS wizard with verification |

---

## Summary

**What we're building:** A feature inside Kyra where any business owner or agency goes through a 5-minute wizard and gets a high-quality, SEO-optimized website (15-40 pages) with a trained AI worker — deployed and live instantly. Then a Growth Engine suggests new pages based on real search data.

**What it costs us:** ~$0.30 per site (tiered AI generation) + ~$0.05/mo hosting (self-hosted VPS).

**What we charge:** $29-99/mo per site (included in agency plans).

**What changed from v1:**
- Quality over quantity (15-25 premium pages, not 80 mediocre ones)
- Tiered LLMs (Sonnet for hero, GPT-4o for services, Haiku for structured, templates for deterministic)
- Self-hosted on VPS (no Vercel dependency at scale)
- Monorepo (no GitHub repo sprawl)
- Photo-first (real photos > stock)
- Growth Engine (data-driven expansion post-launch)
- Content fingerprinting (prevent cross-client duplication)
- Notion-style editor (retention, not just generation)

**The proof:** We already built it manually for HVAC San Mateo. Now we automate it — smarter.
