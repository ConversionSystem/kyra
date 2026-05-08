# Kyra Database Layer Analysis

Scope: `supabase/schema.sql` (baseline), `supabase/migrations/` (81 files), `migrations/` (2 root files), `supabase/seeds/seed-templates.sql`.

## Domain Model Map

### Auth / Users (single-tenant legacy)
- `public.users` — extends `auth.users`; email, plan, stripe_customer_id, usage_this_month, settings (`supabase/schema.sql`)
- `public.conversations` — per-user chat threads; channel in (web/slack/email/api)
- `public.messages` — role=user/assistant/system, conversation-scoped
- `public.memories` — per-user facts; `pinecone_id` for vector sync
- `public.integrations` — per-user OAuth (slack/google/notion/github)
- `public.reminders` — scheduled user reminders
- `public.notifications` — proactive insights/nudges (`003_notifications.sql`)
- `public.automations` — per-user cron jobs; `openclaw_job_id` (`20260212_skills_automations.sql`)
- `public.user_skills` — enabled skills per user with `api_key_encrypted`
- `public.user_channels` — telegram/whatsapp/slack/email/discord link (`20260211_user_channels.sql`, redefined in `005_channels.sql`)
- `public.user_files` — uploaded file refs
- `public.entities` / `public.relationships` — deep memory graph (`006_memory_graph.sql`)
- `public.pipelines` — single-user multi-step work with checkpoints (`004_pipelines.sql`)

### Agency Tenant Core
- `public.agencies` — top-level tenant; owner_id, plan, slug, settings, Stripe/GHL/gateway fields, api_keys (`20260213004_agency_schema.sql` + many ALTERs)
- `public.agency_members` — user↔agency mapping with role (owner/admin/member)
- `public.agency_clients` — client AI instances per agency; GHL tokens, gateway fields, settings, ai_model
- `public.agency_templates` — reusable client configs (built-in when `agency_id IS NULL`)
- `public.agency_billing` — immutable ledger: subscription/client_fee/credit_topup/payout
- `public.sub_account_members` / `public.sub_account_invitations` — portal users for client sub-accounts (`20260223003_account_hierarchy.sql`)
- `public.orphaned_auth_users` — VIEW over `auth.users LEFT JOIN agency_members` (`20260224001`)

### Billing / Credits / Referrals
- `public.agency_credits` — per-agency balance, lifetime totals (UNIQUE on agency_id)
- `public.credit_transactions` — purchase/usage/refund/bonus/manual
- `public.agency_referrals` — referrer/referred mapping, `early_bird`, credits granted
- `public.premium_template_subscriptions` — Stripe-backed premium template gating (`migrations/20260305001_premium_template_subscriptions.sql`)
- `public.kyra_waitlist` — landing-page capture

### Onboarding / Admin
- `public.build_requests` — custom AI worker intake (`20260318001`, `20260321001`)
- `public.ghl_subaccount_requests` — manual GHL sub-account creation queue
- `public.content_calendar` — editorial pipeline for blog/LinkedIn/Facebook/X (root `migrations/20260417001`)

### CRM
- `public.crm_companies`, `public.crm_contacts`, `public.crm_activities`, `public.crm_deals` (`20260227001_crm_core.sql`)
- `public.crm_tasks` — AI/human task assignments (`20260227002_crm_tasks.sql`)
- `public.customer_memory` — structured customer knowledge graph, `client_id TEXT`, tags GIN (`20260301002`)
- `public.web_chat_leads` — widget-captured leads linked to `crm_contacts` (`20260301001`)

### Pipeline (AI Sales Engine)
- `public.pipeline_campaigns`, `public.pipeline_leads` (`20260225001_pipeline.sql`)
- `public.pipeline_webhooks`, `public.pipeline_activity_log` (`20260226001_pipeline_hitl.sql`)
- `public.pipeline_integrations`, `public.pipeline_crm_sync_log` (`20260226002`)
- `public.pipeline_follow_ups` (`20260227002_pipeline_follow_ups.sql`)
- `public.pipeline_ab_tests`, `public.pipeline_message_templates` (`20260228001`)

