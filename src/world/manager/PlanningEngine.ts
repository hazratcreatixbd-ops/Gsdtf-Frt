/**
 * PART 13 — Planning Engine
 * Chronos (Executive Planner). Converts analyzed goals into a structured DAG Task Graph
 * with ordered dependencies, priorities, parallel execution blocks, and approval gates.
 */

import { GoalAnalysisResult, TaskGraph, DAGTask, TaskPriority, WorkflowExecutionMode } from './ManagerTypes';
import { workerCapabilityRegistry } from './WorkerCapabilityRegistry';
import { WorkerRouter } from './WorkerRouter';

export class PlanningEngine {
  public static createPlan(analysis: GoalAnalysisResult, workflowId: string): TaskGraph {
    const tasks: DAGTask[] = [];
    const goalLower = analysis.goal.toLowerCase();

    // Stage 1: Initial Discovery / Research (Runs in Parallel if multiple research streams needed)
    const researchTaskId = `task_${Date.now()}_research`;
    const marketTaskId = `task_${Date.now()}_market`;

    const needsResearch = analysis.requiredWorkers.includes('worker-research');
    const needsMarketData = analysis.requiredWorkers.includes('worker-market-data');
    const needsContent = analysis.requiredWorkers.includes('worker-content');
    const needsMedia = analysis.requiredWorkers.includes('worker-media');
    const needsBusiness = analysis.requiredWorkers.includes('worker-business');
    const needsAnalytics = analysis.requiredWorkers.includes('worker-analytics');
    const needsCoder = analysis.requiredWorkers.includes('worker-coder');
    const needsSecurity = analysis.requiredWorkers.includes('worker-security');
    const needsDevice = analysis.requiredWorkers.includes('worker-device');
    const needsTravel = analysis.requiredWorkers.includes('worker-travel');

    const parallelStage1Ids: string[] = [];

    // Parallel Worker A: Nova (Research) selected via WorkerRouter
    if (needsResearch || (!needsContent && !needsCoder && !needsDevice && !needsTravel && !needsSecurity)) {
      const routedResearch = WorkerRouter.selectWorker('market_research', 'HIGH') || workerCapabilityRegistry.getCapability('worker-research')!;
      tasks.push({
        id: researchTaskId,
        workflowId,
        title: 'Empirical Market & Public Research',
        description: `Gather verified public signals, competitor positioning, and source evidence for: "${analysis.goal}"`,
        workerId: routedResearch.workerId,
        workerName: routedResearch.name,
        role: routedResearch.role,
        priority: 'HIGH',
        dependencies: [],
        status: 'READY',
        input: { goal: analysis.goal, focus: 'Public research and benchmarks' },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      parallelStage1Ids.push(researchTaskId);
    }

    // Parallel Worker B: Mercury (Market Data)
    if (needsMarketData || analysis.complexity === 'COMPLEX' || analysis.complexity === 'MULTI_STAGE') {
      tasks.push({
        id: marketTaskId,
        workflowId,
        title: 'Market Pricing & Competitive Benchmarks',
        description: `Extract competitor pricing benchmarks, cost parameters, and search signal trends for: "${analysis.goal}"`,
        workerId: 'worker-market-data',
        workerName: 'Mercury',
        role: 'MARKET_DATA',
        priority: 'HIGH',
        dependencies: [],
        status: 'READY',
        input: { goal: analysis.goal, focus: 'Pricing and market signals' },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      parallelStage1Ids.push(marketTaskId);
    }

    // Parallel Worker C: Travel (if travel requested)
    if (needsTravel) {
      const travelTaskId = `task_${Date.now()}_travel`;
      tasks.push({
        id: travelTaskId,
        workflowId,
        title: 'Destination & Itinerary Logistics Analysis',
        description: `Analyze transit options, accommodations, and itinerary benchmarks for: "${analysis.goal}"`,
        workerId: 'worker-travel',
        workerName: 'Atlas',
        role: 'TRAVEL',
        priority: 'NORMAL',
        dependencies: [],
        status: 'READY',
        input: { goal: analysis.goal },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      parallelStage1Ids.push(travelTaskId);
    }

    // Parallel Worker D: Device / Android (if device action requested)
    if (needsDevice) {
      const deviceTaskId = `task_${Date.now()}_device`;
      tasks.push({
        id: deviceTaskId,
        workflowId,
        title: 'Device Intent & Action Preview Preparation',
        description: `Stage device command and verify native Android readiness for: "${analysis.goal}"`,
        workerId: 'worker-device',
        workerName: 'Titan',
        role: 'DEVICE',
        priority: 'HIGH',
        dependencies: [],
        status: 'READY',
        input: { goal: analysis.goal },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: analysis.approvalRequired,
        requiresVerification: false,
      });
      parallelStage1Ids.push(deviceTaskId);
    }

    // Stage 2: Synthesis & Analytical Modeling (Depends on Stage 1 Results)
    const stage1Prereqs = parallelStage1Ids.length > 0 ? parallelStage1Ids : [];
    const analyticsTaskId = `task_${Date.now()}_analytics`;
    const businessTaskId = `task_${Date.now()}_business`;
    const stage2Ids: string[] = [];

    if (needsAnalytics || needsMarketData || analysis.complexity !== 'SIMPLE') {
      tasks.push({
        id: analyticsTaskId,
        workflowId,
        title: 'Analytical Modeling & Cost Synthesis',
        description: `Calculate landed costs, conversion estimates, and synthesize data inputs from research streams.`,
        workerId: 'worker-analytics',
        workerName: 'Pythagoras',
        role: 'ANALYTICS',
        priority: 'HIGH',
        dependencies: stage1Prereqs,
        status: stage1Prereqs.length === 0 ? 'READY' : 'PENDING',
        input: { goal: analysis.goal, requiredPrereqs: stage1Prereqs },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      stage2Ids.push(analyticsTaskId);
    }

    // Stage 2B: Business Opportunity / SWOT Modeling (Depends on Stage 1 & Analytics)
    if (needsBusiness || analysis.complexity !== 'SIMPLE') {
      const bizPrereqs = [...stage1Prereqs, ...(stage2Ids.includes(analyticsTaskId) ? [analyticsTaskId] : [])];
      tasks.push({
        id: businessTaskId,
        workflowId,
        title: 'Strategic Business Opportunity & SWOT Blueprint',
        description: `Structure SWOT matrix, strategic milestones, revenue logic, and execution feasibility.`,
        workerId: 'worker-business',
        workerName: 'Orion',
        role: 'BUSINESS',
        priority: 'HIGH',
        dependencies: bizPrereqs,
        status: bizPrereqs.length === 0 ? 'READY' : 'PENDING',
        input: { goal: analysis.goal, requiredPrereqs: bizPrereqs },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      stage2Ids.push(businessTaskId);
    }

    // Stage 2C: Creative Content & Copy (if requested)
    if (needsContent) {
      const contentTaskId = `task_${Date.now()}_content`;
      tasks.push({
        id: contentTaskId,
        workflowId,
        title: 'Content Scriptwriting & Non-Clickbait Hooks',
        description: `Draft timed content script, structured sections, and audience-resonant hooks.`,
        workerId: 'worker-content',
        workerName: 'Echo',
        role: 'CONTENT',
        priority: 'NORMAL',
        dependencies: stage1Prereqs,
        status: stage1Prereqs.length === 0 ? 'READY' : 'PENDING',
        input: { goal: analysis.goal },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      stage2Ids.push(contentTaskId);
    }

    // Stage 2D: Media Packaging & Metadata (if requested)
    if (needsMedia) {
      const mediaTaskId = `task_${Date.now()}_media`;
      tasks.push({
        id: mediaTaskId,
        workflowId,
        title: 'Media Packaging & Metadata Preparation',
        description: `Prepare thumbnail blueprint, platform metadata, and distribution staging.`,
        workerId: 'worker-media',
        workerName: 'Vesper',
        role: 'MEDIA',
        priority: 'NORMAL',
        dependencies: stage1Prereqs,
        status: stage1Prereqs.length === 0 ? 'READY' : 'PENDING',
        input: { goal: analysis.goal },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: analysis.approvalRequired,
        requiresVerification: true,
      });
      stage2Ids.push(mediaTaskId);
    }

    // Stage 2E: Technical Architecture & Testing (if requested)
    if (needsCoder) {
      const coderTaskId = `task_${Date.now()}_coder`;
      const testerTaskId = `task_${Date.now()}_tester`;
      tasks.push({
        id: coderTaskId,
        workflowId,
        title: 'Technical Architecture & Implementation Blueprint',
        description: `Design modular TypeScript components and API integration plan for: "${analysis.goal}"`,
        workerId: 'worker-coder',
        workerName: 'Zephyr',
        role: 'CODER',
        priority: 'HIGH',
        dependencies: stage1Prereqs,
        status: stage1Prereqs.length === 0 ? 'READY' : 'PENDING',
        input: { goal: analysis.goal },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      tasks.push({
        id: testerTaskId,
        workflowId,
        title: 'Automated Regression & Contract Validation',
        description: `Verify implementation blueprint against edge cases and contract assertions.`,
        workerId: 'worker-tester',
        workerName: 'Argus',
        role: 'TESTER',
        priority: 'HIGH',
        dependencies: [coderTaskId],
        status: 'PENDING',
        input: { goal: analysis.goal, requiredPrereqs: [coderTaskId] },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      stage2Ids.push(testerTaskId);
    }

    // Stage 2F: Security & Boundary Audit (if requested or high/sensitive risk)
    if (needsSecurity || analysis.riskLevel === 'SENSITIVE') {
      const securityTaskId = `task_${Date.now()}_security`;
      tasks.push({
        id: securityTaskId,
        workflowId,
        title: 'Defensive Security & Action Boundary Audit',
        description: `Audit permissions, defensive headers, and credential exposure boundaries.`,
        workerId: 'worker-security',
        workerName: 'Aegis',
        role: 'SECURITY',
        priority: 'CRITICAL',
        dependencies: stage1Prereqs,
        status: stage1Prereqs.length === 0 ? 'READY' : 'PENDING',
        input: { goal: analysis.goal },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        requiresApproval: false,
        requiresVerification: true,
      });
      stage2Ids.push(securityTaskId);
    }

    // Stage 3: Empirical Verification Loop — Astra (Depends on Stage 2 Deliverables)
    const verificationTaskId = `task_${Date.now()}_verification`;
    const preVerificationIds = stage2Ids.length > 0 ? stage2Ids : stage1Prereqs;

    tasks.push({
      id: verificationTaskId,
      workflowId,
      title: 'Fact Checking & Evidence Audit',
      description: `Audit all factual claims, pricing values, and analytical deductions against verifiable evidence.`,
      workerId: 'worker-verification',
      workerName: 'Astra',
      role: 'VERIFICATION',
      priority: 'CRITICAL',
      dependencies: preVerificationIds,
      status: preVerificationIds.length === 0 ? 'READY' : 'PENDING',
      input: { goal: analysis.goal, auditScope: 'All upstream outputs' },
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 2,
      requiresApproval: false,
      requiresVerification: false, // Verification itself doesn't loop
    });

    // Stage 4: Executive Review Loop — Athena (Depends on Astra Verification)
    const reviewTaskId = `task_${Date.now()}_review`;
    tasks.push({
      id: reviewTaskId,
      workflowId,
      title: 'Executive Peer Review & Editorial Standard Check',
      description: `Review verified findings for strategic completeness, tone consistency, and absence of fluff.`,
      workerId: 'worker-reviewer',
      workerName: 'Athena',
      role: 'REVIEWER',
      priority: 'HIGH',
      dependencies: [verificationTaskId],
      status: 'PENDING',
      input: { goal: analysis.goal },
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 2,
      requiresApproval: false,
      requiresVerification: false,
    });

    // Stage 5: Final Synthesis & Manager Delivery — Hermes (Depends on Athena Review)
    const finalTaskId = `task_${Date.now()}_final`;
    tasks.push({
      id: finalTaskId,
      workflowId,
      title: 'Executive Synthesis & Final Report Delivery',
      description: `Consolidate research, data analysis, verified findings, and strategic recommendations for user briefing.`,
      workerId: 'worker-manager',
      workerName: 'Hermes',
      role: 'MANAGER',
      priority: 'CRITICAL',
      dependencies: [reviewTaskId],
      status: 'PENDING',
      input: { goal: analysis.goal, expectedOutput: analysis.expectedOutput },
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 1,
      requiresApproval: analysis.approvalRequired && !tasks.some((t) => t.requiresApproval),
      requiresVerification: false,
    });

    // Determine execution mode
    let executionMode: WorkflowExecutionMode = 'MIXED';
    if (parallelStage1Ids.length > 1) {
      executionMode = 'MIXED';
    } else {
      executionMode = 'SEQUENTIAL';
    }

    return {
      workflowId,
      goal: analysis.goal,
      analysis,
      tasks,
      executionMode,
      status: 'PLANNED',
      leadWorker: 'worker-manager',
      plannerWorker: 'worker-planner',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentStepIndex: 0,
      totalSteps: tasks.length,
      progressPercent: 0,
    };
  }
}
