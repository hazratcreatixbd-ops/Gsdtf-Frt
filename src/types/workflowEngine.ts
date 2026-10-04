/**
 * PART 10 — FRIDAY Autonomous Business Manager & End-to-End Workflow Engine Types
 * Strict typed definitions for Business Workflows, Pipeline Stages, Steps,
 * Centralized Approvals, Business Memory, and Campaign Management.
 */

export type WorkflowStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'WAITING_FOR_APPROVAL'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type WorkflowPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type StepStatus =
  | 'PENDING'
  | 'WAITING_FOR_APPROVAL'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED';

export type PipelineStage =
  | 'GOAL'
  | 'RESEARCH'
  | 'BUSINESS_ANALYSIS'
  | 'STRATEGY'
  | 'CONTENT_PLAN'
  | 'CONTENT_CREATION'
  | 'QUALITY_CHECK'
  | 'MEDIA_PREPARATION'
  | 'SCHEDULING'
  | 'PUBLISHING'
  | 'PERFORMANCE_MONITORING'
  | 'ANALYSIS'
  | 'IMPROVEMENT'
  | 'REPORT';

export interface WorkflowApproval {
  id: string;
  stepId: string;
  workflowId: string;
  action: string;
  why: string;
  target: string;
  content: string;
  expectedResult: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  notes?: string;
}

export interface WorkflowStep {
  stepId: string;
  title: string;
  description: string;
  stage: PipelineStage;
  workerType: string;
  status: StepStatus;
  priority: WorkflowPriority;
  dependencies: string[];
  requiresApproval: boolean;
  approvalId?: string;
  input: Record<string, any>;
  output?: any;
  errors?: string[];
  sourceReference?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface WorkflowExecutionHistoryEntry {
  timestamp: number;
  stepId?: string;
  stage?: PipelineStage;
  workerType?: string;
  action: string;
  status: string;
  input?: any;
  output?: any;
  error?: string;
  sourceReference?: string;
}

export interface BusinessWorkflow {
  workflowId: string;
  goal: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  currentStep?: string;
  currentStage?: PipelineStage;
  steps: WorkflowStep[];
  dependencies: { stepId: string; dependsOn: string }[];
  approvals: WorkflowApproval[];
  outputs: { stepId: string; stage: PipelineStage; output: any; timestamp: number }[];
  errors: { stepId?: string; error: string; timestamp: number }[];
  executionHistory: WorkflowExecutionHistoryEntry[];
  summaryReport?: string;
}

export interface StructuredBusinessMemory {
  businessName: string;
  services: string[];
  targetAudience: string;
  brandVoice: string;
  contentPreferences: string[];
  preferredPlatforms: string[];
  businessGoals: string[];
  recurringCampaigns: string[];
  projectInformation: Record<string, string>;
  approvedStrategies: { id: string; title: string; summary: string; approvedAt: number }[];
  previousWorkflowResults: { workflowId: string; goal: string; completedAt: number; summary: string }[];
  updatedAt: number;
}

export interface BusinessCampaignExtended {
  campaignId: string;
  name: string;
  objective: string;
  audience: string;
  platforms: string[];
  startDate: string;
  endDate: string;
  contentItems: {
    id: string;
    title: string;
    platform: string;
    format: string;
    status: 'drafted' | 'approved' | 'scheduled' | 'published';
  }[];
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  performance: {
    targetImpressions?: number;
    actualImpressions?: number;
    leadsGenerated?: number;
    conversions?: number;
    notes?: string;
  };
  notes: string;
  createdAt: number;
  updatedAt: number;
}
