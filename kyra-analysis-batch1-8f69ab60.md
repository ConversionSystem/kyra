# Kyra Database Layer — Analysis Batch 1

Scope: `supabase/schema.sql` (baseline), 81 files in `supabase/migrations/`, 2 root files in `migrations/`, `supabase/seeds/seed-templates.sql`.

## Domain Model Map

### Auth / Users (legacy single-tenant, still present)
- `public.users` — extends `auth.users` with plan, Stripe IDs, `custom_instructions_knowledge`, `custom_instructions_style`, `usage_this_month`, `settings` JSONB. Still referenced by older tables (`pipelines`, `user_skills`, `automations`, `user_files`, `user_channels`). Plan check evolved: `free|starter|business|max|enterprise` (per `001_fix_plans_and_trigger.sql`).
- `public.conversations` / `public.messages` — single-user chat log (channel: web/slack/email/api). Pre-agency model.
- `public.memories` — per-user typed memories with Pinecone vector ID link (`pinecone_id`). Types: fact/person/decision/event/preference.
- `public.integrations` — legacy per-user OAuth (slack/google/notion/github), unique on `(user_id, provider)`.
- `public.reminders` — scheduled notifications per user.
- `entities` + `relationships` (`006_memory_graph.sql`) — per-user knowledge graph (nodes/edges with confidence scores).
- `notifications` (`003_notifications.sql`) — proactive insights per user.
- `user_skills`, `automations`, `user_files`, `user_channels` — per-user add-ons (skills toggle, cron jobs, file uploads, messaging channels).

### Agency (multi-tenant tier 1 — top-level tenant)
- `public.agencies` — agency tenant; `owner_id`, `slug`, `plan` (free/starter/pro/scale/beta), `account_level` (master/agency), Stripe Connect fields, GHL agency-level OAuth, `gateway_*` columns (Fly.io + later OVH), `api_keys` JSONB (BYOK), `settings` (white-label), `onboarding_steps` JSONB, `default_client_price_cents`.
- `public.agency_members` — user↔agency mapping, role `owner|admin|member`, unique `(agency_id, user_id)`.
- `public.agency_templates` — reusable client configs; `agency_id IS NULL` = built-in, `is_public` for community templates. Extended with `icon`, `system_prompt_prefix`, `suggested_skills`, `sample_responses`, `ghl_config`.
- `public.agency_clients` — tenant tier 2 (client AI instance); `ghl_location_id`, `ghl_access_token`, `ghl_refresh_token`, `ghl_private_token`, `ghl_last_contact_scan`, per-client gateway (`gateway_url/token/container_id/status`), Stripe Connect customer/subscription, `billing_status`, `ai_model`, `settings` JSONB, `container_config`.
- `public.sub_account_members` — tenant tier 3 (client staff portal users). Roles `owner|admin|viewer`.
- `public.sub_account_invitations` — invite tokens for sub-account portal (7-day expiry).
- `agency_billing` — immutable billing ledger (subscription/client_fee/credit_topup/payout).
- `agency_credits` + `credit_transactions` — credit wallet per agency (balance, lifetime totals, tx types: purchase/usage/refund/bonus/manual).
- `agency_referrals` — referrer→referred agency graph with `early_bird`, credit grants, status `pending→signed_up→activated→converted→paid_out`.

### Billing / Stripe / Monetization
- Stripe customer/subscription IDs on `users`, `agencies`, `agency_clients`.
- `premium_template_subscriptions` (root `migrations/20260305001...sql`) — per-client premium template billing (e.g., vet-seo-worker), status `active|canceled|past_due|trialing|beta`.
- `payment_requests` — AI-generated invoice tracking (cents, Stripe payment intents, reminder status).
- `kyra_waitlist` — pre-launch email capture.

### CRM (agency-scoped)
- `crm_companies` — company records per agency.
- `crm_contacts` — contacts per agency, optionally per-client (`client_id` added in `20260313001_crm_client_id.sql`). AI fields: `ai_summary`, `ai_next_action`, `score`, `score_label`, `stage`, `enrichment_data`.
- `crm_activities` — unified timeline (email/sms/call/note/ai_message/stage_change), with `needs_attention`, `actor` (human/ai/system).
- `crm_deals` — opportunities with stage/probability/close_date/owner.
- `crm_tasks` — AI/human tasks with priority, due date, `ai_draft`.
- `customer_memory` — per-client+contact structured knowledge graph (facts, tags, appointments, sentiment, LTV).
- `client_knowledge` — structured insights extracted from AI conversations (business_fact/customer_pattern/conversation_outcome/contact_preference/product_knowledge/correction), hash-based dedup.