### Channels / Conversations / Messaging
- `public.client_conversations` — per-agency-client conversation log, added `session_id`/`source_url` later (`20260221001`, `20260305001_widget_analytics_columns.sql`)
- `public.ghl_webhook_logs` — inbound GHL webhook audit (`20260214001_ghl_phase2.sql`)
- `public.ghl_message_log` — processed messages per agency_client (`20260216002`)
- `public.ghl_action_proposals`, `public.ghl_action_log` — HITL write-action confirmation + audit (`20260320002`)
- `public.delivery_sms_log` — SMS audit (springbig/blackleaf/mock), `client_id TEXT` (`20260312001`)
- `public.review_requests`, `public.payment_requests` — reputation + invoicing, `client_id TEXT`, `agency_id UUID NOT NULL` (but no FK!)
- `public.voice_call_logs` — Twilio turns, `client_id TEXT`, `agency_id TEXT` (`20260306001`, `20260306002`, redefined `20260313002`)
- `public.voice_call_history` — per-turn conversation history replacing in-memory Map (`20260312002`)
- `public.voice_usage` — monthly minute tracking per agency (`20260312002`)

### Email Marketing
- `public.email_templates`, `public.email_contacts`, `public.email_campaigns`, `public.email_analytics`, `public.email_unsubscribes` (`20260312003_email_marketing.sql`)
- `public.email_sequences`, `public.email_sequence_steps`, `public.email_sequence_enrollments` (`20260403001`)
- `public.email_nurture_queue` — 7-email agency onboarding drip (`20260322001`)

### Bookings
- `public.client_bookings`, `public.client_booking_config` (`20260403002_bookings.sql`)

### Knowledge
- `public.knowledge_documents` — per-agency or per-client synced docs (`20260219001`)
- `public.client_knowledge` — structured insights harvested from conversations (`20260401001`)
- `public.client_secrets` — encrypted key-value vault per agency_client (`20260313003`)

### Website Builder
- `public.client_sites` — wizard data + build state, ALTERed 7+ times (GA4, GSC tokens, nav_links, sections, generation_mode, google_review_url)
- `public.site_pages` — pages with AI-generated content, html_content, city_data_id
- `public.site_deploys` — version history (`20260314001`)

### SEO / GEO Command Center
- `public.seo_industry_packs`, `public.seo_city_data`, `public.seo_page_metrics`, `public.seo_geo_results`, `public.seo_nap_audits`, `public.seo_competitor_scores`, `public.seo_content_gaps`, `public.seo_keyword_rankings`, `public.seo_published_content`, `public.seo_publish_queue` (`20260413001_seo_command_center.sql`)

### Workers / Automation
- `public.worker_tasks`, `public.worker_task_runs` — autonomous task engine (`20260401003`)
- `public.worker_performance` — per-worker per-client monthly metrics (`20260401002`)
- `public.client_workflows`, `public.workflow_runs` — per-client AI workflow automation (`20260403003`)

### Ops / Dispatch
- `public.dispatch_events` — optimization runs / SLA breaches (`20260415001`)
- `public.firecrawl_usage` — monthly scrape quota per agency (`20260325001`)

No `CREATE TYPE` ENUMs exist in the entire codebase — every enumeration is `TEXT + CHECK (x IN (...))`.

## Migration Timeline & Evolution

