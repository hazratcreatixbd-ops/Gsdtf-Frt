/**
 * PART 10 — FRIDAY Structured Business Memory Manager
 * Integrates directly with existing FRIDAY Memory (Part 2), Business Intelligence (Part 7),
 * and Agent Memory (Part 9). Does not duplicate storage; synchronizes structured knowledge.
 */

import { StructuredBusinessMemory, BusinessWorkflow } from '../types/workflowEngine';
import { businessIntelligenceManager } from './BusinessIntelligenceManager';
import { agentMemory } from './agents/AgentMemory';

const STORAGE_KEY = 'friday_structured_business_memory';

export class BusinessMemoryManager {
  private static instance: BusinessMemoryManager;
  private memory: StructuredBusinessMemory;

  private constructor() {
    this.memory = this.loadMemory();
  }

  public static getInstance(): BusinessMemoryManager {
    if (!BusinessMemoryManager.instance) {
      BusinessMemoryManager.instance = new BusinessMemoryManager();
    }
    return BusinessMemoryManager.instance;
  }

  private loadMemory(): StructuredBusinessMemory {
    const biz = businessIntelligenceManager.getProfile();
    const defaultMemory: StructuredBusinessMemory = {
      businessName: biz.businessName || 'Digital Venture',
      services: biz.services && biz.services.length > 0 ? biz.services : ['Video Production', 'Content Marketing', 'Strategy Consultation'],
      targetAudience: biz.targetAudience || 'Founders, Creators, and Growth-focused Businesses',
      brandVoice: biz.brandVoice || 'Authoritative, engaging, witty, and transparent',
      contentPreferences: ['High-impact short form', 'In-depth breakdown videos', 'Case studies'],
      preferredPlatforms: biz.preferredChannels && biz.preferredChannels.length > 0 ? biz.preferredChannels : ['YouTube', 'LinkedIn', 'Instagram', 'TikTok'],
      businessGoals: biz.businessGoals && biz.businessGoals.length > 0 ? biz.businessGoals : ['Scale client acquisition', 'Build automated content engine'],
      recurringCampaigns: ['Weekly Client Highlight', 'Monthly Industry Deep-Dive'],
      projectInformation: {
        currentFocus: '30-Day Growth Campaign & Pipeline Automation',
        operationalModel: 'AI-assisted high-velocity digital agency',
      },
      approvedStrategies: [],
      previousWorkflowResults: [],
      updatedAt: Date.now(),
    };

    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultMemory;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...defaultMemory,
          ...parsed,
          businessName: parsed.businessName || defaultMemory.businessName,
          services: parsed.services || defaultMemory.services,
          targetAudience: parsed.targetAudience || defaultMemory.targetAudience,
          brandVoice: parsed.brandVoice || defaultMemory.brandVoice,
          preferredPlatforms: parsed.preferredPlatforms || defaultMemory.preferredPlatforms,
        };
      }
    } catch (e) {
      console.error('[BusinessMemoryManager] Error loading business memory:', e);
    }

    return defaultMemory;
  }

  public saveMemory(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
      } catch (e) {
        console.error('[BusinessMemoryManager] Error saving business memory:', e);
      }
    }
  }

  public getBusinessMemory(): StructuredBusinessMemory {
    // Keep aligned with any updates in Business Intelligence Profile
    const biz = businessIntelligenceManager.getProfile();
    if (biz.businessName && biz.businessName !== this.memory.businessName) {
      this.memory.businessName = biz.businessName;
    }
    return { ...this.memory };
  }

  public updateBusinessMemory(updates: Partial<StructuredBusinessMemory>): StructuredBusinessMemory {
    this.memory = {
      ...this.memory,
      ...updates,
      updatedAt: Date.now(),
    };

    // Sync back to BusinessIntelligence profile where appropriate
    if (updates.businessName || updates.services || updates.targetAudience || updates.brandVoice) {
      businessIntelligenceManager.updateProfile({
        businessName: this.memory.businessName,
        services: this.memory.services,
        targetAudience: this.memory.targetAudience,
        brandVoice: this.memory.brandVoice,
        preferredChannels: this.memory.preferredPlatforms,
      });
    }

    // Record into Agent Memory as contextual knowledge
    agentMemory.remember({
      category: 'business_context',
      title: `Business Profile Updated: ${this.memory.businessName}`,
      content: `Target: ${this.memory.targetAudience} | Brand Voice: ${this.memory.brandVoice} | Services: ${this.memory.services.join(', ')}`,
      metadata: { updatedAt: this.memory.updatedAt },
    });

    this.saveMemory();
    return { ...this.memory };
  }

  public recordWorkflowResult(workflow: BusinessWorkflow): void {
    const summary = workflow.summaryReport || `Workflow "${workflow.goal}" completed with ${workflow.steps.filter((s) => s.status === 'COMPLETED').length} steps.`;
    const entry = {
      workflowId: workflow.workflowId,
      goal: workflow.goal,
      completedAt: Date.now(),
      summary,
    };

    this.memory.previousWorkflowResults = [
      entry,
      ...this.memory.previousWorkflowResults.filter((w) => w.workflowId !== workflow.workflowId),
    ].slice(0, 20);

    agentMemory.remember({
      category: 'workflow_history',
      title: `Workflow Completed: ${workflow.goal}`,
      content: summary,
      metadata: { workflowId: workflow.workflowId, status: workflow.status },
    });

    this.saveMemory();
  }

  public recordApprovedStrategy(title: string, summary: string): void {
    const item = {
      id: `strat_${Date.now()}`,
      title,
      summary,
      approvedAt: Date.now(),
    };

    this.memory.approvedStrategies = [item, ...this.memory.approvedStrategies].slice(0, 15);

    agentMemory.remember({
      category: 'approved_strategy',
      title: `Approved Strategy: ${title}`,
      content: summary,
    });

    this.saveMemory();
  }

  public recordCampaign(name: string): void {
    if (!this.memory.recurringCampaigns.includes(name)) {
      this.memory.recurringCampaigns.push(name);
      this.saveMemory();
    }
  }
}

export const businessMemoryManager = BusinessMemoryManager.getInstance();