### Sales Pipeline (lead-gen)
- `pipeline_campaigns` — targeting + counters, follow-up config (`follow_up_count/delay_days/channel`).
- `pipeline_leads` — leads with stage `found|researched|approved|outreach_approved|messaged|replied|interested|booked|closed|skipped`, enrichment, personalized copy, `ab_test_id`, `ab_variant`.
- `pipeline_webhooks` — per-agency outbound webhook configs.
- `pipeline_activity_log` — stage-change audit trail.
- `pipeline_integrations` — GHL/HubSpot/Salesforce/Pipedrive OAuth + config per agency.
- `pipeline_crm_sync_log` — CRM write audit.
- `pipeline_follow_ups` — scheduled follow-up messages (pending/sent/cancelled/failed/generating).
- `pipeline_ab_tests` — variant configs + live stats, `auto_optimize` + `confidence`.
- `pipeline_message_templates` — reusable outreach templates with `avg_response_rate`.

### Channels / Messaging / Voice
- `user_channels` (duplicated in `005_channels.sql` and `20260211_user_channels.sql`) — telegram/whatsapp/slack/email/discord.
- `client_conversations` — per-client AI conversation log (channels: test_chat/portal/telegram/sms/whatsapp/web_chat), with `session_id`/`source_url` for widget analytics.
- `web_chat_leads` — leads auto-captured from embed widget; `urgency` hot/warm/cold, links to `crm_contacts`.
- `ghl_message_log`, `ghl_webhook_logs` — GHL integration logs.
- `ghl_action_proposals` + `ghl_action_log` — write-action confirmation flow (risk_level low/medium/high, 24h expiry on proposals).
- `ghl_subaccount_requests` — manual provisioning requests.
- `voice_call_logs`, `voice_call_history`, `voice_usage` — Twilio voice AI (per-turn history, monthly minute tracking).
- `delivery_sms_log` — dispatch SMS audit (springbig/blackleaf/mock providers).

### Email Marketing
- `email_templates`, `email_contacts`, `email_campaigns`, `email_analytics`, `email_unsubscribes` (`20260312003_email_marketing.sql`).
- `email_sequences` + `email_sequence_steps` + `email_sequence_enrollments` (`20260403001_email_sequences.sql`).
- `email_nurture_queue` — 7-email signup drip for new agencies.

### Bookings / Workflows / Automations
- `client_bookings` + `client_booking_config` — AI-scheduled appointments.
- `client_workflows` + `workflow_runs` — per-client AI workflow engine (trigger JSONB, steps JSONB).
- `worker_tasks` + `worker_task_runs` — autonomous task engine (seo_audit/lead_followup/content_calendar/review_response/competitor_watch/performance_report).
- `worker_performance` — monthly per-worker metrics (conversations, bookings, escalations, positive/negative signals, tokens, credits).
- `review_requests` — reputation management flow.
- `pipelines` (legacy, pre-agency) — step-based pipelines with credits.

### Knowledge / Files
- `knowledge_documents` — per-client docs (text/url/file), `synced_at` marker for gateway sync.
- `client_secrets` — encrypted key/value per client (unique on `(client_id, key_name)`).
- `client_knowledge` — extracted insights (see CRM above).

### Website Builder
- `client_sites` — full wizard dump: branding, services, cities, AI personality, GSC tokens (`gsc_access_token/refresh_token/expires_at/site_url/metrics`), `ga4_id`, `white_label`, `section_order`/`section_overrides`, `generation_mode` (template|ai-custom), `template_preset`.
- `site_pages` — per-page content with `html_content` (AI-generated), SEO metrics (`impressions_30d`, `clicks_30d`), `hero_cta_text/link`.
- `site_deploys` — version history.
- `build_requests` — custom worker intake forms.

### SEO Command Center (`20260413001_seo_command_center.sql`)
- `seo_industry_packs` (public config — industries, geo queries, NAP directories)
- `seo_city_data` (public enrichment — Census + neighborhoods)
- `seo_page_metrics` — per-page GSC clicks/impressions/CTR/position
- `seo_geo_results` — LLM citation tests (chatgpt/perplexity/gemini)
- `seo_nap_audits` — NAP consistency per directory
- `seo_competitor_scores` — competitor GEO tracking
- `seo_content_gaps` — queries with 0% citation → content targets
- `seo_keyword_rankings` — DataForSEO tracking over time
- `seo_published_content` — off-site content log (telegraph/wordpress/github_pages/etc.)
- `seo_publish_queue` — pending content jobs

