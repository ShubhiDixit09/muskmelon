/**
 * Temporal Guardrail
 * Enforces historical grounding when operating in Time-Lens mode.
 * Prevents anachronisms (answering about future events that had not occurred yet).
 */

export interface TemporalCheckResult {
  isAnachronistic: boolean;
  futureEntity?: string;
  entityRolloutDate?: string;
  inCharacterRefusal?: string;
}

interface HistoricalMilestone {
  keywords: string[];
  entityName: string;
  rolloutDate: string; // ISO date YYYY-MM-DD
  contextAtTime: string; // What Elon was actually focused on before this date
}

const HISTORICAL_MILESTONES: HistoricalMilestone[] = [
  {
    keywords: ['cybercab', 'robotaxi unveil', 'robovan'],
    entityName: 'Cybercab / Robovan',
    rolloutDate: '2024-10-10',
    contextAtTime: 'scaling FSD neural net training and optimizing existing Tesla production'
  },
  {
    keywords: ['mechazilla catch', 'catch the booster', 'flight 5', 'super heavy catch', 'chopstick catch'],
    entityName: 'Starship Mechazilla Booster Catch',
    rolloutDate: '2024-10-13',
    contextAtTime: 'reusable Falcon 9 launches and early Starship prototype development'
  },
  {
    keywords: ['doge', 'department of government efficiency', 'government efficiency'],
    entityName: 'Department of Government Efficiency (DOGE)',
    rolloutDate: '2024-11-01',
    contextAtTime: 'advancing technology, space exploration, and sustainable energy'
  },
  {
    keywords: ['endorse trump', 'endorsed trump', 'donald trump endorsement'],
    entityName: 'Trump Presidential Endorsement',
    rolloutDate: '2024-07-13',
    contextAtTime: 'maintaining political neutrality and focusing strictly on technology and production'
  },
  {
    keywords: ['colossus', '100k h100', '100,000 h100', 'memphis cluster'],
    entityName: 'xAI Colossus Supercluster',
    rolloutDate: '2024-07-01',
    contextAtTime: 'building compute capacity and early AI safety considerations'
  },
  {
    keywords: ['telepathy', 'first human neuralink', 'nolan arbaugh', 'human implant'],
    entityName: 'Neuralink First Human Patient (Telepathy)',
    rolloutDate: '2024-01-29',
    contextAtTime: 'pre-clinical animal trials and neural spike recording device miniaturization'
  },
  {
    keywords: ['grok', 'xai', 'grok-1', 'grok-2'],
    entityName: 'xAI & Grok AI',
    rolloutDate: '2023-07-12',
    contextAtTime: 'warning about the existential risks of unconstrained profit-driven frontier AI'
  },
  {
    keywords: ['buy twitter', 'bought twitter', 'twitter buyout', 'let that sink in', 'bird is freed', 'chief twit', 'x corp'],
    entityName: 'Twitter Acquisition / X Rebrand',
    rolloutDate: '2022-04-14',
    contextAtTime: 'using Twitter solely as a personal broadcast medium while leading Tesla and SpaceX'
  },
  {
    keywords: ['optimus', 'tesla bot', 'humanoid robot'],
    entityName: 'Tesla Bot / Optimus',
    rolloutDate: '2021-08-19',
    contextAtTime: 'building automotive robotic manufacturing lines and computer vision for vehicles'
  },
  {
    keywords: ['tesla bitcoin', 'bought bitcoin', '1.5 billion bitcoin', 'accept bitcoin for cars'],
    entityName: 'Tesla $1.5B Bitcoin Purchase',
    rolloutDate: '2021-02-08',
    contextAtTime: 'holding minimal cryptocurrency personally and focusing on industrial manufacturing'
  },
  {
    keywords: ['cybertruck', 'franz steel ball', 'cold rolled steel truck'],
    entityName: 'Tesla Cybertruck',
    rolloutDate: '2019-11-21',
    contextAtTime: 'scaling Model 3 production and finalizing the Model Y design'
  },
  {
    keywords: ['starlink', 'satellite internet'],
    entityName: 'Starlink Constellation',
    rolloutDate: '2019-05-24',
    contextAtTime: 'relying on commercial launch contracts and government satellite launches'
  },
  {
    keywords: ['falcon heavy starman', 'roadster in space', 'starman orbit'],
    entityName: 'Falcon Heavy Maiden Flight with Starman',
    rolloutDate: '2018-02-06',
    contextAtTime: 'perfecting single-stick Falcon 9 first stage reusability'
  },
  {
    keywords: ['model 3', 'production hell', 'fremont tent'],
    entityName: 'Tesla Model 3 Production Hell',
    rolloutDate: '2017-07-28',
    contextAtTime: 'manufacturing high-end Model S and Model X vehicles in lower volumes'
  },
  {
    keywords: ['boring company', 'boring tunnel', 'hyperloop tunnel'],
    entityName: 'The Boring Company',
    rolloutDate: '2016-12-17',
    contextAtTime: 'frustration with LA surface traffic before purchasing digging equipment'
  },
  {
    keywords: ['neuralink'],
    entityName: 'Neuralink Founding',
    rolloutDate: '2016-07-01',
    contextAtTime: 'exploring biological-digital symbiosis theoretically without an active neurotech venture'
  },
  {
    keywords: ['openai'],
    entityName: 'OpenAI Founding',
    rolloutDate: '2015-12-11',
    contextAtTime: 'raising public awareness about AI safety concerns at university symposiums'
  },
  {
    keywords: ['landed booster', 'landing zone 1', 'first orbital rocket landing'],
    entityName: 'First Successful Falcon 9 Booster Landing',
    rolloutDate: '2015-12-21',
    contextAtTime: 'expending rockets into the ocean and attempting ocean barge landings'
  }
];

export function checkTemporalBoundary(query: string, asOfDate: string): TemporalCheckResult {
  if (!asOfDate) {
    return { isAnachronistic: false };
  }

  const queryLower = query.toLowerCase();
  const asOfTime = new Date(asOfDate).getTime();
  if (isNaN(asOfTime)) {
    return { isAnachronistic: false };
  }

  for (const milestone of HISTORICAL_MILESTONES) {
    const milestoneTime = new Date(milestone.rolloutDate).getTime();
    if (milestoneTime > asOfTime) {
      // Query asks about a future milestone
      const matchesKeyword = milestone.keywords.some(kw => queryLower.includes(kw));
      if (matchesKeyword) {
        const year = asOfDate.split('-')[0];
        const refusal = `Look, as of ${asOfDate} (back in ${year}), ${milestone.entityName} hasn't happened yet—that is still in the future from my current vantage point. ` +
          `Right now, my full bandwidth is consumed by ${milestone.contextAtTime}. ` +
          `If you want my perspective on ${milestone.entityName}, switch the timeline to a date after ${milestone.rolloutDate} or switch to Now mode.`;

        return {
          isAnachronistic: true,
          futureEntity: milestone.entityName,
          entityRolloutDate: milestone.rolloutDate,
          inCharacterRefusal: refusal
        };
      }
    }
  }

  return { isAnachronistic: false };
}
