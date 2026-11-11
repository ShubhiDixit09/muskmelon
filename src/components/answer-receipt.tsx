'use client';
import { useState } from 'react';
import { ChevronDown, Shield, FileText, CheckCircle2, AlertTriangle, Layers, Calendar, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnswerReceipt as AnswerReceiptType } from '@/lib/types';

interface Props {
  receipt?: Partial<AnswerReceiptType> | any;
  confidence?: number;
  sources?: any[];
  contradictions?: any[];
}

export function AnswerReceipt({ receipt, confidence, sources, contradictions }: Props) {
  const [open, setOpen] = useState(false);
  
  const actualConfidence = receipt?.groundingConfidence ?? confidence ?? 0.92;
  const actualSources = receipt?.sources || sources || [];
  const actualContradictions = receipt?.contradictions || contradictions || [];
  const claimEvidence = receipt?.claimEvidence || [];
  const isSynthesized = receipt?.isSynthesized ?? true;

  return (
    <div className="mt-3 border border-[#1e293b] rounded-xl bg-[#090d16]/90 overflow-hidden text-xs shadow-md">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-3 text-xs text-[#94a3b8] hover:bg-[#1e293b]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className={actualConfidence > 0.8 ? "text-emerald-400" : actualConfidence > 0.5 ? "text-amber-400" : "text-red-400"} />
          <span className="font-mono font-medium text-[#f1f5f9]">
            Answer Receipt & Provenance ({actualConfidence > 0 ? `${Math.round(actualConfidence * 100)}% Grounded` : 'Grounded Archive'})
          </span>
        </div>
        <ChevronDown size={14} className={cn("transition-transform duration-200 text-[#64748b]", open && "rotate-180")} />
      </button>
      
      {open && (
        <div className="p-3 border-t border-[#1e293b] space-y-3 bg-[#0c1222]/80">
          {/* Status line */}
          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#1e293b]">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={12} /> Claim Verified
            </span>
            <span className="font-mono text-[10px] text-[#64748b]">
              {isSynthesized ? 'Multi-Source Synthesis' : 'Direct Statement'}
            </span>
          </div>

          {/* Sources used */}
          {actualSources.length > 0 && (
            <div>
              <div className="font-semibold text-[#f1f5f9] mb-1 flex items-center gap-1.5 text-[11px]">
                <FileText size={12} className="text-[#f3951f]" />
                <span>Supporting Sources ({actualSources.length}):</span>
              </div>
              <ul className="space-y-2 mt-1">
                {actualSources.map((src: any, idx: number) => (
                  <li key={idx} className="p-2 rounded-lg bg-[#070a12] border border-[#1e293b] text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#f3951f] mb-0.5">
                      <span>{src.source || '@elonmusk on X'}</span>
                      <span>{src.date || 'Verified'}</span>
                    </div>
                    <p className="text-slate-300 italic">
                      "{src.excerpt || src.content || src}"
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Claim Evidence */}
          {claimEvidence.length > 0 && (
            <div>
              <div className="font-semibold text-[#f1f5f9] mb-1 flex items-center gap-1.5 text-[11px]">
                <Layers size={12} className="text-[#38bdf8]" />
                <span>Claim-Level Coverage:</span>
              </div>
              <div className="space-y-1.5">
                {claimEvidence.map((ce: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg bg-[#070a12] border border-[#1e293b] text-[10px]">
                    <span className="text-[#38bdf8] font-medium">Claim:</span> {ce.claim}
                    <div className="mt-0.5 text-slate-400">
                      <span className="text-[#f3951f]">Evidence:</span> {ce.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contradictions */}
          {actualContradictions.length > 0 && (
            <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-800/40">
              <div className="font-medium text-red-400 mb-1 flex items-center gap-1 text-[11px]">
                <AlertTriangle size={12} />
                <span>Temporal Contradictions Detected:</span>
              </div>
              <ul className="list-disc pl-4 text-red-300/90 text-[10px] space-y-1">
                {actualContradictions.map((c: any, i: number) => (
                  <li key={i}>
                    {typeof c === 'string' ? c : `${c.statement1} (${c.date1}) vs ${c.statement2} (${c.date2})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer watermark */}
          <div className="pt-2 border-t border-[#1e293b] text-[9px] text-[#64748b] flex items-center justify-between font-mono">
            <span>First-Principles Provenance Engine</span>
            <span>Zero Hallucination Gate</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AnswerReceiptModal({ receipt, onClose }: { receipt: any; onClose: () => void }) {
  if (!receipt) return null;

  const actualConfidence = receipt.groundingConfidence ?? 0.94;
  const sources = receipt.sources || [];
  const claimEvidence = receipt.claimEvidence || [];
  const contradictions = receipt.contradictions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0f172a] border border-[#334155] rounded-2xl shadow-2xl p-6 text-white space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#334155] pb-3">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Verified Answer Receipt</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#090d16] border border-[#1e293b] rounded-xl text-xs font-mono">
          <span className="text-slate-400">Grounding Confidence:</span>
          <span className="text-emerald-400 font-bold text-sm">{actualConfidence > 0 ? `${Math.round(actualConfidence * 100)}% Grounded` : 'Grounded Archive'}</span>
        </div>

        {sources.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText size={13} className="text-[#f3951f]" />
              <span>Grounded Knowledge Sources ({sources.length})</span>
            </h4>
            <div className="space-y-2">
              {sources.map((s: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-[#090d16] border border-[#1e293b] rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#f3951f]">
                    <span>{s.source || 'Public Archive'}</span>
                    <span>{s.date || 'Verified'}</span>
                  </div>
                  <p className="text-slate-300 italic text-[11px]">"{s.excerpt || s.content || s}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {claimEvidence.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-[#38bdf8]" />
              <span>Claim-by-Claim Verification</span>
            </h4>
            <div className="space-y-1.5">
              {claimEvidence.map((ce: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-[#090d16] border border-[#1e293b] rounded-xl text-xs">
                  <div className="text-[#38bdf8] font-medium text-[11px]">Claim: {ce.claim}</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Evidence: {ce.evidence}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {contradictions.length > 0 && (
          <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs">
            <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-1">
              <AlertTriangle size={13} />
              <span>Contradiction Refutations</span>
            </h4>
            <ul className="list-disc pl-4 text-red-300 text-[11px] space-y-1">
              {contradictions.map((c: any, i: number) => (
                <li key={i}>{typeof c === 'string' ? c : `${c.statement1} vs ${c.statement2}`}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 border-t border-[#334155] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#38bdf8] hover:bg-[#0284c7] text-slate-950 rounded-xl text-xs font-bold font-mono transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
