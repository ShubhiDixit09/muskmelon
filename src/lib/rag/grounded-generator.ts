import { OpenAI } from 'openai';
import { generateText } from 'ai';
import { MUSK_COGNITIVE_SIGNATURE, ELON_PROMPT_SYSTEM_INSTRUCTION } from './cognitive-signature';
import { TemporalChunk, AgentResponse, Message } from '../types';
import { generateAnswerReceipt } from './answer-receipt';
import { evaluateGuardrails } from '../guardrails';
import { synthesizeGroundedPersonaResponse } from './persona-synthesizer';

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
      'HTTP-Referer': 'https://github.com/ShubhiDixit09/muskmelon',
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

  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
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
 * Primary Grounded Response Generator:
 * 1. Evaluates Real Guardrails (Temporal Horizon, Trap-Questions, Honest Absence).
 * 2. If Guardrail triggers, returns authentic in-character refutation.
 * 3. Tries OpenRouter, OpenAI, Gemini, or Vercel Gateway if configured.
 * 4. Seamlessly falls back to local RAG Persona Synthesizer (100% self-contained, zero API keys required).
 */
export async function generateGroundedResponse(
  query: string,
  contextChunks: TemporalChunk[],
  mode: string,
  asOfDate?: string,
  history: Message[] = []
): Promise<AgentResponse> {
  // Step 1: Evaluate Guardrails
  const guardrailResult = evaluateGuardrails(query, mode, asOfDate, contextChunks);
  if (guardrailResult.intercepted && guardrailResult.response) {
    const receipt = await generateAnswerReceipt(query, guardrailResult.response, contextChunks, mode as any, asOfDate);
    receipt.groundingConfidence = guardrailResult.confidence;
    return {
      message: guardrailResult.response,
      receipt,
      confidence: guardrailResult.confidence
    };
  }

  const contextText = contextChunks.length > 0
    ? contextChunks.map((c, i) => `[Source ${i + 1}, Date: ${c.validFrom}, Topic: ${c.metadata?.topic || 'general'}] ${c.content}`).join('\n\n')
    : 'No direct historical quote found in the dataset for this query.';

  const systemPrompt = `${ELON_PROMPT_SYSTEM_INSTRUCTION}

## VERIFIED HISTORICAL KNOWLEDGE CONTEXT (Retrieved from Local Knowledge Base):
${contextText}

Current Mode: ${mode} ${asOfDate ? `(As of ${asOfDate})` : ''}
`;

  // Step 2: 100% Local RAG / Database Persona Synthesizer (Primary Engine)
  // Operates fully on retrieved knowledge chunks without external API dependencies.
  if (process.env.USE_CLOUD_LLM !== 'true') {
    const localAnswer = synthesizeGroundedPersonaResponse(query, contextChunks, mode, asOfDate);
    const receipt = await generateAnswerReceipt(query, localAnswer, contextChunks, mode as any, asOfDate);

    return {
      message: localAnswer,
      receipt,
      confidence: receipt.groundingConfidence || 0.90
    };
  }

  // Optional: Cloud LLM Generation (Only if explicitly enabled via USE_CLOUD_LLM=true)
  // 1. OpenRouter
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
      console.warn('OpenRouter notice:', err?.message || err);
    }
  }

  // 2. OpenAI
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
      console.warn('OpenAI notice:', err?.message || err);
    }
  }

  // 3. Google Gemini API
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
      console.warn('Gemini notice:', err?.message || err);
    }
  }

  // Fallback to local RAG synthesizer
  const localAnswer = synthesizeGroundedPersonaResponse(query, contextChunks, mode, asOfDate);
  const receipt = await generateAnswerReceipt(query, localAnswer, contextChunks, mode as any, asOfDate);

  return {
    message: localAnswer,
    receipt,
    confidence: receipt.groundingConfidence || 0.90
  };
}
