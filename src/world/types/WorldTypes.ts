/**
 * PART 11 — FRIDAY World Interface, Agent Town, & Worker System Types
 * Strict typed definitions for World Shell, Agent Town, Worker Registry,
 * Event Bus, System Modules, and Missions.
 */

export type WorkerRole =
  | 'MANAGER'
  | 'PLANNER'
  | 'RESEARCH'
  | 'CODER'
  | 'DEBUGGER'
  | 'TESTER'
  | 'REVIEWER'
  | 'BUSINESS'
  | 'MARKET_DATA'
  | 'CONTENT'
  | 'MEDIA'
  | 'DEVICE'
  | 'NEWS_WEATHER'
  | 'TRAVEL'
  | 'SECURITY'
  | 'VERIFICATION'
  | 'ANALYTICS';

export type WorkerStatus =
  | 'OFFLINE'
  | 'IDLE'
  | 'READY'
  | 'WORKING'
  | 'THINKING'
  | 'RESEARCHING'
  | 'WAITING'
  | 'BLOCKED'
  | 'ERROR'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED';

export interface WorkstationLocation {
  zone: 'executive' | 'research_lab' | 'business_hub' | 'creative_studio' | 'tech_dev' | 'audit_station';
  roomName: string;
  deskLabel: string;
  x: number; // percentage coordinates for visual positioning
  y: number;
}

export interface WorkerEntity {
  id: string;
  name: string;
  role: WorkerRole;
  description: string;
  status: WorkerStatus;
  currentTask?: string;
  progress: number; // 0 to 100
  capabilities: string[];
  avatar: string;
  accentColor: string;
  workstation: WorkstationLocation;
  lastActivity: string;
  assignedBy: string;
  result?: any;
  error?: string;
  metrics: {
    tasksCompleted: number;
    tasksFailed: number;
    uptimeSec: number;
  };
}

export type WorldEventType =
  | 'WORKFLOW_CREATED'
  | 'PLAN_CREATED'
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_RETRYING'
  | 'WORKER_ASSIGNED'
  | 'WORKER_STARTED'
  | 'WORKER_STATUS_CHANGED'
  | 'WORKER_PROGRESS_UPDATED'
  | 'WORKER_COMPLETED'
  | 'WORKER_FAILED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_COMPLETED'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_FAILED'
  | 'MANAGER_DECISION'
  | 'VOICE_STATE_CHANGED'
  | 'SYSTEM_MODULE_CLICKED';

export interface WorldActivityEvent {
  id: string;
  type: WorldEventType;
  timestamp: number;
  workerId?: string;
  workerName?: string;
  taskId?: string;
  title: string;
  details: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export type SystemModuleName = 'MEMORY' | 'SKILLS' | 'SOUL' | 'SETTINGS';

export interface SystemModuleInfo {
  name: SystemModuleName;
  label: string;
  status: 'ONLINE' | 'STANDBY' | 'SYNCED' | 'CONFIGURED';
  description: string;
  color: string;
  itemsCount: number;
}

export interface CurrentMission {
  id: string;
  name: string;
  goal: string;
  status: 'PLANNING' | 'RUNNING' | 'WAITING_APPROVAL' | 'VERIFYING' | 'COMPLETED' | 'PAUSED';
  leadWorker: string;
  progress: number;
  currentStage: string;
  startedAt: number;
  updatedAt: number;
}
