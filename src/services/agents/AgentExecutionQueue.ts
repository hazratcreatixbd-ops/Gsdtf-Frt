/**
 * PART 9 — FRIDAY Agent Execution Queue
 * Dynamic DAG Executor:
 * Resolves task dependency graphs, executes independent tasks in parallel,
 * manages human approval checkpoints, retries with backoff, enforces timeouts,
 * and supports pause/resume/cancellation controls.
 */

import { WorkflowPlan, AgentTask, WorkerExecutionResult, ExecutionLogEntry } from './AgentTypes';
import { agentWorkerRouter } from './AgentWorkerRouter';
import { agentEventBus } from './AgentEventBus';
import { AgentContextImpl } from './AgentContext';
import { agentMemory } from './AgentMemory';

export class AgentExecutionQueue {
  private activePlan: WorkflowPlan | null = null;
  private outputs: Map<string, any> = new Map();
  private isPausedState = false;
  private isCancelledState = false;
  private runningPromises: Map<string, Promise<void>> = new Map();

  constructor() {}

  public getActivePlan(): WorkflowPlan | null {
    return this.activePlan;
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public isCancelled(): boolean {
    return this.isCancelledState;
  }

  public async startWorkflow(plan: WorkflowPlan): Promise<WorkflowPlan> {
    this.activePlan = plan;
    this.outputs.clear();
    this.isPausedState = false;
    this.isCancelledState = false;

    plan.status = 'running';
    plan.updatedAt = Date.now();
    this.log(plan, `Workflow started: ${plan.goal}`, 'info');
    agentEventBus.emit('workflow:started', plan);

    await this.processQueue();
    return this.activePlan!;
  }

  public pause(): boolean {
    if (!this.activePlan || this.activePlan.status !== 'running') {
      return false;
    }
    this.isPausedState = true;
    this.activePlan.status = 'paused';
    this.activePlan.updatedAt = Date.now();
    this.log(this.activePlan, 'Workflow execution paused by user.', 'info');
    agentEventBus.emit('workflow:paused', this.activePlan);
    return true;
  }

  public async resume(): Promise<boolean> {
    if (!this.activePlan || this.activePlan.status !== 'paused') {
      return false;
    }
    this.isPausedState = false;
    this.activePlan.status = 'running';
    this.activePlan.updatedAt = Date.now();
    this.log(this.activePlan, 'Workflow execution resumed.', 'info');
    agentEventBus.emit('workflow:resumed', this.activePlan);
    await this.processQueue();
    return true;
  }

  public cancel(): boolean {
    if (!this.activePlan) return false;
    this.isCancelledState = true;
    this.activePlan.status = 'cancelled';
    this.activePlan.updatedAt = Date.now();
    this.log(this.activePlan, 'Workflow execution cancelled by user.', 'warn');
    agentEventBus.emit('workflow:cancelled', this.activePlan);
    agentMemory.saveWorkflow(this.activePlan);
    return true;
  }

  public async approveTask(taskId: string, approved: boolean): Promise<boolean> {
    if (!this.activePlan) return false;
    const task = this.activePlan.tasks.find((t) => t.id === taskId);
    if (!task || task.status !== 'waiting_for_approval') return false;

    if (!task.approvalDetails) {
      task.approvalDetails = { action: task.title, summary: 'Human approval' };
    }
    task.approvalDetails.approved = approved;
    task.approvalDetails.reviewedAt = Date.now();
    task.approvalDetails.reviewedBy = 'User';

    if (approved) {
      task.status = 'pending';
      this.log(this.activePlan, `Task "${task.title}" approved by user. Resuming.`, 'info', task.id);
      agentEventBus.emit('task:approved', { workflowId: this.activePlan.id, task });
    } else {
      task.status = 'cancelled';
      this.log(this.activePlan, `Task "${task.title}" rejected by user.`, 'warn', task.id);
    }

    // If workflow was waiting, set back to running
    if (this.activePlan.status === 'waiting_for_approval') {
      this.activePlan.status = 'running';
    }

    await this.processQueue();
    return true;
  }

  private async processQueue(): Promise<void> {
    const plan = this.activePlan;
    if (!plan) return;

    while (plan.status === 'running' && !this.isPausedState && !this.isCancelledState) {
      // Find all tasks that are pending and whose dependencies are ALL completed
      const readyTasks = plan.tasks.filter((t) => {
        if (t.status !== 'pending') return false;
        return t.dependencies.every((depId) => {
          const dep = plan.tasks.find((task) => task.id === depId);
          return dep && dep.status === 'completed';
        });
      });

      // Check if any task is waiting for approval
      const waitingApprovalTask = plan.tasks.find((t) => t.status === 'waiting_for_approval');
      if (waitingApprovalTask) {
        plan.status = 'waiting_for_approval';
        plan.updatedAt = Date.now();
        this.updateProgress(plan);
        agentEventBus.emitTaskWaitingApproval(plan.id, waitingApprovalTask);
        agentEventBus.emit('workflow:updated', plan);
        return;
      }

      // If no tasks ready and none running, check completion
      if (readyTasks.length === 0 && this.runningPromises.size === 0) {
        const anyFailed = plan.tasks.some((t) => t.status === 'failed');
        const allCompleted = plan.tasks.every((t) => t.status === 'completed');

        if (allCompleted) {
          plan.status = 'completed';
          plan.completedAt = Date.now();
          this.log(plan, 'All workflow tasks successfully executed and verified.', 'info');
          agentEventBus.emit('workflow:completed', plan);
        } else if (anyFailed) {
          plan.status = 'failed';
          this.log(plan, 'Workflow halted due to task failures.', 'error');
          agentEventBus.emit('workflow:failed', plan);
        }

        this.updateProgress(plan);
        agentMemory.saveWorkflow(plan);
        return;
      }

      if (readyTasks.length === 0 && this.runningPromises.size > 0) {
        // Wait for one of the currently running tasks to finish
        await Promise.race(Array.from(this.runningPromises.values()));
        continue;
      }

      // Execute ready tasks in parallel (max 3 concurrent)
      const tasksToRun = readyTasks.slice(0, 3 - this.runningPromises.size);
      if (tasksToRun.length === 0) {
        await Promise.race(Array.from(this.runningPromises.values()));
        continue;
      }

      for (const task of tasksToRun) {
        // Check if this task requires approval before execution
        if (task.requiresApproval && !task.approvalDetails?.approved) {
          task.status = 'waiting_for_approval';
          plan.status = 'waiting_for_approval';
          plan.currentTaskId = task.id;
          plan.updatedAt = Date.now();
          this.log(plan, `Task "${task.title}" requires user approval before execution.`, 'warn', task.id);
          this.updateProgress(plan);
          agentEventBus.emitTaskWaitingApproval(plan.id, task);
          agentEventBus.emit('workflow:updated', plan);
          return;
        }

        const taskPromise = this.executeSingleTask(task, plan).finally(() => {
          this.runningPromises.delete(task.id);
        });

        this.runningPromises.set(task.id, taskPromise);
      }

      // Yield control briefly to avoid microtask lock
      await new Promise((r) => setTimeout(r, 20));
    }

    this.updateProgress(plan);
    agentEventBus.emit('workflow:updated', plan);
  }

  private async executeSingleTask(task: AgentTask, plan: WorkflowPlan): Promise<void> {
    const worker = agentWorkerRouter.findWorkerForTask(task);
    if (!worker) {
      task.status = 'failed';
      task.error = `No specialized worker available to handle workerType: ${task.workerType}`;
      this.log(plan, task.error, 'error', task.id);
      return;
    }

    task.status = 'in_progress';
    task.startedAt = Date.now();
    task.updatedAt = Date.now();
    plan.currentTaskId = task.id;
    this.updateProgress(plan);
    agentEventBus.emit('task:started', { workflowId: plan.id, task });

    const context = new AgentContextImpl({
      workflowId: plan.id,
      goal: plan.goal,
      outputs: this.outputs,
      isCancelled: () => this.isCancelledState,
      logSink: (entry) => this.log(plan, entry.message, entry.level, entry.taskId),
    });

    let attempt = 0;
    const maxAttempts = (task.maxRetries ?? 2) + 1;
    let finalResult: WorkerExecutionResult | null = null;

    while (attempt < maxAttempts) {
      attempt++;
      task.retryCount = attempt - 1;

      try {
        const timeoutMs = task.timeoutMs || 30000;
        const result = await Promise.race([
          worker.execute(task, context),
          new Promise<WorkerExecutionResult>((_, reject) =>
            setTimeout(() => reject(new Error(`Task execution timed out after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);

        finalResult = result;
        if (result.success) {
          break; // Success, proceed
        }
      } catch (err: any) {
        context.log(`Attempt ${attempt} failed: ${err.message}`, 'warn', task.id);
        if (attempt >= maxAttempts) {
          finalResult = {
            success: false,
            workerId: worker.id,
            taskId: task.id,
            status: 'failed',
            result: null,
            artifacts: [],
            warnings: [],
            errors: [err.message || 'Worker execution failed'],
            nextActions: [],
          };
        } else {
          // Exponential backoff wait
          await new Promise((r) => setTimeout(r, attempt * 150));
        }
      }
    }

    if (finalResult && finalResult.success) {
      task.status = 'completed';
      task.output = finalResult.result;
      task.artifacts = finalResult.artifacts;
      task.completedAt = Date.now();
      task.updatedAt = Date.now();
      this.outputs.set(task.id, finalResult.result);
      if (finalResult.result?.grade) {
        plan.verificationGrade = finalResult.result.grade;
      }
      agentWorkerRouter.recordTaskCompletion(worker.id, true);
      this.log(plan, `Task "${task.title}" completed successfully by ${worker.name}.`, 'info', task.id);
      agentEventBus.emit('task:completed', { workflowId: plan.id, task, result: finalResult });
    } else {
      task.status = 'failed';
      task.error = finalResult?.errors?.join('; ') || 'Task failed execution';
      task.updatedAt = Date.now();
      agentWorkerRouter.recordTaskCompletion(worker.id, false);
      this.log(plan, `Task "${task.title}" failed: ${task.error}`, 'error', task.id);
      agentEventBus.emit('task:failed', { workflowId: plan.id, task, error: task.error });
    }

    this.updateProgress(plan);
  }

  private updateProgress(plan: WorkflowPlan): void {
    if (plan.tasks.length === 0) {
      plan.progress = 100;
      return;
    }
    const completed = plan.tasks.filter((t) => t.status === 'completed').length;
    plan.progress = Math.round((completed / plan.tasks.length) * 100);
    agentEventBus.emit('workflow:updated', plan);
  }

  private log(
    plan: WorkflowPlan,
    message: string,
    level: ExecutionLogEntry['level'] = 'info',
    taskId?: string
  ): void {
    const entry: ExecutionLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      taskId,
    };
    plan.executionLogs.push(entry);
  }
}