### Ops / Admin / Misc
- `firecrawl_usage` — monthly scrape quota per agency.
- `dispatch_events` — optimization run / SLA breach log (`20260415001`).
- `content_calendar` (root `migrations/20260417001`) — editorial pipeline for scheduled content routines (blog/linkedin/facebook/x), 7 content pillars.
- `kyra_waitlist` — pre-launch email capture.
- `orphaned_auth_users` view — auth users without agency membership.

### ENUMs / Types
There are **no native `CREATE TYPE` ENUMs** — all enumeration is done via `CHECK (col IN (...))` constraints on TEXT columns. This creates brittleness (see Smells).

### Views / Materialized Views
- Single VIEW: `public.orphaned_auth_users` (`20260224001_orphaned_auth_users_view.sql`). No materialized views.

---

## Migration Timeline & Evolution

1. **Baseline single-tenant** (`schema.sql`) — user-centric chat model with `conversations`, `messages`, `memories`, `integrations`, `reminders`. Pinecone vector link in `memories.pinecone_id`. Plans: free/starter/business/enterprise.
2. **Plan expansion + trigger hardening** (`001_fix_plans_and_trigger.sql`) — adds `max` plan, makes `handle_new_user` resilient via `ON CONFLICT DO NOTHING` + `EXCEPTION WHEN OTHERS`.
3. **Proactive intelligence** (`003_notifications.sql`, `004_pipelines.sql`, `005_channels.sql`, `006_memory_graph.sql`) — service-role-driven notifications, multi-step `pipelines`, external `user_channels`, entities/relationships graph.
4. **User productivity add-ons** (`20260211_user_channels.sql`, `20260212_skills_automations.sql`, `20260213001-003`) — a second `user_channels` definition, `user_skills`/`automations`, `custom_instructions_*`, Discord channel type, `user_files`.
5. **Inflection point: Agency multi-tenancy** (`20260213004_agency_schema.sql`) — introduces `agencies`, `agency_members`, `agency_templates`, `agency_clients`, `agency_billing`. Creates `user_agency_ids()` helper for RLS. Seeds 5 built-in templates (LeadPilot, DentalAssist, PropertyPro, ServicePro, RetailAssist).
6. **GHL Phase 2** (`20260214001_ghl_phase2.sql`) — GHL OAuth tracking columns on `agency_clients` + `ghl_webhook_logs` audit.
7. **Billing + template polish** (`20260216001_enhanced_templates.sql`, `20260216001_stripe_connect_billing.sql` — **name collision!**, `20260216002_ghl_message_log.sql`) — Stripe Connect per-client billing (`default_client_price_cents=2900`), enhanced template metadata (icon, suggested_skills, sample_responses, ghl_config), GHL message log.
8. **Template proliferation** (`20260217001`/`002`/`003`/`004`, `seed-templates.sql`) — Personal CRM Assistant + Competitive Intelligence + Content Curator + Education Assistant templates; `ghl_private_token` column for non-Marketplace auth; `api_keys` JSONB for BYOK.
9. **Gateway architecture V1** (`20260218001_add_beta_plan.sql`, `20260218002_agency_gateway.sql`) — per-agency Fly.io gateway (`gateway_app_name` UNIQUE, `gateway_machine_id`, `gateway_region='fra'`, `gateway_volume_id`).
10. **Knowledge base** (`20260219001_knowledge_base.sql`) — `knowledge_documents` with `synced_at` marker for gateway propagation.
11. **Gateway architecture pivot to OVH** (`20260220001_per_client_gateway.sql`) — gateway columns duplicated onto `agency_clients`; agency-level gateway rewritten in `20260222001_agency_gateway.sql` with looser status enum. **Two overlapping "agency_gateway" migrations exist** (`20260218002` and `20260222001`) applying slightly different column sets.
12. **Client observability** (`20260221001_client_conversations.sql`, `20260221002_client_settings.sql`) — log every test-chat turn; client `settings` JSONB.
13. **Plan shake-up + GHL polling** (`20260222002_add_free_plan.sql` / `20260222002_ghl_contact_scan.sql` — **numeric collision!**) — `free|starter|pro|scale|beta` replaces old `starter/pro/scale`, default changes to `free`; separately `ghl_last_contact_scan` column added.
14. **Referrals + hierarchy + credits** (`20260223001-004`) — `agency_referrals`, `kyra_waitlist`, 4-tier hierarchy (master→agency→sub-account→user via `account_level` + `sub_account_members`/`sub_account_invitations`), `agency_credits`/`credit_transactions` with auto-create trigger. `orphaned_auth_users` view added (`20260224001`).
15. **Sales pipeline** (`20260225001_pipeline.sql`, `20260226001_pipeline_hitl.sql`, `20260226002_pipeline_integrations.sql`, `20260227002_pipeline_follow_ups.sql`, `20260228001_pipeline_ab_tests.sql`) — full lead-gen engine with HITL approvals, multi-CRM integrations, follow-up sequences, A/B optimization.
16. **Native CRM** (`20260227001_crm_core.sql`, `20260227002_crm_tasks.sql`) — agency-scoped CRM with contacts/companies/activities/deals/tasks.
17. **Widget + customer memory + billing flows** (`20260301001`-`20260302002`) — `web_chat_leads`, `customer_memory`, `review_requests`, `payment_requests`.
18. **Premium template + referral polish** (`20260305001_premium_template_subscriptions.sql` in root `migrations/`, `20260305001_widget_analytics_columns.sql`, `20260305002_referral_earlybird.sql`) — separate Stripe sub for premium templates, `session_id`/`source_url` added to `client_conversations`, early-bird referral credits.
19. **Voice AI** (`20260306001`, `20260306002`, `20260312002_voice_usage.sql`, `20260313002_voice_call_logs.sql`) — Twilio voice with call logs, per-turn history, monthly minute tracking with `increment_voice_minutes()` SECURITY DEFINER function.
20. **Stuck-referral backfill + constraint fix** (`20260308001`/`002`) — UPDATE backfill + ALTER constraint to add `activated` status that was already used by app code.
21. **Per-client AI model + dispatch + email marketing** (`20260309001`-`20260313004`) — `ai_model` column on clients; `delivery_sms_log`; 5-table email marketing system; website builder (`client_sites`/`site_pages`); `client_secrets` vault.
22. **Website builder expansion** (`20260314001`, `20260316001`, `20260318001`, `20260320001`, `20260320002`, `20260321001`) — GA4, white-label, deploy history, Google review URL, build requests, AI HTML generation mode, GHL action confirmation flow.
23. **Nurture + onboarding + Firecrawl + GHL agency OAuth** (`20260322001`-`20260330002`) — 7-email nurture queue, `onboarding_steps` tracker, Firecrawl quota with atomic increment function, agency-level GHL OAuth (separate from per-client tokens), manual sub-account request workflow.
24. **Website editor enhancements** (`20260331001`/`002`, `20260401001_client_knowledge.sql`) — nav/footer/social columns, section reordering, client knowledge engine.
25. **Modular worker system** (`20260401002_worker_performance.sql`, `20260401003_worker_tasks.sql`) — per-role performance metrics, autonomous task engine with execution history.
26. **Email + bookings + workflows** (`20260403001-003`) — multi-step sequences, AI booking engine, per-client workflow runs.
27. **SEO Command Center** (`20260413001`) — 10 new SEO tables for GEO/LLM citation tracking, GSC metrics, NAP audits, content gaps.
28. **GSC OAuth tokens** (`20260414001_gsc_tokens.sql`) — tokens stored on `client_sites` (not a separate integrations table).
29. **Dispatch events** (`20260415001`) — optimization run / SLA breach telemetry for delivery/dispatch AI.
30. **Content calendar** (root `migrations/20260417001`) — editorial pipeline for scheduled content routines (separate from worker tasks).

