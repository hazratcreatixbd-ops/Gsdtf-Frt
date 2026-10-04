/**
 * PART 13 — FRIDAY CEO / Manager / Planner / Worker Operating System Types
 * Strongly typed models for Goal Analysis, Task Graphs (DAG), Capability Registry,
 * Worker Queue, Approval Gate, Verification, and Live Workflow Timelines.
 */

import { WorkerRole, WorkerStatus } from '../types/WorldTypes';
import { MemoryConfidence } from '../../services/memory/MemoryTypes';

export type GoalComplexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'MULTI_STAGE';

export type GoalRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SENSITIVE';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type DAGTaskStatus =
  | 'PENDING'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'WAITING_APPROVAL'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED';

export type WorkerLiveStatus =
  | 'OFFLINE'
  | 'IDLE'
  | 'READY'
  | 'WORKING'
  | 'WAITING'
  | 'BLOCKED'
  | 'ERROR'
  | 'VERIFYING'
  | 'COMPLETED';

export type WorkflowExecutionMode = 'SEQUENTIAL' | 'PARALLEL' | 'MIXED';

export type WorkflowLifecycleStatus =
  | 'PLANNED'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RECOVERY_REQUIRED';

export interface GoalAnalysisResult {
  goal: string;
  objective: string;
  expectedOutput: string;
  complexity: GoalComplexity;
  riskLevel: GoalRiskLevel;
  constraints: string[];
  deadline?: string;
  requiredTools: string[];
  requiredWorkers: string[];
  dependencies: string[];
  approvalRequired: boolean;
  verificationRequired: boolean;
  analyzedAt: number;
}

export interface WorkerResult {
  taskId: string;
  workerId: string;
  workerName?: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'UNVERIFIED';
  summary: string;
  output: any;
  evidence?: string;
  confidence: MemoryConfidence;
  warnings: string[];
  errors: string[];
  createdAt: number;
}

export interface VerificationVerdict {
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  verifiedBy: string; // 'worker-verification' (Astra)
  score: number;      // 0 to 100
  evidenceSummary: string;
  issues: string[];
  recommendation: 'PROCEED' | 'RETRY' | 'REASSIGN' | 'ESCALATE';
  timestamp: number;
}

export interface ReviewVerdict {
  status: 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';
  reviewedBy: string; // 'worker-reviewer' (Athena)
  notes: string;
  qualityScore: number;
  timestamp: number;
}

export interface DAGTask {
  id: string;
  workflowId: string;
  title: string;
  description: string;
  workerId: string;
  workerName?: string;
  role: WorkerRole;
  priority: TaskPriority;
  dependencies: string[]; // IDs of prerequisite tasks
  status: DAGTaskStatus;
  input: any;
  output?: any;
  result?: WorkerResult;
  verification?: VerificationVerdict;
  review?: ReviewVerdict;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
  requiresApproval: boolean;
  requiresVerification: boolean;
  approvalGranted?: boolean;
  error?: string;
}

export interface TaskGraph {
  workflowId: string;
  goal: string;
  analysis: GoalAnalysisResult;
  tasks: DAGTask[];
  executionMode: WorkflowExecutionMode;
  status: WorkflowLifecycleStatus;
  leadWorker: string; // 'worker-manager' (Hermes)
  plannerWorker: string; // 'worker-planner' (Chronos)
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  currentStepIndex: number;
  totalSteps: number;
  progressPercent: number;
  finalSummary?: string;
  recoveredFromCrash?: boolean;
}

export interface WorkerCapability {
  workerId: string;
  name: string;
  role: WorkerRole;
  capabilities: string[];
  supportedTaskTypes: string[];
  requiredTools: string[];
  riskLevel: GoalRiskLevel;
  status: WorkerLiveStatus;
  currentLoad: number;
  maxConcurrentTasks: number;
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  taskId: string;
  workerId: string;
  title: string;
  actionType: string;
  description: string;
  payload: any;
  riskLevel: GoalRiskLevel;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedAt: number;
  decidedAt?: number;
  decidedBy?: 'USER' | 'POLICY';
  notes?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  timeFormatted: string;
  actor: string;
  action: string;
  details: string;
  category: 'MANAGER' | 'PLANNER' | 'WORKER' | 'VERIFICATION' | 'REVIEW' | 'APPROVAL' | 'SYSTEM';
  level: 'info' | 'success' | 'warn' | 'error';
  workflowId?: string;
  taskId?: string;
}

export interface ManagerDashboardData {
  activeWorkflows: number;
  activeWorkers: number;
  waitingTasks: number;
  failedTasks: number;
  waitingApproval: number;
  verifyingTasks: number;
  completedTasks: number;
  totalTasks: number;
  currentWorkflow?: TaskGraph;
  activeApprovals: ApprovalRequest[];
  timeline: TimelineEvent[];
  hermesState: WorkerLiveStatus;
  chronosState: WorkerLiveStatus;
}
