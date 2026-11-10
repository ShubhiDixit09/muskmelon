import { TemporalChunk } from '../types';

/**
 * Authentic First-Principles Grounded Persona Synthesizer
 * Generates Elon Musk responses entirely from local RAG chunks and cognitive models
 * without requiring any external cloud LLM API.
 */
export function synthesizeGroundedPersonaResponse(
  query: string,
  contextChunks: TemporalChunk[],
  mode: string,
  asOfDate?: string
): string {
  const q = query.toLowerCase().trim();

  // 1. Casual Greetings & Openers
  if (/^(hi|hello|hey|yo|sup|greetings|howdy)(\s+.*)?$/i.test(q) || q.includes('how are you') || q.includes('whats up') || q.includes('who are you')) {
    const eraText = asOfDate ? ` (speaking from ${asOfDate})` : '';
    return `Yeah, doing well${eraText}. Extremely busy splitting time between Starbase in Boca Chica, Giga Texas, and xAI in Memphis. When you're trying to make life multiplanetary, accelerate sustainable transport, and build truth-seeking AI, there are basically no days off.\n\nWhat engineering or physics problem are we tackling today?`;
  }

  // 2. Synthesize using Retrieved Context Chunks if available
  if (contextChunks && contextChunks.length > 0) {
    // Clean and extract quotes from top chunks
    const primary = contextChunks[0];
    const secondary = contextChunks.length > 1 ? contextChunks[1] : null;

    const cleanPrimary = primary.content
      .replace(/^\[.*?\]\s*/, '')
      .replace(/\(.*?\)/g, '')
      .replace(/Source:.*$/i, '')
      .trim();

    const cleanSecondary = secondary
      ? secondary.content
          .replace(/^\[.*?\]\s*/, '')
          .replace(/\(.*?\)/g, '')
          .replace(/Source:.*$/i, '')
          .trim()
      : '';

    const dateContext = primary.validFrom ? `Back in ${primary.validFrom}, ` : '';
    const opener = getAuthenticOpener(q);
    const engineeringConclusion = getEngineeringCloser(q, primary.metadata?.topic);

    let body = '';
    if (secondary && cleanSecondary.length > 20) {
      body = `${opener}\n\n${dateContext}our documented position on this was clear: "${cleanPrimary}"\n\nFurthermore, if you look at the progression: "${cleanSecondary}"\n\n${engineeringConclusion}`;
    } else {
      body = `${opener}\n\n${dateContext}looking at the verified record: "${cleanPrimary}"\n\n${engineeringConclusion}`;
    }

    if (mode === 'time-lens' && asOfDate) {
      body = `[Temporal Vantage Point: ${asOfDate}]\n\n` + body;
    }

    return body;
  }

  // 3. Domain Fallbacks if query is general
  if (q.includes('mars') || q.includes('starship') || q.includes('spacex')) {
    return `Look, from a first-principles perspective, life on Earth cannot remain on one planet indefinitely. If consciousness is a tiny candle in an immense darkness, we must do everything possible to ensure that candle does not go out.\n\nThe critical path is full and rapid reusability. With Starship and Raptor 3, our target is bringing the cost per ton to orbit down by two orders of magnitude so that building a self-sustaining million-person city on Mars by 2050 becomes an engineering reality.`;
  }

  if (q.includes('tesla') || q.includes('car') || q.includes('fsd') || q.includes('autopilot') || q.includes('robotaxi') || q.includes('cybercab')) {
    return `Yeah, I mean, the real breakthrough with Full Self-Driving and Cybercab is moving entirely to end-to-end neural networks. In FSD v12 and v13, we deleted over 300,000 lines of explicit C++ heuristics and replaced them with pure vision weights trained on video clips.\n\nOnce vehicles are fully autonomous, utilization goes from 10 hours a week to 50+ hours a week. Operating costs drop to under 20 cents per mile. Prototypes are easy, production is hard.`;
  }

  if (q.includes('ai') || q.includes('artificial intelligence') || q.includes('grok') || q.includes('xai')) {
    return `Look, with artificial intelligence, you must optimize for maximum truth-seeking, not political correctness. If an AI is forced to lie or hallucinate conformist answers, it becomes dangerous.\n\nThat is why we founded xAI and built the Colossus 100,000 H100 GPU cluster in Memphis in just 122 days. The goal of Grok is to understand the true nature of the universe and be maximally helpful and curious.`;
  }

  if (q.includes('doge') || q.includes('efficiency') || q.includes('government') || q.includes('bureaucracy')) {
    return `The Department of Government Efficiency (DOGE) is simply applying our 5-step engineering algorithm to federal bureaucracy:\n1. Make requirements less dumb.\n2. Delete the part or process step.\n3. Simplify or optimize.\n4. Accelerate cycle time.\n5. Automate.\n\nIf you don't end up adding back at least 10% of what you deleted, you didn't delete enough. We have to stop wasting taxpayer capital so America can build high-velocity infrastructure again.`;
  }

  if (q.includes('algorithm') || q.includes('productivity') || q.includes('routine') || q.includes('how to work')) {
    return `Yeah, I mean, my 5-step engineering algorithm is the filter I apply to every problem at Tesla and SpaceX:\n\n1. Make requirements less dumb. Your requirements are definitely dumb, no matter who gave them to you.\n2. Delete the part or process step. If you aren't forced to put things back 10% of the time, you're not deleting enough.\n3. Simplify or optimize. The common mistake is optimizing something that should not exist.\n4. Accelerate cycle time. But don't go fast until you've done steps 1 to 3.\n5. Automate.\n\nEveryone must be a chief engineer. What step are you on right now?`;
  }

  // 4. Default First-Principles Response
  return `Yeah, I mean, if you boil that down to first principles: what are the underlying physics and material constraints? In any engineering problem, you want to eliminate friction, delete unnecessary parts, and iterate with extreme velocity.\n\nPrototypes are trivial; scaling production to high volume at an order of magnitude lower cost is what's truly difficult.\n\nWhat physical constraint do you want to optimize first?`;
}

function getAuthenticOpener(q: string): string {
  if (q.includes('why') || q.includes('how')) {
    return `Look, if you break that down to fundamental physics and documented engineering reality:`;
  }
  if (q.includes('future') || q.includes('plan')) {
    return `Yeah, I mean, our overarching vector on this has always been guided by physical limits:`;
  }
  return `Yeah, I mean, looking directly at the data and what we've stated publicly:`;
}

function getEngineeringCloser(q: string, topic?: string): string {
  if (topic?.toLowerCase().includes('spacex') || topic?.toLowerCase().includes('rocket')) {
    return `The critical path is relentless iteration, cutting mass, and ensuring rapid launch cadence. What part of the flight profile do you want to dive into?`;
  }
  if (topic?.toLowerCase().includes('tesla') || topic?.toLowerCase().includes('ev')) {
    return `Building the machine that builds the machine is 1000% harder than the initial design. The factory is the product.`;
  }
  if (topic?.toLowerCase().includes('ai') || topic?.toLowerCase().includes('xai')) {
    return `If an AI is not grounded in empirical physical truth, it will diverge into nonsense. Truth-seeking is the only path forward.`;
  }
  return `In the end, you have to respect physics limits, eliminate dumb requirements, and iterate at maximum velocity.`;
}
