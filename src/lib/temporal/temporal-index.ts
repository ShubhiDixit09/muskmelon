import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { TemporalChunk } from '../types';
import bundledSeedData from '../../../data/musk/elon_musk_dataset_2010_2025.json';
import { hybridSearch } from '../rag/hybrid-retriever';

const IS_SERVERLESS = Boolean(process.env.VERCEL);
const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'temporal-index.json');

// In-memory cache for fast retrieval and serverless session support
let inMemoryChunksCache: TemporalChunk[] | null = null;

// Ensure data directory exists
if (!IS_SERVERLESS && !existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export async function loadIndex(): Promise<TemporalChunk[]> {
  if (inMemoryChunksCache && inMemoryChunksCache.length > 0) {
    return inMemoryChunksCache;
  }

  try {
    if (!IS_SERVERLESS && existsSync(STORE_PATH)) {
      const data = await fs.readFile(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryChunksCache = parsed;
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Could not read store, attempting seed load');
  }

  // Auto-seed from JSON dataset if empty
  try {
    const seedItems = bundledSeedData;
    const seededChunks: TemporalChunk[] = seedItems.map((item: any, idx: number) => ({
      id: `seed-musk-${idx + 1}`,
      content: `[${item.date}] (${item.topic}) ${item.content} (Source: ${item.source || '@elonmusk'})`,
      embedding: [],
      commitId: `commit-${item.date.replace(/-/g, '')}-${idx}`,
      validFrom: item.date,
      metadata: {
        source: item.source || '@elonmusk on X',
        sourceType: 'tweet',
        topic: item.topic,
        chunkIndex: idx
      }
    }));

    inMemoryChunksCache = seededChunks;
    if (!IS_SERVERLESS) {
      await saveIndex(seededChunks).catch(() => {});
    }
    return seededChunks;
  } catch (err) {
    console.error('Failed to seed initial temporal index:', err);
  }

  return [];
}

export async function saveIndex(chunks: TemporalChunk[]): Promise<void> {
  inMemoryChunksCache = chunks;
  if (!IS_SERVERLESS) {
    await fs.writeFile(STORE_PATH, JSON.stringify(chunks, null, 2), 'utf-8');
  }
}

export async function addChunk(chunk: TemporalChunk): Promise<void> {
  const chunks = await loadIndex();
  chunks.push(chunk);
  await saveIndex(chunks);
}

export async function addChunks(newChunks: TemporalChunk[]): Promise<void> {
  const chunks = await loadIndex();
  chunks.push(...newChunks);
  await saveIndex(chunks);
}

/**
 * Filter chunks valid at a specific date using hybrid BM25 + Semantic Search
 */
export async function queryAsOf(
  queryEmbedding: number[],
  date: string,
  topK: number = 5,
  queryText: string = ''
): Promise<{ chunk: TemporalChunk; similarity: number }[]> {
  const chunks = await loadIndex();
  if (queryText) {
    const results = hybridSearch(queryText, chunks, topK, date);
    return results.map(r => ({ chunk: r.chunk, similarity: r.similarity }));
  }

  const targetTime = new Date(date).getTime();
  const validChunks = chunks.filter(c => {
    const fromTime = new Date(c.validFrom).getTime();
    if (targetTime < fromTime) return false;
    if (c.validTo) {
      const toTime = new Date(c.validTo).getTime();
      return targetTime <= toTime;
    }
    return true;
  });

  return validChunks.slice(0, topK).map(chunk => ({ chunk, similarity: 0.85 }));
}

/**
 * Get latest valid chunks using hybrid BM25 + Semantic Search
 */
export async function queryLatest(
  queryEmbedding: number[],
  topK: number = 5,
  queryText: string = ''
): Promise<{ chunk: TemporalChunk; similarity: number }[]> {
  const chunks = await loadIndex();
  if (queryText) {
    const results = hybridSearch(queryText, chunks, topK, undefined);
    return results.map(r => ({ chunk: r.chunk, similarity: r.similarity }));
  }

  const now = Date.now();
  const validChunks = chunks.filter(c => {
    if (!c.validTo) return true;
    const toTime = new Date(c.validTo).getTime();
    return now <= toTime;
  });

  return validChunks.slice(0, topK).map(chunk => ({ chunk, similarity: 0.85 }));
}
