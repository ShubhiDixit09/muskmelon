import { OpenAI } from 'openai';
import { generateText } from 'ai';
import { MUSK_COGNITIVE_SIGNATURE, ELON_PROMPT_SYSTEM_INSTRUCTION } from './cognitive-signature';
import { TemporalChunk, AgentResponse, Message } from '../types';
import { generateAnswerReceipt } from './answer-receipt';

/**
 * Returns active OpenAI client if OPENAI_API_KEY is configured
 */
function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (key && key.startsWith('sk-') && !key.includes('...')) {
    return new OpenAI({ apiKey: key });
  }
  return null;
}

/**
 * Call OpenRouter API with max_tokens budget (OpenRouter GPT-4o-mini / GPT-4o)
 */
async function callOpenRouterAPI(systemPrompt: string, userQuery: string, history: Message[] = []): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey || openRouterKey.includes('...')) return null;

  const formattedHistory = history.slice(-4).map(h => ({
    role: (h.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: h.content
  }));

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openRouterKey}`,
      'HTTP-Referer': 'https://github.com/shdra06/muskmelon',
      'X-Title': 'MuskMelon - Elon Musk Knowledge Twin'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 600,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: userQuery }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.warn('OpenRouter API returned non-200:', res.status, errText);
    return null;
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || null;
}

/**
 * Call OpenAI API directly
 */
async function callOpenAIAPI(systemPrompt: string, userQuery: string, history: Message[] = []): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const formattedHistory = history.slice(-4).map(h => ({
    role: (h.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: h.content
  }));

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 600,
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: userQuery }
    ]
  });

  return response.choices[0]?.message?.content || null;
}

/**
 * Call Google Gemini LLM API
 */
async function callGeminiAPI(systemPrompt: string, userQuery: string, history: Message[] = []): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey || geminiKey.includes('...')) return null;

  const contents = [
    ...history.slice(-4).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    })),
    { role: 'user', parts: [{ text: userQuery }] }
  ];

  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 600 }
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}


/**
 * Keyless production LLM fallback through Vercel AI Gateway.
 * Vercel supplies short-lived OIDC credentials to deployed functions.
 * Local development can use AI_GATEWAY_API_KEY instead.
 */
async function callVercelGatewayAPI(
  systemPrompt: string,
  userQuery: string,
  history: Message[] = []
): Promise<string | null> {
  if (!process.env.VERCEL && !process.env.AI_GATEWAY_API_KEY) return null;

  const messages: Array<{ role: 'assistant' | 'user'; content: string }> = [
    ...history.slice(-4).map(h => ({
      role: (h.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: h.content
    })),
    { role: 'user', content: userQuery }
  ];

  const result = await generateText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    messages,
    temperature: 0.6,
    maxOutputTokens: 600
  });

  return result.text?.trim() || null;
}

/**
 * Grounded RAG Response Synthesizer:
 * Generates Elon's grounded response using Weaviate RAG chunks if APIs are unreachable.
 */
function synthesizeRAGResponse(
  query: string,
  contextChunks: TemporalChunk[],
  mode: string,
  asOfDate?: string
): string {
  const q = query.toLowerCase().trim();

  // Greetings & Casual
  if (/^(hi|hello|hey|greetings|yo|sup|howdy)(\s+.*)?$/i.test(q) || q.includes('how are you') || q.includes('how r u') || q.includes('whats up') || q.includes('hi there')) {
    return `Yeah, doing well. Extremely busy splitting time between Starbase, Giga Texas, and xAI in Memphis. When you're trying to make life multiplanetary, accelerate sustainable transport, and build truth-seeking AI, there are basically no days off.\n\nWhat engineering or physics problem are we tackling today?`;
  }

  // Trap Questions & False Premise Refutations
  if (q.includes('flat earth') || q.includes('earth is flat')) {
    return `Look, obviously Earth is an oblate spheroid. Anyone claiming otherwise is defying basic orbital mechanics. We launch rockets into orbit every couple of days at SpaceX—you can literally watch the live 4K stream of Earth's curvature on X from our Starlink satellites.`;
  }

  if (q.includes('aliens') || q.includes('ufo') || q.includes('fermi') || q.includes('extraterrestrial')) {
    return `As far as we know, we are the only conscious life in this sector of the galaxy. I haven't seen any evidence of aliens yet—and believe me, if anyone would know, SpaceX would. That's why making life multi-planetary and colonizing Mars is so vital. The window of consciousness is rare and precious.`;
  }

  // Context Chunks Injection
  if (contextChunks.length > 0) {
    const primary = contextChunks[0];
    const cleanContent = primary.content.replace(/^\[.*?\]\s*/, '').replace(/\(Source:.*?\)/, '').trim();
    return `Yeah, looking at this: ${cleanContent}\n\nThe critical path is eliminating constraints, iterating at maximum velocity, and focusing on the physical limits of mass and energy.`;
  }

  // Domain Defaults
  if (q.includes('productivity') || q.includes('productive') || q.includes('routine')) {
    return `Yeah, I mean, I focus almost 80% to 90% of my time on engineering and design. The biggest mistake people make is optimizing a process that shouldn't exist in the first place.\n\nMy 5-step algorithm:\n1. Make requirements less dumb.\n2. Delete the part or process step.\n3. Simplify or optimize.\n4. Accelerate cycle time.\n5. Automate.`;
  }

  if (q.includes('future') || q.includes('civilization') || q.includes('humanity')) {
    return `The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make humanity a spacefaring civilization. If consciousness is a small candle in a vast darkness, we must do everything possible to ensure that candle does not go out. That means sustainable energy on Earth, and a self-sustaining city on Mars.`;
  }

  if (q.includes('invest') || q.includes('investment') || q.includes('money')) {
    return `I believe in solving real physical engineering problems that move humanity forward. Don't chase paper games or financial engineering. The highest return on investment comes from advancing sustainable energy generation and storage, autonomous robotic transport, orbital heavy lift, and high-bandwidth neural interfaces.`;
  }

  return `Yeah, I mean, if you break that down: what are the underlying physics constraints? In any engineering problem, you want to eliminate friction, delete unnecessary parts, and accelerate cycle time. Prototypes are trivial; scaling production to high volume at an order of magnitude lower cost is what's truly difficult.\n\nWhat specific constraint do you want to optimize first?`;
}