---

## Multi-Tenancy & Isolation

**Tenant hierarchy (4 tiers):** `agencies` (master or regular) → `agency_clients` (sub-account / AI instance) → `sub_account_members` (portal users) → end users / contacts.

**Scoping columns used across the schema:**
- `agency_id UUID REFERENCES agencies(id)` — the primary tenant key, present on nearly every multi-tenant table.
- `client_id UUID REFERENCES agency_clients(id)` — secondary scope for per-client data (conversations, knowledge, workflows, bookings).
- `user_id UUID REFERENCES auth.users(id)` — legacy single-tenant scope; still used by `users`, `conversations`, `memories`, `reminders`, `integrations`, `user_skills`, `automations`, `user_files`, `pipelines`, `entities`, `relationships`, `notifications`.
- `contact_id UUID REFERENCES crm_contacts(id)` — tertiary scope for contact-specific records.

**Isolation mechanism:**
- `public.user_agency_ids()` (SQL SECURITY DEFINER STABLE, in `20260213004_agency_schema.sql`) returns `setof uuid` of agencies the current `auth.uid()` belongs to via `agency_members`. This helper is the RLS canary — the majority of agency-scoped policies are of the form `agency_id IN (SELECT public.user_agency_ids())` or the equivalent inline subquery `SELECT agency_id FROM agency_members WHERE user_id = auth.uid()`.
- **Service-role bypass** is the dominant pattern: API routes use the Supabase service-role client, which bypasses RLS entirely. Many tables have only a token RLS policy for read, relying on service-role for all writes (see `notifications`, `pipeline_activity_log`, `web_chat_leads`, `ghl_webhook_logs`, `agency_billing`, `pipeline_crm_sync_log`).
- **Key tables defining the tenant hierarchy:** `agencies`, `agency_members`, `agency_clients`, `sub_account_members`. The master-account designation lives on `agencies.account_level` (only for ConversionSystem, set via UPDATE by slug).
- **Cross-tenant references** — `agency_referrals` uses `referrer_id`/`referred_id` both pointing to `agencies`. `sub_account_members` bridges `agency_clients` and `auth.users`.

