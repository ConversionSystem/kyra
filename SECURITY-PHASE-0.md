# Security Phase 0 — Rotation & Hardening Checklist

**Status:** In progress. This document tracks the Phase 0 security work that must complete before accepting public customers (either on main kyra agency platform or the meet-kyra solo product).

**Created:** 2026-04-20
**Priority:** CRITICAL — do in order, do not skip.

---

## P0.1 — Rotate leaked Supabase service-role JWT ⚠️

**Background:** `scripts/backfill-templates.js` previously contained a hardcoded production Supabase service-role JWT as the default value for `SUPABASE_KEY`. The JWT was tracked in git, valid until year 2036, and granted full RLS-bypass read/write to the production project `yaijdtsunxicuphrakcc`. Any snapshot of the repo (via fork, clone, or GitHub archive) would have exposed this key.

**Actions required (by Steve/Angel):**

1. Open Supabase dashboard for project `yaijdtsunxicuphrakcc` → Settings → API.
2. Click "Roll service role key" to generate a new service-role JWT. The old one is immediately invalidated.
3. Update the new key in:
   - **Vercel project env vars** (`SUPABASE_SERVICE_ROLE_KEY`) — kyra production + preview environments
   - **OVH VPS** (`15.204.91.157`) — update `/opt/kyra/.env` or the provisioner's environment via `systemctl edit`
   - **Local `.env.local`** on dev machines (Steve, Angel)
   - **GitHub Actions secrets** if any workflow references it (currently doesn't, but verify)
4. Verify by running a quick smoke test against production:
   ```bash
   curl -H "Authorization: Bearer $NEW_SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $NEW_SUPABASE_SERVICE_ROLE_KEY" \
        https://yaijdtsunxicuphrakcc.supabase.co/rest/v1/agencies?limit=1
   ```
5. Audit Supabase logs for any requests using the OLD JWT after rotation (confirms no stale clients are still calling with it). Supabase dashboard → Logs → filter by "service_role".
6. Consider git history scrub if there's reason to believe the repo was cloned by unintended parties (it's a private repo, so lower priority — but be aware the key was tracked in history).

**Code change (done):** `scripts/backfill-templates.js` and `scripts/run-migration.mjs` now fail-closed if `SUPABASE_KEY`, `SUPABASE_URL`, `PROV_SECRET`, or database connection vars are unset. No more hardcoded defaults.

**Verification:**
```bash
# Run without env vars — should fail with clear error:
node scripts/backfill-templates.js --dry-run

# Expected output:
# ERROR: SUPABASE_URL is required. Set it in your .env.local or shell.
```

---

## P0.2 — Rotate provisioner bearer secret

**Background:** `scripts/backfill-templates.js` and `infra/provisioner/server.js` both use `PROV_SECRET='kyra-provisioner-2026'` as a hardcoded fallback. This is the bearer token for the OVH provisioner API — an attacker with this secret can create, destroy, and configure customer containers.

**Actions required:**

1. Generate a new provisioner secret:
   ```bash
   openssl rand -hex 32
   ```
2. Update on OVH VPS (`ubuntu@15.204.91.157`):
   ```bash
   # SSH to VPS
   ssh ubuntu@15.204.91.157
   # Edit provisioner env
   sudo systemctl edit kyra-provisioner
   # Set: Environment="PROVISIONER_SECRET=<new-secret>"
   sudo systemctl restart kyra-provisioner
   ```
3. Update in Vercel env (`OVH_PROVISIONER_SECRET`) for all environments.
4. Update in local `.env.local` on dev machines.
5. Verify:
   ```bash
   curl -H "Authorization: Bearer $NEW_SECRET" http://provisioner.gw.kyra.conversionsystem.com/health
   # Should return 200
   
   curl -H "Authorization: Bearer kyra-provisioner-2026" http://provisioner.gw.kyra.conversionsystem.com/health
   # Should return 401
   ```

**Code change (done):** `scripts/backfill-templates.js` requires `PROV_SECRET` env var. Still TODO: update `infra/provisioner/server.js` default in P0.2 commit (below).

---

## P0.3 — Audit .env.example and SECURITY-AUDIT docs for leaked examples

After rotations above, audit:
- `.env.example` — ensure no real keys leaked
- `.env.local.example` — same
- `docs/SECURITY-AUDIT-2026-03-06.md` — ensure no real keys in audit examples
- GitHub commit history — if feasible, `git-filter-repo` to scrub the old JWT from history (LOW priority — private repo, key is rotated)

---

## Remaining Phase 0 items (tracked separately)

| Item | Status |
|---|---|
| P0.1 Rotate Supabase service-role JWT | **Requires manual Supabase dashboard action by Steve** — code fallback removed ✓ |
| P0.2 Rotate provisioner bearer secret | **Requires manual VPS + Vercel update by Steve** — code fallback removal pending |
| P0.3 Admin email allowlist consolidation into `lib/auth/admin.ts` | Pending |
| P0.4 Add auth to `/api/admin/orphaned-users` + `/api/admin/health-check` | Pending |
| P0.5 Resend webhook signature verification | Pending |
| P0.6 Retell webhook signature verification | Pending |
| P0.7 Twilio + channel webhook verification | Pending |
| P0.8 Flip GHL webhook fail-closed | Pending |
| P0.9 Fix stored XSS in `/api/leads` | Pending |
| P0.10 Resolve `/ai-for/[niche]` vs `[slug]` route conflict | Pending |
| P0.11 RLS fixes migration | Pending |
| P0.12 BYOK resolver consolidation | Pending |
| P0.13 Plan type + aspirational types cleanup | Pending |
| P0.14 Re-enable billing for starter plan | Pending |
| P0.15 Harden Stripe debug endpoints | Pending |
| P0.16 Guard middleware console.log | Pending |
| P0.17 Integration tests for 5 critical routes | Pending |
| P0.18 Cleanup (deprecated files, workflow rename) | Pending |

---

## Ownership

- **Steve (manual infra actions):** P0.1, P0.2 (Supabase dashboard, Vercel env, OVH VPS)
- **Claude (code changes):** P0.3-P0.18
- **Review:** each PR reviewed before merge
