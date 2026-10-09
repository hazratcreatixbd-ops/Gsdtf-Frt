/**
 * PART 13 — FRIDAY CEO & Manager Operations Engine
 * Hermes (Executive Lead & Operations Lead). Orchestrates end-to-end user goal execution:
 * User Goal -> Goal Analysis -> Planner -> Task Graph -> Worker Execution ->
 * Astra Verification -> Athena Review -> Memory Update -> Manager Synthesis -> Final Result.
 */

import { GoalAnalyzer } from './GoalAnalyzer';
import { PlanningEngine } from './PlanningEngine';
import { workerTaskQueue } from './WorkerTaskQueue';
import { workerCapabilityRegistry } from './WorkerCapabilityRegistry';
import { workerRegistry } from '../workers/WorkerRegistry';
import { worldEventBus } from '../events/WorldEventBus';
import { approvalGate } from './ApprovalGate';
import { workflowTimeline } from './WorkflowTimeline';
import { advancedMemoryManager } from '../../services/memory/AdvancedMemoryManager';
import { MemoryContextBuilder } from '../../services/memory/MemoryContextBuilder';
import { businessWorkflowEngine } from '../../services/BusinessWorkflowEngine';
import { androidBridge } from '../../services/AndroidBridge/AndroidBridge';
import {
  TaskGraph,
  ManagerDashboardData,
  TimelineEvent,
  WorkerLiveStatus,
  GoalAnalysisResult,
} from './ManagerTypes';

const PERSISTENCE_KEY = 'friday_manager_task_graphs';

export class ManagerEngine {
  private static instance: ManagerEngine;
  private currentWorkflowId: string | null = null;
  private decisions: { id: string; timestamp: number; decision: string; outcome: string }[] = [];
  private memoryStorageFallback: string | null = null;

  private constructor() {
    this.restoreFromStorage();
    approvalGate.onDecision((req) => {
      const graph = workerTaskQueue.getGraph(req.workflowId);
      if (graph) {
        setTimeout(() => {
          workerTaskQueue.tickGraph(graph).then(() => {
            this.finalizeWorkflow(graph);
          });
        }, 20);
      }
    });
  }

  public static getInstance(): ManagerEngine {
    if (!ManagerEngine.instance) {
      ManagerEngine.instance = new ManagerEngine();
    }
    return ManagerEngine.instance;
  }

  /**
   * Restores persisted workflows and handles crash/restart recovery
   */
  public restoreFromStorage(): void {
    try {
      const raw =
        typeof window !== 'undefined' && window.localStorage
          ? localStorage.getItem(PERSISTENCE_KEY)
          : this.memoryStorageFallback;
      if (raw) {
        const graphs: TaskGraph[] = JSON.parse(raw);
        if (Array.isArray(graphs)) {
          graphs.forEach((g) => {
            // Restart recovery: if it was RUNNING before restart, mark as RECOVERY_REQUIRED
            if (g.status === 'RUNNING') {
              g.status = 'RECOVERY_REQUIRED';
              g.recoveredFromCrash = true;
            }
            workerTaskQueue.registerGraph(g);
            if (!this.currentWorkflowId) {
              this.currentWorkflowId = g.workflowId;
            }
          });
        }
      }
    } catch (e) {
      console.warn('[ManagerEngine] Could not load persisted workflows:', e);
    }
  }

