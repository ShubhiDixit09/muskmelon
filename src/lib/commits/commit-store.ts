import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { KnowledgeCommit } from '../types';
import bundledSeedData from '../../../data/musk/elon_musk_dataset_2010_2025.json';

const IS_SERVERLESS = Boolean(process.env.VERCEL);
const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'commits.json');

let inMemoryCommitsCache: KnowledgeCommit[] | null = null;

// Ensure data directory exists
if (!IS_SERVERLESS && !existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function getSeededCommits(): KnowledgeCommit[] {
  return (bundledSeedData as any[]).map((item, idx) => ({
    id: `commit-${item.date.replace(/-/g, '')}-${idx}`,
    timestamp: item.date,
    ingestedAt: `${item.date}T12:00:00.000Z`,
    source: item.source || '@elonmusk on X',
    sourceType: 'tweet',
    topic: item.topic || 'General',
    content: item.content,
    hash: `sha256-${item.date.replace(/-/g, '')}-${idx}`
  }));
}

/**
 * Load commits from JSON store with automatic historical dataset seeding
 */
async function loadCommits(): Promise<KnowledgeCommit[]> {
  if (inMemoryCommitsCache && inMemoryCommitsCache.length > 0) {
    return inMemoryCommitsCache;
  }

  try {
    if (!IS_SERVERLESS && existsSync(STORE_PATH)) {
      const data = await fs.readFile(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCommitsCache = parsed;
        return parsed;
      }
    }
  } catch (error) {
    // Fall back to seed commits
  }

  // Auto-seed from comprehensive historical dataset
  const seeded = getSeededCommits();
  inMemoryCommitsCache = seeded;
  if (!IS_SERVERLESS) {
    await saveCommits(seeded).catch(() => {});
  }
  return seeded;
}

/**
 * Save commits to JSON store and update in-memory cache
 */
async function saveCommits(commits: KnowledgeCommit[]): Promise<void> {
  inMemoryCommitsCache = commits;
  if (!IS_SERVERLESS) {
    await fs.writeFile(STORE_PATH, JSON.stringify(commits, null, 2), 'utf-8');
  }
}

/**
 * Add a new commit to the store
 */
export async function addCommit(commit: KnowledgeCommit): Promise<void> {
  const commits = await loadCommits();
  commits.unshift(commit);
  await saveCommits(commits);
}

/**
 * Get a commit by ID
 */
export async function getCommit(id: string): Promise<KnowledgeCommit | undefined> {
  const commits = await loadCommits();
  return commits.find(c => c.id === id);
}

/**
 * Get all commits
 */
export async function getAllCommits(): Promise<KnowledgeCommit[]> {
  return loadCommits();
}

/**
 * Get commits within a specific date range
 */
export async function getCommitsByDateRange(from: string, to: string): Promise<KnowledgeCommit[]> {
  const commits = await loadCommits();
  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  return commits.filter(c => {
    const t = new Date(c.timestamp).getTime();
    return t >= fromTime && t <= toTime;
  });
}

/**
 * Get commits by topic
 */
export async function getCommitsByTopic(topic: string): Promise<KnowledgeCommit[]> {
  const commits = await loadCommits();
  return commits.filter(c => c.topic.toLowerCase().includes(topic.toLowerCase()));
}

/**
 * Get the full timeline of commits, sorted by timestamp descending (newest first)
 */
export async function getCommitTimeline(): Promise<KnowledgeCommit[]> {
  const commits = await loadCommits();
  return commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Get store statistics
 */
export async function getStats(): Promise<{ total: number; topics: Record<string, number> }> {
  const commits = await loadCommits();
  const topics: Record<string, number> = {};
  for (const c of commits) {
    topics[c.topic] = (topics[c.topic] || 0) + 1;
  }
  return {
    total: commits.length,
    topics
  };
}

export const CommitStore = {
  addCommit,
  getCommit,
  getAllCommits,
  getCommitsByDateRange,
  getCommitsByTopic,
  getCommitTimeline,
  getStats
};
