/**
 * PART 12 — Research Memory Filter & Source Provenance Evaluator
 * Evaluates candidate research findings: KEEP, UPDATE, TEMPORARY, LOW_VALUE, DUPLICATE, CONFLICTING, UNVERIFIED
 * Retains rigorous provenance and stores uncertainty rather than claiming unverified assertions as fact.
 */

import { ResearchMemoryItem, ResearchFilterVerdict, MemoryProvenance, MemoryConfidence } from './MemoryTypes';
import { DuplicateDetector } from './DuplicateDetector';

export interface ResearchCandidateInput {
  topic: string;
  finding: string;
  source: MemoryProvenance;
  evidence?: string;
  relevance?: number;
  tags?: string[];
  relatedProject?: string;
  relatedWorker?: string;
}

export class ResearchMemoryFilter {
  /**
   * Evaluates research candidate against existing research base
   */
  public static filterFinding(
    candidate: ResearchCandidateInput,
    existingItems: ResearchMemoryItem[]
  ): ResearchFilterVerdict {
    const rawFinding = candidate.finding.trim();
    const rawTopic = candidate.topic.trim();

    // 1. Check for empty or low-value content
    if (rawFinding.length < 10 || rawTopic.length < 2) {
      return {
        action: 'LOW_VALUE',
        reason: 'Finding or topic contains insufficient depth or substance.',
        confidence: 'UNVERIFIED',
      };
    }

    // 2. Check for trivial opinions vs empirical facts
    if (ResearchMemoryFilter.isSubjectiveOpinion(rawFinding)) {
      return {
        action: 'LOW_VALUE',
        reason: 'Finding appears to be speculative opinion without empirical backing.',
        confidence: 'UNVERIFIED',
      };
    }

    // 3. Source Provenance Verification
    const confidence = ResearchMemoryFilter.determineConfidence(candidate.source, candidate.evidence);

    // 4. Check for duplicates in existing research
    for (const item of existingItems) {
      if (item.status === 'DISCARDED') continue;

      const sim = DuplicateDetector.calculateKeywordSimilarity(rawFinding, item.finding);
      if (sim >= 0.75) {
        return {
          action: 'DUPLICATE',
          reason: `Substantially identical to existing research finding #${item.id} on topic "${item.topic}".`,
          confidence: item.confidence,
          existingId: item.id,
        };
      }

      // Check if candidate updates existing finding with higher confidence
      if (item.topic.toLowerCase() === rawTopic.toLowerCase() && sim >= 0.5) {
        return {
          action: 'UPDATE',
          reason: `Provides updated finding for existing research record #${item.id}.`,
          confidence,
          existingId: item.id,
        };
      }

      // Check for contradiction in numeric / factual findings
      if (ResearchMemoryFilter.isContradictoryResearch(rawFinding, item.finding)) {
        return {
          action: 'CONFLICTING',
          reason: `Direct empirical conflict detected with existing finding on "${item.topic}".`,
          confidence: 'PARTIAL',
          existingId: item.id,
        };
      }
    }

    // 5. Unverified source without citations
    if (confidence === 'UNVERIFIED') {
      return {
        action: 'UNVERIFIED',
        reason: 'Finding stored with unverified status pending corroborating source/evidence.',
        confidence: 'UNVERIFIED',
      };
    }

    // 6. Passed all checks -> KEEP
    return {
      action: 'KEEP',
      reason: 'Structured finding with verifiable provenance and strong relevance.',
      confidence,
    };
  }

  /**
   * Determines confidence tier based on real provenance & evidence
   */
  public static determineConfidence(
    source: MemoryProvenance,
    evidence?: string
  ): MemoryConfidence {
    const hasEvidence = Boolean(evidence && evidence.trim().length > 15);
    const hasUrl = Boolean(source.sourceUrl && source.sourceUrl.startsWith('http'));

    if (source.sourceType === 'WEB') {
      if (hasUrl && hasEvidence) return 'VERIFIED';
      if (hasUrl || hasEvidence) return 'PARTIAL';
      return 'UNVERIFIED';
    }

    if (source.sourceType === 'DOCUMENT' || source.sourceType === 'TOOL') {
      if (hasEvidence) return 'VERIFIED';
      return 'PARTIAL';
    }

    if (source.sourceType === 'WORKER') {
      if (hasEvidence) return 'PARTIAL';
      return 'UNVERIFIED';
    }

    if (source.sourceType === 'USER') {
      return 'PARTIAL'; // User-reported facts are kept as partial/subjective assertions
    }

    return 'UNVERIFIED';
  }

  private static isSubjectiveOpinion(text: string): boolean {
    const opinionPhrases = [
      /i think/i,
      /maybe it is/i,
      /probably/i,
      /just a feeling/i,
      /in my humble opinion/i,
    ];
    return opinionPhrases.some((re) => re.test(text));
  }

  private static isContradictoryResearch(a: string, b: string): boolean {
    // Check for contradictory percentages: e.g. "growing at 15%" vs "growing at 45%"
    const pctRegex = /(\d+(?:\.\d+)?)\s*%/g;
    const matchesA = Array.from(a.matchAll(pctRegex)).map((m) => m[1]);
    const matchesB = Array.from(b.matchAll(pctRegex)).map((m) => m[1]);

    if (matchesA.length > 0 && matchesB.length > 0) {
      const hasOverlap = matchesA.some((val) => matchesB.includes(val));
      if (!hasOverlap && (a.includes('growth') || a.includes('rate') || a.includes('share'))) {
        return true;
      }
    }
    return false;
  }
}
