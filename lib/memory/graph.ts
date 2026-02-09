/**
 * Deep Memory Graph Engine
 * 
 * Extracts entities and relationships from conversations,
 * builds a knowledge graph, and generates contextual inferences.
 * 
 * "Based on your Q3 goals, this partnership aligns with your expansion into Utah."
 * That's not memory. That's understanding.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { Entity, Relationship, EntityType, RelationType, GraphContext } from '@/types/memory-graph';
import { v4 as uuid } from 'uuid';

let anthropicInstance: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return anthropicInstance;
}

/**
 * Extract entities and relationships from a conversation message
 */
export async function extractGraphData(
  userId: string,
  message: string,
  existingEntities: Entity[]
): Promise<{
  entities: Partial<Entity>[];
  relationships: Partial<Relationship>[];
}> {
  const anthropic = getAnthropic();
  
  const existingContext = existingEntities.slice(0, 30).map(e => 
    `- [${e.type}] ${e.name}${e.properties ? ': ' + JSON.stringify(e.properties) : ''}`
  ).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }],
    system: `You extract structured knowledge from conversations. Given a user message, identify entities and relationships.

## Existing Known Entities
${existingContext || 'None yet'}

## Entity Types
person, company, project, goal, place, topic, event

## Relationship Types  
knows, works_at, works_on, wants, located_in, related_to, deadline, depends_on, part_of

## Rules
- Only extract entities/relationships that are clearly stated or strongly implied
- Reference existing entities by name when updating (don't create duplicates)
- Include properties like dates, amounts, descriptions
- Set confidence: 0.9 for explicit statements, 0.7 for strong implications, 0.5 for inferences
- If the message is casual/greeting with no extractable info, return empty arrays

## Output (JSON only)
{
  "entities": [
    { "type": "person", "name": "John", "properties": { "role": "CTO" }, "confidence": 0.9 }
  ],
  "relationships": [
    { "from": "John", "to": "Acme Corp", "type": "works_at", "confidence": 0.9 }
  ]
}`,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { entities: [], relationships: [] };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      entities: (parsed.entities || []).map((e: any) => ({
        user_id: userId,
        type: e.type as EntityType,
        name: e.name,
        properties: e.properties || {},
        confidence: e.confidence || 0.8,
      })),
      relationships: (parsed.relationships || []).map((r: any) => ({
        user_id: userId,
        from_name: r.from,
        to_name: r.to,
        type: r.type as RelationType,
        properties: r.properties || {},
        confidence: r.confidence || 0.8,
      })),
    };
  } catch {
    return { entities: [], relationships: [] };
  }
}

/**
 * Save extracted graph data to database
 */
export async function saveGraphData(
  userId: string,
  data: { entities: Partial<Entity>[]; relationships: any[] },
  sourceMemoryId?: string
): Promise<void> {
  if (data.entities.length === 0 && data.relationships.length === 0) return;
  
  const supabase = await createServiceClient();
  
  // Upsert entities (merge by name + type)
  const entityNameMap: Record<string, string> = {}; // name -> id
  
  for (const entity of data.entities) {
    // Check if entity already exists
    const { data: existing } = await supabase
      .from('entities')
      .select('id, properties')
      .eq('user_id', userId)
      .ilike('name', entity.name!)
      .eq('type', entity.type!)
      .single();
    
    if (existing) {
      // Merge properties
      const mergedProps = { ...(existing.properties as object), ...(entity.properties || {}) };
      await supabase
        .from('entities')
        .update({ 
          properties: mergedProps,
          updated_at: new Date().toISOString(),
          source_memory_ids: supabase.rpc ? undefined : undefined, // TODO: append
        })
        .eq('id', existing.id);
      entityNameMap[entity.name!.toLowerCase()] = existing.id;
    } else {
      const id = uuid();
      await supabase.from('entities').insert({
        id,
        user_id: userId,
        type: entity.type,
        name: entity.name,
        properties: entity.properties || {},
        confidence: entity.confidence || 0.8,
        source_memory_ids: sourceMemoryId ? [sourceMemoryId] : [],
      });
      entityNameMap[entity.name!.toLowerCase()] = id;
    }
  }
  
  // Save relationships
  for (const rel of data.relationships) {
    const fromName = rel.from_name?.toLowerCase() || rel.from?.toLowerCase();
    const toName = rel.to_name?.toLowerCase() || rel.to?.toLowerCase();
    
    let fromId = entityNameMap[fromName];
    let toId = entityNameMap[toName];
    
    // Look up entities if not in current batch
    if (!fromId) {
      const { data: e } = await supabase
        .from('entities')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', fromName)
        .single();
      if (e) fromId = e.id;
    }
    
    if (!toId) {
      const { data: e } = await supabase
        .from('entities')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', toName)
        .single();
      if (e) toId = e.id;
    }
    
    if (fromId && toId) {
      // Check for duplicate relationship
      const { data: existingRel } = await supabase
        .from('relationships')
        .select('id')
        .eq('user_id', userId)
        .eq('from_entity_id', fromId)
        .eq('to_entity_id', toId)
        .eq('type', rel.type)
        .single();
      
      if (!existingRel) {
        await supabase.from('relationships').insert({
          id: uuid(),
          user_id: userId,
          from_entity_id: fromId,
          to_entity_id: toId,
          type: rel.type,
          properties: rel.properties || {},
          confidence: rel.confidence || 0.8,
          source_memory_ids: sourceMemoryId ? [sourceMemoryId] : [],
        });
      }
    }
  }
}

