import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { TemporalChunk } from '../types';
import bundledSeedData from '../../../data/musk/elon_musk_dataset_2010_2025.json';

const IS_SERVERLESS = Boolean(process.env.VERCEL);
const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'temporal-index.json');

// Ensure data directory exists
if (!IS_SERVERLESS && !existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function computeTextOverlap(query: string, text: string): number {
  const qWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const tWords = new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/));
  if (qWords.length === 0) return 0;
  let matches = 0;
  for (const w of qWords) {
    if (tWords.has(w)) matches += 1;
    else if (text.toLowerCase().includes(w)) matches += 0.5;
  }
  return matches / qWords.length;
}

export async function loadIndex(): Promise<TemporalChunk[]> {
  try {
    if (!IS_SERVERLESS && existsSync(STORE_PATH)) {
      const data = await fs.readFile(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Could not read store, attempting seed load');
  }

  // Auto-seed from JSON dataset if empty
  try {
    {
      // Bundled JSON is always included in the deployed function artifact.
      // Do not try to write it to the read-only Vercel application directory.
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
      if (!IS_SERVERLESS) await saveIndex(seededChunks);
      return seededChunks;
    }
  } catch (err) {
    console.error('Failed to seed initial temporal index:', err);
  }

  return [];
}

export async function saveIndex(chunks: TemporalChunk[]): Promise<void> {
  if (IS_SERVERLESS) {
    throw new Error('Persistent temporal index writes require a database on serverless hosting');
  }
  await fs.writeFile(STORE_PATH, JSON.stringify(chunks, null, 2), 'utf-8');
}

export async function addChunk(chunk: TemporalChunk): Promise<void> {
  const chunks = await loadIndex();
  chunks.push(chunk);
  await saveIndex(chunks);
}

/**
 * Filter chunks valid at a specific date
 */
export async function queryAsOf(
  queryEmbedding: number[],
  date: string,
  topK: number = 5,
  queryText: string = ''
): Promise<{ chunk: TemporalChunk; similarity: number }[]> {
  const chunks = await loadIndex();
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

  const scored = validChunks.map(chunk => {
    let similarity = 0;
    if (queryEmbedding && queryEmbedding.length > 0 && chunk.embedding && chunk.embedding.length > 0) {
      similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    } else if (queryText) {
      similarity = computeTextOverlap(queryText, chunk.content);
    } else {
      similarity = 0.5;
    }
    return { chunk, similarity };
  });

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

/**
 * Get latest valid chunks
 */
export async function queryLatest(
  queryEmbedding: number[],
  topK: number = 5,
  queryText: string = ''
): Promise<{ chunk: TemporalChunk; similarity: number }[]> {
  const chunks = await loadIndex();
  const now = Date.now();
  
  const validChunks = chunks.filter(c => {
    if (!c.validTo) return true;
    const toTime = new Date(c.validTo).getTime();
    return now <= toTime;
  });

  const scored = validChunks.map(chunk => {
    let similarity = 0;
    if (queryEmbedding && queryEmbedding.length > 0 && chunk.embedding && chunk.embedding.length > 0) {
      similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    } else if (queryText) {
      similarity = computeTextOverlap(queryText, chunk.content);
    } else {
      similarity = 0.5;
    }
    return { chunk, similarity };
  });

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}
