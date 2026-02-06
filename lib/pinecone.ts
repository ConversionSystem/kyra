import { Pinecone } from '@pinecone-database/pinecone';

let pineconeInstance: Pinecone | null = null;

export function getPinecone(): Pinecone {
  if (!pineconeInstance) {
    pineconeInstance = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeInstance;
}

export function getIndex() {
  const pinecone = getPinecone();
  return pinecone.index(process.env.PINECONE_INDEX!);
}

export interface VectorMetadata {
  user_id: string;
  memory_id: string;
  content: string;
  type: string;
  created_at: string;
}

export async function upsertVector(
  id: string,
  embedding: number[],
  metadata: VectorMetadata
) {
  const index = getIndex();
  await index.upsert({
    records: [
      {
        id,
        values: embedding,
        metadata: metadata as unknown as Record<string, string>,
      },
    ],
  });
}

export async function queryVectors(
  embedding: number[],
  userId: string,
  topK: number = 5
) {
  const index = getIndex();
  const results = await index.query({
    vector: embedding,
    topK,
    filter: { user_id: userId },
    includeMetadata: true,
  });
  return results.matches || [];
}

export async function deleteVector(id: string) {
  const index = getIndex();
  await index.deleteOne({ id });
}
