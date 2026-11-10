import { OpenAI } from 'openai';
import { VectorStore } from '../vectorstore';
import { ChatMode, TemporalChunk } from '../types';
import { scrapeFreshWebContext } from './web-scraper-fallback';

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && !process.env.OPENAI_API_KEY.includes('...')) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * High-performance, time-aware hybrid retriever.
 * Blends local BM25 + dense semantic scoring with web fallback.
 */
export async function retrieveContext(
  query: string,
  mode: ChatMode,
  asOfDate?: string,
  compareDates?: { from: string; to: string },
  topK: number = 5
): Promise<TemporalChunk[]> {
  try {
    let queryEmbedding: number[] = [];

    if (openai) {
      try {
        const res = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query
        });
        queryEmbedding = res.data[0].embedding;
      } catch (err) {
        // Fallback to local hybrid search
      }
    }

    // 1. Search Vector Store / Local Hybrid Index
    let results: { chunk: TemporalChunk; similarity: number }[] = [];

    if (mode === 'now') {
      results = await VectorStore.search(queryEmbedding, topK, undefined, query);
    } else if (mode === 'time-lens' && asOfDate) {
      results = await VectorStore.search(queryEmbedding, topK, asOfDate, query);
    } else if (mode === 'belief-diff' && compareDates) {
      const res1 = await VectorStore.search(queryEmbedding, Math.ceil(topK / 2), compareDates.from, query);
      const res2 = await VectorStore.search(queryEmbedding, Math.ceil(topK / 2), compareDates.to, query);
      results = [...res1, ...res2].sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    } else {
      results = await VectorStore.search(queryEmbedding, topK, undefined, query);
    }

    // 2. If vector search found matches with good similarity, return them directly
    if (results.length > 0 && results.some(r => r.similarity >= 0.15)) {
      return results.map(r => r.chunk);
    }

    // 3. If local index has low similarity and not in serverless, try web scraper discovery
    if (!process.env.VERCEL && (results.length === 0 || results.every(r => r.similarity < 0.10))) {
      try {
        const webChunks = await scrapeFreshWebContext(query);
        if (webChunks.length > 0) {
          return webChunks;
        }
      } catch (err) {
        // Continue to fallback
      }
    }

    // 4. Return top candidate chunks from local database
    return results.map(r => r.chunk);
  } catch (error) {
    console.error('Error retrieving context:', error);
    try {
      const fallback = await VectorStore.search([], topK, asOfDate, query);
      return fallback.map(r => r.chunk);
    } catch {
      return [];
    }
  }
}