1. **Legacy single-tenant foundation** — `supabase/schema.sql` establishes `users/conversations/messages/memories/integrations/reminders` (personal AI assistant shape). `001_fix_plans_and_trigger.sql` expands plan constraint (adds `max`), hardens `handle_new_user` with EXCEPTION block and ON CONFLICT DO NOTHING.
2. **Personal-AI bolt-ons** — `003_notifications.sql`, `004_pipelines.sql` (single-user pipelines, distinct from later agency pipelines), `005_channels.sql` (redefines `user_channels` with different schema than `20260211`), `006_memory_graph.sql` (entities/relationships).
3. **User-level skills & files** — `20260211_user_channels.sql` creates `user_channels` first (conflicts with later `005_channels.sql`), `20260212_skills_automations.sql`, `20260213001_custom_instructions.sql`, `20260213002_discord_channel.sql`, `20260213003_files.sql`.
4. **Agency pivot (Feb 13, 2026)** — `20260213004_agency_schema.sql`: introduces `agencies/agency_members/agency_templates/agency_clients/agency_billing`, the `set_updated_at()` trigger, `user_agency_ids()` helper, RLS, and 5 built-in templates (LeadPilot/DentalAssist/PropertyPro/ServicePro/RetailAssist). This is the fundamental architectural inflection.
5. **GHL Phase 2** — `20260214001_ghl_phase2.sql` adds `ghl_connected_at/by` to `agency_clients`, creates `ghl_webhook_logs` with RLS.
6. **Billing wiring** — `20260216001_stripe_connect_billing.sql` adds Stripe Connect + per-client `stripe_customer_id/subscription_id/billing_status`, default pricing. Filename collides with `20260216001_enhanced_templates.sql` (adds `icon/system_prompt_prefix/suggested_skills/sample_responses/ghl_config` JSONB columns to templates).
7. **Industry templates expansion** — `20260217001_personal_crm_competitive_intel_templates.sql`, `20260217002_content_curation_template.sql` (Content Curator + Education Assistant) add 4 more built-in templates. `20260217003_ghl_private_token.sql` allows Private Integration token auth. `20260217004_agency_api_keys.sql` adds BYOK `api_keys` JSONB.
8. **Plan constraint drift** — `20260218001_add_beta_plan.sql` DROPs/ADDs constraint to include `beta`. `20260222002_add_free_plan.sql` (one of a duplicate) DROPs/ADDs again with `free`. The noise of DROP/ADD CONSTRAINT is a direct consequence of the no-ENUM decision.
9. **Gateway architecture zig-zag** — `20260218002_agency_gateway.sql` puts per-AGENCY Fly.io gateway columns on `agencies` (pending→running lifecycle). `20260220001_per_client_gateway.sql` pivots to per-CLIENT OVH gateway on `agency_clients` (comments cite `OVH-ARCHITECTURE-SPEC.md`). Then `20260222001_agency_gateway.sql` re-adds agency-level gateway columns (filename duplicate of `20260222002_add_free_plan.sql` scheme) — now BOTH agency AND client carry gateway columns. Architecture becomes: agency has own gateway + each client has own gateway.
10. **Knowledge + client conversations** — `20260219001_knowledge_base.sql`, `20260221001_client_conversations.sql`, `20260221002_client_settings.sql` (adds `settings` JSONB to agency_clients).
11. **Duplicate-filename day (Feb 22)** — `20260222001_agency_gateway.sql` + `20260222002_add_free_plan.sql` vs `20260222002_ghl_contact_scan.sql` (adds `ghl_last_contact_scan` timestamp). Two migrations at same sequence number — filesystem ordering decides which runs first.
12. **Account hierarchy + credits + referrals** — `20260223001_agency_referrals.sql`, `20260223002_kyra_waitlist.sql`, `20260223003_account_hierarchy.sql` (master/agency/sub-account/user; marks ConversionSystem as master), `20260223004_kyra_credits.sql` (`agency_credits` + `credit_transactions`, trigger `create_agency_credits` on new agency). `20260305002_referral_earlybird.sql` + `20260308001_backfill_stuck_referrals.sql` + `20260308002_referral_status_constraint.sql` fix referral status drift.
13. **Pipeline subsystem (Feb 25-28)** — `20260225001_pipeline.sql` (campaigns/leads), `20260226001_pipeline_hitl.sql` (webhooks/activity_log, redefines stage CHECK), `20260226002_pipeline_integrations.sql` (generic CRM integration provider: ghl/hubspot/salesforce/pipedrive/custom + sync_log), `20260227002_pipeline_follow_ups.sql`, `20260228001_pipeline_ab_tests.sql`.
14. **Native CRM (Feb 27)** — `20260227001_crm_core.sql` (contacts/companies/activities/deals), `20260227002_crm_tasks.sql`. Adds `crm_contacts.client_id` later (`20260313001`) — late addition implies original CRM was agency-scoped only.
15. **Comms surfaces** — `20260301001_web_chat_leads.sql`, `20260301002_customer_memory.sql` (client_id TEXT, GIN index on tags), `20260302001_review_requests.sql`, `20260302002_payment_requests.sql` — all use `client_id TEXT` + loose `service_role full access` RLS.
16. **Voice AI** — `20260306001_voice_call_logs.sql` (client_id TEXT), `20260306002_voice_call_logs_agency_id.sql` (agency_id TEXT added), `20260312002_voice_usage.sql` (adds `voice_usage`, `voice_call_history`, columns for recording/transcript + `increment_voice_minutes` SECURITY DEFINER RPC), `20260313002_voice_call_logs.sql` (idempotent re-creation to recover missing earlier runs).
17. **Email stack (Mar 12)** — `20260312003_email_marketing.sql` creates 5 tables (templates/contacts/campaigns/analytics/unsubscribes) — **no RLS enabled anywhere in file**. Same pattern `20260322001` (nurture queue), `20260403001` (sequences).
18. **Website Builder v1→v2→editor→SEO** — `20260313004_website_builder.sql`, `20260314001_website_builder_v2.sql` (GA4, white_label, `site_deploys`), `20260318001_build_requests.sql`, `20260320001_ai_html_templates.sql` (html_content mode), `20260331001_website_editor_columns.sql`, `20260331002_website_builder_p2.sql` (section_order/section_overrides JSONB). Culminates in `20260413001_seo_command_center.sql` — 10 new SEO tables, ALTER of client_sites/site_pages with FKs to `seo_industry_packs`/`seo_city_data`. `20260414001_gsc_tokens.sql` adds GSC OAuth token columns to client_sites (plus a duplicate `ga4_id` already added in v2 — idempotent ADD IF NOT EXISTS).
19. **GHL agency-OAuth + sub-account manual queue (Mar 30)** — `20260330001_ghl_agency_oauth.sql` adds agency-level OAuth tokens to `public.agencies` (separate from per-client tokens on `agency_clients`). `20260330002_ghl_subaccount_requests.sql` creates manual review queue (Angel approves until Marketplace app lands).
20. **Worker engine (Apr 1) + workflows/bookings (Apr 3) + dispatch (Apr 15)** — `20260401001_client_knowledge.sql`, `20260401002_worker_performance.sql`, `20260401003_worker_tasks.sql` (autonomous task engine with `trigger_type` schedule/event/manual), `20260403002_bookings.sql`, `20260403003_workflows.sql`, `20260415001_dispatch_events.sql`. Root `migrations/20260417001_content_calendar.sql` is the most recent (admin editorial pipeline).

