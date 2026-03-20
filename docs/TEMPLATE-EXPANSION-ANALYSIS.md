# Kyra Website Builder — Template Expansion: The Full Picture
*March 20, 2026 | For Angel Castro*

---

## The Honest Assessment

You're right to push on this. The current website builder sends `template: 'generic'` to the provisioner. **One template. Period.** Every client in every industry gets the same HTML skeleton. The 4 "design styles" in the code don't actually render differently — it's a dropdown that changes nothing (Bug #16). And the brand colors clients pick get ignored because the CSS still uses hardcoded values (Bug #11).

Clients aren't asking for "more templates." They're telling you **the product isn't ready to sell.** A one-template builder in 2026 can't compete — GHL has 1,000+ templates, Duda has hundreds, even SiteSwan has 300+.

Let me break down every real path forward, including the ones most people won't consider.

---

## SECTION 1: The Competitive Reality

| Competitor | Templates | Editor | Monthly Cost | What They Don't Have |
|---|---|---|---|---|
| **GoHighLevel** | 1,000+ | Drag-and-drop | Included in $297-$497/mo | AI content generation, per-site AI chat widget |
| **Duda** | 100+ | Advanced visual | $149/mo white-label | AI brain, autonomous agents |
| **SiteSwan** | 300+ | No-code builder | $199-$499/mo | AI anything |
| **10Web** | Industry-specific | WordPress AI | Usage-based | Non-WordPress flexibility |
| **Weblium** | 300+ | AI-assisted | Affordable | Agent integration |
| **Kyra (today)** | **1** | None (AI-only) | Included | — |

**Kyra's moat is NOT templates. It's the AI employee attached to the site.** But you can't sell the AI employee if the site looks like a homework project. Templates are table stakes — you need enough to not get laughed out of the conversation.

---

## SECTION 2: Every Option, Ranked by Impact

---

### 🏆 OPTION A: AI-Generated Full HTML (Nuclear Option — Highest Impact)
**Skip templates entirely. Generate unique sites per client from scratch.**

**How it works:**
Your content engine already generates all the copy via Claude/GPT. But it sends structured JSON to a static HTML template on the VPS. Instead: **have the LLM generate the complete HTML/CSS for each page.**

Claude Sonnet can output a full, deployable, single-file HTML/CSS/JS site in one API call. It's 2026 — the LLM IS the template engine.

**Architecture:**
```
Client wizard answers → Content engine → LLM generates full HTML per page
                                          ↓
                        Provisioner receives HTML, deploys as static site
                        (no template on VPS at all)
```

**What this means:**
- Every client site is unique. Not color-swapped. Unique layout, unique section ordering, unique visual personality.
- "HVAC emergency repair in Phoenix" gets a completely different layout than "Medical spa in Beverly Hills"
- The LLM uses brand colors, design_style, industry context, and tone to make design decisions
- You leapfrog every competitor. GHL has 1,000 templates but they all look templated. Yours look custom.

**Prompt structure:**
```
You are an elite web designer. Generate a complete, self-contained HTML page.

Business: {name}, {industry} in {city}, {state}
Design style: {design_style} 
Brand colors: primary {color_primary}, secondary {color_secondary}
Tone: {tone}

This is the {page_type} page. Content:
Hero: {hero_h1} / {hero_subtitle}
Sections: {sections JSON}

Requirements:
- Tailwind CSS via CDN (no build step needed)
- Mobile-first responsive
- Fast loading (no heavy JS frameworks)
- Include the Kyra chat widget script
- SEO: proper meta tags, schema markup, semantic HTML
- Design must look like a $5,000 custom site, not a template

Output ONLY the complete <!DOCTYPE html> to </html>.
```

**Cost:** ~$0.03-0.08 per page × 15-25 pages = **$0.45-2.00 per site** (already within your ~$0.30 content budget, may need to double it)

**Effort:** M (2-3 weeks) — rework the content engine to output HTML instead of JSON, update the provisioner to accept raw HTML instead of template + data

