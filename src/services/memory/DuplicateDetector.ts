/**
 * PART 12 — Duplicate Memory Detector
 * Detects exact duplicates, normalized phrasing, and intent-level matches
 * to prevent memory bloat and recommend UPDATE_EXISTING.
 */

import { Memory } from './MemoryTypes';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: 'EXACT' | 'NORMALIZED' | 'INTENT' | 'NONE';
  existingMemory?: Memory;
  similarityScore: number; // 0 to 1
  reason?: string;
}

export class DuplicateDetector {
  /**
   * Normalizes text for comparison: lowercases, removes punctuation, trims extra whitespace
   */
  public static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts meaningful keywords (removes common stop words)
   */
  public static extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'their',
      'this', 'that', 'these', 'those', 'please', 'just', 'always', 'want', 'like'
    ]);

    return DuplicateDetector.normalize(text)
      .split(' ')
      .filter((w) => w.length > 2 && !stopWords.has(w));
  }

  /**
   * Calculates Jaccard similarity between two texts based on keyword overlap
   */
  public static calculateKeywordSimilarity(textA: string, textB: string): number {
    const setA = new Set(DuplicateDetector.extractKeywords(textA));
    const setB = new Set(DuplicateDetector.extractKeywords(textB));

    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    setA.forEach((token) => {
      if (setB.has(token)) intersection++;
    });

    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Checks if candidate content matches any existing memory
   */
  public static findDuplicate(
    candidateTitle: string,
    candidateContent: string,
    existingMemories: Memory[]
  ): DuplicateCheckResult {
    const normTitle = DuplicateDetector.normalize(candidateTitle);
    const normContent = DuplicateDetector.normalize(candidateContent);

    for (const mem of existingMemories) {
      if (mem.status === 'DISCARDED' || mem.status === 'EXPIRED') continue;

      const memNormTitle = DuplicateDetector.normalize(mem.title);
      const memNormContent = DuplicateDetector.normalize(mem.content);

      // 1. Exact match
      if (normContent === memNormContent || (normTitle.length > 5 && normTitle === memNormTitle)) {
        return {
          isDuplicate: true,
          matchType: 'EXACT',
          existingMemory: mem,
          similarityScore: 1.0,
          reason: `Exact match with existing memory: "${mem.title}"`,
        };
      }

      // 2. Substring / high containment match
      if (
        (normContent.length > 15 && memNormContent.includes(normContent)) ||
        (memNormContent.length > 15 && normContent.includes(memNormContent))
      ) {
        return {
          isDuplicate: true,
          matchType: 'NORMALIZED',
          existingMemory: mem,
          similarityScore: 0.9,
          reason: `Contained within existing memory: "${mem.title}"`,
        };
      }

      // 3. Keyword / Intent similarity for user preferences
      const sim = DuplicateDetector.calculateKeywordSimilarity(normContent, memNormContent);
      if (sim >= 0.65) {
        return {
          isDuplicate: true,
          matchType: 'INTENT',
          existingMemory: mem,
          similarityScore: sim,
          reason: `High semantic similarity (${Math.round(sim * 100)}%) with "${mem.title}"`,
        };
      }

      // 4. Intent matching for common preference topics
      if (DuplicateDetector.matchesSamePreferenceTopic(normContent, memNormContent)) {
        return {
          isDuplicate: true,
          matchType: 'INTENT',
          existingMemory: mem,
          similarityScore: 0.8,
          reason: `Targets same preference topic as: "${mem.title}"`,
        };
      }
    }

    return {
      isDuplicate: false,
      matchType: 'NONE',
      similarityScore: 0,
    };
  }

  /**
   * Checks specific intent equivalence for preference statements
   */
  private static matchesSamePreferenceTopic(a: string, b: string): boolean {
    const preferenceTopics = [
      ['short', 'concise', 'brief', 'answers', 'responses', 'replies'],
      ['video', 'title', 'titles', 'headlines', 'length'],
      ['tone', 'voice', 'style', 'casual', 'formal', 'professional'],
      ['dark', 'theme', 'mode', 'light', 'interface'],
      ['language', 'english', 'speed', 'pace'],
    ];

    for (const cluster of preferenceTopics) {
      const matchA = cluster.filter((word) => a.includes(word)).length >= 2;
      const matchB = cluster.filter((word) => b.includes(word)).length >= 2;
      if (matchA && matchB) {
        return true;
      }
    }
    return false;
  }
}
