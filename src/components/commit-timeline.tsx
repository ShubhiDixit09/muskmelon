'use client';
import { useState, useEffect } from 'react';
import { GitCommit, Loader2 } from 'lucide-react';

const COLORS: Record<string, string> = {
  tesla: 'bg-red-500',
  spacex: 'bg-blue-500',
  ai: 'bg-purple-500',
  crypto: 'bg-yellow-500',
  politics: 'bg-orange-500',
  'twitter/x': 'bg-sky-500',
  default: 'bg-[#f3951f]'
};

interface CommitItem {
  id: string;
  timestamp: string;
  topic: string;
  source: string;
  content: string;
}

const DEFAULT_COMMITS: CommitItem[] = [
  { id: 'c-1', timestamp: '2025-01-20', topic: 'politics', source: '@elonmusk on X', content: 'DOGE begins operations. Auditing federal bureaucracy from first principles.' },
  { id: 'c-2', timestamp: '2024-10-13', topic: 'spacex', source: 'SpaceX Broadcast', content: 'Mechazilla has caught the Super Heavy booster back at the launch tower on Flight 5!' },
  { id: 'c-3', timestamp: '2024-10-10', topic: 'tesla', source: 'Tesla We, Robot Event', content: 'Unveiling Cybercab and Robovan: wireless inductive charging, no pedals, no steering wheel.' },
  { id: 'c-4', timestamp: '2024-07-01', topic: 'ai', source: '@elonmusk on X', content: 'xAI Colossus supercluster built in 122 days in Memphis: 100,000 liquid-cooled H100 GPUs.' },
  { id: 'c-5', timestamp: '2024-01-29', topic: 'ai', source: 'Neuralink Update', content: 'First human patient received a Neuralink Telepathy implant and is recovering well.' },
  { id: 'c-6', timestamp: '2023-11-30', topic: 'tesla', source: 'Delivery Event', content: 'First production Cybertruck customer deliveries at Giga Texas.' },
  { id: 'c-7', timestamp: '2023-07-12', topic: 'ai', source: 'xAI Launch', content: 'Announcing xAI: mission is to understand the true nature of the universe.' }
];

export function CommitTimeline() {
  const [commits, setCommits] = useState<CommitItem[]>(DEFAULT_COMMITS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/commits')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.commits) && data.commits.length > 0) {
          setCommits(data.commits.slice(-15).reverse());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-[#1e293b]">
      {commits.map((c) => {
        const topicKey = (c.topic || '').toLowerCase();
        const badgeColor = COLORS[topicKey] || COLORS.default;
        const dateStr = (c.timestamp || '').split('T')[0];

        return (
          <div key={c.id} className="relative group">
            <div className={`absolute -left-[27px] top-2 w-3 h-3 rounded-full ${badgeColor} ring-4 ring-[#0f172a] transition-transform group-hover:scale-125`} />
            <div className="bg-[#090d16] border border-[#1e293b] rounded-xl p-3.5 hover:border-[#f3951f]/50 transition-colors">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#38bdf8]">
                  {c.topic || 'General'} • {c.source || '@elonmusk'}
                </span>
                <span className="text-[10px] font-mono text-[#64748b]">{dateStr}</span>
              </div>
              <p className="text-xs text-[#cbd5e1] leading-relaxed line-clamp-3">
                {c.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
