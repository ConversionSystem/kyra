# Kyra Website Builder — Technical Audit v2 (Mar 14, 2026)

## CRITICAL (production-breaking)

1. **Unsplash Source API dead** — `lib/sites/unsplash.ts:51` — shut down; broken images on all auto-photo sites
2. **`emergency_247` never saved** — wizard collects it, POST route drops it
3. **`existing_website_url` never scraped** — wizard promises scraping, never happens (remove the promise)
4. **`redeploy` calls wrong endpoint** — `website-tab.tsx:988` calls `/deploy` not `/build` — Redeploy is 100% broken
5. **Growth engine `page_type` typo** — `growth/route.ts:246` sets `'services'` not `'service'`
6. **Hours format mismatch** — wizard saves `{days,start,end}`, prompts expect `{mon,tue,...}` — every site shows "Not specified"
7. **No PATCH route for pages** — `website-tab.tsx:279` calls `PATCH /pages/${slug}` — Save and AI Regenerate both fail silently
8. **No PATCH/DELETE for sites** — `website-tab.tsx:644,665` calls `PATCH/DELETE /sites/${id}` — Settings save and delete silently fail
9. **Blog content parsing bug** — prompts return JSON, `parseContent()` expects markdown — blog posts are garbage

## HIGH

10. **Photos never reach deployed site** — verify upload → DB → build route chain
11. **Template ignores brand colors** — CSS vars injected but components still use hardcoded `bg-gray-900`, `bg-red-600`
12. **No status polling after actions** — user sees stale status; generation takes 1-3 min
13. **bookingUrl missing from auto-build** — content-engine `triggerBuildAndDeploy` omits it; first builds have no booking links
14. **Content similarity checker ignores region** — parameter accepted but never used in query
15. **Growth analysis polling too fast** — waits 5s once; GPT-4o-mini takes 10-20s
16. **Template ignores design_style** — all 4 styles produce identical sites
17. **GA4 never injected in template** — `layout.tsx` has no GA4 script
18. **Widget WIDGET_CLIENT_ID placeholder** — may not be replaced by provisioner
19. **Knowledge sync misses city/blog pages** — only syncs homepage, service, utility
20. **white_label never used in template** — no conditional Kyra branding

## MEDIUM

21. **rating/review_count not collected** — wizard has no fields; sites show fake 5/5 (0 reviews)
22. **Cities hardcoded to Bay Area** — industry defaults ignore actual business location
23. **No deploys route** — growth view deploy history always shows "No deploys yet" (route may not exist)
24. **Wizard loses progress on navigation** — no sessionStorage or DB draft saves

## NICE-TO-HAVE

25. No preview before deploy
26. Contact page has no actual form
27. Reviews page has no real review integration
28. Sitemap.xml not generated (template exists, verify)
29. Service descriptions not collected in wizard
30. No robots.txt in template (verify)

## Top 10 Highest-Leverage Fixes (priority order)

| # | Fix | Effort |
|---|-----|--------|
| 1 | Fix `redeploy` endpoint (`deploy` → `build`) | S |
| 2 | Create PATCH/DELETE `/api/agency/sites/[id]` | M |
| 3 | Create PATCH/POST `/api/agency/sites/[id]/pages/[slug]` | M |
| 4 | Fix hours format mismatch | S |
| 5 | Fix blog JSON→markdown parse bug | S |
| 6 | Fix growth engine page_type typo | S |
| 7 | Replace dead Unsplash Source API | S |
| 8 | Add bookingUrl to content-engine auto-build | S |
| 9 | Add status polling to Website Tab | S |
| 10 | Add rating/review_count to wizard | S |
