#!/usr/bin/env node
/**
 * Run SQL migrations against Supabase using direct Postgres connection.
 * Usage: node scripts/run-migration.mjs <migration-file> [<migration-file2> ...]
 *
 * Requires DATABASE_URL env var or constructs from Supabase project ref + password.
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Supabase direct connection (Transaction mode pooler)
const PROJECT_REF = 'yaijdtsunxicuphrakcc';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

if (!DB_PASSWORD && !process.env.DATABASE_URL) {
  console.error('Error: Set SUPABASE_DB_PASSWORD or DATABASE_URL env var');
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/run-migration.mjs <migration.sql> [...]');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  console.log('Connecting to Supabase database...');
  await client.connect();
  console.log('Connected ✅');

  for (const file of files) {
    const filePath = path.resolve(file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`\nRunning migration: ${path.basename(filePath)}`);
    console.log(`  (${sql.length} chars, ${sql.split('\n').length} lines)`);
    
    await client.query(sql);
    console.log(`  ✅ ${path.basename(filePath)} applied successfully`);
  }

  // Verify tables exist
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('agencies', 'agency_members', 'agency_templates', 'agency_clients', 'agency_billing', 'ghl_webhook_logs')
    ORDER BY table_name
  `);
  
  console.log('\n--- Verification ---');
  console.log('Tables found:', rows.map(r => r.table_name).join(', '));
  
  // Count templates
  const { rows: templates } = await client.query('SELECT count(*) as c FROM agency_templates');
  console.log(`Templates seeded: ${templates[0].c}`);
  
} catch (err) {
  console.error('Migration failed:', err.message);
  if (err.message.includes('password')) {
    console.error('\nHint: Check SUPABASE_DB_PASSWORD is correct');
  }
  process.exit(1);
} finally {
  await client.end();
}