## Multi-Tenancy & Isolation

**Hierarchy** (from `20260223003_account_hierarchy.sql`):
```
master (agencies.account_level='master', e.g. ConversionSystem)
  → agency (agencies.account_level='agency')
    → agency_clients (client AI instances)
      → sub_account_members (end-client portal users)
        → auth.users
```

Core scoping tables (4-5 load-bearing):
1. **`agencies`** — tenant root (UUID PK)
2. **`agency_members`** — `(agency_id, user_id, role)` — the junction that `user_agency_ids()` reads
3. **`agency_clients`** — per-agency clients; `client_id` appears on ~30 downstream tables
4. **`sub_account_members`** — portal-level access for each client
5. **`public.users`** — legacy single-tenant root still receiving columns (`custom_instructions_knowledge/style` via `20260213001`) after the pivot

**Scoping columns across downstream tables:**
- `agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE` is the canonical pattern (crm_*, pipeline_*, client_*, email_*, knowledge_documents, firecrawl_usage, client_secrets, etc.)
- `client_id UUID REFERENCES agency_clients(id)` for per-client tables (client_conversations, client_workflows, client_bookings, knowledge_documents nullable, seo_* tables)

**Key RLS helper: `public.user_agency_ids()`** — `SECURITY DEFINER STABLE SQL` function returning `setof uuid` of agency IDs the current `auth.uid()` belongs to. Declared `SELECT agency_id FROM agency_members WHERE user_id = auth.uid()`. Used in ~12 migrations (`20260213004`, `20260214001`, `20260223003`, `20260330002`, etc.). Many later migrations inline the same subquery instead of calling the helper — inconsistent.

**Service-role bypass** pattern: most tables define a redundant `CREATE POLICY "service_role_all" FOR ALL USING (true) WITH CHECK (true)` policy on top of Supabase's default service-role bypass. `20260312001_delivery_sms_log.sql`, `20260318001_build_requests.sql`, `20260301001_web_chat_leads.sql`, etc. Some use `auth.role() = 'service_role'`, most use `true` — both work, but the noise is real.

## Row Level Security

