#!/usr/bin/env node
/**
 * backfill-templates.js
 *
 * Reads all quick_answers data from Supabase (both agency_clients and solo agencies)
 * and pushes them to the provisioner → writes templates.json to disk per container
 * → pushes to live kyra-router.
 *
 * Run: node scripts/backfill-templates.js [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://yaijdtsunxicuphrakcc.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_KEY  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWpkdHN1bnhpY3VwaHJha2NjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI3NzkzOSwiZXhwIjoyMDg1ODUzOTM5fQ.13OWEHyuk7EOLZRGbmxgVKqd2HJ_ouA78BFbEhwChmA';
const PROVISIONER   = process.env.PROVISIONER   || 'http://localhost:9090';
const PROV_SECRET   = process.env.PROV_SECRET   || 'kyra-provisioner-2026';

// ─── Template builder (mirror of lib/billing/template-builder.ts) ─────────────

function buildTemplatesFromQuickAnswers(qa) {
  const t = {};
  if (!qa) return t;

  if (qa.hours) {
    t['what are your hours']        = qa.hours;
    t['when are you open']          = qa.hours;
    t['business hours']             = qa.hours;
    t['what time do you open']      = qa.hours;
    t['what time do you close']     = qa.hours;
    t['are you open']               = qa.hours;
  }
  if (qa.address) {
    t['where are you located']      = qa.address;
    t['what is your address']       = qa.address;
    t['where is your office']       = qa.address;
    t['where are you based']        = qa.address;
  }
  if (qa.services) {
    t['what services do you offer'] = qa.services;
    t['what do you do']             = qa.services;
    t['what can you help with']     = qa.services;
    t['what do you offer']          = qa.services;
    t['what do you specialize in']  = qa.services;
  }
  if (qa.pricing) {
    t['how much does it cost']      = qa.pricing;
    t['what are your prices']       = qa.pricing;
    t['how much is it']             = qa.pricing;
    t['what are your rates']        = qa.pricing;
    t['how much do you charge']     = qa.pricing;
    t['what does it cost']          = qa.pricing;
  }
  if (qa.custom) {
    for (const { trigger, response } of qa.custom) {
      if (trigger?.trim() && response?.trim()) {
        t[trigger.toLowerCase().trim()] = response.trim();
      }
    }
  }
  return t;
}

// ─── Supabase fetch ───────────────────────────────────────────────────────────

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Provisioner push ─────────────────────────────────────────────────────────

async function pushTemplates(clientId, templates) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would push ${Object.keys(templates).length} templates for ${clientId}`);
    return true;
  }
  try {
    const res = await fetch(`${PROVISIONER}/containers/${clientId}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROV_SECRET}`,
      },
      body: JSON.stringify({ templates }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (e) {
    console.warn(`  ⚠ Provisioner error for ${clientId}: ${e.message}`);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔄 Kyra Template Backfill ${DRY_RUN ? '(DRY-RUN)' : '(LIVE)'}\n`);

  let total = 0, pushed = 0, skipped = 0, failed = 0;

  // ── 1. Agency clients ──────────────────────────────────────────────────────
  console.log('📦 Fetching agency_clients with quick_answers...');
  const clients = await sbFetch(
    '/agency_clients?select=id,name,settings&status=eq.active'
  );

  for (const client of clients) {
    const qa = client.settings?.quick_answers;
    if (!qa) { skipped++; continue; }

    const templates = buildTemplatesFromQuickAnswers(qa);
    const count = Object.keys(templates).length;
    if (count === 0) { skipped++; continue; }

    total++;
    console.log(`  → ${client.name} (${client.id.slice(0,8)}) — ${count} templates`);
    const ok = await pushTemplates(client.id, templates);
    if (ok) pushed++;
    else { failed++; console.log(`    ✗ failed`); }
  }

  // ── 2. Solo agencies ───────────────────────────────────────────────────────
  console.log('\n👤 Fetching solo agencies with quick_answers...');
  const agencies = await sbFetch(
    '/agencies?select=id,name,settings&settings->>account_type=eq.solo'
  );

  for (const agency of agencies) {
    const qa = agency.settings?.quick_answers;
    const soloClientId = agency.settings?.solo_client_id;

    if (!qa || !soloClientId) { skipped++; continue; }

    const templates = buildTemplatesFromQuickAnswers(qa);
    const count = Object.keys(templates).length;
    if (count === 0) { skipped++; continue; }

    total++;
    console.log(`  → ${agency.name} [solo] (${soloClientId.slice(0,8)}) — ${count} templates`);
    const ok = await pushTemplates(soloClientId, templates);
    if (ok) pushed++;
    else { failed++; console.log(`    ✗ failed`); }
  }

  // ── 3. Reload router ──────────────────────────────────────────────────────
  if (!DRY_RUN && pushed > 0) {
    console.log('\n🔄 Reloading kyra-router templates...');
    try {
      const r = await fetch(`${PROVISIONER}/router/reload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${PROV_SECRET}` },
        signal: AbortSignal.timeout(5000),
      });
      console.log(r.ok ? '  ✅ Router reloaded' : `  ⚠ Router reload returned ${r.status}`);
    } catch (e) {
      console.warn(`  ⚠ Router reload failed: ${e.message}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n✅ Done.`);
  console.log(`   Total with templates: ${total}`);
  console.log(`   Pushed:  ${pushed}`);
  console.log(`   Skipped: ${skipped} (no quick_answers set)`);
  console.log(`   Failed:  ${failed}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
