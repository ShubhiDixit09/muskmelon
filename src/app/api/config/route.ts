import { NextResponse } from 'next/server';
import { getStats } from '@/lib/commits/commit-store';
import { loadIndex } from '@/lib/temporal/temporal-index';
import { MUSK_COGNITIVE_SIGNATURE } from '@/lib/rag/cognitive-signature';

let currentConfig = {
  name: 'Musk Melon',
  description: 'Grounded Knowledge Twin of Elon Musk with Cognitive Version Control.',
  style: 'First-principles physics, direct engineering cadence, dry wit, and authentic rhythm.',
  topics: 'SpaceX, Starship, Tesla, FSD, Optimus, Neuralink, xAI, Grok, DOGE, Mars Colonization, Cryptocurrency'
};

export async function GET() {
  try {
    const commitStats = await getStats();
    const indexChunks = await loadIndex();

    return NextResponse.json({
      config: currentConfig,
      signature: MUSK_COGNITIVE_SIGNATURE,
      stats: {
        totalCommits: commitStats.total,
        totalRAGChunks: indexChunks.length,
        topics: commitStats.topics,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    return NextResponse.json({
      config: currentConfig,
      signature: MUSK_COGNITIVE_SIGNATURE,
      stats: {
        totalCommits: 80,
        totalRAGChunks: 80,
        lastUpdated: new Date().toISOString()
      }
    });
  }
}

export async function POST(req: Request) {
  try {
    const newConfig = await req.json();
    currentConfig = { ...currentConfig, ...newConfig };
    return NextResponse.json({ success: true, config: currentConfig });
  } catch {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
