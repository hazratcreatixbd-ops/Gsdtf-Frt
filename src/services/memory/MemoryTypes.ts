/**
 * PART 12 — FRIDAY Advanced Memory & Research Memory Types
 * Strongly-typed memory object models, provenance, decision engines,
 * search parameters, and lifecycle states.
 */

export type MemoryType =
  | 'CONVERSATION'
  | 'USER_PREFERENCE'
  | 'TASK'
  | 'WORKFLOW'
  | 'RESEARCH'
  | 'BUSINESS'
  | 'WORKER'
  | 'PROJECT'
  | 'SYSTEM'
  | 'TEMPORARY';

export type MemoryRetention = 'SESSION' | 'SHORT_TERM' | 'LONG_TERM';

export type MemoryStatus = 'ACTIVE' | 'ARCHIVED' | 'EXPIRED' | 'DISCARDED' | 'CONFLICTING';

export type MemoryImportance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type MemoryConfidence = 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED';

export type MemorySensitivity = 'PUBLIC' | 'INTERNAL' | 'SENSITIVE' | 'SECRET';

export type MemorySourceType = 'WEB' | 'USER' | 'WORKER' | 'DOCUMENT' | 'TOOL' | 'SYSTEM' | 'VOICE';

export interface MemoryProvenance {
  sourceType: MemorySourceType;
  sourceName: string;
  sourceUrl?: string;
  retrievedAt: number;
  evidenceSummary?: string;
}

export interface Memory {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  summary: string;
  source: MemoryProvenance;
  importance: MemoryImportance;
  confidence: MemoryConfidence;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  retention: MemoryRetention;
  tags: string[];
  relatedTasks: string[];
  relatedWorkers: string[];
  relatedProjects: string[];
  sensitivity: MemorySensitivity;
  status: MemoryStatus;
  conflictWith?: string[]; // IDs of conflicting memories
  supersededBy?: string;   // ID of superseding memory
  metadata?: Record<string, any>;
}

export type MemoryDecisionAction =
  | 'SAVE'
  | 'UPDATE_EXISTING'
  | 'TEMPORARY_ONLY'
  | 'ARCHIVE'
  | 'DISCARD';

export interface MemoryDecision {
  action: MemoryDecisionAction;
  reason: string;
  confidence: number;
  suggestedType: MemoryType;
  suggestedRetention: MemoryRetention;
  suggestedImportance: MemoryImportance;
  targetMemoryId?: string;
}

export type ResearchFilterAction =
  | 'KEEP'
  | 'UPDATE'
  | 'TEMPORARY'
  | 'LOW_VALUE'
  | 'DUPLICATE'
  | 'CONFLICTING'
  | 'UNVERIFIED';

export interface ResearchFilterVerdict {
  action: ResearchFilterAction;
  reason: string;
  confidence: MemoryConfidence;
  existingId?: string;
}

export interface ResearchMemoryItem {
  id: string;
  memoryId: string;
  topic: string;
  finding: string;
  source: MemoryProvenance;
  dateResearched: string;
  confidence: MemoryConfidence;
  evidence: string;
  relevance: number; // 0 to 100
  tags: string[];
  relatedProject?: string;
  relatedWorker?: string;
  status: MemoryStatus;
  filterVerdict?: ResearchFilterVerdict;
}

export interface MemorySearchParams {
  query?: string;
  type?: MemoryType;
  types?: MemoryType[];
  tags?: string[];
  minImportance?: MemoryImportance;
  importance?: MemoryImportance;
  status?: MemoryStatus;
  retention?: MemoryRetention;
  confidence?: MemoryConfidence;
  project?: string;
  worker?: string;
  minDate?: number;
  maxDate?: number;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface MemoryContextQuery {
  currentTask?: string;
  userRequest?: string;
  activeWorker?: string;
  project?: string;
  conversationContext?: string;
  limit?: number;
}

export interface WorkerMemoryContext {
  workerId: string;
  workerRole?: string;
  relevantPreferences: Memory[];
  relevantResearch: ResearchMemoryItem[];
  relevantProjects: Memory[];
  relevantTasks: Memory[];
  activeDirectives: string[];
  contextSummary: string;
}

export interface MemoryOverviewStats {
  totalCount: number;
  activeCount: number;
  researchCount: number;
  preferenceCount: number;
  importantCount: number;
  archivedCount: number;
  temporaryCount: number;
  conflictCount: number;
  recentCount: number;
}
