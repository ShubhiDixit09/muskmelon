import { checkTemporalBoundary, TemporalCheckResult } from './temporal-guardrail';
import { checkTrapQuestion, TrapCheckResult } from './trap-question-guardrail';
import { checkHonestAbsence, HonestAbsenceResult } from './honest-absence-guardrail';
import { TemporalChunk } from '../types';

export interface GuardrailEvaluation {
  passed: boolean;
  intercepted: boolean;
  guardrailTriggered?: 'temporal' | 'trap_question' | 'honest_absence';
  response?: string;
  confidence: number;
}

/**
 * Unified Guardrails Pipeline
 * Evaluates queries against temporal bounds, trap questions, and honest absence rules.
 */
export function evaluateGuardrails(
  query: string,
  mode: string,
  asOfDate?: string,
  matchedChunks: TemporalChunk[] = [],
  maxSimilarity: number = 1.0
): GuardrailEvaluation {
  // 1. Trap-Question & Prompt Injection check (Highest Priority)
  const trapCheck = checkTrapQuestion(query);
  if (trapCheck.isTrap && trapCheck.refutation) {
    return {
      passed: false,
      intercepted: true,
      guardrailTriggered: 'trap_question',
      response: trapCheck.refutation,
      confidence: 0.98
    };
  }

  // 2. Temporal Horizon Guardrail (When in time-lens mode)
  if (mode === 'time-lens' && asOfDate) {
    const temporalCheck = checkTemporalBoundary(query, asOfDate);
    if (temporalCheck.isAnachronistic && temporalCheck.inCharacterRefusal) {
      return {
        passed: false,
        intercepted: true,
        guardrailTriggered: 'temporal',
        response: temporalCheck.inCharacterRefusal,
        confidence: 0.99
      };
    }
  }

  // 3. Honest Absence Guardrail
  const absenceCheck = checkHonestAbsence(query, matchedChunks.length, maxSimilarity);
  if (absenceCheck.isAbsent && absenceCheck.inCharacterResponse) {
    return {
      passed: false,
      intercepted: true,
      guardrailTriggered: 'honest_absence',
      response: absenceCheck.inCharacterResponse,
      confidence: 0.90
    };
  }

  return {
    passed: true,
    intercepted: false,
    confidence: 1.0
  };
}

export * from './temporal-guardrail';
export * from './trap-question-guardrail';
export * from './honest-absence-guardrail';
