/**
 * PART 12 — Memory Decision Engine
 * Evaluates candidate information to decide:
 * SAVE, UPDATE_EXISTING, TEMPORARY_ONLY, ARCHIVE, DISCARD
 * Enforces security boundaries (blocks passwords, tokens, API keys) and
 * filters fleeting conversation noise from persistent memory.
 */

import {
  Memory,
  MemoryDecision,
  MemoryType,
  MemoryRetention,
  MemoryImportance,
  MemorySensitivity,
} from './MemoryTypes';
import { DuplicateDetector } from './DuplicateDetector';
import { ConflictDetector } from './ConflictDetector';

export interface CandidateMemoryInput {
  title?: string;
  content: string;
  suggestedType?: MemoryType;
  suggestedImportance?: MemoryImportance;
  sourceType?: 'USER' | 'WORKER' | 'WEB' | 'TOOL' | 'SYSTEM' | 'DOCUMENT' | 'VOICE';
  sourceName?: string;
  tags?: string[];
  relatedProject?: string;
  relatedTask?: string;
  metadata?: Record<string, any>;
}

export class MemoryDecisionEngine {
  /**
   * Security scanner: checks for credentials, passwords, tokens, private keys
   */
  public static scanSensitivity(text: string): { isSensitive: boolean; sensitivity: MemorySensitivity; reason?: string } {
    const secretPatterns = [
      /(?:password|passwd|pwd)\s*(?:is|=|:)\s*[^\s]+/i,
      /(?:api[_-]?key|secret[_-]?key|access[_-]?token|bearer\s+[a-z0-9_\-\.]+)/i,
      /AIza[0-9A-Za-z-_]{35}/, // Google API key pattern
      /sk-[a-zA-Z0-9]{20,}/,  // Common secret key pattern
      /ghp_[a-zA-Z0-9]{36}/,  // GitHub token pattern
    ];

    for (const pat of secretPatterns) {
      if (pat.test(text)) {
        return {
          isSensitive: true,
          sensitivity: 'SECRET',
          reason: 'Contains confidential authentication credential or security token.',
        };
      }
    }

    const sensitivePatterns = [
      /(?:credit\s*card|ssn|social\s*security|bank\s*account)/i,
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card numbers
    ];

    for (const pat of sensitivePatterns) {
      if (pat.test(text)) {
        return {
          isSensitive: true,
          sensitivity: 'SENSITIVE',
          reason: 'Contains personal or financial identifier.',
        };
      }
    }

    return {
      isSensitive: false,
      sensitivity: 'PUBLIC',
    };
  }

  /**
   * Evaluates candidate memory against active memory store and deterministic rules
   */
  public static evaluateCandidate(
    input: CandidateMemoryInput,
    existingMemories: Memory[]
  ): MemoryDecision {
    const rawContent = input.content.trim();
    const title = input.title?.trim() || rawContent.slice(0, 48);

    // Rule 1: Security Rule — Never store secrets, passwords, or authentication keys
    const securityCheck = MemoryDecisionEngine.scanSensitivity(rawContent);
    if (securityCheck.sensitivity === 'SECRET') {
      return {
        action: 'DISCARD',
        reason: `Security rule violation: ${securityCheck.reason}`,
        confidence: 1.0,
        suggestedType: 'SYSTEM',
        suggestedRetention: 'SESSION',
        suggestedImportance: 'LOW',
      };
    }

    // Rule 2: Fleeting conversation noise / trivial temporary statements
    if (MemoryDecisionEngine.isFleetingNoise(rawContent)) {
      return {
        action: 'DISCARD',
        reason: 'Fleeting conversation filler without enduring utility.',
        confidence: 0.95,
        suggestedType: 'TEMPORARY',
        suggestedRetention: 'SESSION',
        suggestedImportance: 'LOW',
      };
    }

    // Rule 3: Weather or short-lived environmental context
    if (MemoryDecisionEngine.isTemporaryContext(rawContent)) {
      return {
        action: 'TEMPORARY_ONLY',
        reason: 'Temporary ambient or daily status context; expires quickly.',
        confidence: 0.9,
        suggestedType: 'TEMPORARY',
        suggestedRetention: 'SHORT_TERM',
        suggestedImportance: 'LOW',
      };
    }

    // Rule 4: Duplicate Check — If matching memory exists, recommend UPDATE_EXISTING
    const dupCheck = DuplicateDetector.findDuplicate(title, rawContent, existingMemories);
    if (dupCheck.isDuplicate && dupCheck.existingMemory) {
      return {
        action: 'UPDATE_EXISTING',
        targetMemoryId: dupCheck.existingMemory.id,
        reason: dupCheck.reason || 'Equivalent information already exists; updating existing record.',
        confidence: dupCheck.similarityScore,
        suggestedType: dupCheck.existingMemory.type,
        suggestedRetention: dupCheck.existingMemory.retention,
        suggestedImportance: dupCheck.existingMemory.importance,
      };
    }

    // Rule 5: User Preferences
    if (MemoryDecisionEngine.isUserPreference(rawContent, input.suggestedType)) {
      return {
        action: 'SAVE',
        reason: 'User preference identified with enduring high utility.',
        confidence: 0.92,
        suggestedType: 'USER_PREFERENCE',
        suggestedRetention: 'LONG_TERM',
        suggestedImportance: 'HIGH',
      };
    }

    // Rule 6: Research Findings
    if (input.suggestedType === 'RESEARCH' || MemoryDecisionEngine.isResearchFinding(rawContent)) {
      return {
        action: 'SAVE',
        reason: 'Structured factual finding or market research evidence.',
        confidence: 0.88,
        suggestedType: 'RESEARCH',
        suggestedRetention: 'LONG_TERM',
        suggestedImportance: 'HIGH',
      };
    }

    // Rule 7: Business Architecture & Directives
    if (input.suggestedType === 'BUSINESS' || MemoryDecisionEngine.isBusinessDirective(rawContent)) {
      return {
        action: 'SAVE',
        reason: 'Strategic business intelligence or operational parameter.',
        confidence: 0.9,
        suggestedType: 'BUSINESS',
        suggestedRetention: 'LONG_TERM',
        suggestedImportance: 'HIGH',
      };
    }

    // Rule 8: Task or Project Milestones
    if (input.relatedTask || input.relatedProject || input.suggestedType === 'PROJECT' || input.suggestedType === 'TASK') {
      return {
        action: 'SAVE',
        reason: 'Bound to active project or operational task stream.',
        confidence: 0.85,
        suggestedType: input.suggestedType || 'PROJECT',
        suggestedRetention: 'LONG_TERM',
        suggestedImportance: input.suggestedImportance || 'MEDIUM',
      };
    }

    // Rule 9: System Configuration or Diagnostic Records
    if (input.suggestedType === 'SYSTEM') {
      return {
        action: 'SAVE',
        reason: 'System architecture, configuration, or diagnostic state record.',
        confidence: 0.95,
        suggestedType: 'SYSTEM',
        suggestedRetention: 'LONG_TERM',
        suggestedImportance: input.suggestedImportance || 'HIGH',
      };
    }

    // Default Fallback: General conversation / medium retention
    return {
      action: 'SAVE',
      reason: 'General informational record with moderate future relevance.',
      confidence: 0.75,
      suggestedType: input.suggestedType || 'CONVERSATION',
      suggestedRetention: 'SHORT_TERM',
      suggestedImportance: input.suggestedImportance || 'MEDIUM',
    };
  }

