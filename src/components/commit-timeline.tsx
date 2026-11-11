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

interface CommitTimelineProps {
  refreshTrigger?: number;
}

export function CommitTimeline({ refreshTrigger = 0 }: CommitTimelineProps) {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/commits')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.commits) && data.commits.length > 0) {
          setCommits(data.commits.slice(0, 30));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading && commits.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-[#64748b] gap-2">
        <Loader2 className="animate-spin" size={14} />
        <span>Loading knowledge timeline...</span>
      </div>
    );
  }

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
