/**
 * PART 12 — Memory Context Builder
 * Assembles small, highly relevant memory contexts tailored for specific Workers
 * and operational tasks without overwhelming prompt budgets or sending redundant records.
 */

import {
  Memory,
  ResearchMemoryItem,
  MemoryContextQuery,
  WorkerMemoryContext,
} from './MemoryTypes';
import { MemorySearchService } from './MemorySearchService';

export class MemoryContextBuilder {
  /**
   * Builds compact, prioritized memory context for an active Worker or task
   */
  public static buildWorkerContext(
    query: MemoryContextQuery,
    allMemories: Memory[],
    allResearch: ResearchMemoryItem[]
  ): WorkerMemoryContext {
    const workerId = query.activeWorker || 'worker-manager';
    const limit = query.limit || 5;

    // 1. Identify relevant preferences
    const relevantPreferences = MemorySearchService.search(allMemories, {
      type: 'USER_PREFERENCE',
      status: 'ACTIVE',
      query: query.currentTask || query.userRequest,
      limit,
    });

    // 2. Identify relevant project memories
    const relevantProjects = MemorySearchService.search(allMemories, {
      types: ['PROJECT', 'BUSINESS', 'WORKFLOW'],
      status: 'ACTIVE',
      project: query.project,
      query: query.currentTask || query.userRequest,
      limit,
    });

    // 3. Identify relevant tasks
    const relevantTasks = MemorySearchService.search(allMemories, {
      type: 'TASK',
      status: 'ACTIVE',
      worker: workerId,
      limit: 3,
    });

    // 4. Identify relevant research findings
    const relevantResearch = allResearch
      .filter((r) => {
        if (r.status === 'ARCHIVED' || r.status === 'DISCARDED') return false;
        if (query.project && r.relatedProject && r.relatedProject !== query.project) return false;
        if (query.currentTask) {
          const tLower = query.currentTask.toLowerCase();
          return (
            r.topic.toLowerCase().includes(tLower) ||
            r.finding.toLowerCase().includes(tLower) ||
            r.tags.some((tag) => tLower.includes(tag.toLowerCase()))
          );
        }
        return true;
      })
      .slice(0, limit);

    // 5. Build worker-specific operational directives
    const activeDirectives = MemoryContextBuilder.getWorkerDirectives(workerId, relevantPreferences);

    // 6. Generate brief text summary for prompt injection
    const summaryLines: string[] = [];
    if (relevantPreferences.length > 0) {
      summaryLines.push(
        `PREFERENCES: ${relevantPreferences.map((p) => p.summary || p.title).join('; ')}`
      );
    }
    if (relevantProjects.length > 0) {
      summaryLines.push(
        `PROJECT CONTEXT: ${relevantProjects.map((p) => p.title).join('; ')}`
      );
    }
    if (relevantResearch.length > 0) {
      summaryLines.push(
        `RESEARCH FINDINGS: ${relevantResearch
          .map((r) => `[${r.confidence}] ${r.topic}: ${r.finding.slice(0, 80)}...`)
          .join(' | ')}`
      );
    }

    return {
      workerId,
      relevantPreferences,
      relevantResearch,
      relevantProjects,
      relevantTasks,
      activeDirectives,
      contextSummary: summaryLines.join('\n') || 'Standard operational parameters active.',
    };
  }

  /**
   * Derives role-specific directives matching worker specialization
   */
  private static getWorkerDirectives(workerId: string, preferences: Memory[]): string[] {
    const directives: string[] = [];

    // Apply global preferences
    preferences.forEach((p) => {
      directives.push(`Honor preference: ${p.title}`);
    });

    // Worker role specific rules
    if (workerId.includes('research') || workerId.includes('nova')) {
      directives.push('Record verifiable sources and explicit evidence for all claims.');
      directives.push('Distinguish verified data from partial hypotheses.');
    } else if (workerId.includes('coder') || workerId.includes('zephyr')) {
      directives.push('Maintain TypeScript strict typing and modular architecture.');
    } else if (workerId.includes('business') || workerId.includes('orion')) {
      directives.push('Align recommendations with active business goals and target audience.');
    } else if (workerId.includes('content') || workerId.includes('echo')) {
      directives.push('Observe platform tone guidelines and avoid clickbait cliches.');
    }

    return directives;
  }
}
