'use client';
import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadStats {
  filesProcessed: number;
  commitsCreated: number;
  chunksIndexed: number;
  totalCommits: number;
  topicsDetected: string[];
  topicCounts?: Record<string, number>;
}

interface UploadZoneProps {
  onIngestSuccess?: (stats: UploadStats) => void;
}

export function UploadZone({ onIngestSuccess }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; stats?: UploadStats } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    setFiles(selectedFiles);
    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('sourceType', selectedFiles.some(f => f.name.endsWith('.csv')) ? 'tweet' : 'document');

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to ingest file(s)');
      }

      const result = {
        success: true,
        message: `Successfully processed ${data.stats.filesProcessed} file(s): created ${data.stats.commitsCreated} commits and indexed ${data.stats.chunksIndexed || data.stats.commitsCreated} chunks into RAG.`,
        stats: data.stats
      };

      setUploadResult(result);
      if (onIngestSuccess && data.stats) {
        onIngestSuccess(data.stats);
      }
    } catch (err: unknown) {
      setUploadResult({
        success: false,
        message: err instanceof Error ? err.message : 'Upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  }, [onIngestSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [processFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      processFiles(selected);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.json,.txt,.md"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer",
          isDragging ? "border-[#f3951f] bg-[#f3951f]/10" : "border-[#1e293b] bg-[#0c1222] hover:border-[#f3951f]/60 hover:bg-[#111827]"
        )}
      >
        <Upload className="mx-auto mb-3 text-[#f3951f]" size={32} />
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">
          {isUploading ? 'Ingesting & Indexing Knowledge...' : 'Click to Browse or Drop Dataset Files'}
        </h3>
        <p className="text-xs text-[#94a3b8]">
          Supports Kaggle tweets (.csv), landmark quotes (.json), or text archives (.txt, .md)
        </p>
      </div>

      {isUploading && (
        <div className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs text-[#38bdf8]">
          <Loader2 className="animate-spin" size={14} />
          <span>Parsing records, extracting topics, and synchronizing RAG vectors...</span>
        </div>
      )}

      {uploadResult && (
        <div className={cn(
          "mt-4 p-4 rounded-xl border text-xs leading-relaxed",
          uploadResult.success
            ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
            : "bg-red-950/40 border-red-800 text-red-300"
        )}>
          <div className="flex items-center gap-2 font-medium mb-1">
            {uploadResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{uploadResult.success ? 'Knowledge Ingestion Complete' : 'Ingestion Error'}</span>
          </div>
          <p>{uploadResult.message}</p>
          {uploadResult.stats && uploadResult.stats.topicsDetected?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-emerald-800/40">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">Topics Indexed:</span>
              {uploadResult.stats.topicsDetected.map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-[10px] text-emerald-200">
                  {t} ({uploadResult.stats?.topicCounts?.[t] || 1})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {files.length > 0 && !isUploading && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 bg-[#090d16] border border-[#1e293b] rounded-xl text-xs">
              <FileText size={14} className={f.name.endsWith('.csv') ? "text-emerald-400" : "text-[#f3951f]"} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#f1f5f9] truncate">{f.name}</div>
                <div className="text-[10px] text-[#64748b]">{(f.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
