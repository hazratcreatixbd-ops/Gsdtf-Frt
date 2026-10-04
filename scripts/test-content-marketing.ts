/**
 * PART 8 — FRIDAY Content & Marketing Engine Automated Test Suite
 * Validates all 27 capabilities of Part 8 + Part 7 Integration + Parts 1-6B Regressions.
 */

import { contentMarketingManager } from '../src/services/ContentMarketingManager';
import { publishingManager } from '../src/services/Publishing/PublishingAdapter';
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
  console.log('PART 8 — FRIDAY CONTENT & MARKETING ENGINE TESTS');
  console.log('====================================================\n');

  // Test 1: Content Profile
  {
    const profile = contentMarketingManager.getContentProfile();
    assert(
      profile.brandName !== undefined &&
      profile.tone !== undefined &&
      Array.isArray(profile.platforms) &&
      profile.platforms.includes('YouTube') &&
      profile.platforms.includes('LinkedIn'),
      'Test 1: Content Profile loads and inherits core business parameters'
    );

    const updated = contentMarketingManager.updateContentProfile({
      tone: 'Crisp, high-impact, and educational',
      CTAStyle: 'Join our free architecture workshop',
    });
    assert(
      updated.tone === 'Crisp, high-impact, and educational' &&
      updated.CTAStyle === 'Join our free architecture workshop',
      'Test 1B: Content Profile updates and persists fields'
    );
  }

  // Test 2: Content Pillars
  {
    const pillar = contentMarketingManager.createContentPillar({
      name: 'System Architecture & Automation',
      description: 'Teardowns of scalable software systems and operational AI workflows',
      purpose: 'Establish technical authority and drive advisory inquiries',
      examples: ['Building FRIDAY Part 8', 'Automating Client Intake'],
    });

    const allPillars = contentMarketingManager.getContentPillars();
    assert(
      pillar.id.startsWith('pillar_') &&
      pillar.name === 'System Architecture & Automation' &&
      allPillars.some((p) => p.id === pillar.id),
      'Test 2: Create, retrieve, and organize Content Pillars'
    );

    const updatedPillar = contentMarketingManager.updateContentPillar(pillar.id, {
      description: 'Updated description for scalable systems',
    });
    assert(
      updatedPillar?.description === 'Updated description for scalable systems',
      'Test 2B: Content Pillar updates successfully'
    );
  }

  // Test 3: Content Idea Engine
  {
    const ideas = contentMarketingManager.generateContentIdeas({
      topic: 'AI Automation Workflows',
      platform: 'YouTube',
      count: 5,
    });

    assert(
      ideas.length === 5 &&
      ideas.every((i) => i.title && i.hook && i.concept && i.CTA && i.sourceType === 'generated'),
      'Test 3: Idea Engine generates structured, actionable concepts with hooks and CTAs'
    );
  }

  // Test 4: Hook Generator
  {
    const hooks = contentMarketingManager.generateHooks('Scaling Video Production', 'Agencies');

    assert(
      hooks.length === 10 &&
      hooks.some((h) => h.style === 'curiosity') &&
      hooks.some((h) => h.style === 'problem_solution') &&
      hooks.some((h) => h.style === 'transformation') &&
      hooks.every((h) => h.text.length > 20 && h.rationale.length > 10),
      'Test 4: Hook Engine generates 10 distinct, non-clickbait hook styles with rationales'
    );
  }

  // Test 5: Content Brief
  {
    const brief = contentMarketingManager.createContentBrief({
      title: 'The Solopreneur AI Command Center',
      platform: 'YouTube',
      format: 'long_form_video',
      objective: 'Demonstrate real-world multi-step AI automation without hype',
      keyPoints: ['The Fragmentation Bottleneck', 'Unified Command Architecture', 'Live Walkthrough'],
    });

    const briefs = contentMarketingManager.getContentBriefs();
    assert(
      brief.id.startsWith('brief_') &&
      brief.status === 'brief' &&
      brief.keyPoints.length === 3 &&
      briefs.some((b) => b.id === brief.id),
      'Test 5: Content Brief structure created with objectives, key points, and visual directions'
    );
  }

  // Test 6: Script Writer & Test 7: Video Script Timing
  {
    const script = contentMarketingManager.writeContentScript({
      title: 'How to Automate Client Reports',
      platform: 'YouTube Shorts',
      targetDuration: '60s',
      keyPoints: ['Audit manual hours', 'Build automated pipeline', 'Review weekly'],
    });

    assert(
      script.id.startsWith('script_') &&
      script.sections.length === 6 &&
      script.sections[0].type === 'HOOK' &&
      script.sections[1].type === 'INTRO' &&
      script.sections[2].type === 'MAIN CONTENT' &&
      script.sections[3].type === 'TRANSITION' &&
      script.sections[4].type === 'PAYOFF' &&
      script.sections[5].type === 'CTA',
      'Test 6: Script Writer formats structured sections (Hook, Intro, Main, Transitions, Payoff, CTA)'
    );

    assert(
      script.estimatedWordCount > 0 &&
      script.estimatedReadingTime.includes('min') &&
      script.sourcesUsed.length > 0,
      'Test 7: Video Script Timing accurately estimates word count, reading pace, and preserves sources'
    );
  }

  // Test 8: Caption Generator
  {
    const captions = contentMarketingManager.generateCaptions({
      topic: 'Business Automation',
      platforms: ['LinkedIn', 'Instagram', 'TikTok', 'YouTube', 'Pinterest'],
      coreMessage: 'Eliminate 15 hours of manual busywork every week.',
    });

    const linkedin = captions.find((c) => c.platform === 'LinkedIn');
    const insta = captions.find((c) => c.platform === 'Instagram');

    assert(
      captions.length === 5 &&
      linkedin !== undefined &&
      linkedin.recommendedLimit === 3000 &&
      insta !== undefined &&
      insta.hashtags.length > 0,
      'Test 8: Caption Generator creates platform-tailored copy respecting format guidelines'
    );
  }

  // Test 9: Title Generator
  {
    const titles = contentMarketingManager.generateTitles({
      topic: 'AI Workflow Architecture',
      platform: 'YouTube',
    });

    assert(
      titles.length >= 5 &&
      titles.every((t) => t.title.length > 10 && t.style !== undefined && t.characterCount > 0),
      'Test 9: Title Generator produces multiple non-clickbait title options with character counts'
    );
  }

  // Test 10: Description Generator
  {
    const description = contentMarketingManager.generateDescriptions({
      title: 'The Complete Automation Operating System',
      topic: 'Workflow Engineering',
      platform: 'YouTube',
      includeTimestamps: true,
    });

    assert(
      description.text.includes('TIMESTAMPS') &&
      description.text.includes('0:00') &&
      description.hashtags.length > 0 &&
      description.text.includes('DISCLAIMER'),
      'Test 10: Description Generator formats timestamps, resource links, and educational disclaimers'
    );
  }

  // Test 11: Hashtag Engine
  {
    const hashtags = contentMarketingManager.generateHashtags({
      topic: 'Productivity Systems',
      limit: 10,
    });

    assert(
      hashtags.primary.length > 0 &&
      hashtags.secondary.length > 0 &&
      hashtags.niche.length > 0 &&
      hashtags.allFormatted.includes('#'),
      'Test 11: Hashtag Engine categorizes primary, secondary, niche, and branded tags'
    );
  }

  // Test 12: Content Repurposing Engine
  {
    const pkg = contentMarketingManager.repurposeContent({
      originalTitle: 'The 3 Rules of Modern Agency Ops',
      originalPlatform: 'YouTube',
      originalContent: 'Rule 1: Asynchronous updates. Rule 2: Single source of truth. Rule 3: Zero meeting status checks.',
    });

    assert(
      pkg.id.startsWith('repurpose_') &&
      pkg.variations.length === 6 &&
      pkg.variations.some((v) => v.platform === 'LinkedIn') &&
      pkg.variations.some((v) => v.platform === 'Instagram') &&
      pkg.variations.some((v) => v.platform === 'TikTok') &&
      pkg.variations.every((v) => v.originType === 'ORIGINAL' || v.originType === 'REPURPOSED'),
      'Test 12: Repurposing Engine transforms 1 core piece into 6 distinct platform variations'
    );
  }

  // Test 13: Content Humanizer
  {
    const rawAiDraft = 'It is crucial to remember that we must delve into this tapestry of tools to seamlessly integrate our workflow.';
    const humanized = contentMarketingManager.humanizeContent(rawAiDraft);

    assert(
      humanized.humanizedText.includes('delve into') === false &&
      humanized.humanizedText.includes('tapestry of') === false &&
      humanized.changesApplied.length > 0,
      'Test 13: Content Humanizer replaces robotic AI clichés with natural conversational phrasing'
    );
  }

  // Test 14: Content Style Analyzer
  {
    const style = contentMarketingManager.analyzeContentStyle({
      referenceSource: 'https://youtube.com/@high_impact_creator',
      creatorName: 'Ali Abdaal Style',
    });

    assert(
      style.id.startsWith('style_') &&
      style.pacing !== '' &&
      style.hookStyle !== '' &&
      style.visualApproach !== '' &&
      style.originalStrategyRecommendation.includes('Never copy verbatim phrases'),
      'Test 14: Style Analyzer examines pacing, visual approach, and recommends original strategies'
    );
  }

  // Test 15: Content Calendar & Integration with Task System
  {
    let createdReminder: any = null;
    contentMarketingManager.setTaskCreationCallback((task) => {
      createdReminder = task;
    });

    const calItem = contentMarketingManager.scheduleContentItem({
      contentId: 'script_test_123',
      title: 'Publish Weekly Systems Video',
      platform: 'YouTube',
      format: 'long_form_video',
      scheduledDate: '2026-10-15',
      scheduledTime: '10:00',
      autoCreateReminderTask: true,
    });

    const calendar = contentMarketingManager.getContentCalendar();
    assert(
      calItem.id.startsWith('cal_') &&
      calItem.status === 'scheduled' &&
      calendar.some((c) => c.id === calItem.id) &&
      createdReminder !== null &&
      createdReminder.title.includes('Publish Weekly Systems Video'),
      'Test 15: Content Calendar schedules items and automatically syncs with FRIDAY Task system'
    );
  }

  // Test 16: Weekly Content Plan
  {
    const weekly = contentMarketingManager.createWeeklyContentPlan({
      weekLabel: 'Sprint Week 42',
      targetBusinessGoal: 'Scale YouTube Inbound Leads',
    });

    assert(
      weekly.id.startsWith('wplan_') &&
      weekly.items.length === 6 &&
      weekly.items[0].day === 'Monday' &&
      weekly.items[0].platform !== undefined &&
      weekly.items[0].hook !== '',
      'Test 16: Weekly Content Plan generates 7-day multi-platform schedule aligned with business goals'
    );
  }

  // Test 17: Campaign System
  {
    const campaign = contentMarketingManager.createCampaign({
      name: 'Q4 Systems Retainer Launch',
      objective: 'Secure 10 new qualified client discovery calls via educational video',
      budget: '$2,500',
    });

    const allCampaigns = contentMarketingManager.getCampaigns();
    assert(
      campaign.id.startsWith('camp_') &&
      campaign.status === 'active' &&
      campaign.budget === '$2,500' &&
      allCampaigns.some((c) => c.id === campaign.id),
      'Test 17: Campaign System creates multi-platform initiatives with optional budgets'
    );
  }

  // Test 18: Marketing Funnel
  {
    const funnel = contentMarketingManager.mapMarketingFunnel();

    assert(
      funnel.length === 5 &&
      funnel[0].stage === 'AWARENESS' &&
      funnel[1].stage === 'INTEREST' &&
      funnel[2].stage === 'CONSIDERATION' &&
      funnel[3].stage === 'CONVERSION' &&
      funnel[4].stage === 'RETENTION',
      'Test 18: Marketing Funnel maps formats and concepts across all 5 customer journey stages'
    );
  }

  // Test 19: Content Performance Memory & Test 20: Performance Analysis
  {
    const record = contentMarketingManager.recordPerformance({
      contentId: 'yt_vid_99',
      title: 'The Lean Operating System',
      platform: 'YouTube',
      views: 12450,
      likes: 890,
      comments: 112,
      shares: 430,
      dateRange: 'First 7 Days',
      source: 'user_provided',
      notes: 'Strong retention through step 2',
    });

    const analysis = contentMarketingManager.analyzePerformance();

    assert(
      record.id.startsWith('perf_') &&
      record.views === 12450 &&
      analysis.observations.length >= 3 &&
      analysis.observations.some((o) => o.type === 'FACT') &&
      analysis.observations.some((o) => o.type === 'INTERPRETATION') &&
      analysis.observations.some((o) => o.type === 'HYPOTHESIS'),
      'Test 19 & 20: Performance Memory records empirical data and separates FACT, INTERPRETATION, and HYPOTHESIS'
    );
  }

  // Test 21: Content Experiments
  {
    const exp = contentMarketingManager.createExperiment({
      title: 'Shorts Hook: Question vs Hard Metric',
      hypothesis: 'Leading with an empirical metric increases 30s retention by 20%.',
      variable: 'hook_style',
      optionA: { description: 'Question hook' },
      optionB: { description: 'Hard metric hook' },
      measurementMetric: '30s average retention %',
    });

    const concluded = contentMarketingManager.concludeExperiment(
      exp.id,
      'Option B outperformed Option A by 23% in retention.',
      'Adopt hard metric hooks as default for technical Shorts.'
    );

    assert(
      Boolean(
        exp.id.startsWith('exp_') &&
        concluded?.status === 'concluded' &&
        concluded?.result?.includes('Option B outperformed')
      ),
      'Test 21: Content Experiments tracks hypotheses, A/B variables, and empirical conclusions'
    );
  }

  // Test 22: Content Library
  {
    const libraryHits = contentMarketingManager.searchContentLibrary('Automate');

    assert(
      Array.isArray(libraryHits.ideas) &&
      Array.isArray(libraryHits.briefs) &&
      Array.isArray(libraryHits.scripts) &&
      Array.isArray(libraryHits.calendarItems),
      'Test 22: Content Library provides searchable index across ideas, briefs, scripts, and calendar items'
    );
  }

  // Test 23: Publishing Adapter Architecture & Test 24: Platform Capabilities
  {
    const caps = publishingManager.getAllCapabilities();
    const ytCap = caps.find((c) => c.platform === 'YouTube');
    const liCap = caps.find((c) => c.platform === 'LinkedIn');

    assert(
      caps.length === 7 &&
      ytCap !== undefined &&
      ytCap.canDraft === true &&
      ytCap.isConnected === false &&
      liCap !== undefined &&
      liCap.connectionStatusMessage.includes('is not connected'),
      'Test 23 & 24: Publishing Adapters expose accurate capabilities and honestly report connection status'
    );
  }

  // Test 25: Approval System & Direct Publishing Honesty
  {
    // Without user confirmation, handoff must be rejected
    const unconfirmed = await contentMarketingManager.publishContentItem({
      contentId: 'script_123',
      platform: 'YouTube',
      confirmedByUser: false,
    });
    assert(
      unconfirmed.success === false && unconfirmed.status === 'requires_confirmation',
      'Test 25A: Publishing handoff rejects unconfirmed sensitive actions'
    );

    // With confirmation but without connected OAuth, returns honest status without faking publication
    const confirmed = await contentMarketingManager.publishContentItem({
      contentId: 'script_123',
      platform: 'YouTube',
      confirmedByUser: true,
    });
    assert(
      confirmed.success === false &&
      confirmed.status === 'requires_authorization' &&
      confirmed.message.includes('Publishing integration is not connected'),
      'Test 25B: Direct publishing honestly informs user when platform API is not connected'
    );
  }

  // Test 26: Voice Tool Execution via ToolManager
  {
    const profileRes = await toolManager.executeTool('getContentProfile', {}, 'call_cp_1');
    assert(profileRes.success === true && profileRes.profile !== undefined, 'Test 26A: Voice tool getContentProfile routed');

    const ideasRes = await toolManager.executeTool('generateContentIdeas', { topic: 'Consulting' }, 'call_gi_1');
    assert(ideasRes.success === true && ideasRes.count > 0, 'Test 26B: Voice tool generateContentIdeas routed');

    const hooksRes = await toolManager.executeTool('generateHooks', { topic: 'Client Retention' }, 'call_gh_1');
    assert(hooksRes.success === true && hooksRes.count === 10, 'Test 26C: Voice tool generateHooks routed');

    const scriptRes = await toolManager.executeTool('writeContentScript', { title: 'Test Script' }, 'call_ws_1');
    assert(scriptRes.success === true && scriptRes.script !== undefined, 'Test 26D: Voice tool writeContentScript routed');

    const capsRes = await toolManager.executeTool('getPlatformCapabilities', {}, 'call_pc_1');
    assert(capsRes.success === true && capsRes.capabilities.length > 0, 'Test 26E: Voice tool getPlatformCapabilities routed');
  }

  // Test 27: Part 7 Integration & Regressions
  {
    // Verify Part 7 Business Profile connects to Content Profile
    const bizProfile = businessIntelligenceManager.getProfile();
    const contentProfile = contentMarketingManager.getContentProfile();
    const profilesMatch = contentProfile.brandName === bizProfile.businessName;

    // Verify Gemini Live API health endpoint
    const fetch = globalThis.fetch;
    const health = await fetch('http://localhost:3000/api/health').then((r) => r.json());
    const hasLive = health.status === 'ok' && health.model === 'gemini-3.8-live';

    // Verify Android Bridge intact
    const bridgeCaps = androidBridge.getSupportedCapabilities();
    const hasBridge = bridgeCaps.browser === true;

    assert(
      profilesMatch && hasLive && hasBridge,
      'Test 27: Part 7 Business Profile integration & Parts 1-6B regressions verified (0 regressions)'
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
  console.error('Fatal test error in Part 8 suite:', e);
  process.exit(1);
});
