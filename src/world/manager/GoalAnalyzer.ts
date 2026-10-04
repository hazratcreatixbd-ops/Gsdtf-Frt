/**
 * PART 13 — Goal Analyzer
 * Evaluates high-level user directives and breaks them down into
 * objectives, expected deliverables, constraints, risk levels, approval gates,
 * and required specialized workers.
 */

import { GoalAnalysisResult, GoalComplexity, GoalRiskLevel } from './ManagerTypes';

export class GoalAnalyzer {
  public static analyze(goal: string): GoalAnalysisResult {
    const text = goal.trim();
    const lower = text.toLowerCase();

    // 1. Determine Risk Level
    let riskLevel: GoalRiskLevel = 'LOW';
    let approvalRequired = false;

    const sensitivePatterns = [
      /\b(delete|remove|erase|purge)\b/i,
      /\b(send|publish|post|tweet|broadcast|email|message)\b/i,
      /\b(buy|purchase|order|pay|charge|checkout|subscribe)\b/i,
      /\b(password|credential|token|secret|key)\b/i,
      /\b(reboot|power off|factory reset|wipe)\b/i,
      /\b(whatsapp|sms|phone call)\b/i,
    ];

    for (const pat of sensitivePatterns) {
      if (pat.test(lower)) {
        if (/\b(delete|password|credential|secret|key)\b/i.test(lower)) {
          riskLevel = 'SENSITIVE';
          approvalRequired = true;
        } else if (/\b(send|publish|buy|pay|order)\b/i.test(lower)) {
          riskLevel = 'HIGH';
          approvalRequired = true;
        } else {
          riskLevel = 'MEDIUM';
          approvalRequired = true;
        }
        break;
      }
    }

    // 2. Identify Required Workers & Tools
    const requiredWorkers = new Set<string>();
    const requiredTools = new Set<string>();
    const constraints: string[] = [];

    // Always involve Hermes as CEO/Manager and Chronos as Planner
    requiredWorkers.add('worker-manager');
    requiredWorkers.add('worker-planner');

    // Research intent
    if (
      /\b(research|find|investigate|scan|competitor|market|supplier|source|study|trend)\b/i.test(lower)
    ) {
      requiredWorkers.add('worker-research');
      requiredTools.add('searchWeb');
    }

    // Market data & pricing
    if (/\b(market data|pricing|cost|price|compare|benchmark|supplier price|landed cost)\b/i.test(lower)) {
      requiredWorkers.add('worker-market-data');
      requiredTools.add('analyzeCompetitor');
    }

    // Analytics & calculation
    if (
      /\b(calculate|analytics|metrics|roi|profit|margin|projection|forecast|conversion|data)\b/i.test(lower)
    ) {
      requiredWorkers.add('worker-analytics');
      requiredTools.add('calculateMetrics');
    }

    // Business strategy & opportunity
    if (
      /\b(business|opportunity|strategy|swot|model|revenue|milestone|plan|proposal|venture)\b/i.test(lower)
    ) {
      requiredWorkers.add('worker-business');
      requiredTools.add('buildBusinessStrategy');
    }

    // Content & Copy
    if (/\b(content|write|script|hook|article|blog|caption|newsletter|draft)\b/i.test(lower)) {
      requiredWorkers.add('worker-content');
      requiredTools.add('writeContentScript');
    }

    // Media & Video packaging
    if (/\b(video|media|thumbnail|youtube|shorts|tiktok|package|metadata)\b/i.test(lower)) {
      requiredWorkers.add('worker-media');
      requiredTools.add('prepareMediaMetadata');
    }

    // Coder / Technical
    if (/\b(code|build|app|website|software|frontend|backend|api|component)\b/i.test(lower)) {
      requiredWorkers.add('worker-coder');
      requiredWorkers.add('worker-tester');
      requiredTools.add('generateWebsitePlan');
    }

    // Android / Device
    if (/\b(android|phone|device|app launch|open app|mobile)\b/i.test(lower)) {
      requiredWorkers.add('worker-device');
      requiredTools.add('android_open_app');
    }

    // Travel
    if (/\b(travel|flight|hotel|trip|itinerary|destination)\b/i.test(lower)) {
      requiredWorkers.add('worker-travel');
      requiredTools.add('openMap');
    }

    // Security
    if (/\b(security|vulnerability|audit|header|csp|hsts)\b/i.test(lower)) {
      requiredWorkers.add('worker-security');
      requiredTools.add('analyzeWebsiteSecurity');
    }

    // Always require Verification (Astra) and Review (Athena) for non-trivial workflows
    requiredWorkers.add('worker-verification');
    requiredWorkers.add('worker-reviewer');

    // 3. Determine Complexity based on specialized workers beyond core triage/review
    const coreSystemWorkers = new Set(['worker-manager', 'worker-planner', 'worker-verification', 'worker-reviewer']);
    const specializedCount = Array.from(requiredWorkers).filter((w) => !coreSystemWorkers.has(w)).length;

    let complexity: GoalComplexity = 'SIMPLE';
    if (
      specializedCount >= 4 ||
      /\b(comprehensive|end-to-end|full|multi-stage|quarterly|launch|opportunity report)\b/i.test(lower)
    ) {
      complexity = 'MULTI_STAGE';
    } else if (specializedCount === 3 || /\b(business report|strategy|swot|landed cost)\b/i.test(lower)) {
      complexity = 'COMPLEX';
    } else if (specializedCount === 2 || /\b(compare|analyze|research|calculate)\b/i.test(lower)) {
      complexity = 'MODERATE';
    } else {
      complexity = 'SIMPLE';
    }

    // 4. Expected Deliverable Formulation
    let expectedOutput = 'Comprehensive Executive Briefing and Verified Action Plan';
    if (/\b(opportunity report|report)\b/i.test(lower)) {
      expectedOutput = 'Verified Business Opportunity Report with Market Benchmarks';
    } else if (/\b(landed cost|cost|calculate)\b/i.test(lower)) {
      expectedOutput = 'Supplier Price Comparison and Landed Cost Analytical Breakdown';
    } else if (/\b(plan|strategy)\b/i.test(lower)) {
      expectedOutput = 'Strategic Execution Plan and Action Milestones';
    } else if (/\b(script|video)\b/i.test(lower)) {
      expectedOutput = 'Production-Ready Content Brief, Timed Script, and Media Metadata';
    }

    // 5. Constraints & Deadlines
    let deadline: string | undefined;
    const deadlineMatch = text.match(/\b(by\s+[a-zA-Z0-9\s]+|within\s+\d+\s*(?:hours?|days?|weeks?)|today|tomorrow|asap|24h)\b/i);
    if (deadlineMatch) {
      deadline = deadlineMatch[0].trim();
    }

    if (/\b(urgent|today|asap|24h|immediately)\b/i.test(lower)) {
      constraints.push('High-velocity priority execution requested.');
    }
    if (/\b(affordable|budget|cheap|low cost)\b/i.test(lower)) {
      constraints.push('Enforce cost-efficiency and budget optimization.');
    }
    if (approvalRequired) {
      constraints.push('Sensitive external action requires human confirmation gate.');
    }

    return {
      goal: text,
      objective: `Execute goal: "${text}"`,
      expectedOutput,
      complexity,
      riskLevel,
      constraints,
      deadline,
      requiredTools: Array.from(requiredTools),
      requiredWorkers: Array.from(requiredWorkers),
      dependencies: ['Hermes (Triage)', 'Chronos (Planning)'],
      approvalRequired,
      verificationRequired: true,
      analyzedAt: Date.now(),
    };
  }
}
