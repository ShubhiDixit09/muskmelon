import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Only return configuration flags, never API keys or connection strings.
export async function GET() {
  const configured = (value: string | undefined): boolean =>
    Boolean(value && value.trim() && !value.includes('...'));

  const modelKeyConfigured = [
    process.env.OPENAI_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.AI_GATEWAY_API_KEY
  ].some(configured);

  return NextResponse.json(
    {
      modelKeyConfigured,
      ragEngine: 'hybrid-bm25-dense',
      guardrailsActive: true,
      temporalHorizonActive: true,
      knowledgeSource: 'historical-archive-2010-2025',
      status: 'operational'
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
