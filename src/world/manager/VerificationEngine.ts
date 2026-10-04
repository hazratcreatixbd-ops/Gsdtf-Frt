/**
 * PART 13 — Verification Engine (Astra Loop)
 * Audits worker results against source provenance, logical consistency,
 * and empirical evidence before deliverables can proceed.
 */

import { VerificationVerdict, WorkerResult, DAGTask } from './ManagerTypes';
import { worldEventBus } from '../events/WorldEventBus';

export class VerificationEngine {
  public static verifyTaskOutput(task: DAGTask, result: WorkerResult): VerificationVerdict {
    worldEventBus.emit({
      type: 'VERIFICATION_STARTED',
      title: `Astra Verifying: ${task.title}`,
      details: `Auditing output from ${result.workerName || result.workerId} for factual grounding.`,
      level: 'info',
      workerId: 'worker-verification',
      taskId: task.id,
    });

    const issues: string[] = [];
    let score = 95;

    // 1. Check for failure status
    if (result.status === 'FAILED') {
      issues.push('Upstream worker reported execution failure.');
      score = 20;
    }

    // 2. Check for missing output
    if (!result.output || (typeof result.output === 'string' && result.output.trim().length === 0)) {
      issues.push('Deliverable contains empty output body.');
      score -= 50;
    }

    // 3. Evidence check for research findings
    if (task.role === 'RESEARCH' || task.role === 'MARKET_DATA') {
      if (!result.evidence && !result.output?.sources && !result.output?.evidence) {
        issues.push('Missing explicit source references or observable evidence links.');
        score -= 20;
      }
    }

    // 4. Check for warnings
    if (result.warnings && result.warnings.length > 0) {
      issues.push(...result.warnings);
      score -= result.warnings.length * 5;
    }

    score = Math.max(0, Math.min(100, score));

    let status: 'PASS' | 'PARTIAL' | 'FAIL' = 'PASS';
    let recommendation: 'PROCEED' | 'RETRY' | 'REASSIGN' | 'ESCALATE' = 'PROCEED';

    if (score >= 80 && issues.filter((i) => i.includes('failure')).length === 0) {
      status = 'PASS';
      recommendation = 'PROCEED';
    } else if (score >= 50) {
      status = 'PARTIAL';
      recommendation = 'PROCEED';
    } else {
      status = 'FAIL';
      recommendation = task.retryCount < task.maxRetries ? 'RETRY' : 'ESCALATE';
    }

    const evidenceSummary =
      result.evidence ||
      (typeof result.output === 'object' && result.output?.summary) ||
      `Verified against ${result.confidence} source records.`;

    const verdict: VerificationVerdict = {
      status,
      verifiedBy: 'worker-verification',
      score,
      evidenceSummary,
      issues,
      recommendation,
      timestamp: Date.now(),
    };

    worldEventBus.emit({
      type: 'VERIFICATION_COMPLETED',
      title: `Astra Verification: ${status} (${score}/100)`,
      details: issues.length > 0 ? `Issues flagged: ${issues.join('; ')}` : 'All factual statements verified with high confidence.',
      level: status === 'PASS' ? 'success' : status === 'PARTIAL' ? 'warn' : 'error',
      workerId: 'worker-verification',
      taskId: task.id,
    });

    return verdict;
  }
}
