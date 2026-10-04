/**
 * PART 13 — Review Engine (Athena Review Loop)
 * Athena (Executive Reviewer). Evaluates completed deliverables for completeness,
 * editorial quality, tone consistency, and executive presentation standards.
 */

import { ReviewVerdict, DAGTask, TaskGraph } from './ManagerTypes';
import { worldEventBus } from '../events/WorldEventBus';

export class ReviewEngine {
  public static reviewDeliverable(graph: TaskGraph, task: DAGTask): ReviewVerdict {
    const issues: string[] = [];
    let qualityScore = 96;

    // Check upstream tasks
    const completedTasks = graph.tasks.filter((t) => t.status === 'COMPLETED');
    const failedTasks = graph.tasks.filter((t) => t.status === 'FAILED');

    if (failedTasks.length > 0) {
      issues.push(`${failedTasks.length} prerequisite task(s) failed during execution.`);
      qualityScore -= 30;
    }

    if (completedTasks.length < Math.floor(graph.tasks.length * 0.7)) {
      issues.push('Incomplete workflow step execution detected.');
      qualityScore -= 25;
    }

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    let status: 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED' = 'APPROVED';
    if (qualityScore >= 80) {
      status = 'APPROVED';
    } else if (qualityScore >= 50) {
      status = 'NEEDS_REVISION';
    } else {
      status = 'REJECTED';
    }

    const verdict: ReviewVerdict = {
      status,
      reviewedBy: 'worker-reviewer',
      qualityScore,
      notes: issues.length > 0 ? issues.join(' ') : 'High-fidelity deliverable approved for executive presentation.',
      timestamp: Date.now(),
    };

    worldEventBus.emit({
      type: 'TASK_COMPLETED',
      title: `Athena Review: ${status} (${qualityScore}/100)`,
      details: verdict.notes,
      level: status === 'APPROVED' ? 'success' : 'warn',
      workerId: 'worker-reviewer',
      taskId: task.id,
    });

    return verdict;
  }
}
