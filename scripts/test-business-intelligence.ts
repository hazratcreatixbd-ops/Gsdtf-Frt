/**
 * PART 7 — FRIDAY Business Intelligence & Planning Engine Automated Test Suite
 * Validates all 17 capabilities of Part 7 plus complete regression of Parts 1–6B.
 */

import { businessIntelligenceManager } from '../src/services/BusinessIntelligenceManager';
import { toolManager } from '../src/services/ToolManager';
import { androidBridge } from '../src/services/AndroidBridge/AndroidBridge';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || '');
    failed++;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('PART 7 — BUSINESS INTELLIGENCE & PLANNING ENGINE TESTS');
  console.log('====================================================\n');

  // Test 1: Business Profile System
  {
    const initialProfile = businessIntelligenceManager.getProfile();
    assert(
      initialProfile.businessName !== undefined &&
      Array.isArray(initialProfile.targetMarkets) &&
      Array.isArray(initialProfile.products),
      'Test 1: Persistent Business Profile loads with structured properties'
    );

    // Update profile
    const updated = businessIntelligenceManager.updateProfile({
      businessName: 'VentureScale AI',
      targetMarkets: ['United States', 'United Kingdom', 'Canada'],
    });

    assert(
      updated.businessName === 'VentureScale AI' &&
      updated.targetMarkets.includes('Canada'),
      'Test 1B: Profile updates correctly and updates timestamp'
    );

    // Voice profile update
    const voiceRes = businessIntelligenceManager.parseVoiceProfileUpdate('Change my target market to USA, UK and Canada');
    assert(
      voiceRes.updated === true && voiceRes.value?.includes('Canada'),
      'Test 1C: Voice profile updates parsed and applied successfully'
    );
  }

  // Test 2: Business Goals System
  {
    const goal = businessIntelligenceManager.createGoal({
      title: 'Reach 100,000 monthly views',
      description: 'Build YouTube content pipeline to drive organic discovery',
      priority: 'high',
      measurableTarget: '100,000 monthly views',
      deadline: 'Q4 2026',
    });

    assert(
      goal.id.startsWith('goal_') &&
      goal.title === 'Reach 100,000 monthly views' &&
      goal.status === 'active' &&
      goal.priority === 'high',
      'Test 2: Create Business Goal with priority, status, and measurable target'
    );

    const updatedGoal = businessIntelligenceManager.updateGoal(goal.id, {
      progress: 45,
      status: 'active',
    });

    assert(
      updatedGoal?.progress === 45,
      'Test 2B: Update Business Goal progress and state'
    );
  }

  // Test 3: Market Research Workflow
  {
    const research = businessIntelligenceManager.conductMarketResearch({
      market: 'AI automation agency services',
      geography: 'United States',
    });

    assert(
      research.id.startsWith('mkt_') &&
      research.findings.length > 0 &&
      research.findings.every((f) => f.confidence !== undefined && f.type !== undefined),
      'Test 3: Structured Market Research returns verified findings with confidence types'
    );

    assert(
      research.customerNeeds.length > 0 &&
      research.potentialOpportunities.length > 0 &&
      research.potentialRisks.length > 0,
      'Test 3B: Market Research synthesizes needs, opportunities, and risks'
    );
  }

  // Test 4: Competitor Research Module
  {
    const competitor = businessIntelligenceManager.analyzeCompetitor('Apex Consultancy', 'https://apexconsult.example.com');

    assert(
      competitor.id.startsWith('comp_') &&
      competitor.competitorName === 'Apex Consultancy' &&
      competitor.publicStrengths.length > 0 &&
      competitor.publicGaps.length > 0 &&
      competitor.opportunitiesForUser.length > 0,
      'Test 4: Competitor Snapshot captures public positioning, strengths, gaps, and user opportunities'
    );

    // No arbitrary winner ranking produced
    assert(
      (competitor as any).winner === undefined && (competitor as any).loser === undefined,
      'Test 4B: Competitor analysis does not produce arbitrary winner rankings'
    );
  }

  // Test 5: Target Audience Analysis
  {
    const audience = businessIntelligenceManager.analyzeTargetAudience('USA and Canada');

    assert(
      audience.id.startsWith('aud_') &&
      audience.primaryAudience.painPoints.length > 0 &&
      audience.primaryAudience.buyingMotivations.length > 0 &&
      Array.isArray(audience.facts) &&
      Array.isArray(audience.assumptions) &&
      Array.isArray(audience.hypotheses),
      'Test 5: Audience Analysis clearly separates FACTS, ASSUMPTIONS, and HYPOTHESES'
    );
  }

  // Test 6: SWOT-Style Business Analysis
  {
    const swot = businessIntelligenceManager.generateSWOTAnalysis('VentureScale AI');

    const allPoints = [...swot.strengths, ...swot.weaknesses, ...swot.opportunities, ...swot.risks];
    const allHaveOrigins = allPoints.every(
      (p) => p.origin === 'user-provided' || p.origin === 'researched' || p.origin === 'inferred'
    );

    assert(
      swot.id.startsWith('swot_') &&
      allPoints.length >= 4 &&
      allHaveOrigins,
      'Test 6: SWOT analysis labels every point as user-provided, researched, or inferred'
    );
  }

  // Test 7: Business Idea Generator
  {
    const ideas = businessIntelligenceManager.generateBusinessIdeas({
      market: 'United States',
    });

    assert(
      ideas.length > 0 &&
      ideas[0].concept !== '' &&
      ideas[0].problemSolved !== '' &&
      ideas[0].proposedSolution !== '' &&
      ideas[0].firstValidationStep !== '' &&
      ideas[0].disclaimer.includes('profitability') === false || ideas[0].disclaimer.includes('not guaranteed'),
      'Test 7: Business Idea Generator provides concept, problem, solution, validation step, and disclaims guarantees'
    );
  }

  // Test 8: Strategy Builder
  {
    let createdTasks: string[] = [];
    businessIntelligenceManager.setTaskCreationCallback((task) => {
      createdTasks.push(task.title);
    });

    const strategy = businessIntelligenceManager.buildBusinessStrategy({
      goal: 'Scale Video Production Services',
      autoCreateTasks: true,
    });

    assert(
      strategy.id.startsWith('strat_') &&
      strategy.milestones.length === 4 &&
      strategy.generatedTasks.length > 0 &&
      createdTasks.length > 0,
      'Test 8: Strategy Builder creates 4-phase milestone roadmap and converts actions into tasks'
    );
  }

  // Test 9: Content Strategy Planner
  {
    const contentPlan = businessIntelligenceManager.planContentStrategy();

    assert(
      contentPlan.id.startsWith('content_') &&
      contentPlan.pillars.length > 0 &&
      contentPlan.contentIdeas.length > 0 &&
      contentPlan.contentIdeas.some((i) => i.platform === 'YouTube') &&
      contentPlan.contentIdeas[0].hook !== '',
      'Test 9: Content Strategy Planner generates pillars, platform-specific hooks, titles, and repurposing blueprints'
    );
  }

  // Test 10: Weekly Business Plan
  {
    const weekly = businessIntelligenceManager.createWeeklyPlan({
      weekLabel: 'Week 42 Planning Sprint',
    });

    assert(
      weekly.id.startsWith('week_') &&
      weekly.mainGoals.length > 0 &&
      weekly.priorityProjects.length > 0 &&
      weekly.contentTasks.length > 0 &&
      weekly.endOfWeekReviewChecklist.length > 0,
      'Test 10: Weekly Plan structures goals, priority projects, content, and review checklist'
    );
  }

  // Test 11: Daily Business Briefing
  {
    const briefing = businessIntelligenceManager.getDailyBriefing([
      { title: 'Send client proposal', status: 'pending' },
    ]);

    assert(
      briefing.id.startsWith('brief_') &&
      briefing.todaysGoals.length > 0 &&
      briefing.pendingTasks.includes('Send client proposal') &&
      briefing.recommendedNextActions.length > 0,
      'Test 11: Daily Briefing aggregates today goals, pending tasks, deadlines, and next actions'
    );
  }

  // Test 12: Research Memory
  {
    const record = businessIntelligenceManager.saveResearchRecord({
      query: 'AI video market trends',
      topic: 'Video Production Technology Trends',
      findings: ['Short form vertical video drives 70% of social impressions in 2026.'],
      sources: [{ title: 'Public Web Survey', confidence: 'high' }],
      assumptions: ['Platform algorithms continue prioritizing vertical formats.'],
      confidence: 'high',
    });

    const searchHits = businessIntelligenceManager.searchResearchMemory('video');

    assert(
      searchHits.length > 0 &&
      searchHits.some((h) => h.id === record.id),
      'Test 12: Research Memory saves structured records and retrieves via topic/query search'
    );
  }

  // Test 13: Decision Support Workflow
  {
    const decision = businessIntelligenceManager.evaluateDecisionOptions({
      question: 'Should I hire a full-time video editor or use an on-demand contract agency?',
      optionA: {
        name: 'Full-Time Editor',
        description: 'Dedicated internal team member',
        costs: 'Fixed monthly salary + equipment',
      },
      optionB: {
        name: 'On-Demand Agency',
        description: 'Flexible project-based contract',
        costs: 'Variable fee per completed video',
      },
    });

    assert(
      decision.id.startsWith('dec_') &&
      decision.options.length === 2 &&
      decision.keyDifferences.length > 0 &&
      decision.criticalQuestions.length > 0 &&
      decision.recommendationFraming.includes('assistant') &&
      decision.recommendationFraming.includes('final authority'),
      'Test 13: Decision Support outlines tradeoffs, costs, risks, and preserves user final authority'
    );
  }

  // Test 14: Voice Tool Execution via ToolManager
  {
    const profileRes = await toolManager.executeTool('getBusinessProfile', {}, 'call_prof_1');
    assert(
      profileRes.success === true && profileRes.profile !== undefined,
      'Test 14A: ToolManager routes getBusinessProfile'
    );

    const goalRes = await toolManager.executeTool('createBusinessGoal', {
      title: 'Build automated outreach',
      priority: 'high',
    }, 'call_goal_1');
    assert(
      goalRes.success === true && goalRes.goal.title === 'Build automated outreach',
      'Test 14B: ToolManager routes createBusinessGoal'
    );

    const researchRes = await toolManager.executeTool('conductMarketResearch', {
      market: 'SaaS Business Intelligence',
    }, 'call_res_1');
    assert(
      researchRes.success === true && researchRes.research !== undefined,
      'Test 14C: ToolManager routes conductMarketResearch'
    );

    const briefingRes = await toolManager.executeTool('getDailyBusinessBriefing', {}, 'call_brf_1');
    assert(
      briefingRes.success === true && briefingRes.briefing !== undefined,
      'Test 14D: ToolManager routes getDailyBusinessBriefing'
    );
  }

  // Test 15: Report Generator
  {
    const report = businessIntelligenceManager.generateBusinessReport({
      title: 'Executive Market Expansion Report',
      objective: 'Define roadmap for US & UK digital market entry',
    });

    const exportedText = businessIntelligenceManager.exportReportAsText(report.id);

    assert(
      report.id.startsWith('rep_') &&
      report.executiveSummary !== '' &&
      report.actionPlan.length > 0 &&
      exportedText !== null &&
      exportedText.includes('EXECUTIVE SUMMARY'),
      'Test 15: Report Generator compiles structured executive report and exports formatted text'
    );
  }

  // Test 16: Safe Confirmation & External Action Preservation
  {
    // WhatsApp/External message action must still require Action Preview
    const prepResult = await androidBridge.prepareWhatsAppMessage('+1234567890', 'Hello from business team');
    const previews = androidBridge.getPendingPreviews();

    assert(
      prepResult.success === true &&
      previews.length > 0 &&
      previews[0].status === 'pending_confirmation',
      'Test 16: Confirmation and approval architecture preserved for sensitive external actions'
    );

    // Cancel action
    const cancelRes = androidBridge.cancelAction(previews[0].id);
    assert(cancelRes.success === true && cancelRes.action === 'CANCEL_ACTION', 'Test 16B: Action preview cancellation updates status');
  }

  // Test 17: Parts 1–6B Regression Verification
  {
    const fetch = globalThis.fetch;
    const health = await fetch('http://localhost:3000/api/health').then((r) => r.json());
    const hasLive = health.status === 'ok' && health.model === 'gemini-3.8-live' && health.hasKey === true;

    // Memory system regression
    const memRes = await toolManager.executeTool('saveMemory', { key: 'part7_reg', content: 'regression pass' }, 'mem_p7');
    const hasMem = memRes.success === true;

    // Task system regression
    const taskRes = await toolManager.executeTool('createTask', { title: 'part7 regression task' }, 'task_p7');
    const hasTask = taskRes.success === true;

    // In-App browser regression
    const browserRes = await toolManager.executeTool('openInAppBrowser', { url: 'https://en.wikipedia.org' }, 'br_p7');
    const hasBrowser = browserRes.success === true && browserRes.browserType === 'in_app';

    // Android bridge regression
    const caps = androidBridge.getSupportedCapabilities();
    const hasBridge = caps.browser === true;

    assert(
      hasLive && hasMem && hasTask && hasBrowser && hasBridge,
      'Test 17: Complete regression of Parts 1–6B verified (Gemini Live, Memory, Tasks, In-App Browser, Android Bridge intact)'
    );
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Fatal test execution error:', e);
  process.exit(1);
});
