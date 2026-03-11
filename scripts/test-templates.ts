/**
 * Template Validation Script
 * Tests all industry templates for completeness, correctness, and OpenClaw compatibility.
 * Run: npx tsx scripts/test-templates.ts
 */

import { INDUSTRY_TEMPLATES, getTemplate, applySoulTemplate } from '../lib/templates/industry-templates';

const VALID_TOOLS = [
  'book_appointment',
  'tag_contact',
  'create_opportunity',
  'escalate_to_human',
  'send_email',
  'send_sms',
  'search_knowledge',
];

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, templateId: string, message: string) {
  if (!condition) {
    failed++;
    errors.push(`❌ [${templateId}] ${message}`);
  } else {
    passed++;
  }
}

console.log(`\n🧪 Testing ${INDUSTRY_TEMPLATES.length} industry templates...\n`);

// ── 1. Check for duplicate IDs ──────────────────────────────────────────
const ids = INDUSTRY_TEMPLATES.map(t => t.id);
const uniqueIds = new Set(ids);
assert(ids.length === uniqueIds.size, 'GLOBAL', `No duplicate IDs (found ${ids.length - uniqueIds.size} duplicates)`);
if (ids.length !== uniqueIds.size) {
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  errors.push(`   Duplicates: ${dupes.join(', ')}`);
}

// ── 2. Check for duplicate names ────────────────────────────────────────
const names = INDUSTRY_TEMPLATES.map(t => t.name);
const uniqueNames = new Set(names);
assert(names.length === uniqueNames.size, 'GLOBAL', `No duplicate names (found ${names.length - uniqueNames.size} duplicates)`);

// ── 3. Validate each template ───────────────────────────────────────────
for (const t of INDUSTRY_TEMPLATES) {
  // Basic fields
  assert(t.id.length > 0, t.id, 'Has non-empty ID');
  assert(t.name.length > 0, t.id, 'Has non-empty name');
  assert(t.industry.length > 0, t.id, 'Has non-empty industry');
  assert(t.emoji.length > 0, t.id, 'Has emoji');
  assert(t.description.length > 10, t.id, `Description is meaningful (${t.description.length} chars)`);
  assert(t.tags.length >= 2, t.id, `Has at least 2 tags (has ${t.tags.length})`);
  assert(t.popularity >= 0 && t.popularity <= 100, t.id, `Popularity in range 0-100 (is ${t.popularity})`);

  // SOUL template
  assert(t.soulTemplate.length > 100, t.id, `SOUL template is substantial (${t.soulTemplate.length} chars)`);
  assert(t.soulTemplate.includes('{{'), t.id, 'SOUL template has variables');
  assert(t.soulTemplate.includes('ai_name') || t.soulTemplate.includes('business_name'), t.id, 'SOUL template references core variables');

  // Variables
  assert(t.variables.length >= 3, t.id, `Has at least 3 variables (has ${t.variables.length})`);
  const requiredVars = t.variables.filter(v => v.required);
  assert(requiredVars.length >= 2, t.id, `Has at least 2 required variables (has ${requiredVars.length})`);

  // Check all SOUL template {{variables}} have matching variable definitions
  const templateVars = [...t.soulTemplate.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
  const definedVarKeys = t.variables.map(v => v.key);
  for (const tv of new Set(templateVars)) {
    // Skip variables that are intentionally embedded (like inside $\{{...}})
    if (!tv.startsWith('_')) {
      assert(
        definedVarKeys.includes(tv),
        t.id,
        `Template variable {{${tv}}} has a matching variable definition`
      );
    }
  }

  // Check all variable definitions are used in the template
  for (const v of t.variables) {
    assert(
      t.soulTemplate.includes(`{{${v.key}}}`) || t.soulTemplate.includes(`\{{${v.key}}}`),
      t.id,
      `Variable '${v.key}' is used in the SOUL template`
    );
  }

  // Variable field quality
  for (const v of t.variables) {
    assert(v.key.length > 0, t.id, `Variable has non-empty key`);
    assert(v.label.length > 0, t.id, `Variable '${v.key}' has a label`);
    assert(v.placeholder.length > 0, t.id, `Variable '${v.key}' has a placeholder`);
  }

  // Tools
  assert(t.suggestedTools.length >= 1, t.id, `Has at least 1 suggested tool (has ${t.suggestedTools.length})`);
  for (const tool of t.suggestedTools) {
    assert(VALID_TOOLS.includes(tool), t.id, `Tool '${tool}' is a valid OpenClaw tool`);
  }

  // FAQs
  assert(t.sampleFaqs.length >= 1, t.id, `Has at least 1 sample FAQ (has ${t.sampleFaqs.length})`);
  for (const faq of t.sampleFaqs) {
    assert(faq.q.length > 5, t.id, `FAQ question is meaningful`);
    assert(faq.a.length > 10, t.id, `FAQ answer is meaningful`);
  }

  // Automations
  assert(t.automations.length >= 1, t.id, `Has at least 1 automation (has ${t.automations.length})`);
  for (const auto of t.automations) {
    assert(auto.name.length > 0, t.id, `Automation has a name`);
    assert(auto.description.length > 0, t.id, `Automation '${auto.name}' has a description`);
    assert(auto.trigger.length > 0, t.id, `Automation '${auto.name}' has a trigger`);
  }

  // Test template application with placeholder values
  const testVars: Record<string, string> = {};
  for (const v of t.variables) {
    testVars[v.key] = v.placeholder;
  }
  const applied = applySoulTemplate(t.soulTemplate, testVars);
  assert(!applied.includes('{{'), t.id, 'All variables resolve when placeholders are applied');
  if (applied.includes('{{')) {
    const unresolved = [...applied.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
    errors.push(`   Unresolved: ${[...new Set(unresolved)].join(', ')}`);
  }

  // getTemplate lookup works
  const found = getTemplate(t.id);
  assert(found !== undefined, t.id, 'getTemplate() finds this template by ID');
  assert(found?.id === t.id, t.id, 'getTemplate() returns correct template');
}

// ── Results ─────────────────────────────────────────────────────────────
console.log('─'.repeat(60));
if (errors.length > 0) {
  console.log(`\n${errors.join('\n')}\n`);
}
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} checks`);
console.log(`📦 Templates: ${INDUSTRY_TEMPLATES.length} total`);

if (failed > 0) {
  console.log('\n🔴 SOME TESTS FAILED\n');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED\n');
  process.exit(0);
}
