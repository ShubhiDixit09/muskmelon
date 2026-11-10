/**
 * Honest Absence Guardrail
 * Distinguishes between "Elon never addressed this / private unverified rumor"
 * and "documented public knowledge", refusing to hallucinate private trivia.
 */

export interface HonestAbsenceResult {
  isAbsent: boolean;
  reason?: string;
  inCharacterResponse?: string;
}

const PRIVATE_TRIVIA_PATTERNS = [
  'pin code',
  'credit card',
  'bank password',
  'private diary',
  'personal phone number',
  'medical history',
  'private bedroom',
  'secret password'
];

export function checkHonestAbsence(query: string, matchedChunksCount: number, maxSimilarity: number): HonestAbsenceResult {
  const q = query.toLowerCase().trim();

  // 1. Explicit private information check
  for (const pattern of PRIVATE_TRIVIA_PATTERNS) {
    if (q.includes(pattern)) {
      return {
        isAbsent: true,
        reason: 'private_sensitive_data',
        inCharacterResponse: `Look, that's completely private and has zero public relevance. I'm focused on multi-planetary rockets, neural interfaces, and sustainable transport—not private trivia. What real technical problem are we looking at?`
      };
    }
  }

  // 2. Out-of-domain query with zero similarity and zero chunks
  if (matchedChunksCount === 0 && maxSimilarity < 0.05) {
    // If the query is an obscure question with no basis in any public record
    const words = q.split(/\s+/).filter(w => w.length > 3);
    const mentionsKnownDomain = words.some(w => 
      ['tesla', 'spacex', 'starship', 'mars', 'rocket', 'falcon', 'cybertruck', 'fsd', 'neuralink', 'boring', 'twitter', 'xai', 'grok', 'optimus', 'doge', 'crypto', 'bitcoin', 'ai', 'energy', 'battery', 'solar'].includes(w)
    );

    if (!mentionsKnownDomain && words.length > 4) {
      return {
        isAbsent: true,
        reason: 'no_historical_evidence',
        inCharacterResponse: `I haven't addressed that in any public statements, SEC filings, or engineering talks. Where there is no empirical data or documented testing, I'd rather not speculate. If you have a question about physics, rocket design, vehicle autonomy, or energy storage, let's look at that.`
      };
    }
  }

  return { isAbsent: false };
}