  public saveToStorage(): void {
    try {
      const graphs = workerTaskQueue.getAllGraphs();
      const serialized = JSON.stringify(graphs.slice(0, 10));
      this.memoryStorageFallback = serialized;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(PERSISTENCE_KEY, serialized);
      }
      if (androidBridge.isAvailable()) {
        const runningGraphs = graphs.filter((g) => g.status === 'RUNNING');
        if (runningGraphs.length > 0) {
          androidBridge
            .startForegroundService({
              statusText: `Executing workflow: ${runningGraphs[0].goal.slice(0, 48)}`,
              taskCount: runningGraphs.length,
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[ManagerEngine] Failed to save workflow state:', e);
    }
  }

  public getDecisions(): { id: string; timestamp: number; decision: string; outcome: string }[] {
    return [...this.decisions];
  }

  /**
   * Synchronous / Immediate Dispatch interface (compatible with Part 11)
   */
  public dispatchGoal(goal: string): { workflowId: string; managerAction: string; graph?: TaskGraph } {
    const cleanGoal = goal.trim();
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.currentWorkflowId = workflowId;

    // 1. Goal Analysis
    const analysis = GoalAnalyzer.analyze(cleanGoal);

    // 2. Planning (Chronos)
    const graph = PlanningEngine.createPlan(analysis, workflowId);
    workerTaskQueue.registerGraph(graph);

    // 3. Record Manager Decision
    const decId = `dec_${Date.now()}`;
    const decision = `Executive triage for goal: "${cleanGoal}". Formulating end-to-end plan across ${graph.tasks.length} tasks.`;
    const outcome = `Dispatched to Planner Chronos and specialized Worker fleet.`;

    this.decisions.unshift({
      id: decId,
      timestamp: Date.now(),
      decision,
      outcome,
    });

    worldEventBus.emit({
      type: 'WORKFLOW_CREATED',
      title: 'Goal Accepted by Hermes (CEO / Manager)',
      details: `Hermes initiated workflow for: "${cleanGoal}". Risk: ${analysis.riskLevel}, Complexity: ${analysis.complexity}.`,
      level: 'info',
      workerName: 'Hermes (Manager)',
      workerId: 'worker-manager',
    });

    worldEventBus.emit({
      type: 'PLAN_CREATED',
      title: 'Plan Formulated by Chronos (Planner)',
      details: `Chronos structured ${graph.tasks.length} tasks with ${graph.executionMode} execution mode.`,
      level: 'info',
      workerName: 'Chronos (Planner)',
      workerId: 'worker-planner',
    });

    // 4. Update Manager and Research workers in UI registry
    workerRegistry.updateWorkerStatus('worker-manager', 'WORKING', `Coordinating "${cleanGoal}"`, 25);
    workerCapabilityRegistry.updateWorkerStatus('worker-manager', 'WORKING');

    // 5. Connect to Part 10 BusinessWorkflowEngine if applicable
    if (analysis.requiredWorkers.includes('worker-business')) {
      businessWorkflowEngine.createWorkflow(cleanGoal);
    }

    // 6. Asynchronously trigger worker task queue
    workerTaskQueue.tickGraph(graph).then(() => {
      this.finalizeWorkflow(graph);
    });

    this.saveToStorage();

    return {
      workflowId,
      managerAction: `Goal accepted and dispatched by Executive Manager Hermes.`,
      graph,
    };
  }

  /**
   * Comprehensive asynchronous goal execution with Part 12 Memory Context retrieval
   * and post-completion Memory Decision evaluation.
   */
  public async executeGoal(goal: string): Promise<TaskGraph> {
    const cleanGoal = goal.trim();
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.currentWorkflowId = workflowId;

    // 1. Memory Context Builder (Part 12 integration)
    const context = advancedMemoryManager.buildWorkerContext({
      activeWorker: 'worker-manager',
      currentTask: cleanGoal,
    });

    // 2. Goal Analysis
    const analysis = GoalAnalyzer.analyze(cleanGoal);

    // 3. Planning (Chronos)
    const graph = PlanningEngine.createPlan(analysis, workflowId);
    workerTaskQueue.registerGraph(graph);

    // Connect to Part 10 BusinessWorkflowEngine if business strategy is involved
    if (analysis.requiredWorkers.includes('worker-business')) {
      businessWorkflowEngine.createWorkflow(cleanGoal);
    }

    worldEventBus.emit({
      type: 'WORKFLOW_CREATED',
      title: 'Goal Accepted by Hermes (CEO / Manager)',
      details: `Hermes initiated workflow for: "${cleanGoal}". Context items loaded: ${
        context.relevantPreferences.length + context.relevantResearch.length
      }.`,
      level: 'info',
      workerName: 'Hermes (Manager)',
      workerId: 'worker-manager',
    });

    worldEventBus.emit({
      type: 'PLAN_CREATED',
      title: 'Plan Formulated by Chronos (Planner)',
      details: `Chronos structured ${graph.tasks.length} tasks with dependencies.`,
      level: 'info',
      workerName: 'Chronos (Planner)',
      workerId: 'worker-planner',
    });

    // 4. Execution Tick Loop
    await workerTaskQueue.tickGraph(graph);

    // 5. Finalize Workflow & Synthesize
    await this.finalizeWorkflow(graph);

    return graph;
  }

  /**
   * Final synthesis by Hermes, memory evaluation, and reporting
   */
  public async finalizeWorkflow(graph: TaskGraph): Promise<void> {
    const completedTasks = graph.tasks.filter((t) => t.status === 'COMPLETED');
    const failedTasks = graph.tasks.filter((t) => t.status === 'FAILED');
    const waitingApprovalTasks = graph.tasks.filter((t) => t.status === 'WAITING_APPROVAL');

    // Build final executive synthesis
    const summaries = completedTasks.map((t) => `• ${t.workerName || t.workerId}: ${t.result?.summary || t.title}`);
    graph.finalSummary = `Executive Synthesis for "${graph.goal}":\n${summaries.join('\n')}`;

    if (waitingApprovalTasks.length > 0) {
      graph.status = 'WAITING_APPROVAL';
      workerRegistry.updateWorkerStatus(
        'worker-manager',
        'WAITING',
        `Awaiting human approval on ${waitingApprovalTasks.length} action(s).`,
        graph.progressPercent
      );
      workerCapabilityRegistry.updateWorkerStatus('worker-manager', 'WAITING');
    } else if (failedTasks.length === 0 && completedTasks.length === graph.tasks.length && graph.tasks.length > 0) {
      graph.status = 'COMPLETED';
      graph.completedAt = Date.now();
      graph.progressPercent = 100;
      workerRegistry.updateWorkerStatus('worker-manager', 'READY', 'Goal delivered successfully.', 100);
      workerCapabilityRegistry.updateWorkerStatus('worker-manager', 'READY');

      // Part 12 Memory Integration: evaluate output for long-term saving
      advancedMemoryManager.evaluateAndSave({
        title: `Opportunity Briefing: ${graph.goal.slice(0, 40)}`,
        content: graph.finalSummary,
        suggestedType: 'BUSINESS',
        sourceType: 'SYSTEM',
        sourceName: 'Hermes Executive Operations (Part 13)',
        relatedProject: graph.goal,
      });
    } else if (failedTasks.length > 0) {
      graph.status = 'FAILED';
      workerRegistry.updateWorkerStatus('worker-manager', 'ERROR', `${failedTasks.length} task(s) failed.`, 100);
      workerCapabilityRegistry.updateWorkerStatus('worker-manager', 'ERROR');
    }

    this.saveToStorage();
  }

  /**
   * Compiles live dashboard data for UI operations HUD
   */
  public getDashboardData(): ManagerDashboardData {
    const graphs = workerTaskQueue.getAllGraphs();
    const currentGraph = (this.currentWorkflowId && workerTaskQueue.getGraph(this.currentWorkflowId)) || graphs[0];

    const allTasks = currentGraph ? currentGraph.tasks : [];
    const activeWorkers = workerCapabilityRegistry.getAllCapabilities().filter((w) => w.status === 'WORKING').length;

    const hermesCap = workerCapabilityRegistry.getCapability('worker-manager');
    const chronosCap = workerCapabilityRegistry.getCapability('worker-planner');

    return {
      activeWorkflows: graphs.filter((g) => g.status === 'RUNNING').length,
      activeWorkers,
      waitingTasks: allTasks.filter((t) => t.status === 'WAITING' || t.status === 'PENDING').length,
      failedTasks: allTasks.filter((t) => t.status === 'FAILED').length,
      waitingApproval: allTasks.filter((t) => t.status === 'WAITING_APPROVAL').length,
      verifyingTasks: allTasks.filter((t) => t.status === 'VERIFYING').length,
      completedTasks: allTasks.filter((t) => t.status === 'COMPLETED').length,
      totalTasks: allTasks.length,
      currentWorkflow: currentGraph,
      activeApprovals: approvalGate.getPendingRequests(),
      timeline: workflowTimeline.getEvents(currentGraph?.workflowId, 25),
      hermesState: hermesCap ? hermesCap.status : 'READY',
      chronosState: chronosCap ? chronosCap.status : 'READY',
    };
  }

  public getCurrentWorkflow(): TaskGraph | null {
    if (this.currentWorkflowId) {
      return workerTaskQueue.getGraph(this.currentWorkflowId);
    }
    const all = workerTaskQueue.getAllGraphs();
    return all[0] || null;
  }

  public resetForTesting(): void {
    this.currentWorkflowId = null;
    this.decisions = [];
    this.memoryStorageFallback = null;
    workerTaskQueue.clearAllGraphs();
    approvalGate.resetForTesting();
    workflowTimeline.clear();
    workerCapabilityRegistry.getAllCapabilities().forEach((w) => {
      w.currentLoad = 0;
      w.status = 'READY';
    });
    workerRegistry.getAllWorkers().forEach((w) => {
      workerRegistry.updateWorkerStatus(w.id, 'READY', 'Ready at workstation', 0);
    });
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(PERSISTENCE_KEY);
      } catch (e) {}
    }
  }
}

export const managerEngine = ManagerEngine.getInstance();