  /**
   * Identifies transient chit-chat, greetings, and ephemeral noise
   */
  private static isFleetingNoise(text: string): boolean {
    const lower = text.toLowerCase().trim();
    if (lower.length < 4) return true;

    const noisePhrases = [
      /^hello\b/i,
      /^hi\b/i,
      /^hey\b/i,
      /^good morning\b/i,
      /^good afternoon\b/i,
      /^good evening\b/i,
      /^how are you\b/i,
      /^thanks\b/i,
      /^thank you\b/i,
      /^ok\b/i,
      /^okay\b/i,
      /^sounds good\b/i,
      /^testing 1 2 3\b/i,
      /^can you hear me\b/i,
      /^what time is it\b/i,
    ];

    return noisePhrases.some((re) => re.test(lower));
  }

  /**
   * Identifies ambient context that is only valid for hours/days
   */
  private static isTemporaryContext(text: string): boolean {
    const lower = text.toLowerCase();
    const tempWords = [
      'weather today',
      'weather is',
      'raining today',
      'sunny today',
      'traffic right now',
      'battery at',
      'currently walking',
      'currently driving',
      'be right back',
      'for the next 10 minutes',
    ];

    return tempWords.some((w) => lower.includes(w));
  }

  /**
   * Identifies persistent user preferences
   */
  private static isUserPreference(text: string, suggestedType?: MemoryType): boolean {
    if (suggestedType === 'USER_PREFERENCE') return true;
    const lower = text.toLowerCase();
    const prefPatterns = [
      /\bi prefer\b/i,
      /\bi like (?:to|when|my)\b/i,
      /\bi always want\b/i,
      /\bkeep (?:my|your|the) (?:answers|responses|titles|copy)\b/i,
      /\bmy preference is\b/i,
      /\bdon't use (?:emojis|slang|jargon)\b/i,
      /\bformat (?:my|all) (?:code|output|scripts) in\b/i,
      /\balways format\b/i,
      /\bnever (?:say|include|generate)\b/i,
    ];

    return prefPatterns.some((re) => re.test(lower));
  }

  /**
   * Identifies factual research findings
   */
  private static isResearchFinding(text: string): boolean {
    const lower = text.toLowerCase();
    const researchIndicators = [
      'market size',
      'cagr',
      'competitor analysis',
      'survey found',
      'according to',
      'study shows',
      'benchmark',
      'industry trend',
      'data suggests',
      'source:',
      'evidence:',
    ];

    return researchIndicators.some((term) => lower.includes(term));
  }

  /**
   * Identifies strategic business parameters
   */
  private static isBusinessDirective(text: string): boolean {
    const lower = text.toLowerCase();
    const businessTerms = [
      'brand voice',
      'target audience',
      'pricing model',
      'core offer',
      'business goal',
      'target market',
      'quarterly target',
      'revenue goal',
      'ideal customer',
    ];

    return businessTerms.some((term) => lower.includes(term));
  }
}
