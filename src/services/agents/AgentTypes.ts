/**
 * PART 9 — FRIDAY Agent & Worker Orchestration System
 * Strict typed contracts for Tasks, Workers, Workflows, Queues, and Execution Results.
 */

export type AgentTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting_for_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type AgentTaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type VerificationGrade = 'PASS' | 'NEEDS_REVIEW' | 'FAILED';

export interface VerificationResult {
  grade: VerificationGrade;
  passedChecks: string[];
  failedChecks: string[];
  warnings: string[];
  unsupportedClaims: string[];
  recommendation: string;
}

export interface WorkerExecutionResult {
  success: boolean;
  workerId: string;
  taskId: string;
  status: 'completed' | 'failed' | 'needs_review' | 'waiting_for_approval';
  result: any;
  artifacts: { id: string; name: string; type: string; data: any }[];
  warnings: string[];
  errors: string[];
  nextActions: string[];
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  workerType: string;
  priority: AgentTaskPriority;
  status: AgentTaskStatus;
  dependencies: string[]; // IDs of tasks that must complete before this task
  input: Record<string, any>;
  output?: any;
  artifacts?: { id: string; name: string; type: string; data: any }[];
  requiresApproval?: boolean;
  approvalDetails?: {
    action: string;
    summary: string;
    approved?: boolean;
    reviewedAt?: number;
    reviewedBy?: string;
  };
  timeoutMs?: number;
  maxRetries?: number;
  retryCount?: number;
  error?: string;
  warnings?: string[];
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface WorkerStatusInfo {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'busy' | 'paused' | 'error';
  capabilities: string[];
  currentTaskId?: string;
  tasksCompleted: number;
  tasksFailed: number;
}

export interface AgentWorker {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: string[];
  canHandle(task: AgentTask): boolean;
  execute(task: AgentTask, context: AgentContext): Promise<WorkerExecutionResult>;
  getStatus(): 'idle' | 'busy' | 'paused' | 'error';
}

export interface ExecutionLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  taskId?: string;
  workerId?: string;
}

export interface WorkflowPlan {
  id: string;
  goal: string;
  status: 'draft' | 'running' | 'paused' | 'waiting_for_approval' | 'completed' | 'failed' | 'cancelled';
  tasks: AgentTask[];
  currentTaskId?: string;
  progress: number; // 0 to 100
  summaryReport?: string;
  verificationGrade?: VerificationGrade;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  executionLogs: ExecutionLogEntry[];
}

export interface AgentMemoryItem {
  id: string;
  category: 'business_context' | 'research_summary' | 'approved_strategy' | 'content_preference' | 'workflow_history' | 'performance_insight';
  title: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

// Forward reference for AgentContext
export interface AgentContext {
  workflowId: string;
  goal: string;
  getTaskOutput(taskId: string): any;
  getAllOutputs(): Record<string, any>;
  isCancelled(): boolean;
  log(message: string, level?: 'info' | 'warn' | 'error', taskId?: string): void;
}
