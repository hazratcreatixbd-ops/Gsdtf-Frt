/**
 * PART 13 — CEO / MANAGER / PLANNER / WORKER OPERATING SYSTEM TEST SUITE
 * Verifies all 24 Part 13 subsystems and requirements with authentic execution.
 */

import { managerEngine } from '../src/world/manager/ManagerEngine';
import { GoalAnalyzer } from '../src/world/manager/GoalAnalyzer';
import { PlanningEngine } from '../src/world/manager/PlanningEngine';
import { workerCapabilityRegistry } from '../src/world/manager/WorkerCapabilityRegistry';
import { WorkerRouter } from '../src/world/manager/WorkerRouter';
import { workerTaskQueue } from '../src/world/manager/WorkerTaskQueue';
import { approvalGate } from '../src/world/manager/ApprovalGate';
import { VerificationEngine } from '../src/world/manager/VerificationEngine';
import { ReviewEngine } from '../src/world/manager/ReviewEngine';
import { workflowTimeline } from '../src/world/manager/WorkflowTimeline';
import { worldEventBus } from '../src/world/events/WorldEventBus';
import { workerRegistry } from '../src/world/workers/WorkerRegistry';
import { advancedMemoryManager } from '../src/services/memory/AdvancedMemoryManager';
import { businessWorkflowEngine } from '../src/services/BusinessWorkflowEngine';
import { toolManager } from '../src/services/ToolManager';
import { DAGTask, TaskGraph } from '../src/world/manager/ManagerTypes';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`✅ [PASS] ${label}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${label}`);
    failed++;
  }
}

