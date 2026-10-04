/**
 * PART 9 — FRIDAY Agent Event Bus
 * Lightweight typed pub/sub bus for workflow milestones, task state changes,
 * approval requests, and worker diagnostics.
 */

import { AgentTask, WorkflowPlan, WorkerStatusInfo } from './AgentTypes';

export type AgentEventType =
  | 'workflow:started'
  | 'workflow:updated'
  | 'workflow:paused'
  | 'workflow:resumed'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'workflow:cancelled'
  | 'task:created'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:waiting_approval'
  | 'task:approved'
  | 'worker:status_changed';

export type AgentEventListener = (payload: any) => void;

export class AgentEventBus {
  private static instance: AgentEventBus;
  private listeners: Map<AgentEventType, Set<AgentEventListener>> = new Map();

  private constructor() {}

  public static getInstance(): AgentEventBus {
    if (!AgentEventBus.instance) {
      AgentEventBus.instance = new AgentEventBus();
    }
    return AgentEventBus.instance;
  }

  public on(event: AgentEventType, listener: AgentEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  public off(event: AgentEventType, listener: AgentEventListener): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  public emit(event: AgentEventType, payload: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[AgentEventBus] Error in listener for ${event}:`, err);
        }
      });
    }
  }

  public emitWorkflowUpdated(workflow: WorkflowPlan): void {
    this.emit('workflow:updated', workflow);
  }

  public emitTaskWaitingApproval(workflowId: string, task: AgentTask): void {
    this.emit('task:waiting_approval', { workflowId, task });
  }

  public emitWorkerStatusChanged(info: WorkerStatusInfo): void {
    this.emit('worker:status_changed', info);
  }
}

export const agentEventBus = AgentEventBus.getInstance();
