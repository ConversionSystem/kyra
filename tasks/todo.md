# Kyra Development Tasks

## Current Task: Unified SEO/GEO Command Center

### What exists now (scattered in 3 places):
1. **Marketing tab > SEO sub-tab** = keyword research + SERP + rank tracking (DataForSEO) — `marketing-tab.tsx` lines 551-949
2. **Insights tab > SEO sub-tab** = `SEODashboard` component = GEO + NAP + content publishing — `insights-tab.tsx` line 301, `seo-dashboard.tsx`
3. **Website > AI Visibility page** = same GEO/NAP but website-level — `seo/page.tsx`

### What we're building: ONE unified dashboard with 2 sections

---

## Plan

### Step 1: Create `components/dashboard/client-tabs/seo-geo-command-center.tsx`
- [ ] Top-level 2-tab bar: **SEO** (blue-600) | **GEO** (indigo-600)
- [ ] **SEO section sub-tabs:** Overview, Keywords, SERP, Rankings, Growth
  - Overview: GSC metrics summary (fetch `/api/agency/sites/[id]/seo`)
  - Keywords: copy SEOView keyword research logic from marketing-tab.tsx
  - SERP: copy SERP analysis logic from marketing-tab.tsx
  - Rankings: copy rank tracking logic from marketing-tab.tsx  
  - Growth: fetch `/api/agency/sites/[id]/seo/growth`
- [ ] **GEO section sub-tabs:** Overview, AI Citations, NAP Audit, Authority, Content Gaps
  - Overview: GEO score card + NAP health + content count (from `/api/agency/clients/[id]/seo`)
  - AI Citations: GEO test results table + run test button (from seo-dashboard.tsx)
  - NAP Audit: NAP consistency panel (reuse `NAPAuditPanel` component)
  - Authority: published content + publish queue (reuse `ContentPanel` + `PublishingPlatformsPanel`)
  - Content Gaps: uncited queries needing content
- [ ] Follow BRANDING.md strictly: light theme, white cards, stat cards pattern, empty states

### Step 2: Wire into insights-tab.tsx
- [ ] Replace `SEODashboard` rendering in SEO sub-tab with new `SEOGEOCommandCenter`
- [ ] Change sub-tab label from "SEO" to "SEO/GEO"

### Step 3: Clean up marketing-tab.tsx
- [ ] Rename Marketing "SEO" sub-tab to "Keyword Tools" (keeps it useful without overlap)
- [ ] Add cross-reference note pointing to Insights > SEO/GEO for full command center

### Step 4: Website-level page clarity
- [ ] Rename website seo/page.tsx title from "AI Visibility & Authority" to "Website SEO Performance"
- [ ] Keep it scoped to site-specific GSC/GEO data (no changes to functionality)

### Step 5: TypeScript + quality
- [ ] `npx tsc --noEmit` returns 0 source errors
- [ ] No dark theme classes on page content
- [ ] Commit and push

---

## Review
_(To be filled after implementation)_
