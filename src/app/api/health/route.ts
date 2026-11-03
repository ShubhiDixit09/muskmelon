import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Only return configuration flags, never API keys or connection strings.
export async function GET() {
  const configured = (value: string | undefined): boolean =>
    Boolean(value && value.trim() && !value.includes('...'));

  return NextResponse.json(
    {
      modelKeyConfigured: [
        process.env.OPENAI_API_KEY,
        process.env.OPENROUTER_API_KEY,
        process.env.GEMINI_API_KEY,
        process.env.GOOGLE_API_KEY,
        process.env.AI_GATEWAY_API_KEY
      ].some(configured),
      weaviateConfigured:
        configured(process.env.WEAVIATE_URL) &&
        configured(process.env.WEAVIATE_API_KEY),
      knowledgeSource: 'bundled-archive',
      // OIDC Gateway may be available without an API key, but billing cannot
      // be verified by a cheap health request. Do not report it as ready.
      gatewayAvailability: 'unverified'
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
