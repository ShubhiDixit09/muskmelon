import { TemporalChunk } from '../types';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'what', 'when', 'where', 'why', 'how', 'does', 'did',
  'about', 'with', 'this', 'that', 'from', 'have', 'been', 'would', 'could',
  'tell', 'please', 'musk', 'elon', 'think', 'thought', 'your', 'you', 'are',
  'was', 'were', 'will', 'can', 'has', 'had', 'our', 'his', 'her', 'its',
  'there', 'their', 'they', 'them', 'these', 'those', 'also', 'into', 'just',
  'some', 'than', 'then', 'over', 'only', 'very', 'even', 'more', 'any'
]);

export interface ScoredChunk {
  chunk: TemporalChunk;
  similarity: number;
  bm25Score: number;
  semanticScore: number;
}

/**
 * Tokenize string into normalized terms
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Dense subword n-gram feature vector for local semantic cosine similarity
 */
function computeNgramEmbedding(text: string, dim: number = 128): number[] {
  const vec = new Array(dim).fill(0);
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 2);

  for (const word of words) {
    // Word hash
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    }
    vec[hash % dim] += 1.5;

    // 3-grams
    for (let i = 0; i < word.length - 2; i++) {
      const g = word.slice(i, i + 3);
      let gHash = 0;
      for (let j = 0; j < 3; j++) {
        gHash = (gHash * 33 + g.charCodeAt(j)) >>> 0;
      }
      vec[gHash % dim] += 0.8;
    }
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return vec;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, dot);
}

/**
 * Okapi BM25 Lexical Scorer
 */
export class BM25Index {
  private k1 = 1.5;
  private b = 0.75;
  private docTokens: string[][] = [];
  private docLens: number[] = [];
  private avgDocLen = 0;
  private idf: Map<string, number> = new Map();
  private chunks: TemporalChunk[] = [];

  constructor(chunks: TemporalChunk[]) {
    this.chunks = chunks;
    const N = chunks.length;
    let totalLen = 0;
    const docFreq: Map<string, number> = new Map();

    for (const chunk of chunks) {
      const text = `${chunk.content} ${chunk.metadata?.topic || ''}`;
      const tokens = tokenize(text);
      this.docTokens.push(tokens);
      this.docLens.push(tokens.length);
      totalLen += tokens.length;

      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }

    this.avgDocLen = N > 0 ? totalLen / N : 1;

    for (const [token, df] of docFreq.entries()) {
      // Standard BM25 IDF
      const idfScore = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      this.idf.set(token, Math.max(0.1, idfScore));
    }
  }

  score(query: string): number[] {
    const qTokens = tokenize(query);
    const scores = new Array(this.chunks.length).fill(0);
    if (qTokens.length === 0) return scores;

    for (let i = 0; i < this.chunks.length; i++) {
      const docTokens = this.docTokens[i];
      const docLen = this.docLens[i];
      const tfMap: Map<string, number> = new Map();

      for (const token of docTokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
      }

      let score = 0;
      for (const q of qTokens) {
        const idfVal = this.idf.get(q) || 0;
        const tf = tfMap.get(q) || 0;
        if (tf > 0) {
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLen));
          score += idfVal * (numerator / denominator);
        }
      }
      scores[i] = score;
    }

    // Normalize BM25 scores between 0 and 1
    const maxScore = Math.max(...scores, 1.0);
    return scores.map(s => s / maxScore);
  }
}

/**
 * High-Precision Local Hybrid Search (BM25 + Dense Semantic Scoring)
 */
export function hybridSearch(
  query: string,
  chunks: TemporalChunk[],
  topK: number = 5,
  asOfDate?: string
): ScoredChunk[] {
  if (chunks.length === 0) return [];

  // Filter temporally if asOfDate is provided
  let candidateChunks = chunks;
  if (asOfDate) {
    const asOfTime = new Date(asOfDate).getTime();
    candidateChunks = chunks.filter(c => {
      const fromTime = new Date(c.validFrom).getTime();
      if (asOfTime < fromTime) return false;
      if (c.validTo) {
        const toTime = new Date(c.validTo).getTime();
        return asOfTime <= toTime;
      }
      return true;
    });
  }

  if (candidateChunks.length === 0) return [];

  const bm25 = new BM25Index(candidateChunks);
  const bm25Scores = bm25.score(query);
  const queryVec = computeNgramEmbedding(query);

  const results: ScoredChunk[] = candidateChunks.map((chunk, idx) => {
    const chunkText = `${chunk.content} ${chunk.metadata?.topic || ''}`;
    const chunkVec = computeNgramEmbedding(chunkText);
    const semanticScore = cosineSimilarity(queryVec, chunkVec);
    const bm25Score = bm25Scores[idx] || 0;

    // Hybrid combination: 55% lexical BM25 + 45% semantic cosine
    const similarity = Number((0.55 * bm25Score + 0.45 * semanticScore).toFixed(4));

    return {
      chunk,
      similarity,
      bm25Score: Number(bm25Score.toFixed(4)),
      semanticScore: Number(semanticScore.toFixed(4))
    };
  });

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
