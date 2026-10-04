/**
 * PART 9 — FRIDAY Agent Memory
 * Dedicated storage for agent workflow history, structured worker findings,
 * approved strategies, research summaries, and performance insights.
 * Synchronizes with local storage and falls back safely in headless environments.
 */

import { AgentMemoryItem, WorkflowPlan } from './AgentTypes';

const STORAGE_KEY = 'friday_agent_memory';

export class AgentMemory {
  private static instance: AgentMemory;
  private items: AgentMemoryItem[] = [];
  private workflowHistory: WorkflowPlan[] = [];

  private constructor() {
    this.load();
  }

  public static getInstance(): AgentMemory {
    if (!AgentMemory.instance) {
      AgentMemory.instance = new AgentMemory();
    }
    return AgentMemory.instance;
  }

  private load(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.items = Array.isArray(parsed.items) ? parsed.items : [];
        this.workflowHistory = Array.isArray(parsed.workflowHistory) ? parsed.workflowHistory : [];
      }
    } catch (e) {
      console.error('[AgentMemory] Failed to load localStorage:', e);
    }
  }

  private save(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            items: this.items,
            workflowHistory: this.workflowHistory.slice(0, 30), // keep latest 30 workflows
          })
        );
      } catch (e) {
        console.error('[AgentMemory] Failed to save localStorage:', e);
      }
    }
  }

  public remember(params: {
    category: AgentMemoryItem['category'];
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }): AgentMemoryItem {
    const item: AgentMemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: params.category,
      title: params.title.trim(),
      content: params.content.trim(),
      metadata: params.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.items.unshift(item);
    this.save();
    return item;
  }

  public query(queryText: string, category?: AgentMemoryItem['category']): AgentMemoryItem[] {
    const q = queryText.toLowerCase().trim();
    return this.items.filter((item) => {
      if (category && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }

  public getAll(): AgentMemoryItem[] {
    return [...this.items];
  }

  public getAllMemories(): AgentMemoryItem[] {
    return this.getAll();
  }

  public saveWorkflow(workflow: WorkflowPlan): void {
    const idx = this.workflowHistory.findIndex((w) => w.id === workflow.id);
    if (idx !== -1) {
      this.workflowHistory[idx] = workflow;
    } else {
      this.workflowHistory.unshift(workflow);
    }
    this.save();
  }

  public getWorkflowHistory(): WorkflowPlan[] {
    return [...this.workflowHistory];
  }

  public getWorkflow(workflowId: string): WorkflowPlan | undefined {
    return this.workflowHistory.find((w) => w.id === workflowId);
  }
}

export const agentMemory = AgentMemory.getInstance();
