# SEO/GEO Command Center — Full 6-Phase Build Plan

## Context
Kyra currently has four disconnected SEO systems running in parallel with no unified dashboard:
1. **pSEO site builder** (`lib/sites/`) — generates 15–25 pages but city pages are near-identical (no real differentiating data), internal linker exists but is NOT wired, GSC integration exists but never surfaced in UI
2. **GEO tester** (`templates/vet-seo-worker/skills/geo-tester/`) — only runs for `premium_template === 'vet-seo-worker'` clients
3. **NAP auditor** (`templates/vet-seo-worker/skills/nap-auditor/`) — same vet-only gate
4. **Growth suggestions** (`app/api/agency/sites/[id]/growth/`) — LLM hallucination, no real GSC data

## Goal
Unify all four into a single SEO/GEO Command Center dashboard available to ALL paying clients across 30 industries.

## What Already Exists (DO NOT recreate)
- Migration: `supabase/migrations/20260413001_seo_command_center.sql` (10 tables + ALTER)
- `lib/seo/industry-packs.ts` — getIndustryPack, listIndustryPacks, seedIndustryPack
- `lib/seo/city-data.ts` — getCityData, ensureCityData
- `lib/seo/gsc-sync.ts` — syncGSCMetrics, getPageMetrics
- `lib/seo/internal-linker.ts` + `lib/seo/internal-linker-writer.ts`
- `lib/seo/dataforseo.ts` — keyword tracking
- `lib/seo/growth-engine-v2.ts` — growth suggestions
- `lib/seo/publish-scheduler.ts` — publish queue processing
- `lib/seo/platform-provisioner.ts` — Web 2.0 platform provisioning
- `lib/seo/worker-dispatcher.ts` — SEO worker dispatch
- `lib/seo/schema-markup.ts` — schema generation
- `lib/sites/prompts.ts` — page generation prompts
- `lib/sites/content-engine.ts` — page content generation
- `app/api/admin/seo/seed-pack/[industry]/route.ts`
- `app/api/agency/clients/[id]/seo/route.ts` — main SEO endpoint
- `app/api/agency/clients/[id]/seo/run/route.ts` — run SEO tasks
- `app/api/agency/clients/[id]/seo/publish/route.ts` — publish content
- `app/api/agency/clients/[id]/seo/keywords/route.ts`
- `app/api/agency/clients/[id]/seo/rank/route.ts`
- `app/api/agency/clients/[id]/seo/serp/route.ts`
- `app/api/agency/clients/[id]/seo/status/route.ts`
- `app/api/agency/sites/[id]/seo/route.ts`
- `app/api/agency/sites/[id]/seo/growth/route.ts`
- `app/api/cron/seo-worker/route.ts`
- `app/api/cron/seo/gsc-sync/route.ts`
- `app/api/cron/seo/publish-queue/route.ts`
- `app/(dashboard)/agency/clients/[id]/seo-dashboard.tsx` — main SEO dashboard
- `app/(dashboard)/agency/clients/[id]/seo-setup-wizard.tsx`
- `app/(dashboard)/agency/clients/[id]/nap-audit-panel.tsx`
- `app/(dashboard)/agency/clients/[id]/seo-guide/`
- `app/(dashboard)/agency/website/[siteId]/seo/page.tsx`
- `templates/vet-seo-worker/` — vet-specific configs and skills

## EMPTY directories that need route.ts files:
- `app/api/agency/clients/[id]/seo/geo-scores/` — EMPTY, needs route.ts
- `app/api/agency/clients/[id]/seo/nap-status/` — EMPTY, needs route.ts

## Phase 1 — Database Foundation + GSC Sync (ALREADY DONE)
Migration exists. lib modules exist. API routes exist. Cron exists.
**Audit needed:** Verify all lib modules actually reference the new normalized tables, not just legacy JSONB.

## Phase 2 — Industry Pack System + Content Differentiation
- Admin seed script exists at `/api/admin/seo/seed-pack/[industry]`
- `lib/seo/industry-packs.ts` exists
- `lib/seo/city-data.ts` exists
- **Need to verify:** `lib/sites/prompts.ts` injects real city data (not just placeholder text)
- **Need to verify:** `lib/sites/content-engine.ts` calls `ensureCityData()` before generating city pages
- **Need to verify:** Similarity checker is blocking at 65% (not advisory at 60%)
- **Need to verify:** Internal linker is wired into page generation pipeline

## Phase 3 — GEO Testing Engine (Universal)
- Remove vet-only gate — make GEO tester work for ALL industries
- `app/api/agency/clients/[id]/seo/geo-scores/route.ts` — NEEDS CREATION
- GEO results should read/write from `seo_geo_results` table
- Competitor tracking via `seo_competitor_scores` table
- Content gaps auto-detected from `seo_content_gaps` table

## Phase 4 — NAP Auditor (Universal)
- Remove vet-only gate — make NAP auditor work for ALL industries
- `app/api/agency/clients/[id]/seo/nap-status/route.ts` — NEEDS CREATION
- NAP results should read/write from `seo_nap_audits` table
- Use industry-pack directories instead of hardcoded vet directories

## Phase 5 — Authority Stacking + Publishing
- Web 2.0 publisher, semantic stacker, press releases
- `lib/seo/publish-scheduler.ts` exists
- `lib/seo/platform-provisioner.ts` exists
- Verify publish queue cron works end-to-end

## Phase 6 — Unified Dashboard + Analytics
- `seo-dashboard.tsx` exists (831 lines)
- Verify it pulls from ALL normalized tables (not legacy JSONB)
- Add GEO score trends chart
- Add NAP audit status panel
- Add keyword ranking trends
- Add competitor comparison view
- Add content gap alerts

## Key Principles
1. **No duplicates** — Don't create new files if they already exist
2. **No overlapping functionality** — Check before adding new API routes
3. **Follow Kyra branding** — Use existing component library (shadcn/ui)
4. **Audit before delete** — Check all imports before removing any code
5. **Test everything** — TypeScript must compile, endpoints must return valid JSON