---

## Row Level Security

**RLS enabled on ~50 tables** across `schema.sql` + migrations. Patterns:

### Policy archetypes
1. **User-scoped (legacy)** — `USING (auth.uid() = user_id)` — on `users`, `conversations`, `memories`, `messages` (via conversation), `integrations`, `reminders`, `user_skills`, `automations`, `user_files`, `pipelines`, `notifications`, `user_channels`. Often paired with a service-role-only write policy.
2. **Agency-scoped** — `USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()))` — the dominant pattern for agency-tenant data: `crm_*`, `pipeline_*`, `email_*`, `worker_*`, `knowledge_documents`, `client_secrets`, `client_bookings`, `client_workflows`, `ghl_action_*`, `dispatch_events`, `premium_template_subscriptions`, `firecrawl_usage`, etc.
3. **Via helper** — `USING (agency_id IN (SELECT public.user_agency_ids()))` — used by `20260213004` baseline agency policies and `ghl_subaccount_requests`, `ghl_webhook_logs`.
4. **Client-scoped via parent** — `USING (client_id IN (SELECT id FROM agency_clients WHERE agency_id ...))` — `ghl_message_log`, `dispatch_events`.
5. **Service-role-only / `USING (true)`** — `USING (true) WITH CHECK (true)` effectively disables row-level filtering, relying on the service-role client plus app-layer checks: `voice_call_logs`, `voice_usage`, `voice_call_history`, `customer_memory`, `review_requests`, `payment_requests`, `build_requests`, `agency_billing` (insert), `notifications` (service write), `pipeline_activity_log` (insert), `ghl_webhook_logs` (insert), `entities`/`relationships` (service write).
6. **Public token lookup** — `sub_account_invitations` has `USING (true)` for SELECT to allow unauthenticated invite-acceptance flow.
7. **Public-config read** — `seo_industry_packs` / `seo_city_data` allow any authenticated user to SELECT.

### Tables without policies (RLS enabled but no usable policy — reads all blocked except service role)
- `kyra_waitlist` — RLS enabled with no policy (service-role only by design, landing page uses service key).
- Most `seo_*` tables (beyond the two public-read ones) have RLS enabled but no per-user policies → access only via service role.
- `voice_call_history` — service-role only.
- `email_nurture_queue` — no RLS (not even `ENABLE`). **Gap.**
- `email_sequences`, `email_sequence_steps`, `email_sequence_enrollments` — no RLS. **Gap.**
- `entities`/`relationships` — have service-role `USING (true)` for ALL, and a SELECT-only policy for the user. Writes effectively service-role only.

### Tables with NO RLS at all
Based on grep for `ENABLE ROW LEVEL SECURITY`, these tables are missing RLS entirely:
- `pipelines` table has RLS but sister `pipeline_message_templates`, `pipeline_ab_tests` do **not** (no ENABLE statement).
- `email_sequences`, `email_sequence_steps`, `email_sequence_enrollments`, `email_nurture_queue`, `email_templates`, `email_contacts`, `email_campaigns`, `email_analytics`, `email_unsubscribes` — no RLS.
- `agency_credits`, `credit_transactions` — no RLS, critical billing data relying entirely on service-role.
- `ghl_webhook_logs` — has RLS + policy.
- `ghl_subaccount_requests` — has RLS + policy.
- `ghl_message_log` — has RLS + policy.
- `pipeline_message_templates`, `pipeline_ab_tests` — no RLS.
- `pipelines` — has RLS.
- `content_calendar` (root migrations) — has RLS enabled but no policies at all → admin-only via service role.
- `site_deploys`, `client_sites`, `site_pages`, `email_templates`/`contacts`/`campaigns`/`analytics`/`unsubscribes` — no RLS.

### Policies with `USING (true)` — effectively open within policy scope
- `agency_billing` insert, `notifications` write, `web_chat_leads` service write, `build_requests` full access, `sub_account_invitations` public token SELECT, `payment_requests` ALL, `review_requests` ALL, `delivery_sms_log` ALL, `voice_*` ALL, `customer_memory` ALL, `firecrawl_usage` ALL, `entities` write, `relationships` write, `content_calendar` (no policy = closed but ostensibly via service role).

