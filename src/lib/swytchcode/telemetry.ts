// src/lib/swytchcode/telemetry.ts
// Execution audit trail — records every Swytchcode tool execution
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const IS_SERVERLESS = Boolean(process.env.VERCEL);
const DATA_DIR = path.join(process.cwd(), '.data');
const AUDIT_PATH = path.join(DATA_DIR, 'swytchcode-audit.json');

if (!IS_SERVERLESS && !existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  toolName: string;
  input: Record<string, unknown>;
  policyResult: {
    allowed: boolean;
    action: string;
    ruleId?: string;
    message?: string;
  };
  execution: {
    success: boolean;
    durationMs: number;
    retryCount: number;
    error?: string;
    idempotencyKey?: string;
  };
}

export interface AuditStats {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  policyBlocks: number;
  avgDurationMs: number;
  toolBreakdown: Record<string, { total: number; success: number; failed: number }>;
  recentExecutions: AuditEntry[];
}

async function loadAuditLog(): Promise<AuditEntry[]> {
  // Vercel functions have a read-only code filesystem and no durable local storage.
  if (IS_SERVERLESS) return [];
  try {
    if (!existsSync(AUDIT_PATH)) return [];
    const data = await fs.readFile(AUDIT_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveAuditLog(entries: AuditEntry[]): Promise<void> {
  // Keep last 1000 entries to prevent unbounded growth
  const trimmed = entries.slice(-1000);
  await fs.writeFile(AUDIT_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
}

/** Record a tool execution in the audit trail */
export async function recordExecution(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
  const fullEntry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry
  };

  if (IS_SERVERLESS) {
    // Structured platform logs replace file writes in serverless deployments.
    // Exclude the input payload so prompts, PII, and tokens are never logged.
    console.info('[swytchcode:audit]', JSON.stringify({
      id: fullEntry.id,
      timestamp: fullEntry.timestamp,
      toolName: fullEntry.toolName,
      allowed: fullEntry.policyResult.allowed,
      action: fullEntry.policyResult.action,
      success: fullEntry.execution.success,
      durationMs: fullEntry.execution.durationMs,
      retryCount: fullEntry.execution.retryCount
    }));
    return fullEntry;
  }

  const log = await loadAuditLog();
  log.push(fullEntry);
  await saveAuditLog(log);

  return fullEntry;
}

/** Get the full audit log, optionally filtered */
export async function getAuditLog(filters?: {
  toolName?: string;
  since?: string;
  status?: 'success' | 'failure';
  limit?: number;
}): Promise<AuditEntry[]> {
  let log = await loadAuditLog();

  if (filters?.toolName) {
    log = log.filter(e => e.toolName === filters!.toolName || e.toolName.startsWith(filters!.toolName!));
  }
  if (filters?.since) {
    const sinceTime = new Date(filters.since).getTime();
    log = log.filter(e => new Date(e.timestamp).getTime() >= sinceTime);
  }
  if (filters?.status) {
    log = log.filter(e => filters.status === 'success' ? e.execution.success : !e.execution.success);
  }

  // Most recent first
  log.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    log = log.slice(0, filters.limit);
  }

  return log;
}

/** Get aggregated audit statistics */
export async function getAuditStats(): Promise<AuditStats> {
  const log = await loadAuditLog();

  const successCount = log.filter(e => e.execution.success).length;
  const failureCount = log.filter(e => !e.execution.success).length;
  const policyBlocks = log.filter(e => !e.policyResult.allowed).length;
  const totalDuration = log.reduce((sum, e) => sum + e.execution.durationMs, 0);

  const toolBreakdown: Record<string, { total: number; success: number; failed: number }> = {};
  for (const entry of log) {
    const key = entry.toolName.split('.')[0]; // Group by integration
    if (!toolBreakdown[key]) toolBreakdown[key] = { total: 0, success: 0, failed: 0 };
    toolBreakdown[key].total++;
    if (entry.execution.success) toolBreakdown[key].success++;
    else toolBreakdown[key].failed++;
  }

  return {
    totalExecutions: log.length,
    successCount,
    failureCount,
    policyBlocks,
    avgDurationMs: log.length > 0 ? Math.round(totalDuration / log.length) : 0,
    toolBreakdown,
    recentExecutions: log.slice(-10).reverse()
  };
}
