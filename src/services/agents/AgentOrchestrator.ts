/**
 * PART 9 — FRIDAY Agent & Worker Orchestration System
 * Master Orchestrator:
 * Acts as FRIDAY's central AI coordinator. Decomposes business goals, routes
 * tasks to specialized workers, coordinates DAG queue execution, enforces approval checkpoints,
 * preserves state in AgentMemory, and generates voice summaries.
 */

import { WorkflowPlan, WorkerStatusInfo, AgentTask } from './AgentTypes';
import { agentTaskPlanner, AgentTaskPlanner } from './AgentTaskPlanner';
import { agentWorkerRouter, AgentWorkerRouter } from './AgentWorkerRouter';
import { AgentExecutionQueue } from './AgentExecutionQueue';
import { agentMemory, AgentMemory } from './AgentMemory';
import { agentEventBus, AgentEventBus } from './AgentEventBus';

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private queue: AgentExecutionQueue;
  private planner: AgentTaskPlanner;
  private router: AgentWorkerRouter;
  private memory: AgentMemory;
  private bus: AgentEventBus;

  private constructor() {
    this.queue = new AgentExecutionQueue();
    this.planner = agentTaskPlanner;
    this.router = agentWorkerRouter;
    this.memory = agentMemory;
    this.bus = agentEventBus;
  }

  public static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  public async orchestrateGoal(
    goal: string,
    options?: { customTasks?: Partial<AgentTask>[] }
  ): Promise<WorkflowPlan> {
    // 1. Goal Analyzer & Decomposition
    const plan = this.planner.planGoal(goal, options);

    // 2. Start DAG Execution Queue
    const executedPlan = await this.queue.startWorkflow(plan);
    return executedPlan;
  }

  public pauseWorkflow(): boolean {
    return this.queue.pause();
  }

  public async resumeWorkflow(): Promise<boolean> {
    return await this.queue.resume();
  }

  public cancelWorkflow(): boolean {
    return this.queue.cancel();
  }

  public async approveTask(taskId: string, approved: boolean): Promise<boolean> {
    return await this.queue.approveTask(taskId, approved);
  }

  public getActiveWorkflow(): WorkflowPlan | null {
    return this.queue.getActivePlan();
  }

  public getWorkflowHistory(): WorkflowPlan[] {
    return this.memory.getWorkflowHistory();
  }

  public getWorkersStatus(): WorkerStatusInfo[] {
    return this.router.getWorkersStatus();
  }

  public subscribe(listener: (workflow: WorkflowPlan | null) => void): () => void {
    const handler = (plan: WorkflowPlan) => listener(plan);
    const unsubs = [
      this.bus.on('workflow:started', handler),
      this.bus.on('workflow:updated', handler),
      this.bus.on('workflow:paused', handler),
      this.bus.on('workflow:resumed', handler),
      this.bus.on('workflow:completed', handler),
      this.bus.on('workflow:failed', handler),
      this.bus.on('workflow:cancelled', handler),
      this.bus.on('task:started', () => listener(this.getActiveWorkflow())),
      this.bus.on('task:completed', () => listener(this.getActiveWorkflow())),
      this.bus.on('task:failed', () => listener(this.getActiveWorkflow())),
      this.bus.on('task:waiting_approval', () => listener(this.getActiveWorkflow())),
    ];

    listener(this.getActiveWorkflow());

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }

  /**
   * Generates a concise spoken summary for FRIDAY's Gemini Live voice response
   */
  public generateVoiceSummary(workflow: WorkflowPlan): string {
    const total = workflow.tasks.length;
    const completed = workflow.tasks.filter((t) => t.status === 'completed').length;
    const waiting = workflow.tasks.filter((t) => t.status === 'waiting_for_approval').length;
    const failed = workflow.tasks.filter((t) => t.status === 'failed').length;

    if (workflow.status === 'completed') {
      return `All ${total} orchestrated tasks completed successfully. Market research, strategic roadmap, content drafting, platform adaptation, and quality audits are verified. What would you like to review first?`;
    }

    if (workflow.status === 'waiting_for_approval') {
      const pendingTask = workflow.tasks.find((t) => t.status === 'waiting_for_approval');
      return `I have completed ${completed} out of ${total} tasks. The next action "${pendingTask?.title || 'External Publishing'}" is ready and waiting for your explicit approval before execution.`;
    }

    if (workflow.status === 'failed') {
      return `Workflow paused. Completed ${completed} tasks, but ${failed} task encountered an issue. Would you like me to retry or adjust the parameters?`;
    }

    return `Workflow is currently in progress. ${completed} of ${total} tasks finished.`;
  }
}

export const agentOrchestrator = AgentOrchestrator.getInstance();
