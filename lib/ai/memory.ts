import OpenAI from 'openai';
import { upsertVector, queryVectors, deleteVector, type VectorMetadata } from '@/lib/pinecone';
import { createServiceClient } from '@/lib/supabase/server';
import { Memory, MemoryType } from '@/types';
import { v4 as uuid } from 'uuid';

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openaiInstance;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export async function saveMemory(
  userId: string,
  type: MemoryType,
  content: string,
  metadata: Record<string, any> = {}
): Promise<Memory> {
  const supabase = await createServiceClient();
  const memoryId = uuid();
  const embeddingId = `mem_${memoryId}`;
  
  // Create embedding
  const embedding = await createEmbedding(content);
  
  // Store in Pinecone
  await upsertVector(embeddingId, embedding, {
    user_id: userId,
    memory_id: memoryId,
    content,
    type,
    created_at: new Date().toISOString(),
  });
  
  // Store in Supabase
  const { data, error } = await supabase
    .from('memories')
    .insert({
      id: memoryId,
      user_id: userId,
      type,
      content,
      metadata,
      embedding_id: embeddingId,
    })
    .select()
    .single();
  
  if (error) {
    // Cleanup Pinecone if Supabase fails
    await deleteVector(embeddingId);
    throw error;
  }
  
  return data as Memory;
}

export async function searchMemories(
  userId: string,
  query: string,
  limit: number = 5
): Promise<Memory[]> {
  const supabase = await createServiceClient();
  
  // Create embedding for the query
  const queryEmbedding = await createEmbedding(query);
  
  // Search in Pinecone
  const matches = await queryVectors(queryEmbedding, userId, limit);
  
  if (matches.length === 0) {
    return [];
  }
  
  // Get full memory records from Supabase
  const memoryIds = matches
    .filter(m => m.metadata?.memory_id)
    .map(m => m.metadata!.memory_id as string);
  
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .in('id', memoryIds);
  
  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
  
  // Sort by relevance (match order from Pinecone)
  const memoryMap = new Map(data.map(m => [m.id, m]));
  return memoryIds
    .map(id => memoryMap.get(id))
    .filter((m): m is Memory => m !== undefined);
}

export async function getUserMemories(userId: string): Promise<Memory[]> {
  const supabase = await createServiceClient();
  
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
  
  return data as Memory[];
}

export async function deleteMemory(memoryId: string, userId: string): Promise<boolean> {
  const supabase = await createServiceClient();
  
  // Get the memory first to find embedding_id
  const { data: memory } = await supabase
    .from('memories')
    .select('embedding_id')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();
  
  if (!memory) {
    return false;
  }
  
  // Delete from Pinecone
  if (memory.embedding_id) {
    await deleteVector(memory.embedding_id);
  }
  
  // Delete from Supabase
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId);
  
  return !error;
}

export async function updateMemory(
  memoryId: string,
  userId: string,
  content: string
): Promise<Memory | null> {
  const supabase = await createServiceClient();
  
  // Get current memory
  const { data: currentMemory } = await supabase
    .from('memories')
    .select('*')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();
  
  if (!currentMemory) {
    return null;
  }
  
  // Update embedding
  const embedding = await createEmbedding(content);
  
  if (currentMemory.embedding_id) {
    await upsertVector(currentMemory.embedding_id, embedding, {
      user_id: userId,
      memory_id: memoryId,
      content,
      type: currentMemory.type,
      created_at: currentMemory.created_at,
    });
  }
  
  // Update in Supabase
  const { data, error } = await supabase
    .from('memories')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', memoryId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating memory:', error);
    return null;
  }
  
  return data as Memory;
}