**Risk:**
- LLM output inconsistency — some sites might look weird. Needs QA loop (generate → screenshot → score → regenerate if bad)
- Slightly higher LLM costs per site
- Harder to "edit one section" later — the whole page is a blob

**Mitigation:**
- Use a "design system prompt" that constrains the LLM to a set of approved Tailwind patterns
- Add a visual QA step: Puppeteer screenshot → GPT-4o vision scores it 1-10 → auto-regenerate if < 7
- Store the HTML in the DB so clients can request "regenerate this page in a different style"

**Why this is the nuclear option:** You go from "we have 1 template" to "every site is custom-designed by AI." No competitor can match this story. Every agency demo becomes "watch the AI design a unique site for your client in 5 minutes."

---

### 🥈 OPTION B: Template Library (20-30 templates) via Tailwind Component System
**Build a real template system with section-based composability.**

Instead of one monolithic template, build a **component library** of interchangeable sections:

**Section types (each with 3-5 visual variants):**
| Section | Variants |
|---|---|
| **Hero** | Full-bleed image, Split-screen, Centered badge, Video background, Gradient overlay |
| **Services grid** | 3-column cards, 2-column with icons, Alternating left-right, Accordion, Tab-based |
| **About** | Photo + text split, Timeline, Team grid, Stats bar, Full-width narrative |
| **Testimonials** | Carousel, Grid cards, Single spotlight, Video testimonial, Star-rating wall |
| **CTA** | Phone-first banner, Form embed, Booking calendar, Floating bottom bar, Two-column split |
| **FAQ** | Accordion, Two-column, Search-enabled, Tabbed by category |
| **Footer** | Minimal, 4-column links, Map + contact, Dark branded, Newsletter + social |
| **Nav** | Transparent overlay, Sticky white, Hamburger-first, Logo centered, Mega menu |

**Math:** 8 section types × 4 variants each = 32 sections. The system can generate **thousands of unique page combinations.**

**How it works:**
1. Build each section variant as a Tailwind HTML partial (stored in Supabase or on the VPS in `/templates/sections/`)
2. Each industry gets a "recipe" — which section variants to use by default
3. The AI content engine fills the content slots
4. The provisioner assembles the sections into full pages

**Example recipes:**
```typescript
const INDUSTRY_RECIPES = {
  'hvac': {
    hero: 'full-bleed-emergency',     // Big "CALL NOW" over action photo
    services: 'icon-grid-3col',        // Service icons in a grid
    about: 'stats-bar',               // Years, jobs completed, rating
    testimonials: 'star-rating-wall',
    cta: 'phone-first-banner',
    faq: 'accordion',
    footer: 'map-contact',
    nav: 'sticky-white',
  },
  'med-spa': {
    hero: 'gradient-overlay',          // Soft, elegant
    services: 'alternating-lr',        // Photo left, text right, alternate
    about: 'team-grid',               // Doctor/staff photos
    testimonials: 'single-spotlight',
    cta: 'booking-calendar',
    faq: 'two-column',
    footer: 'minimal',
    nav: 'transparent-overlay',
  },
  // ... etc for all 25 industries
};
```

**Clients choose from "template previews"** that are really combinations of these sections. You show 3-4 options per industry, each is a different recipe.

**Effort:** L (3-4 weeks for 32 sections + assembly pipeline + gallery UI)
**Cost:** $0 (all custom-built, Tailwind CDN)
**Templates available:** Effectively 20-30 distinct "looks" from combinatorial section assembly, but the underlying library supports thousands

---

### 🥉 OPTION C: Acquire and Convert Premium Templates
**Buy the best HTML templates, convert them to Kyra's system.**

**Source 1: Nicepage.com** — 15,000+ free commercial-use templates
- No licensing issues
- Industry-specific (dental, legal, restaurant, real estate — exactly our verticals)
- Direct HTML/CSS export
- Quality: 6/10 — decent but not premium

