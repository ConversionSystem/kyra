/**
 * Re-embed all memories with text-embedding-3-small
 * Fixes the ada-002 → 3-small model mismatch
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.openai', override: true });
const { createClient } = require('@supabase/supabase-js');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX);
  const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

  // Fetch all memories
  const { data: memories, error } = await sb.from('memories').select('*');
  if (error) { console.error('DB error:', error.message); return; }
  
  console.log(`Found ${memories.length} memories to re-embed`);

  for (const mem of memories) {
    console.log(`Re-embedding: ${mem.id.substring(0,8)} (${mem.type}) "${mem.content.substring(0,50)}..."`);
    
    // Generate new embedding with text-embedding-3-small
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: mem.content,
    });
    const embedding = embRes.data[0].embedding;

    // Upsert to Pinecone
    const records = [{
      id: mem.id,
      values: embedding,
      metadata: {
        user_id: mem.user_id || '',
        memory_id: mem.id,
        content: mem.content,
        type: mem.type,
        created_at: mem.created_at || new Date().toISOString(),
      },
    }];
    console.log('  Upserting id:', records[0].id, 'dims:', records[0].values.length);
    await index.upsert({ records });

    console.log(`  ✅ Done (${embedding.length} dims)`);
  }

  // Verify
  const stats = await index.describeIndexStats();
  console.log(`\nPinecone stats: ${stats.totalRecordCount} vectors, ${stats.dimension} dims`);
  console.log('All memories re-embedded with text-embedding-3-small ✅');
}

main().catch(console.error);
