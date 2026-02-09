/**
 * Deep Memory Graph Types
 * 
 * Not just key-value memories. A graph of interconnected knowledge:
 * entities, relationships, goals, timelines, and inferences.
 */

export type EntityType = 'person' | 'company' | 'project' | 'goal' | 'place' | 'topic' | 'event';
export type RelationType = 'knows' | 'works_at' | 'works_on' | 'wants' | 'located_in' | 'related_to' | 'deadline' | 'depends_on' | 'part_of';

export interface Entity {
  id: string;
  user_id: string;
  type: EntityType;
  name: string;
  properties: Record<string, any>; // Flexible key-value properties
  confidence: number;              // 0-1, how confident we are in this entity
  source_memory_ids: string[];     // Which memories this was extracted from
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  user_id: string;
  from_entity_id: string;
  to_entity_id: string;
  type: RelationType;
  properties: Record<string, any>;
  confidence: number;
  source_memory_ids: string[];
  created_at: string;
}

export interface MemoryGraphQuery {
  entityName?: string;
  entityType?: EntityType;
  relationType?: RelationType;
  depth?: number;  // How many hops to traverse
}

export interface GraphContext {
  entities: Entity[];
  relationships: Relationship[];
  inferences: string[];  // AI-generated insights from the graph
}