**Source 2: ThemeForest Extended License** — $100-250 per template
- Extended License = legal for SaaS serving unlimited end clients
- Quality: 9/10 — professionally designed
- Risk: maintenance burden, may use jQuery/Bootstrap patterns that clash with our Tailwind approach
- Best picks: Nexsas ($14 reg, ~$100 extended), Porto, Flavor (restaurant), MediPro (medical)

**Source 3: Tailwind template packs (free/open-source)**
- TailGrids — 100+ free Tailwind components
- UIDeck — 30+ landing templates
- Shadcn/UI blocks — modern, beautiful, React/Next.js compatible
- Magic UI (19K GitHub stars) — production-ready animated components
- Quality: 8/10 — modern, matches our stack perfectly
- **This is the best source.** Free, Tailwind-native, MIT-licensed.

**Conversion process per template:**
1. Strip content, keep layout/CSS
2. Create content injection slots (hero_h1, sections, etc.)
3. Map to Kyra's design variables (color_primary, color_secondary, etc.)
4. Test with 3 industries
5. Screenshot for gallery preview
6. ~6-10 hours per template

**Effort:** M (2 weeks for 10-15 templates)
**Cost:** $0-$500 depending on sources
**Result:** 10-15 professionally designed templates ready for the gallery

---

### OPTION D: Embed Duda as the Builder (Buy vs. Build)
**Stop building your own website builder. White-label Duda.**

**The case for this:**
- Duda's white-label plan: $149/mo + $17/site
- 100+ templates, real drag-and-drop editor, mobile editor, client collaboration
- Full API: programmatic site creation, domain mapping, auto-SSL
- You focus on what makes Kyra unique (AI employees, GHL integration, agency dashboard) instead of reinventing the wheel

**How it would work:**
```
Kyra wizard → AI generates content → Duda API creates site with template
                                    → Injects content into Duda sections
                                    → Kyra chat widget added via custom code
                                    → Client edits in Duda editor (white-labeled as Kyra)
```

**Economics at scale:**
- 50 client sites: $149 + (50 × $17) = $999/mo to Duda
- If agencies pay $99-499/mo for Kyra, the math works at scale
- At 200 sites: $149 + (200 × $17) = $3,549/mo → custom Duda pricing kicks in (volume discounts)

**Pros:** Instant world-class editor, hundreds of templates, zero build time
**Cons:** $149/mo + per-site cost, dependency on Duda, less differentiation, another moving part

**Verdict:** Only if you decide building a site editor is not worth Kyra's engineering time. It's a valid strategy — many SaaS platforms embed Duda.

---

### OPTION E: 10Web White-Label API (WordPress-based)
**Use 10Web's AI site builder via API. Fully white-labeled.**

- AI generates WordPress sites from prompts in < 60 seconds
- Industry-specific templates
- Full white-label: custom domain, branding, client dashboard
- REST API: programmatic site creation, plugin management, domain mapping
- Managed WordPress on Google Cloud
- Usage-based pricing with volume discounts

**Pros:** Most complete white-label AI builder available via API. WordPress = infinite ecosystem.
**Cons:** WordPress = heavier infrastructure, slower, more attack surface. Monthly cost per site.

---

### OPTION F: GrapesJS Studio SDK (Build Your Own Editor — Long-term)
**Embed a real drag-and-drop visual editor inside Kyra.**

- Open-source core, paid Studio SDK ($99+/mo for SaaS)
- Template manager built in (onLoad callback → fetch from Supabase)
- Marketplace at gjs.market for blocks and template packs
- Blocky for Tailwind ($59): 40+ pre-built responsive blocks
- Can convert any of our HTML templates into GrapesJS-editable JSON

**The pitch to agencies:** "Your clients can customize their AI-generated site themselves — drag-and-drop editing, no code needed."

**Effort:** XL (4-8 weeks minimum)
**When to do this:** Q2-Q3, after template library exists, after critical bugs are fixed

---

### OPTION G: Template Marketplace (Revenue Stream)
**Build a template marketplace inside Kyra where designers sell templates.**

- Free templates: included with all plans (5-10 basic)
- Premium templates: $29-$99 one-time purchase
- Agency-exclusive templates: included with Pro/Scale plans
- Community submissions: designers submit templates, earn 70% revenue share

