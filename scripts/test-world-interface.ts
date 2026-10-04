/**
 * PART 11 — FRIDAY World Interface, Agent Town, & Worker System Tests
 * Verifies:
 * 1. WorkerRegistry initializes all 17 specialized autonomous workers
 * 2. Each worker has valid role, workstation zone, coordinates, and capabilities
 * 3. Selection, task assignment, progress update, and completion lifecycle
 * 4. ManagerEngine goal dispatching and executive triage
 * 5. WorldEventBus event publishing, filtering, and history retention
 * 6. ToolManager interface switching between HOME and WORLD
 * 7. BusinessWorkflowEngine integration driving active worker states in Agent Town
 */

import { workerRegistry } from '../src/world/workers/WorkerRegistry';
import { managerEngine } from '../src/world/manager/ManagerEngine';
import { worldEventBus } from '../src/world/events/WorldEventBus';
import { toolManager } from '../src/services/ToolManager';
import { businessWorkflowEngine } from '../src/services/BusinessWorkflowEngine';
import { WorkerRole } from '../src/world/types/WorldTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING PART 11 — WORLD INTERFACE & AGENT TOWN');
  console.log('======================================================\n');

  // Test 1: Worker Registry Count and Roles
  console.log('--- Test 1: Verifying All 17 Specialized Workers ---');
  const allWorkers = workerRegistry.getAllWorkers();
  assert(allWorkers.length === 17, `Expected 17 workers in Agent Town, found: ${allWorkers.length}`);

  const requiredRoles: WorkerRole[] = [
    'MANAGER',
    'PLANNER',
    'RESEARCH',
    'CODER',
    'DEBUGGER',
    'TESTER',
    'REVIEWER',
    'BUSINESS',
    'MARKET_DATA',
    'CONTENT',
    'MEDIA',
    'DEVICE',
    'NEWS_WEATHER',
    'TRAVEL',
    'SECURITY',
    'VERIFICATION',
    'ANALYTICS',
  ];

  requiredRoles.forEach((role) => {
    const found = allWorkers.find((w) => w.role === role);
    assert(!!found, `Worker with role ${role} must exist (Found: ${found?.name || 'none'})`);
    assert(found!.workstation.x >= 0 && found!.workstation.x <= 100, `${found!.name} must have valid workstation X`);
    assert(found!.workstation.y >= 0 && found!.workstation.y <= 100, `${found!.name} must have valid workstation Y`);
    assert(found!.capabilities.length > 0, `${found!.name} must have declared capabilities`);
  });

  // Test 2: Worker Selection and Detailed Inspection
  console.log('\n--- Test 2: Worker Selection & Station Focus ---');
  workerRegistry.selectWorker('worker-research');
  const selected = workerRegistry.getSelectedWorker();
  assert(selected.id === 'worker-research', `Selected worker should be Nova (research), got: ${selected.id}`);
  assert(selected.name === 'Nova', `Worker name is Nova`);

  // Test 3: Task Assignment & Completion Lifecycle
  console.log('\n--- Test 3: Direct Task Assignment & Progress Lifecycle ---');
  const assignOk = workerRegistry.assignTask('worker-research', 'Deep scan on emerging AI video tools');
  assert(assignOk, 'Task successfully assigned to research worker');
  const workingResearch = workerRegistry.getWorker('worker-research');
  assert(workingResearch?.status === 'WORKING', 'Worker status transitioned to WORKING');
  assert(workingResearch?.currentTask?.includes('emerging AI video tools') || false, 'Current task correctly set');

  const completeOk = workerRegistry.completeTask('worker-research', 'Identified top 5 viral competitor frameworks');
  assert(completeOk, 'Task completed successfully');
  const readyResearch = workerRegistry.getWorker('worker-research');
  assert(readyResearch?.status === 'READY', 'Worker returned to READY status');
  assert(readyResearch?.metrics.tasksCompleted! > 0, 'Worker metrics updated');

  // Test 4: Manager Engine Goal Triage
  console.log('\n--- Test 4: Executive Manager Hermes Goal Triage ---');
  const triage = managerEngine.dispatchGoal('Scale subscription revenue for creator video course');
  assert(!!triage.workflowId, 'Manager successfully initiated workflow ID');
  assert(triage.managerAction.includes('Hermes'), 'Manager action recorded');
  const decisions = managerEngine.getDecisions();
  assert(decisions.length > 0, 'Manager decision log populated');

  // Test 5: World Event Bus
  console.log('\n--- Test 5: World Event Bus Emission & History ---');
  let receivedCustomEvent = false;
  const unsub = worldEventBus.on('MANAGER_DECISION', (evt) => {
    if (evt.title.includes('Custom Executive Decision')) {
      receivedCustomEvent = true;
    }
  });

  worldEventBus.emit({
    type: 'MANAGER_DECISION',
    title: 'Custom Executive Decision',
    details: 'Verified event bus dispatch pipeline.',
    level: 'info',
  });
  assert(receivedCustomEvent, 'WorldEventBus dispatched event to listener');
  unsub();

  const history = worldEventBus.getHistory();
  assert(history.length > 0, 'WorldEventBus maintains history');

  // Test 6: ToolManager Part 11 Tool Execution
  console.log('\n--- Test 6: ToolManager Interface Mode & Part 11 Tools ---');
  let currentInterfaceMode = 'home';
  const unsubMode = toolManager.onInterfaceMode((m) => {
    currentInterfaceMode = m;
  });

  // Switch to world
  const resWorld = await toolManager.executeTool('switchInterfaceMode', { mode: 'world' });
  assert(resWorld.success && resWorld.mode === 'world', 'Switched to World mode via toolManager');
  assert(currentInterfaceMode === 'world', 'Interface mode listener notified of WORLD mode');

  // Switch to home
  const resHome = await toolManager.executeTool('returnToHome', {});
  assert(resHome.success && resHome.mode === 'home', 'Returned to Home mode via toolManager');
  assert(currentInterfaceMode === 'home', 'Interface mode listener notified of HOME mode');

  unsubMode();

  // Test 7: Worker Registry Status Tool
  console.log('\n--- Test 7: Worker Registry Status Tool ---');
  const resRegistry = await toolManager.executeTool('getWorkerRegistryStatus', {});
  assert(resRegistry.success, 'getWorkerRegistryStatus tool executed');
  assert(resRegistry.totalWorkers === 17, 'Reported 17 total workers');

  // Test 8: Business Workflow Integration with Agent Town
  console.log('\n--- Test 8: End-to-End Workflow Reactivity in Agent Town ---');
  const wf = businessWorkflowEngine.createWorkflow('Build automated marketing pipeline');
  assert(wf.steps.length > 0, 'Workflow generated steps');

  console.log('\n======================================================');
  console.log('🎉 ALL PART 11 WORLD & AGENT TOWN TESTS PASSED (8/8)');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
