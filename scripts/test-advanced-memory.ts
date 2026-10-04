/**
 * PART 12 — ADVANCED MEMORY & RESEARCH MEMORY SYSTEM TESTS
 * Validates all 22 required areas of FRIDAY's Part 12 architecture.
 */

import { advancedMemoryManager } from '../src/services/memory/AdvancedMemoryManager';
import { MemoryDecisionEngine } from '../src/services/memory/MemoryDecisionEngine';
import { DuplicateDetector } from '../src/services/memory/DuplicateDetector';
import { ConflictDetector } from '../src/services/memory/ConflictDetector';
import { ResearchMemoryFilter } from '../src/services/memory/ResearchMemoryFilter';
import { MemorySearchService } from '../src/services/memory/MemorySearchService';
import { MemoryContextBuilder } from '../src/services/memory/MemoryContextBuilder';
import { toolManager } from '../src/services/ToolManager';
import { workerRegistry } from '../src/world/workers/WorkerRegistry';
import { businessMemoryManager } from '../src/services/BusinessMemoryManager';

async function runPart12Tests() {
  console.log('======================================================');
  console.log('🧪 TESTING PART 12 — ADVANCED MEMORY & RESEARCH MEMORY');
  console.log('======================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // Reset test store
  advancedMemoryManager.resetForTesting();

  // --- Test 1: Memory creation ---
  const mem1 = advancedMemoryManager.createMemory({
    type: 'USER_PREFERENCE',
    title: 'Short Video Titles',
    content: 'User prefers short video titles under 50 characters.',
    summary: 'Video titles under 50 characters',
    source: { sourceType: 'USER', sourceName: 'User Dialogue', retrievedAt: Date.now() },
    importance: 'HIGH',
    confidence: 'VERIFIED',
    retention: 'LONG_TERM',
    tags: ['video', 'title', 'format'],
    relatedTasks: [],
    relatedWorkers: ['worker-content'],
    relatedProjects: ['Content Engine'],
    sensitivity: 'PUBLIC',
    status: 'ACTIVE',
  });
  assert(!!mem1.id && mem1.id.startsWith('mem_'), 'Test 1: Memory creation generates unique ID');
  assert(mem1.title === 'Short Video Titles', 'Test 1: Memory title is set correctly');

  // --- Test 2: Memory retrieval ---
  const retrieved = advancedMemoryManager.getMemory(mem1.id);
  assert(!!retrieved && retrieved.id === mem1.id, 'Test 2: Memory retrieval by ID returns record');
  assert(retrieved?.importance === 'HIGH', 'Test 2: Retrieved memory preserves importance');

  // --- Test 3: Memory update ---
  const updated = advancedMemoryManager.updateMemory(mem1.id, {
    summary: 'Video titles strictly under 40 characters',
    tags: ['video', 'title', 'shortform'],
  });
  assert(updated?.summary === 'Video titles strictly under 40 characters', 'Test 3: Memory update changes summary');
  assert(updated?.tags.includes('shortform') === true, 'Test 3: Memory update updates tags');
  assert(updated?.updatedAt! >= mem1.updatedAt, 'Test 3: Memory update updates timestamp');

  // --- Test 4: Memory archive ---
  const archivedOk = advancedMemoryManager.archiveMemory(mem1.id);
  const afterArchive = advancedMemoryManager.getMemory(mem1.id);
  assert(archivedOk === true, 'Test 4: Memory archive succeeds');
  assert(afterArchive?.status === 'ARCHIVED', 'Test 4: Memory status is ARCHIVED');

  // Reactivate for further tests
  advancedMemoryManager.updateMemory(mem1.id, { status: 'ACTIVE' });

  // --- Test 5: Memory discard ---
  const tempForDiscard = advancedMemoryManager.createMemory({
    type: 'TEMPORARY',
    title: 'Fleet Status Note',
    content: 'Temporary device note',
    summary: 'Temporary',
    source: { sourceType: 'SYSTEM', sourceName: 'System', retrievedAt: Date.now() },
    importance: 'LOW',
    confidence: 'PARTIAL',
    retention: 'SESSION',
    tags: ['temp'],
    relatedTasks: [],
    relatedWorkers: [],
    relatedProjects: [],
    sensitivity: 'PUBLIC',
    status: 'ACTIVE',
  });
  const discardOk = advancedMemoryManager.discardMemory(tempForDiscard.id);
  const afterDiscard = advancedMemoryManager.getMemory(tempForDiscard.id);
  assert(discardOk === true, 'Test 5: Memory discard succeeds');
  assert(afterDiscard?.status === 'DISCARDED', 'Test 5: Memory status is DISCARDED');

  // --- Test 6: Duplicate detection (exact & normalized) ---
  const dupExact = DuplicateDetector.findDuplicate(
    'Short Video Titles',
    'User prefers short video titles under 50 characters.',
    [mem1]
  );
  assert(dupExact.isDuplicate === true, 'Test 6: Duplicate detection flags exact match');
  assert(dupExact.matchType === 'EXACT' || dupExact.matchType === 'NORMALIZED', 'Test 6: Duplicate classified as exact/normalized');

  const dupIntent = DuplicateDetector.findDuplicate(
    'Concise video titles',
    'Keep video titles short and brief',
    [mem1]
  );
  assert(dupIntent.isDuplicate === true, 'Test 6B: Intent-level similarity recognized as duplicate preference');

  // --- Test 7: Memory classification (MemoryDecisionEngine) ---
  const prefDecision = MemoryDecisionEngine.evaluateCandidate(
    { content: 'I prefer concise answers without filler.' },
    [mem1]
  );
  assert(prefDecision.action === 'SAVE', 'Test 7: Preference candidate classified as SAVE');
  assert(prefDecision.suggestedType === 'USER_PREFERENCE', 'Test 7: Suggested type is USER_PREFERENCE');
  assert(prefDecision.suggestedRetention === 'LONG_TERM', 'Test 7: Retention is LONG_TERM');

  const noiseDecision = MemoryDecisionEngine.evaluateCandidate(
    { content: 'hello how are you' },
    [mem1]
  );
  assert(noiseDecision.action === 'DISCARD', 'Test 7B: Conversational filler is discarded');

  // --- Test 8: Temporary memory ---
  const tempDecision = MemoryDecisionEngine.evaluateCandidate(
    { content: 'The weather is raining today outside.' },
    [mem1]
  );
  assert(tempDecision.action === 'TEMPORARY_ONLY', 'Test 8: Daily weather classified as TEMPORARY_ONLY');
  assert(tempDecision.suggestedRetention === 'SHORT_TERM', 'Test 8: Retention is SHORT_TERM');

  // --- Test 9: Long-term memory ---
  const bizDecision = MemoryDecisionEngine.evaluateCandidate(
    { content: 'Our quarterly revenue goal is $250,000 for the digital agency.' },
    [mem1]
  );
  assert(bizDecision.action === 'SAVE', 'Test 9: Business directive classified as SAVE');
  assert(bizDecision.suggestedRetention === 'LONG_TERM', 'Test 9: Business directive retention is LONG_TERM');
  assert(bizDecision.suggestedImportance === 'HIGH', 'Test 9: Business directive importance is HIGH');

  // --- Test 10: Memory search (keyword, filters) ---
  const searchResults = MemorySearchService.search([mem1], {
    query: 'video',
    type: 'USER_PREFERENCE',
  });
  assert(searchResults.length === 1, 'Test 10: Search by query and type returns matching record');
  assert(searchResults[0].id === mem1.id, 'Test 10: Found correct memory ID');

  const noMatch = MemorySearchService.search([mem1], { query: 'cryptocurrency' });
  assert(noMatch.length === 0, 'Test 10B: Search returns empty on non-matching query');

  // --- Test 11: Research memory ---
  const researchRes = advancedMemoryManager.addResearchFinding({
    topic: 'AI Video Editing Market',
    finding: 'The automated video editing market is projected to reach $1.8B by 2028 with 22.4% CAGR.',
    source: {
      sourceType: 'WEB',
      sourceName: 'Market Insights Report',
      sourceUrl: 'https://example.com/reports/video-ai',
      retrievedAt: Date.now(),
    },
    evidence: 'Based on 450 industry respondent surveys and SEC filing data.',
    relevance: 95,
    tags: ['ai', 'video', 'market_size'],
    relatedProject: 'Content Engine',
  });
  assert(!!researchRes.researchItem, 'Test 11: Research memory item created');
  assert(researchRes.researchItem?.topic === 'AI Video Editing Market', 'Test 11: Research topic preserved');
  assert(researchRes.researchItem?.confidence === 'VERIFIED', 'Test 11: Research confidence set based on URL and evidence');

  // --- Test 12: Research filtering ---
  const unverifiedRes = advancedMemoryManager.addResearchFinding({
    topic: 'Speculative Trend',
    finding: 'Someone on social media claimed conversion rates will drop 90% next week.',
    source: {
      sourceType: 'USER',
      sourceName: 'Casual Chat',
      retrievedAt: Date.now(),
    },
  });
  assert(unverifiedRes.verdict.confidence === 'PARTIAL' || unverifiedRes.verdict.confidence === 'UNVERIFIED', 'Test 12: Research filter identifies unverified/partial claims');

  const lowValueRes = ResearchMemoryFilter.filterFinding(
    {
      topic: 'x',
      finding: 'short',
      source: { sourceType: 'USER', sourceName: 'test', retrievedAt: Date.now() },
    },
    []
  );
  assert(lowValueRes.action === 'LOW_VALUE', 'Test 12B: Research filter rejects low-value/shallow content');

  // --- Test 13: Source tracking ---
  const researchItem = researchRes.researchItem!;
  assert(researchItem.source.sourceType === 'WEB', 'Test 13: Provenance retains sourceType');
  assert(researchItem.source.sourceUrl === 'https://example.com/reports/video-ai', 'Test 13: Provenance retains source URL');
  assert(!!researchItem.source.retrievedAt, 'Test 13: Provenance retains retrieval timestamp');

  // --- Test 14: Conflict detection ---
  const conflict = ConflictDetector.detectConflict(
    'Product Pricing',
    'Product price is $150',
    [
      {
        ...mem1,
        content: 'Product price is $99',
      },
    ]
  );
  assert(conflict.hasConflict === true, 'Test 14: Conflict detector identifies contradictory price values');
  assert(conflict.topic === 'price', 'Test 14: Conflict identifies conflicting topic');

  // --- Test 15: Worker memory context ---
  const workerCtx = advancedMemoryManager.buildWorkerContext({
    activeWorker: 'worker-research',
    currentTask: 'Research video AI trends',
    project: 'Content Engine',
  });
  assert(workerCtx.workerId === 'worker-research', 'Test 15: Worker context built for research worker');
  assert(workerCtx.relevantResearch.length > 0, 'Test 15: Worker context includes relevant research');
  assert(workerCtx.activeDirectives.length > 0, 'Test 15: Worker context includes active directives');

  // --- Test 16: MemoryContextBuilder ---
  const customCtx = MemoryContextBuilder.buildWorkerContext(
    { activeWorker: 'worker-content', currentTask: 'Write video titles' },
    [mem1],
    [researchItem]
  );
  assert(customCtx.relevantPreferences.length > 0, 'Test 16: MemoryContextBuilder retrieves relevant preference');
  assert(customCtx.contextSummary.includes('PREFERENCES'), 'Test 16: Summary formatted for LLM context injection');

  // --- Test 17: World Memory module overview stats ---
  const stats = advancedMemoryManager.getOverviewStats();
  assert(stats.activeCount >= 1, 'Test 17: Stats count active memories');
  assert(stats.researchCount >= 1, 'Test 17: Stats count research findings');
  assert(stats.totalCount >= 2, 'Test 17: Stats reflect total storage');

  // --- Test 18: Voice -> Memory routing foundation (ToolManager) ---
  const voiceSave = await toolManager.executeTool('saveToMemory', {
    content: 'User prefers dark mode and minimalist layouts.',
    title: 'UI Preferences',
    type: 'USER_PREFERENCE',
  });
  assert(voiceSave.success === true, 'Test 18: saveToMemory tool executes successfully');
  assert(voiceSave.decision === 'SAVE', 'Test 18: Decision engine approves save via voice tool');

  const voiceRecall = await toolManager.executeTool('recallMemory', {
    query: 'dark mode',
  });
  assert(voiceRecall.success === true, 'Test 18B: recallMemory tool retrieves saved memory');
  assert(voiceRecall.count >= 1, 'Test 18B: Recall count is at least 1');

  // --- Test 19: Business memory integration ---
  const bizMem = businessMemoryManager.getBusinessMemory();
  assert(!!bizMem.businessName, 'Test 19: Business memory manager is connected');

  // --- Test 20: Persistence (session clear & surviving records) ---
  const sessionCleared = advancedMemoryManager.clearSessionMemory();
  assert(typeof sessionCleared === 'number', 'Test 20: Session clearing executes safely');
  const activeMemories = advancedMemoryManager.getAllMemories();
  assert(activeMemories.length > 0, 'Test 20: Persistent long-term memories survive session clear');

  // --- Test 21: Security rules (blocking secrets & tokens) ---
  const secretEval = MemoryDecisionEngine.evaluateCandidate(
    { content: 'Here is my password: SuperSecretPassword123' },
    []
  );
  assert(secretEval.action === 'DISCARD', 'Test 21: Password input is discarded');

  const apiKeyEval = MemoryDecisionEngine.evaluateCandidate(
    { content: 'sk-1234567890abcdef1234567890' },
    []
  );
  assert(apiKeyEval.action === 'DISCARD', 'Test 21B: API key token is discarded');

  // --- Test 22: WorkerRegistry memory context integration ---
  const regCtx = workerRegistry.getWorkerContext('worker-research', 'Examine video market');
  assert(!!regCtx && regCtx.workerId === 'worker-research', 'Test 22: WorkerRegistry getWorkerContext succeeds');

  console.log('======================================================');
  console.log(`🎉 PART 12 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPart12Tests().catch((err) => {
  console.error('Unhandled error in Part 12 tests:', err);
  process.exit(1);
});
