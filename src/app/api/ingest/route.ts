import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createCommit } from '@/lib/commits/commit-engine';
import { addCommit, getStats } from '@/lib/commits/commit-store';
import { parseDocument } from '@/lib/ingest/parser';
import { parseTweetCSV } from '@/lib/ingest/tweet-parser';
import { addChunks } from '@/lib/temporal/temporal-index';
import { KnowledgeCommit, TemporalChunk } from '@/lib/types';

/**
 * POST /api/ingest
 * Fully functional document & tweet ingestion pipeline.
 * Parses uploaded files (.csv, .json, .txt, .md), creates timestamped Knowledge Commits,
 * and immediately indexes them into the active RAG vector index.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files');
    const sourceType = (formData.get('sourceType') as string) || 'document';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided. Use form field "files".' }, { status: 400 });
    }

    const createdCommits: KnowledgeCommit[] = [];
    const newTemporalChunks: TemporalChunk[] = [];
    const errors: string[] = [];

    for (const fileEntry of files) {
      if (!(fileEntry instanceof File)) {
        errors.push('Invalid file entry — expected File object');
        continue;
      }

      const file = fileEntry as File;
      const fileName = file.name;
      const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';

      try {
        const rawContent = await file.text();

        if (!rawContent.trim()) {
          errors.push(`File '${fileName}' is empty`);
          continue;
        }

        if (ext === 'csv') {
          // Parse as tweets CSV
          const tweets = parseTweetCSV(rawContent);
          if (tweets.length === 0) {
            errors.push(`File '${fileName}' contained no valid CSV rows`);
            continue;
          }

          for (let i = 0; i < tweets.length; i++) {
            const tweet = tweets[i];
            const commit = createCommit(
              tweet.text,
              fileName,
              'tweet',
              tweet.date
            );
            await addCommit(commit);
            createdCommits.push(commit);

            newTemporalChunks.push({
              id: `ingest-${commit.id}`,
              content: `[${tweet.date}] (${commit.topic}) ${tweet.text} (Source: ${fileName})`,
              embedding: [],
              commitId: commit.id,
              validFrom: tweet.date.split('T')[0],
              metadata: {
                source: fileName,
                sourceType: 'tweet',
                topic: commit.topic,
                chunkIndex: i
              }
            });
          }
        } else if (ext === 'json') {
          // Try parsing as JSON array of events/statements or object
          try {
            const parsed = JSON.parse(rawContent);
            const items = Array.isArray(parsed) ? parsed : [parsed];

            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const text = item.content || item.text || JSON.stringify(item);
              const date = item.date || item.validFrom || new Date().toISOString().split('T')[0];
              const commit = createCommit(text, fileName, 'document', date);
              await addCommit(commit);
              createdCommits.push(commit);

              newTemporalChunks.push({
                id: `ingest-json-${commit.id}`,
                content: `[${date}] (${commit.topic}) ${text}`,
                embedding: [],
                commitId: commit.id,
                validFrom: date,
                metadata: {
                  source: fileName,
                  sourceType: 'document',
                  topic: commit.topic,
                  chunkIndex: i
                }
              });
            }
          } catch {
            const parsedContent = await parseDocument(rawContent, ext);
            const commit = createCommit(parsedContent, fileName, 'document', new Date().toISOString());
            await addCommit(commit);
            createdCommits.push(commit);
          }
        } else {
          // Markdown / Plain text
          const parsedContent = await parseDocument(rawContent, ext);
          const validSourceType = ['tweet', 'article', 'interview', 'book', 'document', 'speech'].includes(sourceType)
            ? sourceType as KnowledgeCommit['sourceType']
            : 'document';

          const commit = createCommit(
            parsedContent,
            fileName,
            validSourceType,
            new Date().toISOString()
          );

          await addCommit(commit);
          createdCommits.push(commit);

          newTemporalChunks.push({
            id: `ingest-doc-${commit.id}`,
            content: `[${commit.timestamp.split('T')[0]}] (${commit.topic}) ${parsedContent.slice(0, 500)}`,
            embedding: [],
            commitId: commit.id,
            validFrom: commit.timestamp.split('T')[0],
            metadata: {
              source: fileName,
              sourceType: validSourceType,
              topic: commit.topic,
              chunkIndex: 0
            }
          });
        }
      } catch (fileError: unknown) {
        errors.push(`Failed to process '${fileName}': ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
      }
    }

    // Add all generated temporal chunks to the active RAG index
    if (newTemporalChunks.length > 0) {
      await addChunks(newTemporalChunks);
    }

    // Get updated stats
    const stats = await getStats();

    return NextResponse.json({
      success: createdCommits.length > 0,
      stats: {
        filesProcessed: files.length,
        commitsCreated: createdCommits.length,
        chunksIndexed: newTemporalChunks.length,
        totalCommits: stats.total,
        topicsDetected: Object.keys(stats.topics),
        topicCounts: stats.topics
      },
      commits: createdCommits.slice(0, 10).map(c => ({
        id: c.id,
        source: c.source,
        topic: c.topic,
        timestamp: c.timestamp
      })),
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: unknown) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ingestion failed' },
      { status: 500 }
    );
  }
}
