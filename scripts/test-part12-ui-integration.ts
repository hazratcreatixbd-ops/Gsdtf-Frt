/**
 * PART 12 — Verification Test Script: Memory UI Integration & End-to-End Workflow
 */

import { advancedMemoryManager } from '../src/services/memory/AdvancedMemoryManager';
import { toolManager } from '../src/services/ToolManager';
import { workerRegistry } from '../src/world/workers/WorkerRegistry';
import { MemoryType, MemoryImportance } from '../src/services/memory/MemoryTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runPart12UIIntegrationTests() {
  console.log('======================================================');
  console.log('🧪 TESTING PART 12 — MEMORY UI INTEGRATION & VERIFICATION');
  console.log('======================================================');

  // Test 1: Clean Reset & Empty State
  advancedMemoryManager.resetForTesting();
  const initialMemories = advancedMemoryManager.getAllMemories();
  assert(initialMemories.length === 0, 'Initial memory store is empty (clean state)');

  const initialStats = advancedMemoryManager.getOverviewStats();
  assert(initialStats.totalCount === 0, 'Stats total count is 0 on empty state');
  assert(initialStats.activeCount === 0, 'Stats active count is 0 on empty state');
  assert(initialStats.importantCount === 0, 'Stats important count is 0 on empty state');

  // Test 2: Test Flow Execution (development test candidate)
  const testCandidate = {
    title: 'System Diagnostic Test Memory',
    content: 'Autonomous Memory Engine verification test candidate for retrieval indexing and provenance validation.',
    suggestedType: 'SYSTEM' as MemoryType,
    suggestedImportance: 'HIGH' as MemoryImportance,
    tags: ['test', 'diagnostic', 'system-verification'],
    sourceType: 'SYSTEM' as const,
    sourceName: 'Memory Core Diagnostic Flow',
    relatedProject: 'FRIDAY Core',
  };

  const testResult = advancedMemoryManager.evaluateAndSave(testCandidate);
  assert(testResult.decision.action === 'SAVE', 'Decision engine evaluated test memory as SAVE');
  assert(!!testResult.memory, 'Test memory successfully created and returned');
  assert(testResult.memory?.title === 'System Diagnostic Test Memory', 'Title correctly preserved');

  // Test 3: Retrieval of saved test memory in Memory Core list
  const storedList = advancedMemoryManager.getAllMemories();
  assert(storedList.length === 1, 'Memory Core contains exactly 1 saved memory after test flow');
  assert(storedList[0].id === testResult.memory?.id, 'Retrieved memory ID matches saved ID');

  // Test 4: Memory Detail Inspection & Provenance
  const fetchedMemory = advancedMemoryManager.getMemory(storedList[0].id);
  assert(fetchedMemory !== null, 'Memory details retrieved by ID');
  assert(fetchedMemory?.source.sourceType === 'SYSTEM', 'Provenance sourceType is preserved');
  assert(fetchedMemory?.source.sourceName === 'Memory Core Diagnostic Flow', 'Provenance sourceName is preserved');
  assert(fetchedMemory?.importance === 'HIGH', 'Importance is HIGH');
  assert(fetchedMemory?.confidence === 'VERIFIED', 'Confidence is VERIFIED');
  assert(Boolean(fetchedMemory?.tags.includes('diagnostic')), 'Tags include "diagnostic"');
  assert(Boolean(fetchedMemory?.relatedProjects.includes('FRIDAY Core')), 'Related project includes "FRIDAY Core"');

  // Test 5: Search & Keyword Filter
  const searchHit = advancedMemoryManager.search({ query: 'diagnostic' });
  assert(searchHit.length === 1, 'Keyword search for "diagnostic" finds saved memory');
  const searchMiss = advancedMemoryManager.search({ query: 'nonexistent_quantum_string' });
  assert(searchMiss.length === 0, 'Search for non-existent keyword yields 0 hits');

  // Test 6: Type Filter
  const typeHit = advancedMemoryManager.search({ type: 'SYSTEM' });
  assert(typeHit.length === 1, 'Type filter for SYSTEM finds memory');
  const typeMiss = advancedMemoryManager.search({ type: 'USER_PREFERENCE' });
  assert(typeMiss.length === 0, 'Type filter for USER_PREFERENCE is empty');

  // Test 7: Importance Filter
  const impHit = advancedMemoryManager.search({ importance: 'HIGH' });
  assert(impHit.length === 1, 'Importance filter for HIGH finds memory');
  const impMiss = advancedMemoryManager.search({ importance: 'LOW' });
  assert(impMiss.length === 0, 'Importance filter for LOW is empty');

  // Test 8: Archive Action
  const archiveSuccess = advancedMemoryManager.archiveMemory(storedList[0].id);
  assert(archiveSuccess === true, 'Memory successfully archived');
  const archivedRecord = advancedMemoryManager.getMemory(storedList[0].id);
  assert(archivedRecord?.status === 'ARCHIVED', 'Memory status updated to ARCHIVED');

  const activeAfterArchive = advancedMemoryManager.search({ status: 'ACTIVE' });
  assert(activeAfterArchive.length === 0, 'Active list excludes archived memory');
  const archivedSearch = advancedMemoryManager.search({ status: 'ARCHIVED', includeArchived: true });
  assert(archivedSearch.length === 1, 'Archived search retrieves archived memory');

  // Test 9: Unarchive / Restore Action
  advancedMemoryManager.updateMemory(storedList[0].id, { status: 'ACTIVE' });
  const restoredRecord = advancedMemoryManager.getMemory(storedList[0].id);
  assert(restoredRecord?.status === 'ACTIVE', 'Memory restored back to ACTIVE status');

  // Test 10: Voice Integration: saveMemory Tool -> AdvancedMemoryManager
  const voiceCallResult = await toolManager.executeTool('saveMemory', {
    key: 'user_video_style',
    content: 'User prefers YouTube titles under 50 characters with bold curiosity hooks',
  });
  assert(voiceCallResult.success === true, 'saveMemory tool executed successfully');

  const voiceMemories = advancedMemoryManager.search({ query: 'curiosity hooks' });
  assert(voiceMemories.length === 1, 'Voice command memory passed through Part 12 Memory Engine');
  assert(voiceMemories[0].source.sourceType === 'VOICE', 'Voice memory provenance tagged as VOICE');
  assert(voiceMemories[0].type === 'USER_PREFERENCE', 'Voice memory classified as USER_PREFERENCE');

  // Test 11: Discard Action
  const memoryToDiscard = storedList[0].id;
  const discardSuccess = advancedMemoryManager.discardMemory(memoryToDiscard);
  assert(discardSuccess === true, 'Discard memory executed successfully');
  const discardedRecord = advancedMemoryManager.getMemory(memoryToDiscard);
  assert(discardedRecord?.status === 'DISCARDED', 'Memory marked as DISCARDED');

  // Test 12: Research Subsystem Integration
  const researchCandidate = {
    topic: 'Automated Short-Form Retention Rates',
    finding: 'Retention jumps by 24% when first 3 seconds feature text animation and dynamic pacing.',
    source: {
      sourceType: 'WEB' as const,
      sourceName: 'Creator Analytics Empirical Study 2026',
      sourceUrl: 'https://research.creatoranalytics.org/short-form-retention',
      retrievedAt: Date.now(),
    },
    relatedWorker: 'worker-research',
    relatedProject: 'Video Optimization',
    relevance: 95,
  };
  const researchResult = advancedMemoryManager.addResearchFinding(researchCandidate);
  assert(researchResult.verdict.action === 'KEEP', 'Research filter approved finding with KEEP');
  assert(researchResult.researchItem !== undefined, 'Research finding created and stored in research memory');
  assert(researchResult.researchItem?.relevance === 95, 'Research relevance preserved');

  const allResearch = advancedMemoryManager.getResearchMemories();
  assert(allResearch.length === 1, 'Research memory items count is 1');
  assert(allResearch[0].topic === 'Automated Short-Form Retention Rates', 'Research topic matches');

  // Test 13: 6 Overview Stats Calculation
  const finalStats = advancedMemoryManager.getOverviewStats();
  assert(finalStats.activeCount >= 1, 'Overview stats reflects active memories');
  assert(finalStats.researchCount >= 1, 'Overview stats reflects research findings');
  assert(finalStats.preferenceCount >= 1, 'Overview stats reflects user preferences');
  assert(finalStats.importantCount >= 1, 'Overview stats reflects important memories');

  // Test 14: Worker Registry check
  const allWorkers = workerRegistry.getAllWorkers();
  assert(allWorkers.length === 17, 'All 17 Workers registered and accessible in Worker Filter');

  console.log('======================================================');
  console.log('🎉 ALL PART 12 UI INTEGRATION TESTS PASSED (14/14)!');
  console.log('======================================================');
}

runPart12UIIntegrationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