/**
 * Query the memory graph for context relevant to a message
 */
export async function queryGraph(
  userId: string,
  query: string,
  depth: number = 2
): Promise<GraphContext> {
  const supabase = await createServiceClient();
  
  // Get all user entities (for small graphs, this is fine; optimize later with search)
  const { data: allEntities } = await supabase
    .from('entities')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100);
  
  if (!allEntities || allEntities.length === 0) {
    return { entities: [], relationships: [], inferences: [] };
  }
  
  // Find relevant entities using keyword matching (fast, pre-embedding search)
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const relevantEntities = (allEntities as Entity[]).filter(e => {
    const nameMatch = queryWords.some(w => e.name.toLowerCase().includes(w));
    const propMatch = queryWords.some(w => JSON.stringify(e.properties).toLowerCase().includes(w));
    return nameMatch || propMatch;
  });
  
  if (relevantEntities.length === 0) {
    // Return top entities by recency as context
    return {
      entities: (allEntities as Entity[]).slice(0, 10),
      relationships: [],
      inferences: [],
    };
  }
  
  // Get relationships for relevant entities (1 hop)
  const entityIds = relevantEntities.map(e => e.id);
  const { data: rels } = await supabase
    .from('relationships')
    .select('*')
    .eq('user_id', userId)
    .or(`from_entity_id.in.(${entityIds.join(',')}),to_entity_id.in.(${entityIds.join(',')})`);
  
  // Get connected entities (2nd hop if depth > 1)
  let connectedEntities: Entity[] = [];
  if (depth > 1 && rels && rels.length > 0) {
    const connectedIds = new Set<string>();
    for (const rel of rels) {
      connectedIds.add(rel.from_entity_id);
      connectedIds.add(rel.to_entity_id);
    }
    // Remove already-known entity IDs
    entityIds.forEach(id => connectedIds.delete(id));
    
    if (connectedIds.size > 0) {
      const { data: connected } = await supabase
        .from('entities')
        .select('*')
        .in('id', Array.from(connectedIds));
      connectedEntities = (connected || []) as Entity[];
    }
  }
  
  const allRelevant = [...relevantEntities, ...connectedEntities];
  
  return {
    entities: allRelevant,
    relationships: (rels || []) as Relationship[],
    inferences: [], // Will be populated by the AI when generating responses
  };
}

/**
 * Format graph context for injection into system prompt
 */
export function formatGraphContext(context: GraphContext): string {
  if (context.entities.length === 0) return '';
  
  const entityLines = context.entities.map(e => {
    const props = Object.entries(e.properties || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return `- **${e.name}** [${e.type}]${props ? ` — ${props}` : ''}`;
  }).join('\n');
  
  const relLines = context.relationships.map(r => {
    const from = context.entities.find(e => e.id === r.from_entity_id);
    const to = context.entities.find(e => e.id === r.to_entity_id);
    if (!from || !to) return null;
    return `- ${from.name} → ${r.type} → ${to.name}`;
  }).filter(Boolean).join('\n');
  
  return `### Knowledge Graph
${entityLines}

${relLines ? `### Connections\n${relLines}` : ''}

Use this graph to make connections the user hasn't explicitly asked about. Draw insights from relationships between entities.`;
}

/**
 * Process a message through the graph pipeline:
 * 1. Extract entities/relationships
 * 2. Save to graph
 * 3. Query relevant context
 */
export async function processMessageForGraph(
  userId: string,
  message: string
): Promise<string> {
  // Get existing entities for context
  const supabase = await createServiceClient();
  const { data: existingEntities } = await supabase
    .from('entities')
    .select('*')
    .eq('user_id', userId)
    .limit(50);
  
  // Extract and save (fire-and-forget for speed)
  extractGraphData(userId, message, (existingEntities || []) as Entity[])
    .then(data => saveGraphData(userId, data))
    .catch(err => console.error('Graph extraction error:', err));
  
  // Query graph for relevant context
  const context = await queryGraph(userId, message);
  return formatGraphContext(context);
}
