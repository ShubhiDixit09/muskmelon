import { NextResponse } from 'next/server';
import { PersonaAgent } from '@/lib/agent/persona-agent';
import { recordExecution } from '@/lib/swytchcode/telemetry';

/**
 * POST /api/chat
 * MindCommit chat endpoint — routes through PersonaAgent with Swytchcode telemetry.
 * All LLM calls and knowledge retrieval are logged in the execution audit trail.
 */
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { message, mode = 'now', asOfDate, compareDates, history = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 10000) {
      return NextResponse.json({ error: 'Message exceeds maximum length of 10,000 characters' }, { status: 400 });
    }

    const mappedMode = mode === 'time' ? 'time-lens' : mode === 'diff' ? 'belief-diff' : 'now';

    const response = await PersonaAgent.chat({
      message,
      mode: mappedMode as 'now' | 'time-lens' | 'belief-diff',
      asOfDate,
      compareDates: compareDates ? { from: compareDates[0], to: compareDates[1] } : undefined,
      history
    });

    // Record chat execution in Swytchcode telemetry
    await recordExecution({
      toolName: 'mindcommit.chat',
      input: { mode: mappedMode, messageLength: message.length, hasHistory: history.length > 0 },
      policyResult: { allowed: true, action: 'allow' },
      execution: {
        success: true,
        durationMs: Date.now() - startTime,
        retryCount: 0
      }
    });

    return NextResponse.json({
      message: response.message,
      receipt: response.receipt,
      confidence: response.confidence
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process chat';
    console.error('API /api/chat error:', error);

    // Record failed execution
    await recordExecution({
      toolName: 'mindcommit.chat',
      input: { error: true },
      policyResult: { allowed: true, action: 'allow' },
      execution: {
        success: false,
        durationMs: Date.now() - startTime,
        retryCount: 0,
        error: errorMessage
      }
    }).catch(() => {}); // Don't fail the response if telemetry fails

    if (errorMessage.includes('AI generation is unavailable')) {
      return NextResponse.json({
        code: 'AI_PROVIDER_UNAVAILABLE',
        error: 'The AI provider is not available. Configure a server-side OpenAI, Gemini, or OpenRouter key, or enable Vercel AI Gateway billing.'
      }, { status: 503 });
    }

    // Hide server-side implementation details from end users.
    return NextResponse.json({ error: 'Unable to complete the chat request. Please try again.' }, { status: 500 });
  }
}