**This is a business model, not a feature.** It only works after you have the template infrastructure from one of the other options.

**Effort:** L (3-4 weeks for marketplace + payment integration)
**Revenue:** If 50 agencies buy 2 premium templates/mo at $49 avg = $4,900/mo additional revenue

---

### OPTION H: v0-style AI Generation in the Dashboard
**Let agencies describe what they want, AI generates it live in the dashboard.**

Think v0.dev (Vercel) but inside Kyra:
- Agency types: "Modern dark website for an HVAC company in Phoenix with red branding"
- AI generates a preview in 30-60 seconds
- Agency clicks "Use this" or "Regenerate"
- Full site is built from that generation

**This is Option A on steroids — it becomes the product demo.**

**Effort:** L (3-4 weeks — prompt engineering + preview renderer + UI)
**Cost:** LLM costs ~$0.50-1.00 per generation attempt

---

## SECTION 3: The Real Strategy

Here's what I'd actually build, in order:

### Sprint 1: Immediate (This Week)
**Fix the bugs that make the current template actually work.**
- Make design_style render 4 genuinely different CSS treatments
- Make brand colors actually apply everywhere
- Fix the 8 critical bugs from the V2 audit
- **Result:** 1 template that actually works in 4 visual styles. Table stakes.

### Sprint 2: Week 2-4
**Option B (section-based template system) + Option C (Tailwind source templates).**
- Build 32 section variants from Tailwind open-source sources (TailGrids, UIDeck, Magic UI, Shadcn blocks)
- Create 25 industry recipes (one per industry we serve)
- Build a template gallery with real screenshots in the wizard
- **Result:** 20-30 visually distinct site options. Agencies stop complaining.

### Sprint 3: Week 5-8
**Option A (AI-generated HTML) as a premium "Custom Design" tier.**
- Rework content engine to output full HTML instead of JSON
- Add visual QA (Puppeteer screenshot → vision model scoring)
- Position as "Custom AI-designed site" — the premium offering
- **Result:** Every premium client gets a unique site. Demo-killer for sales calls.

### Sprint 4: Month 3+
**Option F (GrapesJS) or Option G (marketplace) based on demand.**
- If agencies ask for editing: GrapesJS
- If agencies ask for more designs: marketplace
- Decision made based on real customer feedback, not guessing

---

## SECTION 4: The Unfair Advantage Play

Here's what nobody in this space is doing:

**AI-designed + AI-written + AI-powered sites, generated in 5 minutes, with an AI employee that knows the site inside out.**

GHL has templates. Duda has a builder. SiteSwan has themes. **None of them generate a unique site + train an AI on it + deploy it + have the AI answer customer questions about the business — in one automated pipeline.**

That's the pitch. Templates are just the delivery vehicle. The AI employee is the product. But the delivery vehicle needs to look good enough that agencies trust the product inside it.

Get to 20-30 solid templates (Sprint 2) and this problem goes from blocker to non-issue. Then the AI-generated custom sites (Sprint 3) become the feature nobody else can copy.

---

## Quick Decision Matrix for Angel

| Question | Answer |
|---|---|
| **What to build this week?** | Fix bugs. Make 4 styles actually render. (Sprint 1) |
| **What to build this month?** | Section-based template library from open-source Tailwind. 20-30 looks. (Sprint 2) |
| **Should we buy Duda/10Web?** | Not yet. Our AI-generated approach is more differentiated. Revisit if template building takes too long. |
| **Should we buy ThemeForest templates?** | Grab 3-5 from Tailwind open-source (free). ThemeForest only if you need a specific premium look. |
| **When to build drag-and-drop editor?** | Q2-Q3 minimum. Fix the foundation first. |
| **Biggest competitive opportunity?** | AI-generated unique HTML per client (Option A). Nobody else is doing this at scale. |
| **What's the sales pitch?** | "Every site is custom-designed by AI. Not a template. Not a theme. A unique design for your business." |

---

*This analysis covers all options I could find. Tell me which direction and I'll start building.*
