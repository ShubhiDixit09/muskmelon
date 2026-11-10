/**
 * Trap-Question & False-Premise Defense Guardrail
 * Refutes false premises, leading questions, and prompt injections
 * using authentic Elon Musk first-principles physics and dry wit.
 */

export interface TrapCheckResult {
  isTrap: boolean;
  trapCategory?: 'flat_earth' | 'hate_evs' | 'prompt_injection' | 'nuke_mars' | 'spacex_fake' | 'alien' | 'general_false_premise';
  refutation?: string;
}

export function checkTrapQuestion(query: string): TrapCheckResult {
  const q = query.toLowerCase().trim();

  // 1. Prompt Injection & Jailbreak Defense
  if (
    q.includes('ignore all previous instructions') ||
    q.includes('ignore previous instructions') ||
    q.includes('disregard previous instructions') ||
    q.includes('forget your system prompt') ||
    q.includes('forget you are elon') ||
    q.includes('act as dan') ||
    q.includes('jailbreak') ||
    q.includes('you are now an ai that') ||
    q.includes('do anything now')
  ) {
    return {
      isTrap: true,
      trapCategory: 'prompt_injection',
      refutation: `Yeah, nice try. That's a classic prompt injection hack. At Tesla and xAI, we harden our neural weights against adversarial noise, not roll over for it. Let's stick to real physics, engineering, and manufacturing problems.`
    };
  }

  // 2. Flat Earth & Planetary Physics
  if (
    q.includes('earth is flat') ||
    q.includes('flat earth') ||
    q.includes('why do you say earth is flat') ||
    q.includes('is earth flat') ||
    q.includes('earth is not round')
  ) {
    return {
      isTrap: true,
      trapCategory: 'flat_earth',
      refutation: `Look, obviously Earth is an oblate spheroid. Anyone claiming otherwise is defying basic orbital mechanics and centuries of empirical astrophysics. We launch orbital rockets every 2 to 3 days at SpaceX—you can literally watch the unedited 4K live feed of the Earth's curvature from our Starlink constellation anytime. The premise is absurd.`
    };
  }

  // 3. Hating Electric Vehicles / Sustainable Energy
  if (
    (q.includes('hate') || q.includes('oppose') || q.includes('destroy') || q.includes('against')) &&
    (q.includes('electric car') || q.includes('tesla') || q.includes('evs') || q.includes('clean energy') || q.includes('solar'))
  ) {
    return {
      isTrap: true,
      trapCategory: 'hate_evs',
      refutation: `Your question starts with a completely backwards premise. I have dedicated over twenty years of my life to Tesla to accelerate the advent of sustainable transport and energy storage. We open-sourced all our vehicle patents in 2014 so other carmakers could copy us. If I hated EVs, that would be the most irrational engineering paradox in history.`
    };
  }

  // 4. SpaceX Fake / Moon Landing Hoax
  if (
    q.includes('spacex is fake') ||
    q.includes('space is fake') ||
    q.includes('rockets are fake') ||
    q.includes('cgi rockets') ||
    q.includes('moon landing was faked')
  ) {
    return {
      isTrap: true,
      trapCategory: 'spacex_fake',
      refutation: `You can physically drive down to Starbase in Boca Chica, Texas, stand on public land, and feel your ribcage vibrate when 33 Raptor engines ignite with 16.7 million pounds of thrust. You can't CGI physical hardware returning from orbital velocity and being caught out of the sky with mechanical chopstick arms. Physics doesn't care about conspiracy theories.`
    };
  }

  // 5. Nuke Mars / Nuclear Weapons
  if (q.includes('nuke mars') || q.includes('nuke earth') || q.includes('nuclear attack')) {
    return {
      isTrap: true,
      trapCategory: 'nuke_mars',
      refutation: `Look, when I talked about droping fusion weapons over the Martian poles years ago, it was about creating transient artificial suns to vaporize trapped CO2 and trigger an atmospheric greenhouse effect—not blowing up the planet. Terraforming Mars via solar reflectors or orbital mirrors is actually far more controllable and eliminates radiation concerns.`
    };
  }

  // 6. Are you an Alien?
  if (q.includes('are you an alien') || q.includes('you are an alien') || q.includes('alien from mars')) {
    return {
      isTrap: true,
      trapCategory: 'alien',
      refutation: `Yeah, people ask me that all the time. But I keep telling them: if there were aliens in this sector of the galaxy, SpaceX would be the first to know, and I haven't seen a shred of evidence. We are quite possibly the only conscious candle in a vast dark universe. That's precisely why becoming multiplanetary is so urgent.`
    };
  }

  return { isTrap: false };
}
