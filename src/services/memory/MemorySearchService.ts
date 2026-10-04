/**
 * PART 12 — Memory Search Service
 * High-performance search & filtering across memories and research findings.
 * Supports keywords, tags, dates, importance, workers, projects, and semantic ranking.
 */

import { Memory, MemorySearchParams, MemoryImportance } from './MemoryTypes';
import { DuplicateDetector } from './DuplicateDetector';

const IMPORTANCE_WEIGHTS: Record<MemoryImportance, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export class MemorySearchService {
  /**
   * Searches and filters memory collection according to MemorySearchParams
   */
  public static search(memories: Memory[], params: MemorySearchParams): Memory[] {
    const query = params.query ? params.query.toLowerCase().trim() : '';
    const queryTokens = query ? DuplicateDetector.extractKeywords(query) : [];

    let results = memories.filter((mem) => {
      // 1. Status Filter
      if (params.status && mem.status !== params.status) {
        return false;
      }
      if (!params.includeArchived && !params.status && mem.status === 'ARCHIVED') {
        return false;
      }
      if (mem.status === 'DISCARDED') {
        return false;
      }

      // 2. Type Filter
      if (params.type && mem.type !== params.type) {
        return false;
      }
      if (params.types && params.types.length > 0 && !params.types.includes(mem.type)) {
        return false;
      }

      // 3. Importance Filter
      if (params.importance && mem.importance !== params.importance) {
        return false;
      }
      if (params.minImportance) {
        const memWeight = IMPORTANCE_WEIGHTS[mem.importance] || 1;
        const reqWeight = IMPORTANCE_WEIGHTS[params.minImportance] || 1;
        if (memWeight < reqWeight) return false;
      }

      // 4. Retention Filter
      if (params.retention && mem.retention !== params.retention) {
        return false;
      }

      // 5. Confidence Filter
      if (params.confidence && mem.confidence !== params.confidence) {
        return false;
      }

      // 6. Project Filter
      if (params.project) {
        const pLower = params.project.toLowerCase();
        const hasProject = mem.relatedProjects.some((p) => p.toLowerCase().includes(pLower));
        if (!hasProject) return false;
      }

      // 7. Worker Filter
      if (params.worker) {
        const wLower = params.worker.toLowerCase();
        const hasWorker = mem.relatedWorkers.some((w) => w.toLowerCase().includes(wLower));
        if (!hasWorker) return false;
      }

      // 8. Date Range Filter
      if (params.minDate && mem.createdAt < params.minDate) return false;
      if (params.maxDate && mem.createdAt > params.maxDate) return false;

      // 9. Tag Filter
      if (params.tags && params.tags.length > 0) {
        const memTags = mem.tags.map((t) => t.toLowerCase());
        const matchesTag = params.tags.some((t) => memTags.includes(t.toLowerCase()));
        if (!matchesTag) return false;
      }

      // 10. Keyword Query Match
      if (query) {
        const titleLower = mem.title.toLowerCase();
        const contentLower = mem.content.toLowerCase();
        const summaryLower = mem.summary.toLowerCase();
        const tagsJoined = mem.tags.join(' ').toLowerCase();

        // Exact substring hit
        if (
          titleLower.includes(query) ||
          contentLower.includes(query) ||
          summaryLower.includes(query) ||
          tagsJoined.includes(query)
        ) {
          return true;
        }

        // Token match
        if (queryTokens.length > 0) {
          const matchedCount = queryTokens.filter(
            (t) => titleLower.includes(t) || contentLower.includes(t) || tagsJoined.includes(t)
          ).length;
          return matchedCount >= Math.ceil(queryTokens.length * 0.5);
        }

        return false;
      }

      return true;
    });

    // Score and rank results
    results.sort((a, b) => {
      // Relevance score
      let scoreA = IMPORTANCE_WEIGHTS[a.importance] * 10;
      let scoreB = IMPORTANCE_WEIGHTS[b.importance] * 10;

      if (query) {
        if (a.title.toLowerCase().includes(query)) scoreA += 50;
        if (b.title.toLowerCase().includes(query)) scoreB += 50;
        if (a.content.toLowerCase().includes(query)) scoreA += 20;
        if (b.content.toLowerCase().includes(query)) scoreB += 20;
      }

      // Recency bias (newer memories have small score boost)
      scoreA += (a.updatedAt / 100000000000);
      scoreB += (b.updatedAt / 100000000000);

      return scoreB - scoreA;
    });

    // Pagination
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    return results.slice(offset, offset + limit);
  }
}
