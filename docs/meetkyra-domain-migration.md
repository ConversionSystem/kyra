# meetkyra.com — Domain Migration Plan
*Created: 2026-03-19 — Ready to execute when Angel gives the go*

## What We're Moving
- **Old:** `kyra.conversionsystem.com`
- **New:** `meetkyra.com`
- **Gateway subdomain:** `{client-id}.gw.kyra.conversionsystem.com` → `{client-id}.gw.meetkyra.com`
- **Provisioner:** `provisioner.gw.kyra.conversionsystem.com` → `provisioner.gw.meetkyra.com`
- **Email from:** `@kyra.conversionsystem.com` → `@meetkyra.com`

## Scope
- ~90 hardcoded URL occurrences in code (160 files total)
- 34 files already use `NEXT_PUBLIC_APP_URL` env var (just need env update)
- 5 email from addresses
- VPS provisioner + Traefik wildcard DNS
- Supabase auth URLs
- External services: Stripe, Twilio, GHL, Resend, Meta Pixel, Google Search Console

## Execution Order (Zero Downtime)
1. Register meetkyra.com (confirm Angel owns it)
2. DNS setup — wildcard `*.gw.meetkyra.com` → OVH VPS (15.204.91.157), `meetkyra.com` → Vercel
3. Resend — verify meetkyra.com email domain BEFORE code deploy
4. Vercel — add domain as primary, update `NEXT_PUBLIC_APP_URL` env var
5. Supabase — update Site URL + add meetkyra.com to redirect allowlist (keep old domain too)
6. Deploy single code PR (all 160 files in one shot)
7. VPS — update Traefik wildcard cert + provisioner `DOMAIN_SUFFIX`
8. DB SQL — `UPDATE clients SET gateway_url = REPLACE(gateway_url, 'gw.kyra.conversionsystem.com', 'gw.meetkyra.com')`
9. External: Stripe webhook URL, Twilio SMS webhooks, GHL private integration base URL
10. Google Search Console — submit new sitemap
11. Old domain — permanent 301 redirect to meetkyra.com (keep forever)

## Key Risks & Mitigations
- **58 live containers** — DNS first, old domain stays up, zero downtime
- **Existing client webhooks (Twilio/GHL)** — old domain 301 redirect, follows through
- **Email deliverability** — verify Resend domain BEFORE code deploy
- **Supabase magic links** — keep both domains in redirect allowlist during transition
- **SEO** — 301 redirects + Search Console resubmit, low equity lost since subdomain
- **DB hardcoded URLs** — SQL sweep on clients, sites, invite tables

## Questions to Confirm Before Starting
- [ ] Does Angel own meetkyra.com already?
- [ ] Where is DNS managed for meetkyra.com? (Cloudflare/Namecheap/etc.)
- [ ] Preferred migration date/window?
