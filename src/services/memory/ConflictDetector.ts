/**
 * PART 12 — Conflict Detector
 * Detects contradictory memories (e.g. conflicting prices, divergent specs, opposing preferences)
 * Marks them CONFLICTING rather than silently assuming truth, preserving provenance.
 */

import { Memory } from './MemoryTypes';
import { DuplicateDetector } from './DuplicateDetector';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingMemory?: Memory;
  conflictReason?: string;
  topic?: string;
}

export class ConflictDetector {
  /**
   * Scans existing memories to check if candidate statement directly contradicts an existing one
   */
  public static detectConflict(
    candidateTitle: string,
    candidateContent: string,
    existingMemories: Memory[]
  ): ConflictCheckResult {
    const normTitle = DuplicateDetector.normalize(candidateTitle);
    const normContent = DuplicateDetector.normalize(candidateContent);

    for (const mem of existingMemories) {
      if (mem.status === 'ARCHIVED' || mem.status === 'DISCARDED') continue;

      const memNormTitle = DuplicateDetector.normalize(mem.title);
      const memNormContent = DuplicateDetector.normalize(mem.content);

      // Check 1: Key-Value / Numeric contradiction (e.g. "price is $50" vs "price is $100")
      const kvConflict = ConflictDetector.checkKeyValueContradiction(normContent, memNormContent);
      if (kvConflict.conflict) {
        return {
          hasConflict: true,
          conflictingMemory: mem,
          conflictReason: kvConflict.reason,
          topic: kvConflict.topic,
        };
      }

      // Check 2: Same topic / entity with mutually exclusive assertions
      const entityConflict = ConflictDetector.checkEntityContradiction(normTitle, normContent, memNormTitle, memNormContent);
      if (entityConflict.conflict) {
        return {
          hasConflict: true,
          conflictingMemory: mem,
          conflictReason: entityConflict.reason,
          topic: entityConflict.topic,
        };
      }
    }

    return { hasConflict: false };
  }

  private static checkKeyValueContradiction(
    a: string,
    b: string
  ): { conflict: boolean; reason?: string; topic?: string } {
    // Check price patterns: $XX or XX dollars or price XX
    const priceRegex = /(?:price|cost|fee|rate)(?:\s*(?:is|of|=|:)?\s*)?\$?(\d+(?:\.\d+)?)/i;
    const matchA = a.match(priceRegex);
    const matchB = b.match(priceRegex);

    if (matchA && matchB) {
      const valA = matchA[1];
      const valB = matchB[1];
      if (valA !== valB) {
        return {
          conflict: true,
          reason: `Contradictory values detected for price/cost: "${valA}" vs "${valB}"`,
          topic: 'price',
        };
      }
    }

    // Check project/business name contradiction
    const nameRegex = /(?:project|business|company|app|system)\s+(?:name|title)\s*(?:is|was|=|:)?\s*([a-z0-9_-]+)/i;
    const nameA = a.match(nameRegex);
    const nameB = b.match(nameRegex);

    if (nameA && nameB) {
      const nA = nameA[1].trim();
      const nB = nameB[1].trim();
      if (nA !== nB && nA.length > 2 && nB.length > 2) {
        return {
          conflict: true,
          reason: `Contradictory name asserted: "${nA}" vs "${nB}"`,
          topic: 'naming',
        };
      }
    }

    return { conflict: false };
  }

  private static checkEntityContradiction(
    titleA: string,
    contentA: string,
    titleB: string,
    contentB: string
  ): { conflict: boolean; reason?: string; topic?: string } {
    // Mutually exclusive preference pairs
    const opposingPairs: [string, string][] = [
      ['prefer dark mode', 'prefer light mode'],
      ['prefer short', 'prefer long'],
      ['prefer concise', 'prefer detailed'],
      ['english only', 'spanish only'],
      ['enable audio', 'disable audio'],
      ['mute', 'unmute'],
    ];

    for (const [pos, neg] of opposingPairs) {
      const aHasPos = contentA.includes(pos) || titleA.includes(pos);
      const aHasNeg = contentA.includes(neg) || titleA.includes(neg);
      const bHasPos = contentB.includes(pos) || titleB.includes(pos);
      const bHasNeg = contentB.includes(neg) || titleB.includes(neg);

      if ((aHasPos && bHasNeg) || (aHasNeg && bHasPos)) {
        return {
          conflict: true,
          reason: `Mutually exclusive preference statement: "${pos}" vs "${neg}"`,
          topic: 'preference',
        };
      }
    }

    return { conflict: false };
  }
}