**Tables WITH RLS**: ~55 tables — baseline users/conversations/messages/memories/integrations/reminders; agency-core agencies/agency_members/agency_templates/agency_clients/agency_billing; CRM crm_contacts/companies/activities/deals/tasks; pipeline_* (campaigns/leads/webhooks/activity_log/follow_ups/integrations/crm_sync_log); seo_* (10 tables); ghl_* (webhook_logs/message_log/action_proposals/action_log/subaccount_requests); client_* (conversations/secrets/bookings/booking_config/workflows/knowledge); sub_account_members/invitations; user_channels/files/skills; knowledge_documents; customer_memory; worker_tasks/task_runs/performance; voice_call_logs/history; voice_usage; firecrawl_usage; kyra_waitlist; build_requests; web_chat_leads; review_requests; payment_requests; delivery_sms_log; workflow_runs; dispatch_events; notifications; automations; entities; relationships; pipelines; content_calendar; premium_template_subscriptions.

**Tables MISSING RLS (actual gaps):**
- `agency_credits` + `credit_transactions` (`20260223004_kyra_credits.sql`) — billing-sensitive, no RLS. Any service-role write works, but credentials leakage = balance exposure.
- `pipeline_ab_tests` + `pipeline_message_templates` (`20260228001_pipeline_ab_tests.sql`) — outreach strategies exposed.
- `client_sites` + `site_pages` (`20260313004_website_builder.sql`) + `site_deploys` (`20260314001_website_builder_v2.sql`) — per-client website data, no RLS.
- `email_templates`, `email_contacts`, `email_campaigns`, `email_analytics`, `email_unsubscribes` (`20260312003_email_marketing.sql`) — entire email marketing stack without RLS.
- `email_sequences`, `email_sequence_steps`, `email_sequence_enrollments` (`20260403001`) — same.
- `email_nurture_queue` (`20260322001`) — internal but still agency-scoped.

