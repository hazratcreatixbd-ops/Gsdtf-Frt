/**
 * PART 13 — Worker Router
 * Selects the optimal Worker for a task based on capability registry,
 * task type, priority, current workload, and risk level.
 */

import { workerCapabilityRegistry } from './WorkerCapabilityRegistry';
import { WorkerCapability } from './ManagerTypes';

export class WorkerRouter {
  public static selectWorker(taskType: string, priority: string = 'NORMAL'): WorkerCapability | null {
    const candidates = workerCapabilityRegistry.findWorkersForTaskType(taskType);

    if (candidates.length === 0) {
      // Fallback: Check general workers by role keyword
      const all = workerCapabilityRegistry.getAllCapabilities();
      const fallback = all.find((w) => w.role.toLowerCase() === taskType.toLowerCase());
      if (fallback) return fallback;
      return null;
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // Sort candidates by current load (least loaded first), then max concurrent tasks
    return candidates.sort((a, b) => {
      const loadRatioA = a.currentLoad / a.maxConcurrentTasks;
      const loadRatioB = b.currentLoad / b.maxConcurrentTasks;
      return loadRatioA - loadRatioB;
    })[0];
  }
}
