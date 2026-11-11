'use client';
import { useState } from 'react';
import { UploadZone } from '@/components/upload-zone';
import { CommitTimeline } from '@/components/commit-timeline';
import { Shield, Database, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 md:p-10 font-sans text-[#f1f5f9]">
      <header className="mb-8 flex items-center justify-between border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl bg-[#1e293b] hover:bg-[#273549] text-slate-300 hover:text-white border border-[#334155] transition-colors"
            title="Back to Twin"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#f1f5f9]">MindCommit Admin & Ingestion</h1>
            <p className="text-xs text-[#94a3b8]">Manage Knowledge Commits, Datasets & Guardrails</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-[#1e293b] border border-[#334155] rounded-xl text-xs text-[#38bdf8] flex items-center gap-1.5 font-mono">
            <Database size={13} className="text-emerald-400" />
            <span>Kaggle Dataset (2010–2025)</span>
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Upload Data Section */}
          <section className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-base font-semibold text-[#f1f5f9] mb-3 flex items-center gap-2">
              <span>Ingest Knowledge Dataset</span>
            </h2>
            <p className="text-xs text-[#94a3b8] mb-4">
              Upload the Kaggle Elon Musk tweets CSV or approved documents to parse, timestamp, chunk, and create Knowledge Commits.
            </p>
            <UploadZone onIngestSuccess={() => setRefreshTrigger(prev => prev + 1)} />
          </section>

          {/* Cognitive Signature Info */}
          <section className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-base font-semibold text-[#f1f5f9] mb-4">Cognitive Signature (Elon Musk)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#090d16] border border-[#1e293b] rounded-xl">
                <div className="text-xs text-[#94a3b8] mb-1 font-mono uppercase">Communication Style</div>
                <div className="text-xs text-[#cbd5e1] leading-relaxed">Direct, bold, physics-based reasoning, memes & humor, technical clarity.</div>
              </div>
              <div className="p-4 bg-[#090d16] border border-[#1e293b] rounded-xl">
                <div className="text-xs text-[#94a3b8] mb-1 font-mono uppercase">Core Knowledge Domains</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Tesla', 'SpaceX', 'Starship', 'Neuralink', 'xAI', 'Grok', 'Mars', 'Crypto', 'DOGE', 'Optimus'].map(t => (
                    <span key={t} className="px-2 py-0.5 bg-[#1e293b] border border-[#334155] rounded-md text-[11px] text-[#38bdf8] font-mono">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Active Guardrails & Verification Layers */}
          <section className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#f1f5f9]">Active Guardrails & Verification Layers</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                4 Active Guardrails
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: 'Temporal Horizon Guardrail', id: 'Enforces historical limits in Time-Lens mode; prevents future anachronisms', status: 'Enforced' },
                { name: 'Trap-Question & Premise Defense', id: 'Detects false premises, leading questions, and prompt injection attempts', status: 'Active' },
                { name: 'Honest Absence Gate', id: 'Prevents hallucination on unverified private trivia or out-of-dataset queries', status: 'Active' },
                { name: 'Claim-to-Evidence Answer Receipt', id: 'Mathematical grounding confidence & claim verification mapping', status: 'Verified' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#090d16] border border-[#1e293b] rounded-xl text-xs">
                  <div className="flex items-center gap-2.5">
                    <Shield size={14} className="text-[#38bdf8]" />
                    <div>
                      <div className="text-[#f1f5f9] font-medium">{item.name}</div>
                      <div className="text-[10px] font-mono text-[#64748b]">{item.id}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 size={10} /> {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar: Consent Ledger & Timeline */}
        <div className="space-y-8">
          <section className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-base font-semibold text-[#f1f5f9] mb-3">Consent Ledger</h2>
            <div className="p-4 bg-[#090d16] border border-[#1e293b] rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-emerald-400" />
                <span className="text-xs font-semibold text-[#f1f5f9]">Public Provenance Ledger</span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Knowledge commits are strictly bounded by authorized public statements, Kaggle tweet archives (2010–2025), and SEC regulatory filings.
              </p>
            </div>
          </section>

          <section className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl p-6 h-[480px] overflow-hidden flex flex-col backdrop-blur-md">
            <h2 className="text-base font-semibold text-[#f1f5f9] mb-3">Knowledge Commit Timeline</h2>
            <div className="flex-1 overflow-y-auto pr-2">
              <CommitTimeline refreshTrigger={refreshTrigger} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