async function runPart13Tests() {
  console.log('======================================================');
  console.log('🧪 TESTING PART 13 — CEO / MANAGER / PLANNER / WORKER OS');
  console.log('======================================================');

  managerEngine.resetForTesting();
  advancedMemoryManager.resetForTesting();

  // -------------------------------------------------------------------------
  // 1. CAPABILITY REGISTRY & PRESERVATION OF ALL 17 WORKERS
  // -------------------------------------------------------------------------
  const allCapabilities = workerCapabilityRegistry.getAllCapabilities();
  const allWorldWorkers = workerRegistry.getAllWorkers();
  assert(allCapabilities.length === 17, 'Capability Registry contains all 17 Agent Town Workers');
  assert(allWorldWorkers.length === 17, 'Part 11 WorkerRegistry preserves all 17 Workers');

  const expectedNames = [
    'Hermes', 'Chronos', 'Nova', 'Mercury', 'Aero', 'Orion', 'Pythagoras',
    'Echo', 'Vesper', 'Astra', 'Aegis', 'Zephyr', 'Vigil', 'Argus',
    'Athena', 'Titan', 'Atlas',
  ];
  const registeredNames = allCapabilities.map((c) => c.name);
  const allNamesPresent = expectedNames.every((n) => registeredNames.includes(n));
  assert(allNamesPresent, 'All 17 canonical Worker names (Hermes..Atlas) preserved');

  // Verify no fake WORKING state when idle
  const workingAtIdle = allCapabilities.filter((w) => w.status === 'WORKING').length;
  assert(workingAtIdle === 0, 'Zero fake WORKING states when no task is running');

  // -------------------------------------------------------------------------
  // 2. GOAL ANALYZER (Complexity, Risk, Deadlines, Capabilities)
  // -------------------------------------------------------------------------
  const simpleGoal = GoalAnalyzer.analyze('Check current local weather report');
  assert(simpleGoal.complexity === 'SIMPLE', 'GoalAnalyzer classifies single-domain query as SIMPLE');
  assert(simpleGoal.riskLevel === 'LOW', 'GoalAnalyzer classifies benign weather query as LOW risk');

  const moderateGoal = GoalAnalyzer.analyze('Research competitors and compare pricing by tomorrow');
  assert(moderateGoal.complexity === 'MODERATE', 'GoalAnalyzer classifies 2-worker query as MODERATE');
  assert(moderateGoal.deadline?.toLowerCase().includes('by tomorrow') === true, 'GoalAnalyzer extracts deadline ("by tomorrow")');

  const complexGoal = GoalAnalyzer.analyze('Find affordable suppliers for product X and calculate estimated landed cost');
  assert(
    complexGoal.complexity === 'COMPLEX' || complexGoal.complexity === 'MULTI_STAGE',
    'GoalAnalyzer classifies supplier + landed cost goal as COMPLEX/MULTI_STAGE'
  );
  assert(complexGoal.requiredWorkers.includes('worker-research'), 'GoalAnalyzer requires Nova (Research)');
  assert(complexGoal.requiredWorkers.includes('worker-market-data'), 'GoalAnalyzer requires Mercury (Market Data)');
  assert(complexGoal.requiredWorkers.includes('worker-analytics'), 'GoalAnalyzer requires Pythagoras (Analytics)');

  const multiStageGoal = GoalAnalyzer.analyze(
    'Research the AI video editing market, compare pricing, calculate ROI metrics, and prepare a comprehensive business opportunity report'
  );
  assert(multiStageGoal.complexity === 'MULTI_STAGE', 'GoalAnalyzer classifies multi-domain executive directive as MULTI_STAGE');

  const sensitiveGoal = GoalAnalyzer.analyze('Delete old credential tokens and publish announcement email');
  assert(sensitiveGoal.riskLevel === 'SENSITIVE', 'GoalAnalyzer flags credential deletion as SENSITIVE risk');
  assert(sensitiveGoal.approvalRequired === true, 'GoalAnalyzer enforces approvalRequired on sensitive goal');

  // -------------------------------------------------------------------------
  // 3. WORKER ROUTER (Capability Matching & Load Balancing)
  // -------------------------------------------------------------------------
  const selectedResearcher = WorkerRouter.selectWorker('market_research', 'HIGH');
  assert(selectedResearcher?.workerId === 'worker-research', 'WorkerRouter selects Nova for market_research');

  const selectedVerifier = WorkerRouter.selectWorker('fact_check', 'CRITICAL');
  assert(selectedVerifier?.workerId === 'worker-verification', 'WorkerRouter selects Astra for fact_check');

  // -------------------------------------------------------------------------
  // 4. PLANNING ENGINE & TASK GRAPH (DAG Dependencies)
  // -------------------------------------------------------------------------
  const planGraph = PlanningEngine.createPlan(multiStageGoal, 'wf_test_dag');
  assert(planGraph.tasks.length >= 6, `PlanningEngine generated structured 6-stage DAG (${planGraph.tasks.length} tasks)`);
  assert(planGraph.executionMode === 'MIXED', 'PlanningEngine selects MIXED execution mode for parallel Stage 1 + sequential Stage 2-5');

  const stage1Tasks = planGraph.tasks.filter((t) => t.dependencies.length === 0);
  const dependentTasks = planGraph.tasks.filter((t) => t.dependencies.length > 0);
  assert(stage1Tasks.length >= 2, 'Stage 1 has parallel unblocked tasks (Nova + Mercury)');
  assert(stage1Tasks.every((t) => t.status === 'READY'), 'Stage 1 tasks initialize in READY state');
  assert(dependentTasks.every((t) => t.status === 'PENDING'), 'Downstream dependent tasks initialize in PENDING state');

  // -------------------------------------------------------------------------
  // 5. END-TO-END EXECUTION, PARALLEL STAGE 1, WORKER HANDOFF, VERIFICATION & REVIEW
  // -------------------------------------------------------------------------
  const capturedEvents: string[] = [];
  const unsubEvents = worldEventBus.on('*', (evt) => {
    capturedEvents.push(`${evt.type}:${evt.title}`);
  });

  const executedGraph = await managerEngine.executeGoal(
    'Research the AI video editing market, compare pricing, and prepare a business opportunity report'
  );

  assert(executedGraph.status === 'COMPLETED', 'ManagerEngine executed full workflow to COMPLETED state');
  assert(executedGraph.progressPercent === 100, 'TaskGraph progress reached 100%');
  assert(
    executedGraph.tasks.every((t) => t.status === 'COMPLETED'),
    'All DAG tasks in workflow reached COMPLETED status'
  );

  // Check Worker-to-Worker communication (upstreamOutputs handoff)
  const analyticsNode = executedGraph.tasks.find((t) => t.role === 'ANALYTICS');
  assert(
    Array.isArray(analyticsNode?.input?.upstreamOutputs) && analyticsNode!.input.upstreamOutputs.length >= 2,
    'Worker-to-Worker Communication: Pythagoras received upstream outputs from Nova & Mercury'
  );

  // Check Astra Verification Verdict
  const researchNode = executedGraph.tasks.find((t) => t.role === 'RESEARCH');
  assert(
    researchNode?.verification?.status === 'PASS' && (researchNode?.verification?.score || 0) >= 80,
    'Verification Loop: Astra audited Nova output and issued PASS verdict'
  );

  // Check Athena Review Verdict
  const reviewNode = executedGraph.tasks.find((t) => t.role === 'REVIEWER');
  assert(
    reviewNode?.review?.status === 'APPROVED' && (reviewNode?.review?.qualityScore || 0) >= 80,
    'Review Loop: Athena peer-reviewed deliverables and issued APPROVED verdict'
  );

  // Check Final Executive Synthesis by Hermes
  assert(
    Boolean(executedGraph.finalSummary && executedGraph.finalSummary.includes('Executive Synthesis')),
    'Hermes generated Final Executive Synthesis report'
  );

  // Check Worker state synchronization after completion (no stuck WORKING states)
  const postRunWorkingCount = workerCapabilityRegistry.getAllCapabilities().filter((w) => w.status === 'WORKING').length;
  assert(postRunWorkingCount === 0, 'Worker State Sync: All workers returned to READY/COMPLETED after workflow finished');

  // -------------------------------------------------------------------------
  // 6. EVENT BUS & WORKFLOW TIMELINE
  // -------------------------------------------------------------------------
  assert(capturedEvents.some((e) => e.startsWith('WORKFLOW_CREATED:')), 'Event Bus emitted WORKFLOW_CREATED');
  assert(capturedEvents.some((e) => e.startsWith('PLAN_CREATED:')), 'Event Bus emitted PLAN_CREATED');
  assert(capturedEvents.some((e) => e.includes('Worker-to-Worker Handoff')), 'Event Bus emitted Worker-to-Worker Handoff');
  assert(capturedEvents.some((e) => e.startsWith('VERIFICATION_COMPLETED:')), 'Event Bus emitted VERIFICATION_COMPLETED');
  assert(capturedEvents.some((e) => e.startsWith('WORKFLOW_COMPLETED:')), 'Event Bus emitted WORKFLOW_COMPLETED');

  const timelineEvents = workflowTimeline.getEvents();
  assert(timelineEvents.length >= 8, `Workflow Timeline recorded ${timelineEvents.length} authentic operational milestones`);
  unsubEvents();

  // -------------------------------------------------------------------------
  // 7. PART 12 MEMORY & PART 7/10 BUSINESS INTEGRATION
  // -------------------------------------------------------------------------
  const researchMemories = advancedMemoryManager.getResearchMemories('video editing');
  assert(researchMemories.length >= 1, 'Part 12 Memory Integration: Astra-verified findings saved to Research Memory');

  const businessMemories = advancedMemoryManager.search({ query: 'Opportunity Briefing' });
  assert(businessMemories.length >= 1, 'Part 12 Memory Integration: Hermes synthesis saved to Long-Term Business Memory');

  const bizWorkflows = businessWorkflowEngine.listWorkflows();
  assert(bizWorkflows.length >= 1, 'Part 7/10 Business Integration: BusinessWorkflowEngine synchronized with executive goal');

  // -------------------------------------------------------------------------
  // 8. PRIORITY QUEUE, RETRY & FAILURE RECOVERY
  // -------------------------------------------------------------------------
  const retryGraphId = 'wf_test_retry';
  const transientTask: DAGTask = {
    id: 'task_transient_1',
    workflowId: retryGraphId,
    title: 'Transient API Fetch',
    description: 'Test automatic retry on transient failure',
    workerId: 'worker-research',
    workerName: 'Nova',
    role: 'RESEARCH',
    priority: 'CRITICAL',
    dependencies: [],
    status: 'READY',
    input: { goal: 'Retry test', simulateFailureOnce: true },
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: 2,
    requiresApproval: false,
    requiresVerification: true,
  };
  const retryGraph: TaskGraph = {
    workflowId: retryGraphId,
    goal: 'Test Retry and Priority',
    analysis: GoalAnalyzer.analyze('Test Retry and Priority'),
    tasks: [transientTask],
    executionMode: 'SEQUENTIAL',
    status: 'PLANNED',
    leadWorker: 'worker-manager',
    plannerWorker: 'worker-planner',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentStepIndex: 0,
    totalSteps: 1,
    progressPercent: 0,
  };

  workerTaskQueue.registerGraph(retryGraph);
  await workerTaskQueue.tickGraph(retryGraph);
  assert(
    transientTask.retryCount === 1 && transientTask.status === 'COMPLETED',
    'Retry Mechanism: Task recovered from transient failure on retry #1 and completed'
  );

  // Test permanent failure & manual recovery
  const failGraphId = 'wf_test_fail';
  const permFailTask: DAGTask = {
    id: 'task_perm_fail',
    workflowId: failGraphId,
    title: 'Failing Task',
    description: 'Test permanent failure handling',
    workerId: 'worker-coder',
    workerName: 'Zephyr',
    role: 'CODER',
    priority: 'HIGH',
    dependencies: [],
    status: 'READY',
    input: { goal: 'Failure recovery test', simulatePermanentFailure: true },
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: 1,
    requiresApproval: false,
    requiresVerification: false,
  };
  const failGraph: TaskGraph = {
    workflowId: failGraphId,
    goal: 'Failure Recovery Test',
    analysis: GoalAnalyzer.analyze('Failure Recovery Test'),
    tasks: [permFailTask],
    executionMode: 'SEQUENTIAL',
    status: 'PLANNED',
    leadWorker: 'worker-manager',
    plannerWorker: 'worker-planner',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentStepIndex: 0,
    totalSteps: 1,
    progressPercent: 0,
  };
  workerTaskQueue.registerGraph(failGraph);
  await workerTaskQueue.tickGraph(failGraph);
  assert(permFailTask.status === 'FAILED', 'Failure Handling: Task exceeding maxRetries transitions to FAILED');

  // Remove failure flag and trigger manual retryTask recovery
  permFailTask.input.simulatePermanentFailure = false;
  workerTaskQueue.retryTask(failGraphId, 'task_perm_fail');
  await new Promise((r) => setTimeout(r, 120));
  assert(permFailTask.status === 'COMPLETED', 'Failure Recovery: Manual retryTask recovered failed task to COMPLETED');

  // -------------------------------------------------------------------------
  // 9. APPROVAL GATE & SECURITY BOUNDARIES
  // -------------------------------------------------------------------------
  const approvalWf = await managerEngine.executeGoal(
    'Open Android phone settings and send WhatsApp broadcast message to client list'
  );
  assert(
    approvalWf.status === 'WAITING_APPROVAL',
    'Approval Gate: Sensitive external action paused workflow in WAITING_APPROVAL'
  );
  const pendingApprovals = approvalGate.getPendingRequests();
  assert(pendingApprovals.length >= 1, 'Approval Gate queued pending human approval request');

  // Approve via Voice / ToolManager
  const approveToolRes = await toolManager.executeTool('approveManagerAction', {
    requestId: pendingApprovals[0].id,
    notes: 'Authorized by user during test',
  });
  assert(approveToolRes.success === true, 'Voice/Tool Integration: approveManagerAction approved pending request');
  await new Promise((r) => setTimeout(r, 350));

  // Approve any remaining approval gate (e.g., final delivery on sensitive workflow)
  const remainingApprovals = approvalGate.getPendingRequests();
  for (const req of remainingApprovals) {
    approvalGate.approve(req.id, 'Authorized final step');
  }
  await new Promise((r) => setTimeout(r, 250));
  assert(
    approvalWf.status === 'COMPLETED',
    'Approval Gate: Workflow resumed and completed after human approval'
  );

  // -------------------------------------------------------------------------
  // 10. VOICE COMMAND ROUTING & PERSISTENCE / CRASH RECOVERY
  // -------------------------------------------------------------------------
  const voiceDispatch = await toolManager.executeTool('orchestrateCeoGoal', {
    goal: 'Analyze website security headers and permissions',
  });
  assert(voiceDispatch.success === true && Boolean(voiceDispatch.workflowId), 'Voice Integration: orchestrateCeoGoal dispatched workflow');

  const statusToolRes = await toolManager.executeTool('getManagerOperationsStatus', {});
  assert(statusToolRes.success === true && Boolean(statusToolRes.dashboard), 'Voice Integration: getManagerOperationsStatus returned live dashboard');

  // Test crash recovery state restoration
  const runningGraph: TaskGraph = {
    workflowId: 'wf_crash_sim',
    goal: 'Simulated Interrupted Workflow',
    analysis: GoalAnalyzer.analyze('Simulated Interrupted Workflow'),
    tasks: [],
    executionMode: 'SEQUENTIAL',
    status: 'RUNNING',
    leadWorker: 'worker-manager',
    plannerWorker: 'worker-planner',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentStepIndex: 0,
    totalSteps: 1,
    progressPercent: 50,
  };
  workerTaskQueue.registerGraph(runningGraph);
  managerEngine.saveToStorage();
  workerTaskQueue.clearAllGraphs();
  managerEngine.restoreFromStorage();
  const recoveredGraph = workerTaskQueue.getGraph('wf_crash_sim');
  assert(
    recoveredGraph?.status === 'RECOVERY_REQUIRED' && recoveredGraph?.recoveredFromCrash === true,
    'Persistence & Recovery: Interrupted RUNNING workflow restored with RECOVERY_REQUIRED flag'
  );

  console.log('======================================================');
  if (failed === 0) {
    console.log(`🎉 ALL PART 13 TESTS PASSED (${passed}/${passed + failed})!`);
  } else {
    console.error(`⚠️ PART 13 TESTS: ${passed} passed, ${failed} failed.`);
    process.exit(1);
  }
  console.log('======================================================');
}

runPart13Tests().catch((err) => {
  console.error('Fatal error in Part 13 tests:', err);
  process.exit(1);
});
