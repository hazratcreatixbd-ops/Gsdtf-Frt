/**
 * PART 12 — Advanced Memory & Research Memory Manager
 * Core orchestrator for FRIDAY's multi-tier memory system.
 * Manages conversation, user preference, task, research, business, and worker memory.
 * Features deterministic decision triage, duplicate/conflict prevention, and persistence.
 */

import {
  Memory,
  ResearchMemoryItem,
  MemorySearchParams,
  MemoryOverviewStats,
  MemoryContextQuery,
  WorkerMemoryContext,
  MemoryType,
  MemoryImportance,
  MemoryRetention,
  MemoryConfidence,
  MemoryStatus,
} from './MemoryTypes';
import { MemoryDecisionEngine, CandidateMemoryInput } from './MemoryDecisionEngine';
import { DuplicateDetector } from './DuplicateDetector';
import { ConflictDetector } from './ConflictDetector';
import { ResearchMemoryFilter, ResearchCandidateInput } from './ResearchMemoryFilter';
import { MemorySearchService } from './MemorySearchService';
import { MemoryContextBuilder } from './MemoryContextBuilder';
import { businessMemoryManager } from '../BusinessMemoryManager';
import { agentMemory } from '../agents/AgentMemory';

const MEMORY_STORAGE_KEY = 'friday_advanced_memory_store';
const RESEARCH_STORAGE_KEY = 'friday_research_memory_store';

export type MemoryChangeListener = (memories: Memory[]) => void;