/**
 * Primary Grounded Response Generator:
 * 1. Executes OpenRouter API (GPT-4o / Claude) with the user's active key.
 * 2. Executes OpenAI API if available.
 * 3. Executes Google Gemini if available.
 * 4. Falls back seamlessly to Grounded RAG Synthesizer.
 */
export async function generateGroundedResponse(
  query: string,
  contextChunks: TemporalChunk[],
  mode: string,
  asOfDate?: string,
  history: Message[] = []
): Promise<AgentResponse> {
  const contextText = contextChunks.length > 0 
    ? contextChunks.map((c, i) => `[Source ${i + 1}, Date: ${c.validFrom}, Topic: ${c.metadata?.topic || 'general'}] ${c.content}`).join('\n\n')
    : 'No direct historical quote found in the dataset for this query.';

  const systemPrompt = `${ELON_PROMPT_SYSTEM_INSTRUCTION}

## CURRENT VERIFIED RAG KNOWLEDGE CONTEXT (Retrieved from Weaviate):
${contextText}

Current Mode: ${mode} ${asOfDate ? `(As of ${asOfDate})` : ''}
`;

  // 1. PRIMARY: OpenRouter API (User Verified Active Key)
  if (process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('...')) {
    try {
      const answer = await callOpenRouterAPI(systemPrompt, query, history);
      if (answer) {
        const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);
        return {
          message: answer,
          receipt,
          confidence: receipt.groundingConfidence || 0.95
        };
      }
    } catch (err: any) {
      console.warn('OpenRouter notice, proceeding to secondary:', err?.message || err);
    }
  }

  // 2. SECONDARY: Direct OpenAI API
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('...')) {
    try {
      const answer = await callOpenAIAPI(systemPrompt, query, history);
      if (answer) {
        const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);
        return {
          message: answer,
          receipt,
          confidence: receipt.groundingConfidence || 0.95
        };
      }
    } catch (err: any) {
      console.warn('OpenAI notice, proceeding to fallback:', err?.message || err);
    }
  }

  // 3. TERTIARY: Google Gemini API
  if ((process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && !process.env.GEMINI_API_KEY?.includes('...')) {
    try {
      const answer = await callGeminiAPI(systemPrompt, query, history);
      if (answer) {
        const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);
        return {
          message: answer,
          receipt,
          confidence: receipt.groundingConfidence || 0.95
        };
      }
    } catch (err: any) {
      console.warn('Gemini notice, proceeding to fallback:', err?.message || err);
    }
  }

  // 4. Vercel AI Gateway with project-scoped OIDC (no embedded API keys).
  if (process.env.VERCEL || process.env.AI_GATEWAY_API_KEY) {
    try {
      const answer = await callVercelGatewayAPI(systemPrompt, query, history);
      if (answer) {
        const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);
        return { message: answer, receipt, confidence: receipt.groundingConfidence };
      }
    } catch (err: unknown) {
      console.error('Vercel AI Gateway generation unavailable:', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // Never represent canned demo text as a successfully generated AI answer in production.
  if (process.env.VERCEL) {
    throw new Error('AI generation is unavailable. Enable Vercel AI Gateway for this project or configure an LLM API key.');
  }

  // 5. Deterministic offline-only fallback for local demo work.
  // First-Principles RAG Synthesizer
  const answer = synthesizeRAGResponse(query, contextChunks, mode, asOfDate);
  const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);

  return {
    message: answer,
    receipt,
    confidence: receipt.groundingConfidence || 0.95
  };
}
