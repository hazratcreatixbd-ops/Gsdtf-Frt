/**
 * PART 9 — FRIDAY Agent Worker Router
 * Central registry and task dispatcher for all 10 specialized workers.
 * Matches tasks based on capability, workerType, and natural language heuristics.
 */

import { AgentWorker, AgentTask, WorkerStatusInfo } from './AgentTypes';
import { ResearchWorker } from './workers/ResearchWorker';
import { BusinessIntelligenceWorker } from './workers/BusinessIntelligenceWorker';
import { ContentWorker } from './workers/ContentWorker';
import { LinkedInWorker } from './workers/LinkedInWorker';
import { SocialMediaWorker } from './workers/SocialMediaWorker';
import { EngagementWorker } from './workers/EngagementWorker';
import { AnalyticsWorker } from './workers/AnalyticsWorker';
import { PublishingWorker } from './workers/PublishingWorker';
import { MediaWorker } from './workers/MediaWorker';
import { VerificationWorker } from './workers/VerificationWorker';

export class AgentWorkerRouter {
  private static instance: AgentWorkerRouter;
  private workers: Map<string, AgentWorker> = new Map();
  private metrics: Map<string, { completed: number; failed: number }> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): AgentWorkerRouter {
    if (!AgentWorkerRouter.instance) {
      AgentWorkerRouter.instance = new AgentWorkerRouter();
    }
    return AgentWorkerRouter.instance;
  }

  private registerDefaults(): void {
    const list: AgentWorker[] = [
      new ResearchWorker(),
      new BusinessIntelligenceWorker(),
      new ContentWorker(),
      new LinkedInWorker(),
      new SocialMediaWorker(),
      new EngagementWorker(),
      new AnalyticsWorker(),
      new PublishingWorker(),
      new MediaWorker(),
      new VerificationWorker(),
    ];

    list.forEach((w) => this.registerWorker(w));
  }

  public registerWorker(worker: AgentWorker): void {
    this.workers.set(worker.id, worker);
    if (!this.metrics.has(worker.id)) {
      this.metrics.set(worker.id, { completed: 0, failed: 0 });
    }
  }

  public getWorker(workerId: string): AgentWorker | undefined {
    return this.workers.get(workerId);
  }

  public getAllWorkers(): AgentWorker[] {
    return Array.from(this.workers.values());
  }

  public findWorkerForTask(task: AgentTask): AgentWorker | undefined {
    const rawType = (task.workerType || '').toLowerCase().trim();
    const normalizedType = rawType.replace(/-/g, '_');

    // 1. Direct match by exact worker ID
    const byId = this.workers.get(task.workerType);
    if (byId) {
      return byId;
    }

    // 2. Direct match by normalized ID
    for (const [id, worker] of this.workers.entries()) {
      if (id.toLowerCase().replace(/-/g, '_') === normalizedType) {
        return worker;
      }
    }

    // 3. Delegate canHandle inspection
    for (const worker of this.workers.values()) {
      if (worker.canHandle(task)) {
        return worker;
      }
    }

    // 4. Prefix or base name match (e.g. 'linkedin' -> 'linkedin-worker', 'content' -> 'content-worker')
    for (const worker of this.workers.values()) {
      const baseName = worker.id.replace('-worker', '').replace(/_/g, '');
      const cleanType = normalizedType.replace('_worker', '').replace(/_/g, '');
      if (baseName === cleanType || cleanType.includes(baseName) || baseName.includes(cleanType)) {
        return worker;
      }
    }

    // 5. Heuristic fallback based on capabilities or title
    for (const worker of this.workers.values()) {
      if (
        worker.capabilities.some(
          (c) => rawType.includes(c) || c.includes(rawType) || (task.title && task.title.toLowerCase().includes(c))
        )
      ) {
        return worker;
      }
    }

    return undefined;
  }

  public recordTaskCompletion(workerId: string, success: boolean): void {
    const stat = this.metrics.get(workerId) || { completed: 0, failed: 0 };
    if (success) {
      stat.completed += 1;
    } else {
      stat.failed += 1;
    }
    this.metrics.set(workerId, stat);
  }

  public getWorkersStatus(): WorkerStatusInfo[] {
    return Array.from(this.workers.values()).map((w) => {
      const stat = this.metrics.get(w.id) || { completed: 0, failed: 0 };
      return {
        id: w.id,
        name: w.name,
        description: w.description,
        status: w.getStatus(),
        capabilities: w.capabilities,
        tasksCompleted: stat.completed,
        tasksFailed: stat.failed,
      };
    });
  }
}

export const agentWorkerRouter = AgentWorkerRouter.getInstance();