---

## Key Integrations Surfaced in Schema

### Stripe
- `users.stripe_customer_id`, `users.stripe_subscription_id`
- `agencies.stripe_customer_id`, `agencies.stripe_connect_account_id`, `agencies.stripe_onboarding_complete`
- `agency_clients.stripe_customer_id`, `stripe_subscription_id`, `billing_status` (none/active/past_due/canceled/trialing)
- `agency_billing.stripe_invoice_id`
- `credit_transactions.stripe_payment_intent_id`
- `payment_requests.stripe_payment_intent_id`
- `premium_template_subscriptions.stripe_subscription_id`/`stripe_customer_id`

### GHL (GoHighLevel)
- Per-client: `agency_clients.ghl_location_id`, `ghl_access_token`, `ghl_refresh_token`, `ghl_private_token`, `ghl_connected_at`, `ghl_connected_by`, `ghl_last_contact_scan`
- Agency-level: `agencies.ghl_agency_id`, `ghl_access_token`, `ghl_refresh_token`, `ghl_token_expires_at`, `ghl_company_id`, `ghl_connected_at`, `ghl_connected_by`
- Tables: `ghl_webhook_logs`, `ghl_message_log`, `ghl_action_proposals`, `ghl_action_log`, `ghl_subaccount_requests`
- Integration config: `pipeline_integrations` supports GHL as a provider (stage mapping, pipeline_id, calendar_id, tag_prefix).

### OpenClaw Gateway
- `agency_clients.gateway_url`, `gateway_token`, `gateway_container_id`, `gateway_status` (provisioning/starting/running/stopped/error), `gateway_error`, `gateway_provisioned_at`
- `agencies.gateway_app_name` (UNIQUE), `gateway_machine_id`, `gateway_url`, `gateway_token`, `gateway_status`, `gateway_region` (default `fra`), `gateway_volume_id`
- Two architectures visible: Fly.io (agency-level) in `20260218002` and OVH (per-client) in `20260220001`/`20260222001`.

### Pinecone
- `public.memories.pinecone_id` — vector ID for deletion sync. Only reference in schema.

### OAuth / Tokens
- User level: `integrations` table (slack/google/notion/github).
- Agency level GHL: see above.
- Client level GHL: see above.
- Pipeline CRM: `pipeline_integrations` (GHL/HubSpot/Salesforce/Pipedrive/custom).
- GSC: `client_sites.gsc_access_token/refresh_token/token_expires_at/site_url`.
- BYOK AI providers: `agencies.api_keys` JSONB.

### Webhooks
- `pipeline_webhooks` — outbound.
- `ghl_webhook_logs` — inbound audit.
- `pipeline_crm_sync_log` — CRM-side sync audit.

### Knowledge Base / Memory
- `knowledge_documents` (per-client docs), `client_knowledge` (extracted insights), `customer_memory` (per-contact memory), `entities`/`relationships` (legacy per-user graph), `public.memories` (legacy per-user).

### Templates / Premium Templates
- `agency_templates` (shared + private), `premium_template_subscriptions`, `pipeline_message_templates`, `email_templates`.

### Funnels / Pipeline
- See Sales Pipeline section (7 tables).

### Automations / Workflows
- Legacy: `automations` (user-level cron jobs with OpenClaw `openclaw_job_id`).
- Agency: `client_workflows`/`workflow_runs`, `worker_tasks`/`worker_task_runs`, `pipeline_follow_ups`.

### Content Calendar
- Root `migrations/20260417001_content_calendar.sql` — 7-pillar editorial pipeline (blog/linkedin/facebook/x).

---

## Indexes, Constraints, Triggers, Functions

### Non-trivial indexes
- **Partial indexes** abound: `idx_reminders_user_due ... WHERE NOT delivered`, `idx_agency_clients_stripe_subscription WHERE stripe_subscription_id IS NOT NULL`, `idx_agencies_gateway_status WHERE gateway_status IS NOT NULL`, `idx_agency_clients_ghl_location WHERE ghl_location_id IS NOT NULL`, `idx_notifications_user_unread WHERE read = FALSE AND dismissed = FALSE`, `idx_pipelines_status WHERE status IN ('running','paused')`, `idx_follow_ups_pending WHERE status = 'pending'`, `idx_email_sequence_enrollments_next WHERE status = 'active'`, `idx_crm_tasks_due WHERE status = 'pending'`, many more — well-tuned for cron/worker scans.
- **Composite indexes** for filtered feeds: `idx_crm_activities_feed (agency_id, needs_attention, resolved, created_at DESC)`, `idx_crm_contacts_last_activity (agency_id, last_activity_at DESC NULLS LAST)`, `idx_content_calendar_dedup (platform, pillar, scheduled_for DESC)`.
- **GIN indexes** on JSONB/array: `idx_email_contacts_tags USING GIN(tags)`, `idx_customer_memory_tags USING GIN(tags)`.
- **Case-insensitive**: `idx_entities_name (user_id, lower(name))`.
- **Unique composites**: `(agency_id, slug)` on `agency_clients`, `(client_id, user_id)` + `(client_id, email)` on `sub_account_members`, `(agency_id, year_month)` on `firecrawl_usage`, `(agency_id, month)` on `voice_usage`, `(client_id, worker_id, period_start)` on `worker_performance`, `(site_id, page_slug, date)` on `seo_page_metrics`, `(client_id, hash)` on `client_knowledge`.