**Policy-pattern variants observed:**
1. `agency_id IN (SELECT public.user_agency_ids())` — canonical (agency_schema, account_hierarchy, ghl_subaccount_requests, knowledge_documents).
2. `agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())` — inlined copy (crm_*, pipeline_*, bookings, workflows, web_chat_leads, workers, premium_template_subscriptions). Semantically identical to #1 but bypasses the SECURITY DEFINER wrapper.
3. `agency_id = auth.uid()` — **BROKEN** in `20260312001_delivery_sms_log.sql`:
   ```
   CREATE POLICY "agency_read_own" ON delivery_sms_log
     FOR SELECT USING (
       client_id IN (
         SELECT id::text FROM agency_clients WHERE agency_id = auth.uid()
       )
     );
   ```
   `agency_id` is a UUID FK to `agencies.id`; `auth.uid()` is a user UUID. They will never match. The policy always denies; the table is effectively service-role only (which is how it's used, but silently).
4. Nested `client_id IN (SELECT id FROM agency_clients WHERE agency_id IN ...)` — ghl_message_log, dispatch_events, ghl_webhook_logs.
5. `service_all USING (true) WITH CHECK (true)` — customer_memory, review_requests, payment_requests, build_requests, firecrawl_usage, content_calendar, voice_*, delivery_sms_log. Effectively = "RLS enabled but every role passes" when auth.role() isn't checked. Supabase's service_role already bypasses RLS, so these are mostly redundant — but when applied `FOR ALL` with `USING (true)`, they allow `anon` and `authenticated` too unless an earlier policy denies. Audit needed: some of these are likely accidentally wide-open.
6. Auth-gated SELECT + service-role-only write: seo_industry_packs/seo_city_data use `FOR SELECT TO authenticated USING (true)` and rely on service-role for writes.

**Other gaps/oddities:**
- `sub_account_invitations` has a policy `USING (true)` for public token lookup — intentional (invite acceptance) but unguarded.
- `orphaned_auth_users` VIEW has no RLS; runs as invoker, so leaks are possible if granted to `authenticated`.
- `content_calendar` enables RLS with NO policies — admin-only via service-role route is noted in comments, but any authenticated user sees zero rows (correct by default-deny).

## Key Integrations Surfaced in Schema

- **Stripe**: `users.stripe_customer_id/subscription_id` (baseline), `agencies.stripe_customer_id/stripe_connect_account_id/stripe_onboarding_complete/default_client_price_cents`, `agency_clients.stripe_customer_id/stripe_subscription_id/billing_status`, `agency_billing.stripe_invoice_id`, `credit_transactions.stripe_payment_intent_id`, `premium_template_subscriptions.stripe_subscription_id/customer_id`, `payment_requests.stripe_payment_intent_id`, `email_analytics.resend_email_id` (Resend for email delivery).
- **GHL (GoHighLevel)**: extensive surface — `agency_clients.ghl_location_id/access_token/refresh_token/private_token/connected_at/connected_by/last_contact_scan`; `agencies.ghl_access_token/refresh_token/token_expires_at/company_id/connected_at/connected_by` (agency-level OAuth for sub-account creation); `ghl_webhook_logs`, `ghl_message_log`, `ghl_subaccount_requests` (manual queue), `ghl_action_proposals` + `ghl_action_log` (HITL write confirmation + audit of every API call with risk_level).
- **OpenClaw Gateways** — dual deployment model:
  - Agency-level: `agencies.gateway_app_name/machine_id/url/token/status/region='fra'/volume_id/error/provisioned_at` (Fly.io, `20260218002`), then a second set `gateway_container_id` on docker (`20260222001`).
  - Per-client: `agency_clients.gateway_url/token/container_id/status/error/provisioned_at` (OVH, `20260220001`).
  - Status lifecycle: `pending→provisioning→starting→running→stopped→error` (agency version adds `destroying`).
- **Pinecone**: `memories.pinecone_id` (single-tenant legacy only — no per-agency equivalent in schema).
- **OAuth / tokens**: `integrations` (slack/google/notion/github), `pipeline_integrations` (ghl/hubspot/salesforce/pipedrive/custom with access/refresh/expires), `client_sites.gsc_access_token/refresh_token/expires_at/site_url` (Google Search Console), `user_channels.connection_token` for telegram/whatsapp/slack/email/discord, `client_secrets` vault (encrypted_value TEXT).
- **Webhooks**: `pipeline_webhooks` (per-agency outbound with HMAC secret + last_status/error), `ghl_webhook_logs` (inbound audit), `pipeline_activity_log.webhook_sent` flag.
- **Knowledge**: `knowledge_documents` (source_type text/url/file, synced_at timestamp), `client_knowledge` (categorized, hash-deduplicated, confidence-scored — harvested from conversations).
- **Templates**: `agency_templates` with rich JSONB (`cron_config`, `ghl_config`, `sample_responses`, `suggested_skills`, `system_prompt_prefix`, `soul_template` with `{{var}}` placeholders). 9 built-in templates seeded across 3 migrations. `premium_template_subscriptions` gates premium (`vet-seo-worker`) via Stripe.
- **Funnels / Automations**: `pipelines` (user-scoped with steps JSONB + checkpointing), `automations` (user cron + `openclaw_job_id`), `worker_tasks` (client-scoped autonomous tasks with trigger schedule/event/manual), `client_workflows` + `workflow_runs` (per-client automation). Workflow engine runs are logged with JSONB `step_results`.
- **Content Calendar**: `content_calendar` (blog/linkedin/facebook/x × 7 pillars, lifecycle draft→approved→posted, CTA tracking).
- **SEO / GEO**: DataForSEO (`seo_keyword_rankings.source='dataforseo'`), ChatGPT/Perplexity/Gemini GEO citation testing (`seo_geo_results.provider`), NAP directory audits, publish queue for Web 2.0 platforms (telegraph/wordpress/github_pages/notion/blogger/google_docs/google_sites).

## Indexes, Constraints, Triggers, Functions

**Non-trivial indexes:**
- **Partial indexes** (14+): `idx_reminders_user_due WHERE NOT delivered`, `idx_automations_enabled WHERE enabled = true`, `idx_notifications_user_unread WHERE read = FALSE AND dismissed = FALSE`, `idx_pipelines_status WHERE status IN ('running','paused')`, `idx_follow_ups_pending WHERE status = 'pending'`, `idx_email_sequence_enrollments_next WHERE status = 'active'`, `idx_worker_tasks_next_run WHERE enabled = true`, `idx_leads_ab_test WHERE ab_test_id IS NOT NULL`, `idx_crm_tasks_due WHERE status = 'pending'`, `idx_user_channels_token WHERE connection_token IS NOT NULL`, `idx_clients_gateway_status WHERE gateway_status IS NOT NULL`, `idx_agency_templates_public WHERE is_public = true`, `idx_agencies_gateway_status WHERE gateway_status IS NOT NULL`, `idx_agency_clients_billing_status WHERE billing_status != 'none'`.
- **GIN indexes**: `idx_customer_memory_tags ON customer_memory USING GIN (tags)`, `idx_email_contacts_tags ON email_contacts USING GIN(tags)`. No trigram/fulltext indexes despite heavy TEXT columns.
- **Composite indexes** for feed/timeline queries: `idx_crm_activities_feed (agency_id, needs_attention, resolved, created_at DESC)` is the richest; `idx_crm_contacts_last_activity (agency_id, last_activity_at DESC NULLS LAST)` uses NULLS LAST.
- **Unique constraints**: `agencies(slug)`, `agency_members(agency_id,user_id)`, `agency_clients(agency_id,slug)`, `sub_account_members(client_id,user_id)` + `(client_id,email)`, `sub_account_invitations.token`, `agency_credits.agency_id` (1:1), `client_secrets(client_id,key_name)`, `voice_usage(agency_id,month)`, `firecrawl_usage(agency_id,year_month)`, `email_contacts(agency_id,client_id,email)`, `customer_memory(client_id,contact_id)`, `seo_city_data(city,state)`, `seo_page_metrics(site_id,page_slug,date)`, `seo_keyword_rankings(site_id,keyword,date)`, `site_pages(site_id,slug)`, `premium_template_subscriptions(client_id,template_type)`, `kyra_waitlist.email`.

**`updated_at` trigger drift — TWO coexisting functions + 5 table-specific copies:**
- `public.update_updated_at_column()` (`supabase/schema.sql:180`) — used for users/conversations/memories/integrations.
- `public.set_updated_at()` (`20260213004_agency_schema.sql:14`) — used for agencies/agency_clients/knowledge_documents/sub_account_members/client_secrets/ghl_subaccount_requests.
- Redefined `update_updated_at_column` inside `20260225001_pipeline.sql` and a DO-block in `20260227001_crm_core.sql` (guards with `IF NOT EXISTS` but creates the same function again).
- 5+ table-specific copies: `update_web_chat_leads_updated_at()` (`20260301001`), `update_client_workflows_updated_at()` (`20260403003`), `content_calendar_touch_updated_at()` (root `20260417001`). Root `migrations/20260305001_premium_template_subscriptions.sql` has no trigger despite having `updated_at`.

**SECURITY DEFINER functions:**
- `public.user_agency_ids()` — STABLE SQL, the central RLS helper.
- `public.handle_new_user()` — auth trigger; inserts into `public.users` with plan='free', EXCEPTION block, ON CONFLICT DO NOTHING.
- `public.create_agency_credits()` — after-insert trigger on `agencies`, seeds `agency_credits`.
- `public.increment_voice_minutes(uuid, numeric)` — upsert on `voice_usage`.
- `public.increment_firecrawl_usage(uuid, text, int)` — upsert on `firecrawl_usage`.

No SQL stored procedures beyond these — all CRUD runs through Supabase REST or service-role API routes.

## Smells / Concerns

- **Duplicate migration filenames** (collision risk — filesystem sort decides):
  - `20260216001_enhanced_templates.sql` vs `20260216001_stripe_connect_billing.sql` (templates wins alphabetically).
  - `20260222002_add_free_plan.sql` vs `20260222002_ghl_contact_scan.sql` (add_free_plan wins alphabetically — but free-plan constraint change depends on order).
  - `20260216001_stripe_connect_billing.sql` is dependent on agencies existing; `20260216001_enhanced_templates.sql` is dependent on agency_templates. Both exist → no actual conflict, but the numbering convention is broken.
- **Two migration directories**: `supabase/migrations/` (81 files, Supabase CLI managed) + root `migrations/` (2 files: `20260305001_premium_template_subscriptions.sql`, `20260417001_content_calendar.sql`). The root files have no `README` describing how they're applied. The `20260305001` timestamp collides with `supabase/migrations/20260305001_widget_analytics_columns.sql` (same day, different prefix scope). Ambiguous deployment.
- **Overlapping `agency_gateway`**: `20260218002_agency_gateway.sql` (Fly.io-era columns: `gateway_app_name/machine_id/region/volume_id`) + `20260222001_agency_gateway.sql` (Docker-era: `gateway_container_id`). Both ADD columns IF NOT EXISTS — they pile up on `agencies`. The table now has DUPLICATE `gateway_status` CHECK constraints (`20260218002` allows `destroying`, `20260222001` doesn't) — unclear which survives since the second migration's CHECK constraint has the same name and ALTER TABLE … ADD COLUMN IF NOT EXISTS silently skips, leaving the first constraint in place. Confusion about container lifecycle.
- **Type drift — TEXT vs UUID for `client_id`/`agency_id`:**
  - UUID FK: `agency_clients` FKs in knowledge_documents, crm_*, pipeline_*, client_sites, client_bookings, client_secrets, worker_tasks, ghl_message_log.agency_client_id, dispatch_events.
  - TEXT: `voice_call_logs.client_id/agency_id`, `voice_call_history.call_sid` (ok), `delivery_sms_log.client_id`, `review_requests.client_id + contact_id`, `payment_requests.client_id + contact_id`, `customer_memory.client_id + contact_id`, `worker_task_runs.client_id` (UUID in `worker_tasks` but denormalized copy is bare `UUID NOT NULL` without FK).
  - The TEXT variant was chosen to accept either `agency_clients.id::text` OR `agencies.id::text` ("solo agency" fallback where a single agency acts as its own client) — this branch logic lives in application code, not schema. Breaks cascades: deleting an agency_client orphans voice/SMS/review logs.
- **Parallel plan taxonomies**:
  - `public.users.plan CHECK IN ('free','starter','business','max','enterprise')` — legacy personal-AI plans.
  - `public.agencies.plan CHECK IN ('free','starter','pro','scale','beta')` — agency plans.
  - No mapping table, no shared source of truth. Both check constraints are DROPped/ADDed repeatedly (`001_fix_plans_and_trigger`, `20260218001_add_beta_plan`, `20260222002_add_free_plan`).
- **Encryption promised in comments but not enforced**: `agency_clients.ghl_access_token/refresh_token`, `agencies.ghl_access_token/refresh_token`, `pipeline_integrations.access_token/refresh_token`, `user_skills.api_key_encrypted`, `client_secrets.encrypted_value`, `agencies.api_keys` JSONB — every comment says "encrypt at rest via Vault in production" but there is no `pgcrypto` / `pgsodium` / Supabase Vault wiring visible in any migration. `client_secrets.encrypted_value` is TEXT with no enforced ciphertext format. `user_skills.api_key_encrypted` relies entirely on application-layer crypto.
- **No `CREATE TYPE` ENUMs**: every status/role/stage is TEXT + CHECK. Adding a value requires `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ...` (visible in `001_fix_plans_and_trigger`, `20260218001`, `20260222002`, `20260226001` for pipeline_leads stage, `20260308002` for referrals). Every redefinition risks leaving orphan rows with values not in the new constraint.
- **Legacy `public.users` world still accepting new columns post-pivot**: `20260213001_custom_instructions.sql` adds `custom_instructions_knowledge/style` AFTER the agency pivot (same sequence date). Agency-era users get zero benefit from these columns; adds dead schema surface. The file-based `MEMORY.md` storage in `memories.pinecone_id` is single-user-only and has no agency equivalent.
- **Missing FKs**: `review_requests.agency_id`, `payment_requests.agency_id`, `pipeline_ab_tests.agency_id + campaign_id`, `pipeline_message_templates.agency_id`, `worker_tasks.agency_id`, `worker_task_runs.client_id + agency_id`, `client_knowledge.agency_id`, `worker_performance.agency_id`, `dispatch_events` has client_id FK but no agency_id column at all — declared as `UUID NOT NULL` without REFERENCES. Cascade deletes break.
- **`delivery_sms_log` RLS policy broken** (see above): `agency_id = auth.uid()` — UUID-to-agency vs user UUID, never matches, policy denies silently. Functions only via service-role.
- **`orphaned_auth_users` VIEW** has no RLS or documented GRANT REVOKE — if exposed via PostgREST, leaks email addresses of abandoned signups.
- **Four places store GHL OAuth tokens**: `integrations` (user-level), `pipeline_integrations`, `agencies.ghl_*`, `agency_clients.ghl_*`. No single source of truth.
- **`site_pages` has 5 coexisting render paths**: `content_sections JSONB` + `section_order/overrides JSONB` + `html_content TEXT` + `generation_mode` + `template_preset`. Three rewrites without deprecation.
