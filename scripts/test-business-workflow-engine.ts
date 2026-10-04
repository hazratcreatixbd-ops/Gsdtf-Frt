/**
 * PART 10 — FRIDAY Autonomous Business Manager & Workflow Engine Automated Test Suite
 * Validates:
 * 1. Goal Analyzer & Structured Pipeline Decomposition (12–14 stages)
 * 2. Strict separation of Planning (PLANNED) vs Execution (RUNNING)
 * 3. Human-in-the-Loop Approval Checkpoints (ACTION, WHY, TARGET, CONTENT, EXPECTED RESULT)
 * 4. Approval Authorization (approveStep) & Rejection (rejectStep)
 * 5. Execution Controls: Pause, Resume, Cancel, and Retry
 * 6. Step-by-Step Execution (executeNextStep)
 * 7. Social Platform Safety (zero-hallucination, checks real connections, no fake broadcast)
 * 8. Campaign Manager: Create, Edit, Pause, Resume, Duplicate, Archive, and Generate Report
 * 9. Structured Business Memory: Business context, approved strategies, and workflow history
 * 10. Executive Report Generation
 * 11. ToolManager function calling integration
 * 12. Regressions verification across Parts 1–9
 */

import { businessWorkflowEngine } from '../src/services/BusinessWorkflowEngine';
import { businessMemoryManager } from '../src/services/BusinessMemoryManager';
import { campaignManager } from '../src/services/CampaignManager';
import { toolManager } from '../src/services/ToolManager';
import { businessIntelligenceManager } from '../src/services/BusinessIntelligenceManager';
import { contentMarketingManager } from '../src/services/ContentMarketingManager';
import { agentOrchestrator } from '../src/services/agents/AgentOrchestrator';
import { androidBridge } from '../src/services/AndroidBridge/AndroidBridge';
import { publishingManager } from '../src/services/Publishing/PublishingAdapter';

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
  console.log('PART 10 — FRIDAY AUTONOMOUS BUSINESS MANAGER TESTS');
  console.log('====================================================\n');

  // Test 1: High-Level Goal Decomposition to Structured Workflow
  {
    const wf = businessWorkflowEngine.createWorkflow('Help me grow my video editing business', {
      priority: 'HIGH',
    });

    assert(!!wf.workflowId, 'Test 1: Workflow created with unique ID');
    assert(wf.status === 'PLANNED', 'Test 1: Initial status is PLANNED (separate planning from execution)', { status: wf.status });
    assert(wf.steps.length >= 12, 'Test 1: Decomposed goal into at least 12 structured stages', { count: wf.steps.length });

    const stages = wf.steps.map((s) => s.stage);
    assert(stages.includes('RESEARCH'), 'Test 1: Includes RESEARCH stage');
    assert(stages.includes('BUSINESS_ANALYSIS'), 'Test 1: Includes BUSINESS_ANALYSIS stage');
    assert(stages.includes('STRATEGY'), 'Test 1: Includes STRATEGY stage');
    assert(stages.includes('CONTENT_PLAN'), 'Test 1: Includes CONTENT_PLAN stage');
    assert(stages.includes('CONTENT_CREATION'), 'Test 1: Includes CONTENT_CREATION stage');
    assert(stages.includes('QUALITY_CHECK'), 'Test 1: Includes QUALITY_CHECK stage');
    assert(stages.includes('MEDIA_PREPARATION'), 'Test 1: Includes MEDIA_PREPARATION stage');
    assert(stages.includes('PUBLISHING'), 'Test 1: Includes PUBLISHING stage');
    assert(stages.includes('PERFORMANCE_MONITORING'), 'Test 1: Includes PERFORMANCE_MONITORING stage');
    assert(stages.includes('REPORT'), 'Test 1: Includes REPORT stage');
  }

  // Test 2: Dependency Graph & Execution Order
  {
    const wf = businessWorkflowEngine.createWorkflow('Launch 30-Day Growth Campaign');
    const s1 = wf.steps[0];
    const s2 = wf.steps[1];

    assert(s1.dependencies.length === 0, 'Test 2: First stage has zero prerequisites');
    assert(s2.dependencies.includes(s1.stepId), 'Test 2: Subsequent stages declare dependency on prerequisite steps');
  }

  // Test 3: Step-by-Step Execution Mode (executeNextStep)
  {
    const wf = businessWorkflowEngine.createWorkflow('Scale client acquisitions for boutique agency');
    const step1 = wf.steps[0];

    const result = await businessWorkflowEngine.executeNextStep(wf.workflowId);
    assert(result.status === 'COMPLETED', 'Test 3: executeNextStep executes only the single ready stage', { status: result.status });
    assert(step1.status === 'COMPLETED', 'Test 3: Step 1 marked COMPLETED with real output');
    assert(!!step1.output, 'Test 3: Step 1 contains recorded findings output', { output: step1.output });
  }

  // Test 4: Human-in-the-Loop Approval Checkpoint Gate
  {
    // Create workflow with explicit approval required at step 2
    const wf = businessWorkflowEngine.createWorkflow('Direct broadcast distribution', {
      customSteps: [
        {
          stepId: 'cust_s1',
          title: 'Drafting Content Package',
          stage: 'CONTENT_CREATION',
          workerType: 'content-worker',
          dependencies: [],
          requiresApproval: false,
        },
        {
          stepId: 'cust_s2_publish',
          title: 'Publish to Public Social Platforms',
          stage: 'PUBLISHING',
          workerType: 'publishing-worker',
          dependencies: ['cust_s1'],
          requiresApproval: true,
        },
      ],
    });

    // Start workflow
    await businessWorkflowEngine.startWorkflow(wf.workflowId);

    assert(
      wf.status === 'WAITING_FOR_APPROVAL',
      'Test 4: Workflow automatically halts at Human Approval Gate before sensitive publishing action',
      { status: wf.status }
    );

    const pending = wf.approvals.find((a) => a.status === 'PENDING');
    assert(!!pending, 'Test 4: Workflow registers pending Approval item');
    assert(!!pending?.why && !!pending?.target && !!pending?.expectedResult, 'Test 4: Approval item discloses WHY, TARGET, and EXPECTED RESULT');

    // Test 5: Approval Authorization
    const approved = await businessWorkflowEngine.approveStep(wf.workflowId, 'cust_s2_publish');
    assert(approved, 'Test 5: approveStep records human authorization');
    assert(wf.status === 'COMPLETED', 'Test 5: Workflow resumes and completes remaining pipeline upon approval', { status: wf.status });
  }

  // Test 6: Approval Rejection & Halt
  {
    const wf = businessWorkflowEngine.createWorkflow('Email Blast Test', {
      customSteps: [
        {
          stepId: 'cust_e1',
          title: 'Draft Emails',
          stage: 'CONTENT_CREATION',
          workerType: 'content-worker',
          dependencies: [],
          requiresApproval: false,
        },
        {
          stepId: 'cust_e2_send',
          title: 'Send Mass Outreach Emails',
          stage: 'PUBLISHING',
          workerType: 'publishing-worker',
          dependencies: ['cust_e1'],
          requiresApproval: true,
        },
      ],
    });

    await businessWorkflowEngine.startWorkflow(wf.workflowId);
    assert(wf.status === 'WAITING_FOR_APPROVAL', 'Test 6: Halts for authorization');

    const rejected = await businessWorkflowEngine.rejectStep(wf.workflowId, 'cust_e2_send', 'Unauthorized outreach');
    assert(rejected, 'Test 6: rejectStep safely rejects external action');

    const step = wf.steps.find((s) => s.stepId === 'cust_e2_send');
    assert(step?.status === 'CANCELLED', 'Test 6: Rejected step status set to CANCELLED');
    assert(wf.status === 'PAUSED', 'Test 6: Workflow safely pauses upon rejection');
  }

  // Test 7: Pause, Resume, Cancel, and Retry Controls
  {
    const wf = businessWorkflowEngine.createWorkflow('Control Loop Verification');
    await businessWorkflowEngine.startWorkflow(wf.workflowId);

    // Pause
    const paused = businessWorkflowEngine.pauseWorkflow(wf.workflowId);
    assert(paused, 'Test 7: pauseWorkflow suspends running execution');
    assert(wf.status === 'PAUSED', 'Test 7: Workflow status updated to PAUSED');

    // Resume
    const resumed = await businessWorkflowEngine.resumeWorkflow(wf.workflowId);
    assert(resumed, 'Test 7: resumeWorkflow successfully resumes execution');

    // Cancel
    const cancelled = businessWorkflowEngine.cancelWorkflow(wf.workflowId);
    assert(cancelled, 'Test 7: cancelWorkflow cancels active workflow');
    assert(wf.status === 'CANCELLED', 'Test 7: Workflow status is CANCELLED');

    // Retry
    const retried = await businessWorkflowEngine.retryWorkflow(wf.workflowId);
    assert(retried, 'Test 7: retryWorkflow resets and relaunches workflow execution');
  }

  // Test 8: Social Platform Safety & Zero Fake Success
  {
    const ytCap = publishingManager.getCapability('YouTube');
    const liCap = publishingManager.getCapability('LinkedIn');

    // In preview without official OAuth configured, isConnected must be false
    assert(ytCap.isConnected === false, 'Test 8: Unconnected YouTube platform correctly reports isConnected = false');
    assert(liCap.isConnected === false, 'Test 8: Unconnected LinkedIn platform correctly reports isConnected = false');

    // Run a publishing stage and verify output explicitly states external connection required
    const wf = businessWorkflowEngine.createWorkflow('Safe Publishing Test', {
      customSteps: [
        {
          stepId: 'safe_pub',
          title: 'Publish Video Metadata Package',
          stage: 'PUBLISHING',
          workerType: 'publishing-worker',
          dependencies: [],
          requiresApproval: false,
        },
      ],
    });

    await businessWorkflowEngine.startWorkflow(wf.workflowId);
    const pubStep = wf.steps[0];

    assert(pubStep.status === 'COMPLETED', 'Test 8: Staging completes');
    assert(
      pubStep.output?.summary?.includes('external platform connection required'),
      'Test 8: Publishing stage output explicitly discloses external platform connection required (never fakes broadcast success)',
      { output: pubStep.output }
    );
  }

  // Test 9: Campaign Manager CRUD & Lifecycle
  {
    const camp = campaignManager.createCampaign({
      name: 'Spring Creator Showcase',
      objective: 'Build audience reach across YouTube and LinkedIn',
      audience: 'Video Creators',
      platforms: ['YouTube', 'LinkedIn'],
    });

    assert(!!camp.campaignId, 'Test 9: Created campaign with unique ID');
    assert(camp.status === 'ACTIVE', 'Test 9: Campaign initial status is ACTIVE');

    // Pause & Resume
    campaignManager.pauseCampaign(camp.campaignId);
    assert(campaignManager.getCampaign(camp.campaignId)?.status === 'PAUSED', 'Test 9: Campaign pause working');

    campaignManager.resumeCampaign(camp.campaignId);
    assert(campaignManager.getCampaign(camp.campaignId)?.status === 'ACTIVE', 'Test 9: Campaign resume working');

    // Duplicate
    const dup = campaignManager.duplicateCampaign(camp.campaignId);
    assert(!!dup && dup.name.includes('Copy'), 'Test 9: Campaign duplication creates clean draft copy');

    // Archive
    campaignManager.archiveCampaign(camp.campaignId);
    assert(campaignManager.getCampaign(camp.campaignId)?.status === 'ARCHIVED', 'Test 9: Campaign archive working');

    // Generate Report
    const rep = campaignManager.generateCampaignReport(camp.campaignId);
    assert(rep.includes('CAMPAIGN PERFORMANCE REPORT'), 'Test 9: Campaign report generation successful');
  }

  // Test 10: Structured Business Memory Synchronization
  {
    const memory = businessMemoryManager.getBusinessMemory();
    assert(!!memory.businessName, 'Test 10: Recalls business name');
    assert(Array.isArray(memory.services), 'Test 10: Recalls structured services array');

    const updated = businessMemoryManager.updateBusinessMemory({
      businessName: 'FRIDAY Media Innovations',
      targetAudience: 'Global Founders & Modern Studios',
      brandVoice: 'Dynamic, insightful, and sharply focused',
    });

    assert(updated.businessName === 'FRIDAY Media Innovations', 'Test 10: Updates and syncs business name');
    assert(businessIntelligenceManager.getProfile().businessName === 'FRIDAY Media Innovations', 'Test 10: Business Intelligence Profile synchronized with Business Memory');
  }

  // Test 11: Executive Report Generation
  {
    const wf = businessWorkflowEngine.createWorkflow('Comprehensive Agency Scaling Blueprint');
    const report = businessWorkflowEngine.generateWorkflowReport(wf.workflowId);

    assert(report.includes('FRIDAY AUTONOMOUS BUSINESS MANAGER REPORT'), 'Test 11: Generates comprehensive Markdown business report');
    assert(report.includes(wf.goal), 'Test 11: Report includes business goal');
    assert(report.includes('Detailed Stage Execution Trace'), 'Test 11: Report includes stage execution trace');
  }

  // Test 12: ToolManager Function Calling Integration for Part 10
  {
    const resCreate = await toolManager.executeTool('createBusinessWorkflow', {
      goal: 'Launch automated YouTube business pipeline',
    });
    assert(resCreate.success === true && !!resCreate.workflowId, 'Test 12: ToolManager routes createBusinessWorkflow');

    const resStatus = await toolManager.executeTool('getBusinessWorkflowStatus', {
      workflowId: resCreate.workflowId,
    });
    assert(resStatus.success === true && typeof resStatus.progress === 'number', 'Test 12: ToolManager routes getBusinessWorkflowStatus');

    const resMemory = await toolManager.executeTool('getBusinessMemory', {});
    assert(resMemory.success === true && !!resMemory.memory, 'Test 12: ToolManager routes getBusinessMemory');

    const resCampaigns = await toolManager.executeTool('getBusinessCampaigns', {});
    assert(resCampaigns.success === true && Array.isArray(resCampaigns.campaigns), 'Test 12: ToolManager routes getBusinessCampaigns');
  }

  // Test 13: Regression Validation Across Parts 1–9
  {
    // Part 7: Business Intelligence
    const goals = businessIntelligenceManager.getGoals();
    assert(Array.isArray(goals), 'Test 13: Part 7 Business Intelligence remains operational');

    // Part 8: Content Marketing
    const ideas = contentMarketingManager.generateContentIdeas({ topic: 'Video Editing' });
    assert(Array.isArray(ideas) && ideas.length > 0, 'Test 13: Part 8 Content Marketing remains operational');

    // Part 9: Agent Orchestrator
    const workers = agentOrchestrator.getWorkersStatus();
    assert(workers.length === 10, 'Test 13: Part 9 Agent Orchestrator fleet of 10 workers intact');

    // Part 6: Android Bridge
    assert(typeof androidBridge.isAvailable() === 'boolean', 'Test 13: Part 6 Android Bridge interface intact');
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