### Unique constraints on tenant identity
- `agencies.slug UNIQUE`, `agencies.gateway_app_name UNIQUE`, `agency_clients (agency_id, slug) UNIQUE`.
- `user_channels` has contradictory UNIQUE definitions between `005_channels.sql` (`UNIQUE(channel_type, channel_user_id)`) and `20260211_user_channels.sql` (`UNIQUE(user_id, channel_type)` + `UNIQUE(channel_type, channel_user_id)`). **See Smells.**

### Functions
- `public.set_updated_at()` — canonical `updated_at` trigger (from `20260213004`).
- `public.update_updated_at_column()` — parallel implementation (from `schema.sql` + `crm_core` + `pipeline` + several others). **Two competing `updated_at` functions in the codebase** — `set_updated_at` is used by the agency baseline, `update_updated_at_column` by subsequent feature migrations. Idempotent re-creation in `20260227001_crm_core.sql` via DO block.
- `public.handle_new_user()` — Auth user → `public.users` row insertion on `auth.users` INSERT. Hardened with `ON CONFLICT DO NOTHING` + `EXCEPTION WHEN OTHERS` in `001_fix_plans_and_trigger.sql`.
- `public.user_agency_ids()` — SECURITY DEFINER STABLE helper for RLS.
- `public.create_agency_credits()` — auto-creates `agency_credits` row on new agency (via `on_agency_created_credits` trigger).
- `increment_voice_minutes(p_agency_id, p_minutes)` — SECURITY DEFINER atomic upsert for monthly voice minutes.
- `increment_firecrawl_usage(p_agency_id, p_year_month, p_cost)` — SECURITY DEFINER atomic upsert.
- `update_web_chat_leads_updated_at()` — one-off `updated_at` function (duplicate pattern).
- `update_client_workflows_updated_at()` — another one-off.
- `content_calendar_touch_updated_at()` — yet another one-off.

### Triggers with real work
- `on_auth_user_created` on `auth.users` → creates `public.users`.
- `on_agency_created_credits` on `agencies` → auto-provisions credit wallet row.
- 17+ `updated_at` triggers across tables.
- No billing/credit-grant triggers in SQL itself — credit grants happen in app code (see referenced commit `8f69ab60 fix(billing): grant credits on subscription.updated`).

---

## Smells / Concerns

### Duplicate / colliding migration filenames
- `20260216001_enhanced_templates.sql` **and** `20260216001_stripe_connect_billing.sql` — same timestamp prefix, different content. Migration order is ambiguous — lexical order would put `enhanced` first, but the two do unrelated things so it doesn't functionally collide. Still a documentation hazard.
- `20260222001_agency_gateway.sql` duplicates the intent of `20260218002_agency_gateway.sql` — both ADD COLUMNs for gateway state with slightly different check constraints (`20260218002` uses `gateway_app_name UNIQUE` + default 'pending', `20260222001` uses `gateway_container_id` + nullable status). Applied in sequence, one shadows the other; the later one is narrower.
- `20260222002_add_free_plan.sql` **and** `20260222002_ghl_contact_scan.sql` — same timestamp, different tables.
- `20260211_user_channels.sql` (no trailing seq digits) and `005_channels.sql` both define `user_channels` with different columns and constraints. Later one `CREATE TABLE IF NOT EXISTS` so only the first applied wins; `20260213002_discord_channel.sql` assumes the constraint name `user_channels_channel_type_check` exists. **This is fragile — one migration defines the table, another expects a specific constraint name.**
- Dual-definition of `voice_call_logs`: `20260306001` creates it per-client (`client_id TEXT`), `20260313002` re-creates idempotently + adds `agency_id` + more columns. `20260306002` separately adds `agency_id TEXT`. Net effect works, but there are three overlapping migrations touching the same table.