export class AdvancedMemoryManager {
  private static instance: AdvancedMemoryManager;
  private memories: Map<string, Memory> = new Map();
  private researchItems: Map<string, ResearchMemoryItem> = new Map();
  private listeners: Set<MemoryChangeListener> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): AdvancedMemoryManager {
    if (!AdvancedMemoryManager.instance) {
      AdvancedMemoryManager.instance = new AdvancedMemoryManager();
    }
    return AdvancedMemoryManager.instance;
  }

  /**
   * Loads persisted memories from storage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      // 1. Load general memories
      const rawMemories = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (rawMemories) {
        const parsed: Memory[] = JSON.parse(rawMemories);
        if (Array.isArray(parsed)) {
          parsed.forEach((m) => {
            // Clean out expired session memories from past sessions
            if (m.retention === 'SESSION' && Date.now() - m.createdAt > 3600000 * 12) {
              return;
            }
            this.memories.set(m.id, m);
          });
        }
      }

      // 2. Load research items
      const rawResearch = localStorage.getItem(RESEARCH_STORAGE_KEY);
      if (rawResearch) {
        const parsed: ResearchMemoryItem[] = JSON.parse(rawResearch);
        if (Array.isArray(parsed)) {
          parsed.forEach((r) => this.researchItems.set(r.id, r));
        }
      }
    } catch (e) {
      console.error('[AdvancedMemoryManager] Error loading memories from storage:', e);
    }
  }

  /**
   * Persists memories to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const memoryArray = Array.from(this.memories.values());
      const researchArray = Array.from(this.researchItems.values());

      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memoryArray));
      localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(researchArray));
    } catch (e) {
      console.error('[AdvancedMemoryManager] Error saving memories to storage:', e);
    }
  }

  private notifyListeners(): void {
    const list = this.getAllMemories();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (err) {
        console.error('[AdvancedMemoryManager] Error in change listener:', err);
      }
    });
  }

  public subscribe(listener: MemoryChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getAllMemories());
    return () => this.listeners.delete(listener);
  }

  /**
   * Synchronizes baseline business parameters with Part 10 BusinessMemoryManager
   */
  private syncBusinessMemory(): void {
    const biz = businessMemoryManager.getBusinessMemory();
    if (!biz || !biz.businessName) return;

    // Check if business identity is already captured
    const existing = this.search({
      type: 'BUSINESS',
      query: biz.businessName,
    });

    if (existing.length === 0) {
      const bizMemory: Memory = {
        id: `mem_biz_${Date.now()}`,
        type: 'BUSINESS',
        title: `Business Profile: ${biz.businessName}`,
        content: `Business: ${biz.businessName}. Services: ${biz.services.join(', ')}. Target Audience: ${biz.targetAudience}. Brand Voice: ${biz.brandVoice}.`,
        summary: `Strategic profile for ${biz.businessName} targeting ${biz.targetAudience}.`,
        source: {
          sourceType: 'SYSTEM',
          sourceName: 'BusinessIntelligenceManager (Part 7/10)',
          retrievedAt: Date.now(),
        },
        importance: 'HIGH',
        confidence: 'VERIFIED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        retention: 'LONG_TERM',
        tags: ['business', 'profile', 'strategy', ...biz.services],
        relatedTasks: [],
        relatedWorkers: ['worker-manager', 'worker-business'],
        relatedProjects: [biz.businessName],
        sensitivity: 'INTERNAL',
        status: 'ACTIVE',
      };
      this.memories.set(bizMemory.id, bizMemory);
    }
  }

  // ==========================================
  // CANDIDATE EVALUATION & AUTOMATIC DECISION
  // ==========================================

  /**
   * Passes candidate text through MemoryDecisionEngine and acts on the decision
   */
  public evaluateAndSave(candidate: CandidateMemoryInput): {
    decision: ReturnType<typeof MemoryDecisionEngine.evaluateCandidate>;
    memory?: Memory;
  } {
    const all = this.getAllMemories();
    const decision = MemoryDecisionEngine.evaluateCandidate(candidate, all);

    if (decision.action === 'DISCARD') {
      return { decision };
    }

    if (decision.action === 'UPDATE_EXISTING' && decision.targetMemoryId) {
      const existing = this.memories.get(decision.targetMemoryId);
      if (existing) {
        const updated = this.updateMemory(decision.targetMemoryId, {
          content: `${existing.content}\n[Updated]: ${candidate.content}`,
          summary: candidate.content.slice(0, 100),
          importance: decision.suggestedImportance || existing.importance,
          confidence: 'VERIFIED',
        });
        return { decision, memory: updated || undefined };
      }
    }

    // Check for direct conflict
    const conflict = ConflictDetector.detectConflict(
      candidate.title || candidate.content.slice(0, 32),
      candidate.content,
      all
    );

    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMemory: Memory = {
      id: memoryId,
      type: decision.suggestedType,
      title: candidate.title?.trim() || candidate.content.slice(0, 48),
      content: candidate.content.trim(),
      summary: candidate.content.slice(0, 120),
      source: {
        sourceType: candidate.sourceType || 'USER',
        sourceName:
          candidate.sourceName ||
          (candidate.sourceType === 'WORKER'
            ? 'Autonomous Worker'
            : candidate.sourceType === 'VOICE'
            ? 'FRIDAY Voice Session'
            : 'User Conversation'),
        retrievedAt: Date.now(),
      },
      importance: decision.suggestedImportance,
      confidence: 'VERIFIED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
      retention: decision.suggestedRetention,
      tags: candidate.tags || ['general'],
      relatedTasks: candidate.relatedTask ? [candidate.relatedTask] : [],
      relatedWorkers: [],
      relatedProjects: candidate.relatedProject ? [candidate.relatedProject] : [],
      sensitivity: 'PUBLIC',
      status: conflict.hasConflict ? 'CONFLICTING' : 'ACTIVE',
      conflictWith: conflict.conflictingMemory ? [conflict.conflictingMemory.id] : undefined,
      metadata: candidate.metadata,
    };

    if (conflict.hasConflict && conflict.conflictingMemory) {
      // Mark opposing memory as also conflicting
      const opp = this.memories.get(conflict.conflictingMemory.id);
      if (opp) {
        opp.status = 'CONFLICTING';
        opp.conflictWith = [...(opp.conflictWith || []), memoryId];
        this.memories.set(opp.id, opp);
      }
    }

    this.memories.set(newMemory.id, newMemory);
    this.saveToStorage();
    this.notifyListeners();

    // Mirror to agentMemory if appropriate
    if (newMemory.type === 'RESEARCH' || newMemory.type === 'BUSINESS') {
      agentMemory.remember({
        category: newMemory.type === 'RESEARCH' ? 'research_summary' : 'business_context',
        title: newMemory.title,
        content: newMemory.content,
      });
    }

    return { decision, memory: newMemory };
  }

  // ==========================================
  // CRUD & LIFECYCLE
  // ==========================================

  public createMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt'>): Memory {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullMemory: Memory = {
      ...memory,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.memories.set(id, fullMemory);
    this.saveToStorage();
    this.notifyListeners();
    return fullMemory;
  }

  public getMemory(id: string): Memory | null {
    const mem = this.memories.get(id);
    if (mem) {
      mem.lastAccessedAt = Date.now();
      return { ...mem };
    }
    return null;
  }

  public updateMemory(id: string, updates: Partial<Memory>): Memory | null {
    const mem = this.memories.get(id);
    if (!mem) return null;

    const updated: Memory = {
      ...mem,
      ...updates,
      id: mem.id, // Immutable ID
      createdAt: mem.createdAt, // Preserve creation timestamp
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.memories.set(id, updated);
    this.saveToStorage();
    this.notifyListeners();
    return updated;
  }

  public archiveMemory(id: string): boolean {
    const mem = this.memories.get(id);
    if (!mem) return false;

    mem.status = 'ARCHIVED';
    mem.updatedAt = Date.now();
    this.memories.set(id, mem);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  public discardMemory(id: string): boolean {
    const mem = this.memories.get(id);
    if (!mem) return false;

    mem.status = 'DISCARDED';
    mem.updatedAt = Date.now();
    this.memories.set(id, mem);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  public clearSessionMemory(): number {
    let count = 0;
    for (const [id, mem] of this.memories.entries()) {
      if (mem.retention === 'SESSION' || mem.type === 'TEMPORARY') {
        this.memories.delete(id);
        count++;
      }
    }
    if (count > 0) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return count;
  }

  public getAllMemories(): Memory[] {
    return Array.from(this.memories.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public search(params: MemorySearchParams): Memory[] {
    return MemorySearchService.search(this.getAllMemories(), params);
  }

  // ==========================================
  // RESEARCH MEMORY SUBSYSTEM
  // ==========================================

  public addResearchFinding(candidate: ResearchCandidateInput): {
    verdict: ReturnType<typeof ResearchMemoryFilter.filterFinding>;
    researchItem?: ResearchMemoryItem;
    memoryRecord?: Memory;
  } {
    const existing = Array.from(this.researchItems.values());
    const verdict = ResearchMemoryFilter.filterFinding(candidate, existing);

    if (verdict.action === 'LOW_VALUE') {
      return { verdict };
    }

    if (verdict.action === 'DUPLICATE' && verdict.existingId) {
      const item = this.researchItems.get(verdict.existingId);
      return { verdict, researchItem: item };
    }

    if (verdict.action === 'UPDATE' && verdict.existingId) {
      const item = this.researchItems.get(verdict.existingId);
      if (item) {
        item.finding = candidate.finding;
        item.confidence = verdict.confidence;
        item.evidence = candidate.evidence || item.evidence;
        item.dateResearched = new Date().toISOString().split('T')[0];
        this.researchItems.set(item.id, item);
        this.saveToStorage();
        return { verdict, researchItem: item };
      }
    }

    const researchId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const memoryId = `mem_res_${Date.now()}`;

    // Create research memory item
    const researchItem: ResearchMemoryItem = {
      id: researchId,
      memoryId,
      topic: candidate.topic.trim(),
      finding: candidate.finding.trim(),
      source: candidate.source,
      dateResearched: new Date().toISOString().split('T')[0],
      confidence: verdict.confidence,
      evidence: candidate.evidence || '',
      relevance: candidate.relevance ?? 85,
      tags: candidate.tags || ['research', candidate.topic.toLowerCase()],
      relatedProject: candidate.relatedProject,
      relatedWorker: candidate.relatedWorker || 'worker-research',
      status: verdict.action === 'CONFLICTING' ? 'CONFLICTING' : 'ACTIVE',
      filterVerdict: verdict,
    };

    // Mirror as full Memory object
    const memoryRecord: Memory = {
      id: memoryId,
      type: 'RESEARCH',
      title: `Research: ${candidate.topic}`,
      content: candidate.finding,
      summary: candidate.finding.slice(0, 120),
      source: candidate.source,
      importance: 'HIGH',
      confidence: verdict.confidence,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
      retention: 'LONG_TERM',
      tags: researchItem.tags,
      relatedTasks: [],
      relatedWorkers: [candidate.relatedWorker || 'worker-research'],
      relatedProjects: candidate.relatedProject ? [candidate.relatedProject] : [],
      sensitivity: 'INTERNAL',
      status: researchItem.status,
    };

    this.researchItems.set(researchId, researchItem);
    this.memories.set(memoryId, memoryRecord);
    this.saveToStorage();
    this.notifyListeners();

    return { verdict, researchItem, memoryRecord };
  }

  public getResearchMemories(query?: string, minConfidence?: MemoryConfidence): ResearchMemoryItem[] {
    let items = Array.from(this.researchItems.values());

    if (minConfidence) {
      const ranks: Record<MemoryConfidence, number> = { VERIFIED: 3, PARTIAL: 2, UNVERIFIED: 1 };
      const req = ranks[minConfidence] || 1;
      items = items.filter((r) => (ranks[r.confidence] || 1) >= req);
    }

    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (r) =>
          r.topic.toLowerCase().includes(q) ||
          r.finding.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return items.sort((a, b) => b.relevance - a.relevance);
  }

  public getResearchById(id: string): ResearchMemoryItem | null {
    return this.researchItems.get(id) || null;
  }

  // ==========================================
  // CONFLICT RESOLUTION
  // ==========================================

  public getConflicts(): Memory[] {
    return Array.from(this.memories.values()).filter((m) => m.status === 'CONFLICTING');
  }

  public resolveConflict(memoryId: string, chosenStatus: 'ACTIVE' | 'ARCHIVED' | 'DISCARDED', notes?: string): boolean {
    const mem = this.memories.get(memoryId);
    if (!mem) return false;

    mem.status = chosenStatus;
    mem.updatedAt = Date.now();
    if (notes) {
      mem.content = `${mem.content}\n[Conflict Resolved]: ${notes}`;
    }

    // Resolve paired conflicts if applicable
    if (mem.conflictWith) {
      mem.conflictWith.forEach((otherId) => {
        const other = this.memories.get(otherId);
        if (other && other.status === 'CONFLICTING') {
          other.status = chosenStatus === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
          this.memories.set(other.id, other);
        }
      });
    }

    this.memories.set(mem.id, mem);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  // ==========================================
  // WORKER CONTEXT COMPILATION
  // ==========================================

  public buildWorkerContext(query: MemoryContextQuery): WorkerMemoryContext {
    return MemoryContextBuilder.buildWorkerContext(
      query,
      this.getAllMemories(),
      Array.from(this.researchItems.values())
    );
  }

  // ==========================================
  // OVERVIEW & METRICS
  // ==========================================

  public getOverviewStats(): MemoryOverviewStats {
    const list = this.getAllMemories();
    const now = Date.now();
    const twentyFourHours = 3600000 * 24;

    return {
      totalCount: list.length,
      activeCount: list.filter((m) => m.status === 'ACTIVE').length,
      researchCount: this.researchItems.size + list.filter((m) => m.type === 'RESEARCH').length,
      preferenceCount: list.filter((m) => m.type === 'USER_PREFERENCE').length,
      importantCount: list.filter((m) => m.importance === 'CRITICAL' || m.importance === 'HIGH').length,
      archivedCount: list.filter((m) => m.status === 'ARCHIVED').length,
      temporaryCount: list.filter((m) => m.retention === 'SESSION' || m.type === 'TEMPORARY').length,
      conflictCount: list.filter((m) => m.status === 'CONFLICTING').length,
      recentCount: list.filter((m) => now - m.updatedAt < twentyFourHours).length,
    };
  }

  /**
   * Resets memory for unit tests
   */
  public resetForTesting(): void {
    this.memories.clear();
    this.researchItems.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(MEMORY_STORAGE_KEY);
        localStorage.removeItem(RESEARCH_STORAGE_KEY);
      } catch (e) {
        // ignore
      }
    }
  }
}

export const advancedMemoryManager = AdvancedMemoryManager.getInstance();
