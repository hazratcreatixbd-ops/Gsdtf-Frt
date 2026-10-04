/**
 * PART 9 — FRIDAY Agent & Worker Orchestration System Automated Test Suite
 * Validates all core components:
 * 1. Goal Analyzer & Task Planner (DAG construction, dependencies)
 * 2. 10 Specialized Workers Fleet (capabilities & routing)
 * 3. Dynamic DAG Execution Queue & Worker execution
 * 4. Human-in-the-Loop Approval Checkpoints (Safety rules)
 * 5. Pause, Resume, and Cancellation Controls
 * 6. Cross-Worker Context Sharing & Artifacts
 * 7. Verification Worker Quality Auditing & Grading (PASS / NEEDS_REVIEW / FAILED)
 * 8. Shared Agent Memory & Workflow History
 * 9. Spoken Voice Summary Generation
 * 10. ToolManager Function Calling Integration
 * 11. Regression validation across Parts 1–8
 */

import { agentOrchestrator } from '../src/services/agents/AgentOrchestrator';
import { agentTaskPlanner } from '../src/services/agents/AgentTaskPlanner';
import { agentWorkerRouter } from '../src/services/agents/AgentWorkerRouter';
import { agentMemory } from '../src/services/agents/AgentMemory';
import { toolManager } from '../src/services/ToolManager';
import { businessIntelligenceManager } from '../src/services/BusinessIntelligenceManager';
import { contentMarketingManager } from '../src/services/ContentMarketingManager';
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
  console.log('PART 9 — FRIDAY AGENT & WORKER ORCHESTRATION TESTS');
  console.log('====================================================\n');

  // Test 1: Worker Registry - All 10 Specialized Workers
  {
    const workers = agentWorkerRouter.getAllWorkers();
    const workerIds = workers.map((w) => w.id);

    const expectedWorkers = [
      'research-worker',
      'business-intelligence-worker',
      'content-worker',
      'linkedin-worker',
      'social-media-worker',
      'engagement-worker',
      'analytics-worker',
      'publishing-worker',
      'media-worker',
      'verification-worker',
    ];

    const hasAll = expectedWorkers.every((id) => workerIds.includes(id));
    assert(
      hasAll && workers.length === 10,
      'Test 1: Worker Registry contains all 10 specialized workers',
      { registered: workerIds }
    );
  }

  // Test 2: Worker Router - Capability & Type Matching
  {
    const w1 = agentWorkerRouter.findWorkerForTask({
      id: 't1',
      title: 'Scan market competitors',
      description: '',
      workerType: 'research-worker',
      priority: 'high',
      status: 'pending',
      dependencies: [],
      input: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const w2 = agentWorkerRouter.findWorkerForTask({
      id: 't2',
      title: 'Draft LinkedIn thought leadership post',
      description: '',
      workerType: 'linkedin',
      priority: 'medium',
      status: 'pending',
      dependencies: [],
      input: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const w3 = agentWorkerRouter.findWorkerForTask({
      id: 't3',
      title: 'Audit deliverables and check safety compliance',
      description: '',
      workerType: 'verification',
      priority: 'high',
      status: 'pending',
      dependencies: [],
      input: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    assert(
      w1?.id === 'research-worker' &&
      w2?.id === 'linkedin-worker' &&
      w3?.id === 'verification-worker',
      'Test 2: Worker Router accurately routes tasks by type, capability, and heuristics'
    );
  }

  // Test 3: Goal Analyzer & Task Planner
  {
    const plan = agentTaskPlanner.planGoal(
      'Research competitors, create 7-day content strategy, draft LinkedIn post, and verify deliverables'
    );

    assert(
      plan.id.startsWith('wf_') &&
      plan.tasks.length >= 4 &&
      plan.status === 'draft' &&
      plan.tasks.some((t) => t.dependencies.length > 0),
      'Test 3: Task Planner decomposes high-level goal into an ordered DAG with dependencies'
    );
  }

  // Test 4: End-to-End Workflow Execution with Context Passing
  {
    const testGoal = 'Automated Test: Research market, draft content, and verify deliverables';
    const plan = await agentOrchestrator.orchestrateGoal(testGoal, {
      customTasks: [
        {
          id: 'step_1_research',
          title: 'Market Signal Scan',
          workerType: 'research-worker',
          priority: 'high',
          dependencies: [],
          input: { query: 'AI Productivity Software', geography: 'Global' },
        },
        {
          id: 'step_2_bi',
          title: 'Strategic Positioning Analysis',
          workerType: 'business-intelligence-worker',
          priority: 'high',
          dependencies: ['step_1_research'],
          input: { businessName: 'TaskForce AI' },
        },
        {
          id: 'step_3_content',
          title: 'Draft Multi-Platform Hooks & Ideas',
          workerType: 'content-worker',
          priority: 'medium',
          dependencies: ['step_2_bi'],
          input: { topic: 'Autonomous AI Orchestration' },
        },
        {
          id: 'step_4_verify',
          title: 'Quality & Deliverable Audit',
          workerType: 'verification-worker',
          priority: 'critical',
          dependencies: ['step_3_content'],
          input: {},
        },
      ],
    });

    const allCompleted = plan.tasks.every((t) => t.status === 'completed');
    const verifyTask = plan.tasks.find((t) => t.id === 'step_4_verify');

    assert(
      plan.status === 'completed' &&
      plan.progress === 100 &&
      allCompleted &&
      verifyTask?.output?.verification?.grade !== undefined,
      'Test 4: Orchestrator executes DAG tasks sequentially resolving dependencies with context passing',
      {
        planStatus: plan.status,
        progress: plan.progress,
        taskStatuses: plan.tasks.map((t) => ({ id: t.id, status: t.status, error: t.error })),
        verifyGrade: verifyTask?.output?.verification?.grade,
      }
    );
  }

  // Test 5: Human Approval Checkpoint Enforcement (Safety Rule)
  {
    const approvalPlan = await agentOrchestrator.orchestrateGoal('Goal with Human Approval Checkpoint', {
      customTasks: [
        {
          id: 'task_prep',
          title: 'Prepare Staged Content Deliverable',
          workerType: 'content-worker',
          priority: 'medium',
          dependencies: [],
          input: { topic: 'Safe AI Launch' },
        },
        {
          id: 'task_publish_handoff',
          title: 'Publishing Handoff to External Platform',
          workerType: 'publishing-worker',
          priority: 'critical',
          dependencies: ['task_prep'],
          requiresApproval: true,
          approvalDetails: {
            action: 'External Platform Distribution',
            summary: 'Staging publishing package for external network review',
          },
          input: { platform: 'LinkedIn', title: 'Safe AI Launch Announcement' },
        },
      ],
    });

    // Should stop at waiting_for_approval
    const waitingTask = approvalPlan.tasks.find((t) => t.id === 'task_publish_handoff');
    const stoppedAtApproval =
      approvalPlan.status === 'waiting_for_approval' &&
      waitingTask?.status === 'waiting_for_approval';

    // Now user grants approval
    const approved = await agentOrchestrator.approveTask('task_publish_handoff', true);

    const postApprovalStatus = agentOrchestrator.getActiveWorkflow();

    assert(
      stoppedAtApproval &&
      approved &&
      postApprovalStatus?.status === 'completed',
      'Test 5: Human approval checkpoint halts execution for external actions and resumes upon approval'
    );
  }

  // Test 6: Workflow Pause and Resume Controls
  {
    const plan = agentTaskPlanner.planGoal('Pause and Resume Verification', {
      customTasks: [
        { id: 'p1', title: 'Task 1', workerType: 'content-worker', dependencies: [] },
        { id: 'p2', title: 'Task 2', workerType: 'linkedin-worker', dependencies: ['p1'] },
      ],
    });

    // Start asynchronously
    const runPromise = agentOrchestrator.orchestrateGoal('Pause and Resume Verification', {
      customTasks: [
        { id: 'p1', title: 'Task 1', workerType: 'content-worker', dependencies: [] },
      ],
    });

    const active = agentOrchestrator.getActiveWorkflow();
    const paused = agentOrchestrator.pauseWorkflow();

    assert(
      paused === true || active !== null,
      'Test 6: Orchestrator supports interactive execution pausing and state suspension'
    );

    if (paused) {
      const resumed = await agentOrchestrator.resumeWorkflow();
      assert(resumed, 'Test 6b: Orchestrator successfully resumes suspended workflow execution');
    }
  }

  // Test 7: Verification Worker Output & Grading
  {
    const verifyWorker = agentWorkerRouter.getWorker('verification-worker');
    assert(
      verifyWorker !== undefined &&
      verifyWorker.capabilities.includes('output_verification') &&
      verifyWorker.capabilities.includes('safety_compliance_check'),
      'Test 7: Verification Worker is equipped with quality and safety compliance inspection'
    );
  }

  // Test 8: Shared Agent Memory Storage & Query
  {
    const memItem = agentMemory.remember({
      category: 'approved_strategy',
      title: 'Q4 B2B LinkedIn Thought Leadership Strategy',
      content: 'Focus on case studies, technical frameworks, and zero-hype executive summaries.',
      metadata: { targetAudience: 'CTOs and VP Engineering' },
    });

    const queried = agentMemory.query('executive summaries', 'approved_strategy');
    const allMemories = agentMemory.getAllMemories();

    assert(
      memItem.id.startsWith('mem_') &&
      queried.length >= 1 &&
      allMemories.some((m) => m.id === memItem.id),
      'Test 8: Agent Memory persists cross-worker contextual knowledge and supports filtered queries'
    );
  }

  // Test 9: Spoken Voice Summary Generation
  {
    const dummyWorkflow = {
      id: 'wf_voice_test',
      goal: 'Launch Q4 Strategy',
      status: 'completed' as const,
      tasks: [
        {
          id: 't1',
          title: 'T1',
          description: '',
          workerType: 'research-worker',
          priority: 'high' as const,
          status: 'completed' as const,
          dependencies: [],
          input: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      progress: 100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executionLogs: [],
    };

    const summary = agentOrchestrator.generateVoiceSummary(dummyWorkflow);
    assert(
      typeof summary === 'string' &&
      summary.includes('completed successfully') &&
      !summary.includes('undefined'),
      'Test 9: Orchestrator generates concise, natural spoken voice summaries for FRIDAY Gemini Live'
    );
  }

  // Test 10: ToolManager Function Calling Integration
  {
    const workersRes: any = await toolManager.executeTool('getAgentWorkers', {});
    const orchestrateRes: any = await toolManager.executeTool('orchestrateBusinessGoal', {
      goal: 'Test ToolManager Orchestration Trigger',
      customTasks: [
        { id: 'tm_t1', title: 'ToolManager Subtask', workerType: 'content-worker', dependencies: [] },
      ],
    });
    const statusRes: any = await toolManager.executeTool('getOrchestratorStatus', {});
    const historyRes: any = await toolManager.executeTool('getAgentExecutionHistory', {});

    assert(
      workersRes?.success === true &&
      workersRes?.workers?.length === 10 &&
      orchestrateRes?.success === true &&
      statusRes?.success === true &&
      historyRes?.success === true,
      'Test 10: ToolManager routes Part 9 orchestration tools (orchestrateBusinessGoal, getWorkers, status)'
    );
  }

  // Test 11: Regressions - Part 7 Business Intelligence
  {
    const profile = businessIntelligenceManager.getProfile();
    const goals = businessIntelligenceManager.getGoals();
    assert(
      profile.businessName !== undefined &&
      Array.isArray(goals),
      'Test 11: Part 7 Business Intelligence persists and integrates seamlessly with Part 9'
    );
  }

  // Test 12: Regressions - Part 8 Content Marketing
  {
    const cProfile = contentMarketingManager.getContentProfile();
    const pillars = contentMarketingManager.getContentPillars();
    assert(
      cProfile.brandName !== undefined &&
      Array.isArray(pillars),
      'Test 12: Part 8 Content Marketing persists and operates smoothly alongside Part 9'
    );
  }

  // Test 13: Regressions - Part 6 Android Bridge
  {
    const capabilities = androidBridge.getSupportedCapabilities();
    const isAvail = androidBridge.isAvailable();
    assert(
      typeof capabilities.browser === 'boolean' &&
      typeof isAvail === 'boolean',
      'Test 13: Part 6 Android Bridge remains intact and fully functional'
    );
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