### Reverts / rewrites disguised as migrations
- `20260308001_backfill_stuck_referrals.sql` — UPDATE data migration (OK).
- `20260308002_referral_status_constraint.sql` — ALTER CHECK to add `activated` status that app code was already using. Indicates schema drift between code and DB.
- `20260218001_add_beta_plan.sql` → superseded by `20260222002_add_free_plan.sql` which re-declares the constraint with `free` included; the earlier migration's beta-only state was briefly live.

### Inconsistent patterns
- **Two `updated_at` trigger functions** (`set_updated_at` and `update_updated_at_column`) coexist. Plus at least five table-specific duplicates (`update_web_chat_leads_updated_at`, `update_client_workflows_updated_at`, `content_calendar_touch_updated_at`).
- **Scoping-column type drift** — `review_requests.client_id` is `TEXT`, `delivery_sms_log.client_id` is `TEXT`, `voice_call_logs.client_id` is `TEXT`, `customer_memory.client_id` is `TEXT`. Every other table types `client_id` as `UUID REFERENCES agency_clients(id)`. Same drift for `agency_id` on `voice_call_logs` (TEXT) and `payment_requests`/`review_requests`/`customer_memory` (no FK). These tables can't benefit from ON DELETE CASCADE and can hold orphaned data.
- **Missing foreign keys** — `review_requests`, `payment_requests`, `customer_memory`, `client_knowledge` (only `client_id` is FK'd, not `agency_id`), `worker_performance`, `worker_tasks`, `worker_task_runs` all have `agency_id UUID NOT NULL` but no REFERENCES. Deleting an agency won't cascade.
- **Mixed plan vocabulary** — `users.plan` checks `free|starter|business|max|enterprise`; `agencies.plan` checks `free|starter|pro|scale|beta`. Two independent plan taxonomies. If anyone ever tries to reconcile, there's no mapping table.
- **`auth.uid() = agency_id` in `delivery_sms_log`** — the policy `WHERE agency_id = auth.uid()` is wrong (`auth.uid()` is a user ID, not an agency ID). Effectively zero matches; table only usable via service role. Likely a typo.

### Dead weight / open questions
- `public.users` legacy table is still receiving new columns (`custom_instructions_*`) and still referenced by `pipelines`, `user_skills`, `automations`, `user_files`, `entities`, `relationships`, `notifications`, `user_channels`, `reminders`, `conversations`, `memories`, `integrations` — yet none of these integrate with the agency model. Significant parallel-world surface area.
- `public.conversations` + `public.messages` + `public.memories` + `public.reminders` + `public.integrations` are all pre-agency and probably orphaned in new flows.
- `entities`/`relationships` (knowledge graph) — user-scoped only, appears unused by agency workers.
- `pipelines` table (user-scoped multi-step) versus `pipeline_campaigns`/`pipeline_leads` (agency-scoped) — name collision, different purposes. Confusing.
- `user_channels` appears defined twice with subtly different schemas.
- `kyra_waitlist` RLS enabled with no policies — readable only via service role; fine, but there's a comment-only "service role only" note rather than a documented policy.
- `client_conversations.channel` constraint is missing (`CHECK` not present on `test_chat|portal|telegram|sms|whatsapp|web_chat` values despite being treated as an enum in queries).
- `premium_template_subscriptions` lives in `migrations/` (root) **not** `supabase/migrations/` — two migration directories with different deployment tooling? Same for `20260417001_content_calendar.sql`. This split is unexplained and a deployment footgun.
- `20260309001_client_ai_model.sql` ends with a `SELECT` reporting results — not idempotent (fine for `ALTER ... IF NOT EXISTS`, but the trailing SELECT is non-standard for a migration file).
- No `CREATE TYPE` ENUMs anywhere — all enumerations are TEXT + CHECK constraints. Adding a new status value requires DROP + ADD CONSTRAINT (see `20260226001` re-declaring `pipeline_leads_stage_check`, `20260308002` for referrals). Brittle and noisy.
- **Encryption-at-rest is promised, not enforced** — many migrations comment `"encrypt at rest via Supabase Vault in production"` on `ghl_access_token`, `ghl_refresh_token`, `access_token`, `api_keys`, `client_secrets.encrypted_value`, `pipeline_integrations.access_token`. The actual implementation (Vault / pgcrypto / application layer) is not visible in the schema — columns are plain TEXT.
- `agency_billing` billing ledger has no `UPDATE` policy — intentionally immutable, but also no audit trigger preventing service-role updates.
- `content_calendar` has RLS enabled with **zero policies** — an explicit admin-service-role-only table. Works, but an explicit `CREATE POLICY ... FOR SELECT TO service_role USING (true)` would be clearer intent.
