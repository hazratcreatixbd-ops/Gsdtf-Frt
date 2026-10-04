/**
 * PART 13 — Approval Gate
 * Safety mechanism for sensitive, financial, publishing, messaging, or device actions.
 * Workflow pauses in WAITING_APPROVAL until explicit human approval or rejection.
 */

import { ApprovalRequest, GoalRiskLevel } from './ManagerTypes';
import { worldEventBus } from '../events/WorldEventBus';

export type ApprovalDecisionListener = (request: ApprovalRequest) => void;

export class ApprovalGate {
  private static instance: ApprovalGate;
  private pendingRequests: Map<string, ApprovalRequest> = new Map();
  private history: ApprovalRequest[] = [];
  private listeners: Set<ApprovalDecisionListener> = new Set();

  private constructor() {}

  public static getInstance(): ApprovalGate {
    if (!ApprovalGate.instance) {
      ApprovalGate.instance = new ApprovalGate();
    }
    return ApprovalGate.instance;
  }

  public requestApproval(params: {
    workflowId: string;
    taskId: string;
    workerId: string;
    title: string;
    actionType: string;
    description: string;
    payload: any;
    riskLevel: GoalRiskLevel;
  }): ApprovalRequest {
    const id = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const request: ApprovalRequest = {
      id,
      workflowId: params.workflowId,
      taskId: params.taskId,
      workerId: params.workerId,
      title: params.title,
      actionType: params.actionType,
      description: params.description,
      payload: params.payload,
      riskLevel: params.riskLevel,
      status: 'PENDING',
      requestedAt: Date.now(),
    };

    this.pendingRequests.set(id, request);
    this.history.unshift(request);

    worldEventBus.emit({
      type: 'APPROVAL_REQUIRED',
      title: `Approval Required: ${params.title}`,
      details: `${params.description} (Risk Level: ${params.riskLevel})`,
      level: 'warn',
      workerId: params.workerId,
      taskId: params.taskId,
    });

    return request;
  }

  public approve(requestId: string, notes?: string): boolean {
    const req = this.pendingRequests.get(requestId);
    if (!req || req.status !== 'PENDING') return false;

    req.status = 'APPROVED';
    req.decidedAt = Date.now();
    req.decidedBy = 'USER';
    req.notes = notes;
    this.pendingRequests.delete(requestId);

    worldEventBus.emit({
      type: 'APPROVAL_GRANTED',
      title: `Approval Granted: ${req.title}`,
      details: notes ? `Approved with notes: "${notes}"` : 'Human approval granted by user.',
      level: 'success',
      workerId: req.workerId,
      taskId: req.taskId,
    });

    this.notify(req);
    return true;
  }

  public reject(requestId: string, reason?: string): boolean {
    const req = this.pendingRequests.get(requestId);
    if (!req || req.status !== 'PENDING') return false;

    req.status = 'REJECTED';
    req.decidedAt = Date.now();
    req.decidedBy = 'USER';
    req.notes = reason || 'Action rejected by user.';
    this.pendingRequests.delete(requestId);

    worldEventBus.emit({
      type: 'APPROVAL_REJECTED',
      title: `Approval Rejected: ${req.title}`,
      details: `Action rejected: ${req.notes}`,
      level: 'error',
      workerId: req.workerId,
      taskId: req.taskId,
    });

    this.notify(req);
    return true;
  }

  public cancel(requestId: string): boolean {
    const req = this.pendingRequests.get(requestId);
    if (!req || req.status !== 'PENDING') return false;

    req.status = 'CANCELLED';
    req.decidedAt = Date.now();
    req.decidedBy = 'USER';
    this.pendingRequests.delete(requestId);
    this.notify(req);
    return true;
  }

  public getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  public getHistory(): ApprovalRequest[] {
    return [...this.history];
  }

  public onDecision(listener: ApprovalDecisionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(request: ApprovalRequest): void {
    this.listeners.forEach((l) => {
      try {
        l(request);
      } catch (err) {
        console.error('[ApprovalGate] Error in listener:', err);
      }
    });
  }

  public resetForTesting(): void {
    this.pendingRequests.clear();
    this.history = [];
  }
}

export const approvalGate = ApprovalGate.getInstance();
