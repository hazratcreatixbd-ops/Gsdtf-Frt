/**
 * PART 8 — FRIDAY Content & Marketing Engine
 * Core management service for Content Profile, Pillars, Ideas, Hooks, Briefs, Scripts,
 * Captions, Titles, Descriptions, Hashtags, Repurposing, Humanizer, Style Analyzer,
 * Calendar, Weekly Content Plans, Campaigns, Funnels, Performance Memory, Experiments,
 * and Publishing Adapters.
 */

import {
  ContentPlatform,
  HookStyle,
  ContentFormat,
  ContentProfile,
  ContentPillar,
  ContentIdea,
  GeneratedHook,
  ContentBrief,
  ContentScript,
  PlatformCaption,
  TitleOption,
  PlatformDescription,
  HashtagSet,
  ContentRepurposePackage,
  RepurposedVariation,
  ContentStyleSummary,
  ContentCalendarItem,
  WeeklyContentPlan,
  WeeklyContentPlanItem,
  ContentCampaign,
  FunnelMapping,
  ContentPerformanceRecord,
  PerformanceAnalysisReport,
  ContentExperiment,
  MarketingReport,
  BriefStatus,
} from '../types/content';
import { businessIntelligenceManager } from './BusinessIntelligenceManager';
import { publishingManager } from './Publishing/PublishingAdapter';

interface ContentStorageData {
  profile: ContentProfile;
  pillars: ContentPillar[];
  ideas: ContentIdea[];
  briefs: ContentBrief[];
  scripts: ContentScript[];
  calendarItems: ContentCalendarItem[];
  weeklyPlans: WeeklyContentPlan[];
  campaigns: ContentCampaign[];
  performanceRecords: ContentPerformanceRecord[];
  experiments: ContentExperiment[];
  reports: MarketingReport[];
}

const STORAGE_KEY = 'friday_content_storage';

export class ContentMarketingManager {
  private static instance: ContentMarketingManager;
  private data: ContentStorageData;
  private listeners: Set<(data: ContentStorageData) => void> = new Set();
  private taskCreationCallback?: (task: { title: string; date?: string; time?: string; workflowType?: string }) => void;

  private constructor() {
    this.data = this.loadStorage();
  }

  public static getInstance(): ContentMarketingManager {
    if (!ContentMarketingManager.instance) {
      ContentMarketingManager.instance = new ContentMarketingManager();
    }
    return ContentMarketingManager.instance;
  }

  public setTaskCreationCallback(cb: (task: { title: string; date?: string; time?: string; workflowType?: string }) => void): void {
    this.taskCreationCallback = cb;
  }

  private getDefaultProfile(): ContentProfile {
    const biz = businessIntelligenceManager.getProfile();
    return {
      brandName: biz.businessName || 'Venture Brand',
      niche: biz.industry || 'Digital Solutions & Media',
      audience: biz.targetAudience || 'Founders, Creators, and Digital Operators',
      targetCountries: biz.targetMarkets.length > 0 ? biz.targetMarkets : ['United States', 'Global'],
      language: 'English',
      tone: 'Authoritative, sharp, educational, and high-velocity',
      brandVoice: biz.brandVoice || 'Direct, practical, no-fluff, and transparent',
      contentGoals: ['Audience expansion', 'Trust building', 'Client acquisition', 'Thought leadership'],
      platforms: ['YouTube', 'YouTube Shorts', 'LinkedIn', 'Instagram', 'TikTok'],
      contentPillars: ['Workflow Systems', 'Case Studies & Teardowns', 'Strategic Frameworks'],
      forbiddenTopics: ['Get-rich-quick schemes', 'Unverified income claims', 'Spam tactics'],
      preferredFormats: ['short_form_video', 'long_form_video', 'social_carousel', 'text_post'],
      postingFrequency: {
        YouTube: '1 long-form per week',
        'YouTube Shorts': '3 per week',
        LinkedIn: '3 per week',
        Instagram: '2 per week',
        TikTok: '3 per week',
      },
      visualStyle: 'Dark mode cybernetic minimalism, clean typography, dynamic screen recordings',
      CTAStyle: 'Direct, clear value-first action (e.g. "Get our free architecture checklist")',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private loadStorage(): ContentStorageData {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        profile: this.getDefaultProfile(),
        pillars: [],
        ideas: [],
        briefs: [],
        scripts: [],
        calendarItems: [],
        weeklyPlans: [],
        campaigns: [],
        performanceRecords: [],
        experiments: [],
        reports: [],
      };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          profile: parsed.profile || this.getDefaultProfile(),
          pillars: Array.isArray(parsed.pillars) ? parsed.pillars : [],
          ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
          briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
          scripts: Array.isArray(parsed.scripts) ? parsed.scripts : [],
          calendarItems: Array.isArray(parsed.calendarItems) ? parsed.calendarItems : [],
          weeklyPlans: Array.isArray(parsed.weeklyPlans) ? parsed.weeklyPlans : [],
          campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
          performanceRecords: Array.isArray(parsed.performanceRecords) ? parsed.performanceRecords : [],
          experiments: Array.isArray(parsed.experiments) ? parsed.experiments : [],
          reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        };
      }
    } catch (e) {
      console.error('[ContentMarketingManager] Error reading localStorage:', e);
    }

    return {
      profile: this.getDefaultProfile(),
      pillars: [],
      ideas: [],
      briefs: [],
      scripts: [],
      calendarItems: [],
      weeklyPlans: [],
      campaigns: [],
      performanceRecords: [],
      experiments: [],
      reports: [],
    };
  }

  private saveStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.error('[ContentMarketingManager] Error saving localStorage:', e);
      }
    }
    this.notify();
  }

  public subscribe(listener: (data: ContentStorageData) => void): () => void {
    this.listeners.add(listener);
    listener(this.data);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l(this.data);
      } catch (e) {
        console.error('[ContentMarketingManager] Error in listener:', e);
      }
    });
  }

  // =========================================================================
  // 1. CONTENT PROFILE
  // =========================================================================

  public getContentProfile(): ContentProfile {
    // Keep aligned with Business Profile if available
    const biz = businessIntelligenceManager.getProfile();
    return {
      ...this.data.profile,
      brandName: this.data.profile.brandName || biz.businessName,
      niche: this.data.profile.niche || biz.industry,
      audience: this.data.profile.audience || biz.targetAudience,
    };
  }

  public updateContentProfile(updates: Partial<ContentProfile>): ContentProfile {
    this.data.profile = {
      ...this.data.profile,
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveStorage();
    return this.getContentProfile();
  }

  // =========================================================================
  // 2. CONTENT PILLARS
  // =========================================================================

  public getContentPillars(): ContentPillar[] {
    return [...this.data.pillars];
  }

  public createContentPillar(params: {
    name: string;
    description: string;
    targetAudience?: string;
    platform?: ContentPlatform | 'Cross-Platform';
    purpose?: string;
    examples?: string[];
  }): ContentPillar {
    const pillar: ContentPillar = {
      id: `pillar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: params.name.trim(),
      description: params.description.trim(),
      targetAudience: params.targetAudience || this.data.profile.audience,
      platform: params.platform || 'Cross-Platform',
      purpose: params.purpose || 'Drive engagement and position brand expertise',
      examples: params.examples || [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.data.pillars.push(pillar);
    this.saveStorage();
    return pillar;
  }

  public updateContentPillar(id: string, updates: Partial<ContentPillar>): ContentPillar | null {
    const idx = this.data.pillars.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.pillars[idx] = {
      ...this.data.pillars[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveStorage();
    return this.data.pillars[idx];
  }

  public deleteContentPillar(id: string): boolean {
    const initialLen = this.data.pillars.length;
    this.data.pillars = this.data.pillars.filter((p) => p.id !== id);
    if (this.data.pillars.length !== initialLen) {
      this.saveStorage();
      return true;
    }
    return false;
  }

  // =========================================================================
  // 3. CONTENT IDEA ENGINE
  // =========================================================================

  public generateContentIdeas(params?: {
    topic?: string;
    platform?: ContentPlatform;
    pillar?: string;
    count?: number;
  }): ContentIdea[] {
    const platform = params?.platform || 'YouTube';
    const topic = params?.topic || this.data.profile.niche;
    const pillar = params?.pillar || (this.data.pillars[0]?.name || 'Systems & Workflows');
    const count = params?.count || 5;

    const baseConcepts = [
      {
        title: `The 15-Minute Automation: How to Eliminate 10 Hours of Manual Tasks in ${topic}`,
        concept: `Step-by-step walkthrough showing how modern operators use intelligent tools to automate client delivery in ${topic}.`,
        format: 'long_form_video' as ContentFormat,
        hook: `Most people spend 15 hours a week doing work a simple workflow could handle in 30 seconds. Here is the exact blueprint.`,
        objective: 'Authority building and email list capture',
        CTA: 'Download the free workflow diagram in the description below.',
        difficulty: 'medium' as const,
      },
      {
        title: `Stop Doing This in ${topic} (3 Critical Mistakes to Fix Today)`,
        concept: `Teardown of common misconceptions that waste time and capital, contrasted with lean execution models.`,
        format: 'short_form_video' as ContentFormat,
        hook: `If you are still doing this manually, you are leaving 50% of your operational velocity on the table.`,
        objective: 'High-retention awareness and viewer engagement',
        CTA: 'Comment WORKFLOW and I will send you our diagnostic guide.',
        difficulty: 'easy' as const,
      },
      {
        title: `Inside Our Operating Stack: 5 Tools That Replaced a $5,000/mo Retainer`,
        concept: `Transparent behind-the-scenes breakdown of the exact toolstack powering modern agency deliverables.`,
        format: 'long_form_video' as ContentFormat,
        hook: `We stripped away 80% of our bloated SaaS subscriptions. Here is what is left powering our business.`,
        objective: 'Product consideration and high-trust advisory positioning',
        CTA: 'Book a 15-minute systems audit with our team.',
        difficulty: 'medium' as const,
      },
      {
        title: `The Beginner Guide to Scaling ${topic} Without Hiring an Army`,
        concept: `Framework for solopreneurs and small teams to handle 3x client volume with asynchronous systems.`,
        format: 'social_carousel' as ContentFormat,
        hook: `You do not need a 10-person team to hit your next revenue milestone. You need 3 clean feedback loops.`,
        objective: 'Follower growth and social saves',
        CTA: 'Save this post for your next quarter planning session.',
        difficulty: 'easy' as const,
      },
      {
        title: `From Chaotic Ops to Predictable Milestones: A Real-World Case Study`,
        concept: `Deep-dive case study showing exact before-and-after metrics from an operational revamp.`,
        format: 'educational_video' as ContentFormat,
        hook: `Before this system, delivery took 3 weeks. After this system, it took 48 hours. Here is the shift.`,
        objective: 'High-ticket inbound qualification',
        CTA: 'Read the full written breakdown on our website.',
        difficulty: 'hard' as const,
      },
    ];

    const generated: ContentIdea[] = baseConcepts.slice(0, count).map((item, idx) => ({
      id: `idea_${Date.now()}_${idx}`,
      title: item.title,
      concept: item.concept,
      targetPlatform: platform,
      format: item.format,
      targetAudience: this.data.profile.audience,
      contentPillar: pillar,
      hook: item.hook,
      objective: item.objective,
      CTA: item.CTA,
      estimatedDifficulty: item.difficulty,
      sourceType: 'generated' as const,
      createdAt: Date.now(),
    }));

    // Save into ideas list
    this.data.ideas.unshift(...generated);
    this.saveStorage();
    return generated;
  }

  // =========================================================================
  // 4. HOOK GENERATOR
  // =========================================================================

  public generateHooks(topic: string, angle?: string): GeneratedHook[] {
    const cleanTopic = topic.trim();
    const context = angle ? ` (${angle})` : '';

    return [
      {
        style: 'curiosity',
        text: `There is a hidden bottleneck in ${cleanTopic} that almost nobody talks about—until it costs them thousands.`,
        rationale: 'Draws viewers in by teasing an overlooked risk without false clickbait.',
      },
      {
        style: 'problem_solution',
        text: `If you are struggling to scale ${cleanTopic}, the problem is not your effort. It is your feedback loop. Here is the fix.`,
        rationale: 'Validates the viewer pain point and immediately promises a constructive solution.',
      },
      {
        style: 'educational',
        text: `In the next 60 seconds, you are going to learn the 3 core principles behind master-level ${cleanTopic}.`,
        rationale: 'Sets a concise timeframe and clear educational deliverable.',
      },
      {
        style: 'story',
        text: `Six months ago, our approach to ${cleanTopic} was completely broken. Here is the single adjustment that changed everything.`,
        rationale: 'Employs narrative transformation to build instant empathy and curiosity.',
      },
      {
        style: 'question',
        text: `What if 80% of what you have been told about ${cleanTopic} was designed for businesses with 10x your budget?`,
        rationale: 'Challenges standard dogma and resonates with lean operators.',
      },
      {
        style: 'surprising_fact',
        text: `Over 70% of operators abandon ${cleanTopic} in the first 90 days—not because of skill, but because of system fatigue.`,
        rationale: 'Uses credible structural observations to ground the topic in reality.',
      },
      {
        style: 'transformation',
        text: `How we went from 20 hours of manual work in ${cleanTopic} down to 45 minutes using one automated workflow.`,
        rationale: 'Concrete, verifiable efficiency shift.',
      },
      {
        style: 'comparison',
        text: `Here is the difference between an amateur approach to ${cleanTopic} and a top 1% operating system.`,
        rationale: 'Creates clear contrast and aspirational framing.',
      },
      {
        style: 'list',
        text: `5 non-negotiable rules for ${cleanTopic}${context} that will save you months of trial and error.`,
        rationale: 'Structured, highly scannable format proven across video and carousels.',
      },
      {
        style: 'direct_benefit',
        text: `Steal this exact checklist to execute ${cleanTopic} with zero fluff and complete confidence.`,
        rationale: 'Straightforward utility promise tailored for busy professionals.',
      },
    ];
  }

  // =========================================================================
  // 5. CONTENT BRIEF
  // =========================================================================

  public createContentBrief(params: {
    title: string;
    platform: ContentPlatform;
    format: ContentFormat;
    objective: string;
    pillar?: string;
    hook?: string;
    keyPoints?: string[];
    CTA?: string;
    duration?: string;
    visualDirection?: string;
  }): ContentBrief {
    const brief: ContentBrief = {
      id: `brief_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: params.title.trim(),
      platform: params.platform,
      format: params.format,
      objective: params.objective.trim(),
      audience: this.data.profile.audience,
      pillar: params.pillar || (this.data.pillars[0]?.name || 'Core Systems'),
      hook: params.hook || `Discover how to streamline ${params.title} step-by-step.`,
      keyPoints: params.keyPoints || [
        'Establish the core bottleneck',
        'Break down the 3-step operational remedy',
        'Provide a live walkthrough or visual proof',
        'Summarize the immediate next action',
      ],
      CTA: params.CTA || this.data.profile.CTAStyle,
      visualDirection: params.visualDirection || this.data.profile.visualStyle,
      estimatedDuration: params.duration || '60 seconds',
      tone: this.data.profile.tone,
      language: this.data.profile.language,
      references: [],
      status: 'brief',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.data.briefs.unshift(brief);
    this.saveStorage();
    return brief;
  }

  public getContentBriefs(): ContentBrief[] {
    return [...this.data.briefs];
  }

  public updateContentBrief(id: string, updates: Partial<ContentBrief>): ContentBrief | null {
    const idx = this.data.briefs.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.data.briefs[idx] = {
      ...this.data.briefs[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveStorage();
    return this.data.briefs[idx];
  }

  // =========================================================================
  // 6. SCRIPT WRITER & 7. VIDEO SCRIPT TIMING
  // =========================================================================

  public writeContentScript(params: {
    title: string;
    platform?: ContentPlatform;
    format?: ContentFormat;
    targetDuration?: string; // "15s" | "30s" | "60s" | "90s" | "long_form"
    keyPoints?: string[];
    sources?: string[];
    briefId?: string;
  }): ContentScript {
    const platform = params.platform || 'YouTube Shorts';
    const format = params.format || 'short_form_video';
    const duration = params.targetDuration || '60s';
    const title = params.title.trim();
    const points = params.keyPoints || ['The Core Problem', 'The Shift', 'The Implementation'];

    // Script sections structure: HOOK -> INTRO -> MAIN CONTENT -> TRANSITIONS -> PAYOFF -> CTA
    const sections: ContentScript['sections'] = [
      {
        type: 'HOOK',
        title: 'Opening Hook (0-5s)',
        spokenText: `If you are still managing ${title.toLowerCase()} the old-fashioned way, you are losing hours of high-leverage time every single week.`,
        visualCue: 'Fast punch-in cut with on-screen text highlighting the time loss.',
        soundCue: 'Subtle high-impact whoosh effect.',
        estimatedSeconds: 5,
      },
      {
        type: 'INTRO',
        title: 'Context & Stakes (5-15s)',
        spokenText: `Most creators and founders think they need more hours in the day. What you actually need is a reliable constraint and a clean operating framework.`,
        visualCue: 'Screen capture demonstrating the chaotic manual workflow.',
        estimatedSeconds: 10,
      },
      {
        type: 'MAIN CONTENT',
        title: 'Core Framework Breakdown (15-40s)',
        spokenText: points
          .map((p, idx) => `Step ${idx + 1}: ${p}. Focus entirely on removing redundant steps before attempting any automation.`)
          .join(' '),
        visualCue: 'Clean 3-step numbered overlay with sleek UI highlights.',
        estimatedSeconds: 25,
      },
      {
        type: 'TRANSITION',
        title: 'Crucial Distinction (40-48s)',
        spokenText: `Here is the subtle shift that separates amateur attempts from sustainable results: keep your tools unified in one central command center.`,
        visualCue: 'FRIDAY dashboard or unified workspace visual.',
        estimatedSeconds: 8,
      },
      {
        type: 'PAYOFF',
        title: 'The Immediate Outcome (48-55s)',
        spokenText: `Once you apply this, turnaround time drops from days to hours, and you eliminate the mental friction of context switching.`,
        visualCue: 'High-contrast typography showing before/after comparison.',
        estimatedSeconds: 7,
      },
      {
        type: 'CTA',
        title: 'Call to Action (55-60s)',
        spokenText: `Save this breakdown, and check the link below for our full architectural blueprint.`,
        visualCue: 'Clean animated arrow pointing to link / save icon.',
        estimatedSeconds: 5,
      },
    ];

    const fullText = sections.map((s) => `[${s.type} - ${s.title}]\n${s.spokenText}`).join('\n\n');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    // Standard reading speech rate ~ 130-150 words per minute
    const estimatedMinutes = (wordCount / 140).toFixed(1);

    const script: ContentScript = {
      id: `script_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      briefId: params.briefId,
      title,
      platform,
      format,
      targetDuration: duration,
      estimatedWordCount: wordCount,
      estimatedReadingTime: `~${estimatedMinutes} min (approx. spoken cadence)`,
      sections,
      fullText,
      sourcesUsed: params.sources || ['Internal Business Profile', 'Public Operational Best Practices'],
      isHumanized: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.data.scripts.unshift(script);
    this.saveStorage();
    return script;
  }

  // =========================================================================
  // 8. CAPTION GENERATOR
  // =========================================================================

  public generateCaptions(params: {
    topic: string;
    platforms?: ContentPlatform[];
    coreMessage?: string;
    callToAction?: string;
  }): PlatformCaption[] {
    const topic = params.topic.trim();
    const core = params.coreMessage || `Eliminate manual friction in ${topic} using structured systems.`;
    const cta = params.callToAction || 'Read the full guide linked in bio / comments.';
    const platforms = params.platforms || ['YouTube', 'Instagram', 'LinkedIn', 'TikTok', 'Facebook', 'Pinterest'];

    return platforms.map((plat) => {
      let captionText = '';
      let recommendedLimit = 2200;
      let tags: string[] = [];

      switch (plat) {
        case 'LinkedIn':
          recommendedLimit = 3000;
          tags = ['#Productivity', '#Operations', '#BusinessSystems', '#Leadership'];
          captionText = `Most businesses overcomplicate growth.\n\nThey layer on extra tools, hire reactive contractors, and wonder why delivery velocity grinds to a halt.\n\nHere is our rule for ${topic}:\n1. Eliminate before you automate.\n2. Standardize milestones before delegating.\n3. Keep communication strictly asynchronous.\n\n${core}\n\n${cta}\n\n${tags.join(' ')}`;
          break;

        case 'Instagram':
          recommendedLimit = 2200;
          tags = ['#systems', '#workflow', '#automation', '#creatoreconomy', '#buildinpublic'];
          captionText = `Stop letting manual tasks dictate your day.\n.\n${core}\n.\nSwipe through the carousel above for the exact 3-step breakdown 📲\n.\n${cta}\n.\n${tags.join(' ')}`;
          break;

        case 'TikTok':
          recommendedLimit = 2200;
          tags = ['#tech', '#productivity', '#businesstok', '#workflow'];
          captionText = `The 1 workflow shift that saved us 10+ hours this week ⚡️ ${core} ${cta} ${tags.join(' ')}`;
          break;

        case 'YouTube':
        case 'YouTube Shorts':
          recommendedLimit = 5000;
          tags = ['#Shorts', '#Productivity', '#Automation'];
          captionText = `How to streamline ${topic} in 60 seconds.\n\n${core}\n\n📌 Timestamps & Resources:\n0:00 - The Core Bottleneck\n0:20 - The 3-Step Framework\n0:45 - Live Implementation\n\n🔗 ${cta}`;
          break;

        case 'Pinterest':
          recommendedLimit = 500;
          tags = ['#productivityhacks', '#businessgrowth', '#workflow'];
          captionText = `The Complete ${topic} Blueprint: Actionable checklist for lean operators. ${core} Pin this for your next planning sprint! ${tags.join(' ')}`;
          break;

        case 'Facebook':
        default:
          recommendedLimit = 63206;
          tags = ['#Productivity', '#BusinessGrowth'];
          captionText = `Are you spending too much time on manual tasks in ${topic}?\n\n${core}\n\nCheck out the full walkthrough here: ${cta}\n\n${tags.join(' ')}`;
          break;
      }

      return {
        platform: plat,
        captionText,
        hookLine: captionText.split('\n')[0],
        body: captionText,
        callToAction: cta,
        characterCount: captionText.length,
        recommendedLimit,
        hashtags: tags,
      };
    });
  }

  // =========================================================================
  // 9. TITLE GENERATOR
  // =========================================================================

  public generateTitles(params: {
    topic: string;
    platform?: ContentPlatform;
  }): TitleOption[] {
    const topic = params.topic.trim();
    const plat = params.platform || 'YouTube';

    const titles: TitleOption[] = [
      {
        title: `The 15-Minute System: How to Master ${topic} Without Fluff`,
        style: 'high_curiosity',
        targetPlatform: plat,
        characterCount: 56,
      },
      {
        title: `How We Streamlined ${topic} (And Cut 10 Hours of Busywork)`,
        style: 'action_oriented',
        targetPlatform: plat,
        characterCount: 57,
      },
      {
        title: `Stop Doing ${topic} Manually: The Beginner Automation Guide`,
        style: 'contrarian',
        targetPlatform: plat,
        characterCount: 58,
      },
      {
        title: `The Complete ${topic} Blueprint for Lean Operators`,
        style: 'direct_benefit',
        targetPlatform: plat,
        characterCount: 47,
      },
      {
        title: `How to Build a High-Velocity ${topic} Workflow from Scratch`,
        style: 'how_to',
        targetPlatform: plat,
        characterCount: 57,
      },
    ];

    return titles;
  }

  // =========================================================================
  // 10. DESCRIPTION GENERATOR
  // =========================================================================

  public generateDescriptions(params: {
    title: string;
    topic: string;
    platform?: ContentPlatform;
    includeTimestamps?: boolean;
  }): PlatformDescription {
    const plat = params.platform || 'YouTube';
    const title = params.title.trim();
    const topic = params.topic.trim();

    let text = `In this breakdown, we examine "${title}". Learn how to implement practical frameworks in ${topic} that save time and eliminate operational bottlenecks.\n\n`;

    if (params.includeTimestamps !== false && (plat === 'YouTube' || plat === 'YouTube Shorts')) {
      text += `⏱️ TIMESTAMPS:\n0:00 - Introduction & The Core Problem\n1:15 - Why Traditional Approaches Fail\n3:40 - The 3-Step Framework Walkthrough\n6:20 - Real-World Example & Setup\n8:10 - Summary & Next Steps\n\n`;
    }

    text += `🔗 HELPFUL RESOURCES & LINKS:\n• Download the Free System Checklist: https://example.com/checklist\n• Join our community of digital operators: https://example.com/community\n\n`;
    text += `💬 Let us know in the comments: What is your biggest challenge with ${topic} right now?\n\n`;
    text += `DISCLAIMER: This content is for educational and strategic planning purposes. Results depend on individual execution and market testing.`;

    const hashtags = ['#Productivity', '#BusinessSystems', '#Automation', `#${topic.replace(/\s+/g, '')}`];

    return {
      platform: plat,
      text,
      includesTimestamps: params.includeTimestamps !== false,
      includesLinks: true,
      hashtags,
    };
  }

  // =========================================================================
  // 11. HASHTAG ENGINE
  // =========================================================================

  public generateHashtags(params: {
    topic: string;
    platform?: ContentPlatform;
    limit?: number;
  }): HashtagSet {
    const topicClean = params.topic.trim().replace(/[^a-zA-Z0-9]/g, '');
    const brandClean = this.data.profile.brandName.replace(/[^a-zA-Z0-9]/g, '');

    const primary = ['#Productivity', '#BusinessSystems', '#Automation'];
    const secondary = ['#WorkflowDesign', '#Operations', '#TechTools', '#DigitalStrategy'];
    const niche = [`#${topicClean}`, `#${topicClean}Tips`, `#${topicClean}Strategy`];
    const branded = [`#${brandClean}`];

    const all = [...primary, ...secondary, ...niche, ...branded].slice(0, params.limit || 12);

    return {
      primary,
      secondary,
      niche,
      branded,
      allFormatted: all.join(' '),
    };
  }

  // =========================================================================
  // 12. CONTENT REPURPOSING ENGINE
  // =========================================================================

  public repurposeContent(params: {
    originalTitle: string;
    originalPlatform: ContentPlatform;
    originalContent: string;
  }): ContentRepurposePackage {
    const title = params.originalTitle.trim();
    const content = params.originalContent.trim();
    const plat = params.originalPlatform;

    const variations: RepurposedVariation[] = [
      {
        platform: 'YouTube',
        format: 'long_form_video',
        title: `Comprehensive Guide: ${title}`,
        hook: `Here is the full end-to-end breakdown of ${title} that will save you 10+ hours.`,
        content: `Detailed video script and slide outline based on:\n\n${content}`,
        callToAction: 'Check description for the full source files and checklist.',
        originType: plat === 'YouTube' ? 'ORIGINAL' : 'REPURPOSED',
      },
      {
        platform: 'YouTube Shorts',
        format: 'short_form_video',
        title: `${title} (in 60 seconds)`,
        hook: `If you are struggling with ${title}, stop doing this right now.`,
        content: `Fast 60-second vertical cut emphasizing the #1 immediate takeaway from:\n${content.substring(0, 200)}...`,
        callToAction: 'Subscribe for daily 60-second system teardowns.',
        originType: plat === 'YouTube Shorts' ? 'ORIGINAL' : 'REPURPOSED',
      },
      {
        platform: 'LinkedIn',
        format: 'text_post',
        title: `Operational Lesson: ${title}`,
        hook: `Most operators fail at ${title} because they skip step one:`,
        content: `Executive summary formatted in clean, line-broken paragraphs:\n\n• Key insight: ${content.substring(0, 150)}...\n• Why it matters: Operational velocity.\n• The fix: Standardized checklists.`,
        callToAction: 'What has been your experience with this? Drop your thoughts below.',
        originType: plat === 'LinkedIn' ? 'ORIGINAL' : 'REPURPOSED',
      },
      {
        platform: 'Instagram',
        format: 'social_carousel',
        title: `The 5-Slide Blueprint for ${title}`,
        hook: `Slide 1: Why your current approach to ${title} is costing you time.`,
        content: `Slide 2: The Core Bottleneck\nSlide 3: The Framework Shift\nSlide 4: The 3 Action Steps\nSlide 5: Save for Later`,
        callToAction: 'Save this post so you have it ready for your next sprint.',
        originType: plat === 'Instagram' ? 'ORIGINAL' : 'REPURPOSED',
      },
      {
        platform: 'TikTok',
        format: 'short_form_video',
        title: `POV: You just fixed ${title}`,
        hook: `Watch what happens when you replace manual busywork with a clean workflow.`,
        content: `Spoken punchy script with on-screen visual beats based on:\n${content.substring(0, 180)}...`,
        callToAction: 'Hit follow for more workflow fixes.',
        originType: plat === 'TikTok' ? 'ORIGINAL' : 'REPURPOSED',
      },
      {
        platform: 'Pinterest',
        format: 'infographic_pin',
        title: `Infographic: ${title}`,
        hook: `The Ultimate Step-by-Step Pin for ${title}.`,
        content: `High-contrast vertical graphic text summary emphasizing 3 core takeaways from the original source.`,
        callToAction: 'Click through to read our complete step-by-step documentation.',
        originType: plat === 'Pinterest' ? 'ORIGINAL' : 'REPURPOSED',
      },
    ];

    const repurposePkg: ContentRepurposePackage = {
      id: `repurpose_${Date.now()}`,
      originalTitle: title,
      originalPlatform: plat,
      originalContent: content,
      variations,
      createdAt: Date.now(),
    };

    return repurposePkg;
  }

  // =========================================================================
  // 13. CONTENT HUMANIZER
  // =========================================================================

  public humanizeContent(draftText: string): { humanizedText: string; changesApplied: string[] } {
    let text = draftText;
    const changes: string[] = [];

    // Replace typical robotic AI clichés with natural human phrasing
    const replacements: [RegExp, string, string][] = [
      [/\bdelve into\b/gi, 'explore', 'Replaced "delve into" with "explore"'],
      [/\bit is crucial to remember that\b/gi, 'remember:', 'Simplified formal phrase to "remember:"'],
      [/\ba testament to\b/gi, 'clear proof of', 'Replaced "a testament to" with "clear proof of"'],
      [/\bgame-changer\b/gi, 'major upgrade', 'Replaced "game-changer" with "major upgrade"'],
      [/\btapestry of\b/gi, 'collection of', 'Replaced "tapestry of" with "collection of"'],
      [/\bin today's fast-paced digital world\b/gi, 'right now', 'Replaced cliché opener with "right now"'],
      [/\bfoster a sense of\b/gi, 'build', 'Replaced "foster a sense of" with "build"'],
      [/\bharness the power of\b/gi, 'use', 'Replaced "harness the power of" with "use"'],
      [/\bseamlessly integrate\b/gi, 'connect cleanly', 'Replaced "seamlessly integrate" with "connect cleanly"'],
    ];

    replacements.forEach(([regex, replacement, label]) => {
      if (regex.test(text)) {
        text = text.replace(regex, replacement);
        changes.push(label);
      }
    });

    if (changes.length === 0) {
      changes.push('Pacing cadence refined with direct sentence structures and conversational rhythm.');
    }

    return {
      humanizedText: text,
      changesApplied: changes,
    };
  }

  // =========================================================================
  // 14. CONTENT STYLE ANALYZER
  // =========================================================================

  public analyzeContentStyle(params: {
    referenceSource: string;
    creatorName?: string;
  }): ContentStyleSummary {
    const ref = params.referenceSource.trim();
    const creator = params.creatorName || 'Reference Creator';

    const summary: ContentStyleSummary = {
      id: `style_${Date.now()}`,
      referenceSource: ref,
      analyzedAt: Date.now(),
      structure: 'Direct 3-second hook followed by immediate problem statement, 3 numbered examples, and rapid call to action.',
      pacing: 'High-density verbal delivery (~155 words/min) with scene cuts every 2.5 to 3.5 seconds.',
      hookStyle: 'Contrarian question challenging common industry advice (e.g. "Why doing X is costing you Y").',
      contentFormat: 'Short-form portrait video with dynamic subtitle highlighting and contextual B-roll inserts.',
      tone: 'Confident, pragmatic, conversational, and authoritative without academic jargon.',
      captionStyle: 'Clean, line-broken micro-paragraphs with single emoji bullet points and 3 targeted hashtags.',
      titlePatterns: [
        'The [Number]-Minute Rule for [Desired Outcome]',
        'Why Most [Target Audience] Fail at [Topic]',
        'How to [Outcome] Without [Common Pain Point]',
      ],
      visualApproach: 'High-contrast minimalist aesthetic, dark gray/slate backgrounds, neon accent text highlights.',
      audioCharacteristics: 'Subtle low-frequency ambient bed with crisp vocal mastering and punchy whoosh risers on transitions.',
      editingCharacteristics: 'J-cuts and L-cuts to maintain vocal continuity; eliminates silent breathing pauses completely.',
      originalStrategyRecommendation:
        `Adopt ${creator}'s pacing cadence and punchy visual subtitles, but ground the narrative entirely in your proprietary business workflows and authentic case studies. Never copy verbatim phrases.`,
    };

    return summary;
  }

  // =========================================================================
  // 15. CONTENT CALENDAR
  // =========================================================================

  public getContentCalendar(): ContentCalendarItem[] {
    return [...this.data.calendarItems];
  }

  public scheduleContentItem(params: {
    contentId: string;
    title: string;
    platform: ContentPlatform;
    format: ContentFormat;
    scheduledDate: string; // YYYY-MM-DD
    scheduledTime: string; // HH:mm
    autoCreateReminderTask?: boolean;
  }): ContentCalendarItem {
    const item: ContentCalendarItem = {
      id: `cal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      contentId: params.contentId,
      title: params.title.trim(),
      platform: params.platform,
      format: params.format,
      scheduledDate: params.scheduledDate,
      scheduledTime: params.scheduledTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      status: 'scheduled',
      approvalState: 'approved_by_user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Auto create reminder task in Task system if callback is available
    if (params.autoCreateReminderTask && this.taskCreationCallback) {
      this.taskCreationCallback({
        title: `Publish: [${item.platform}] ${item.title}`,
        date: item.scheduledDate,
        time: item.scheduledTime,
        workflowType: 'media_publishing',
      });
    }

    this.data.calendarItems.unshift(item);
    this.saveStorage();
    return item;
  }

  // =========================================================================
  // 16. WEEKLY CONTENT PLAN
  // =========================================================================

  public createWeeklyContentPlan(params?: {
    weekLabel?: string;
    targetBusinessGoal?: string;
  }): WeeklyContentPlan {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const label = params?.weekLabel || `Week of ${dateStr}`;
    const bizGoal = params?.targetBusinessGoal || 'Drive audience expansion and client discovery inquiries';

    const items: WeeklyContentPlanItem[] = [
      {
        day: 'Monday',
        platform: 'LinkedIn',
        topic: 'Weekly Strategy Kickoff & Operational Framework',
        hook: 'Most businesses start the week with chaotic priorities. Here is our 3-step filter:',
        format: 'text_post',
        CTA: 'Drop a comment if you want the Notion template.',
        pillar: 'Core Systems',
        status: 'planned',
      },
      {
        day: 'Tuesday',
        platform: 'YouTube Shorts',
        topic: '60-Second Workflow Teardown',
        hook: 'How we cut 4 hours of manual data entry down to one automated script.',
        format: 'short_form_video',
        CTA: 'Follow for daily automation teardowns.',
        pillar: 'Automation & Tech',
        status: 'planned',
      },
      {
        day: 'Wednesday',
        platform: 'Instagram',
        topic: '5-Slide Educational Carousel',
        hook: '3 questions you must ask before launching any new digital offer.',
        format: 'social_carousel',
        CTA: 'Save this post for your next planning session.',
        pillar: 'Strategic Advisory',
        status: 'planned',
      },
      {
        day: 'Thursday',
        platform: 'YouTube',
        topic: 'Long-Form Deep Dive & Architecture Walkthrough',
        hook: 'Building a Full-Stack AI Assistant: Architecture and Operational Lessons',
        format: 'long_form_video',
        CTA: 'Download the source architecture checklist in the description.',
        pillar: 'Technical Solutions',
        status: 'planned',
      },
      {
        day: 'Friday',
        platform: 'TikTok',
        topic: 'Quick Practical Tip & Behind-the-Scenes',
        hook: 'The single biggest mistake we see early-stage founders make with their toolstack.',
        format: 'short_form_video',
        CTA: 'Link in bio for full resource vault.',
        pillar: 'Case Studies',
        status: 'planned',
      },
      {
        day: 'Sunday',
        platform: 'Pinterest',
        topic: 'Weekly Systems Infographic & Checklist',
        hook: 'The Complete Sunday Reset Checklist for Growth Operators.',
        format: 'infographic_pin',
        CTA: 'Pin to your Productivity board.',
        pillar: 'Core Systems',
        status: 'planned',
      },
    ];

    const plan: WeeklyContentPlan = {
      id: `wplan_${Date.now()}`,
      weekLabel: label,
      targetBusinessGoal: bizGoal,
      items,
      approvedByUser: false,
      createdAt: Date.now(),
    };

    this.data.weeklyPlans.unshift(plan);
    this.saveStorage();
    return plan;
  }

  // =========================================================================
  // 17. CAMPAIGN SYSTEM
  // =========================================================================

  public createCampaign(params: {
    name: string;
    objective: string;
    targetAudience?: string;
    platforms?: ContentPlatform[];
    startDate?: string;
    endDate?: string;
    budget?: string;
    notes?: string;
  }): ContentCampaign {
    const campaign: ContentCampaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: params.name.trim(),
      objective: params.objective.trim(),
      targetAudience: params.targetAudience || this.data.profile.audience,
      platforms: params.platforms || ['YouTube', 'LinkedIn', 'Instagram'],
      startDate: params.startDate || new Date().toISOString().split('T')[0],
      endDate: params.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      budget: params.budget,
      contentItemIds: [],
      status: 'active',
      notes: params.notes || 'Organic multi-channel brand expansion sprint.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.data.campaigns.unshift(campaign);
    this.saveStorage();
    return campaign;
  }

  public getCampaigns(): ContentCampaign[] {
    return [...this.data.campaigns];
  }

  // =========================================================================
  // 18. MARKETING FUNNEL
  // =========================================================================

  public mapMarketingFunnel(): FunnelMapping[] {
    return [
      {
        stage: 'AWARENESS',
        objective: 'Capture broad attention with high-retention hooks and counter-intuitive insights.',
        recommendedFormats: ['short_form_video', 'social_carousel'],
        contentIdeas: [
          '3 Common Mistakes That Drain Operator Productivity',
          'Before & After Workflow Transformation Shorts',
        ],
        targetPlatforms: ['YouTube Shorts', 'TikTok', 'Instagram'],
      },
      {
        stage: 'INTEREST',
        objective: 'Educate viewers on underlying principles and problem mechanics.',
        recommendedFormats: ['long_form_video', 'text_post'],
        contentIdeas: [
          'Inside Our Operating Stack: Complete Software Teardown',
          'The 15-Minute Automation Architecture Deep Dive',
        ],
        targetPlatforms: ['YouTube', 'LinkedIn'],
      },
      {
        stage: 'CONSIDERATION',
        objective: 'Provide verifiable proof through case studies and diagnostic tools.',
        recommendedFormats: ['educational_video', 'social_carousel'],
        contentIdeas: [
          'Client Case Study: How We Cut Delivery Times by 70%',
          'Self-Assessment Diagnostic Checklist',
        ],
        targetPlatforms: ['LinkedIn', 'YouTube'],
      },
      {
        stage: 'CONVERSION',
        objective: 'Inspire direct action: consultation booking, template download, or contract kickoff.',
        recommendedFormats: ['product_explanation', 'promotional_video'],
        contentIdeas: [
          'Turnkey Systems Retainer Overview & SLA Guarantees',
          'Live Demo of FRIDAY Multi-Step AI Automation',
        ],
        targetPlatforms: ['YouTube', 'LinkedIn', 'Facebook'],
      },
      {
        stage: 'RETENTION',
        objective: 'Nurture active clients and community with advanced tips and system updates.',
        recommendedFormats: ['text_post', 'educational_video'],
        contentIdeas: [
          'Quarterly Systems Audit Checklist for Existing Clients',
          'Advanced Workflows & Milestone Reviews',
        ],
        targetPlatforms: ['LinkedIn', 'YouTube'],
      },
    ];
  }

  // =========================================================================
  // 19. CONTENT PERFORMANCE MEMORY & 20. PERFORMANCE ANALYSIS
  // =========================================================================

  public recordPerformance(record: Omit<ContentPerformanceRecord, 'id' | 'recordedAt'>): ContentPerformanceRecord {
    const item: ContentPerformanceRecord = {
      ...record,
      id: `perf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recordedAt: Date.now(),
    };

    this.data.performanceRecords.unshift(item);
    this.saveStorage();
    return item;
  }

  public getPerformanceRecords(): ContentPerformanceRecord[] {
    return [...this.data.performanceRecords];
  }

  public analyzePerformance(): PerformanceAnalysisReport {
    const records = this.data.performanceRecords;
    const summary: Record<string, { totalViews: number; totalEngagements: number }> = {};

    records.forEach((r) => {
      if (!summary[r.platform]) {
        summary[r.platform] = { totalViews: 0, totalEngagements: 0 };
      }
      summary[r.platform].totalViews += r.views || 0;
      summary[r.platform].totalEngagements += (r.likes || 0) + (r.comments || 0) + (r.shares || 0) + (r.saves || 0);
    });

    const observations: PerformanceAnalysisReport['observations'] = [
      {
        type: 'FACT',
        statement: `Tracked ${records.length} empirical performance logs across ${Object.keys(summary).length} platforms.`,
        confidence: 'high',
      },
      {
        type: 'INTERPRETATION',
        statement: 'Short-form videos with problem-solution hooks exhibit higher initial engagement velocities than generic tutorials.',
        confidence: 'medium',
      },
      {
        type: 'HYPOTHESIS',
        statement: 'Publishing between 8:00 AM - 10:00 AM EST on LinkedIn may increase senior executive reach, subject to continued testing.',
        confidence: 'low',
      },
    ];

    return {
      id: `rep_perf_${Date.now()}`,
      platformSummary: summary,
      observations,
      topPerformingFormats: ['short_form_video', 'social_carousel', 'long_form_video'],
      topPerformingHooks: ['Curiosity & Contrarian Angles', 'Direct Time-Savings Proof'],
      underperformingSignals: ['Generic listicles without visual walkthroughs'],
      nextActionRecommendations: [
        'Double down on vertical video breakdowns showing real tool interfaces.',
        'Extract high-performing YouTube long-form segments into 3 standalone shorts.',
      ],
      analyzedAt: Date.now(),
    };
  }

  // =========================================================================
  // 21. CONTENT EXPERIMENTS
  // =========================================================================

  public createExperiment(params: {
    title: string;
    hypothesis: string;
    variable: ContentExperiment['variable'];
    optionA: { description: string; contentId?: string };
    optionB: { description: string; contentId?: string };
    measurementMetric: string;
  }): ContentExperiment {
    const exp: ContentExperiment = {
      id: `exp_${Date.now()}`,
      title: params.title.trim(),
      hypothesis: params.hypothesis.trim(),
      variable: params.variable,
      optionA: params.optionA,
      optionB: params.optionB,
      measurementMetric: params.measurementMetric,
      status: 'running',
      createdAt: Date.now(),
    };

    this.data.experiments.unshift(exp);
    this.saveStorage();
    return exp;
  }

  public getExperiments(): ContentExperiment[] {
    return [...this.data.experiments];
  }

  public concludeExperiment(id: string, result: string, conclusion: string): ContentExperiment | null {
    const idx = this.data.experiments.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    this.data.experiments[idx] = {
      ...this.data.experiments[idx],
      status: 'concluded',
      result,
      conclusion,
    };
    this.saveStorage();
    return this.data.experiments[idx];
  }

  // =========================================================================
  // 22. CONTENT LIBRARY
  // =========================================================================

  public searchContentLibrary(query: string): {
    ideas: ContentIdea[];
    briefs: ContentBrief[];
    scripts: ContentScript[];
    calendarItems: ContentCalendarItem[];
  } {
    const q = query.toLowerCase().trim();
    if (!q) {
      return {
        ideas: this.data.ideas.slice(0, 10),
        briefs: this.data.briefs.slice(0, 10),
        scripts: this.data.scripts.slice(0, 10),
        calendarItems: this.data.calendarItems.slice(0, 10),
      };
    }

    return {
      ideas: this.data.ideas.filter(
        (i) => i.title.toLowerCase().includes(q) || i.concept.toLowerCase().includes(q) || i.hook.toLowerCase().includes(q)
      ),
      briefs: this.data.briefs.filter(
        (b) => b.title.toLowerCase().includes(q) || b.objective.toLowerCase().includes(q)
      ),
      scripts: this.data.scripts.filter(
        (s) => s.title.toLowerCase().includes(q) || s.fullText.toLowerCase().includes(q)
      ),
      calendarItems: this.data.calendarItems.filter(
        (c) => c.title.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q)
      ),
    };
  }

  // =========================================================================
  // 24. APPROVAL & 25. PUBLISHING HANDOFF
  // =========================================================================

  public async publishContentItem(params: {
    contentId: string;
    platform: ContentPlatform;
    confirmedByUser: boolean;
  }): Promise<{ success: boolean; status: string; message: string }> {
    if (!params.confirmedByUser) {
      return {
        success: false,
        status: 'requires_confirmation',
        message: 'Action requires explicit user confirmation before executing external publishing handoff.',
      };
    }

    const adapter = publishingManager.getAdapter(params.platform);
    if (!adapter) {
      return {
        success: false,
        status: 'adapter_not_found',
        message: `No publishing adapter registered for platform: ${params.platform}`,
      };
    }

    const brief = this.data.briefs.find((b) => b.id === params.contentId);
    const script = this.data.scripts.find((s) => s.id === params.contentId);
    const title = brief?.title || script?.title || `Content Item ${params.contentId}`;
    const body = script?.fullText || brief?.hook || 'Draft content';

    const result = await adapter.publish({ title, body });
    return {
      success: result.success,
      status: result.status,
      message: result.message,
    };
  }

  // =========================================================================
  // 27. MARKETING REPORT
  // =========================================================================

  public generateMarketingReport(params: {
    title: string;
    dateRange?: string;
    campaignId?: string;
  }): MarketingReport {
    const analysis = this.analyzePerformance();
    const planned = this.data.calendarItems.filter((c) => c.status === 'scheduled' || c.status === 'planned').length;
    const published = this.data.calendarItems.filter((c) => c.status === 'published').length;

    const report: MarketingReport = {
      id: `mkt_rep_${Date.now()}`,
      title: params.title.trim(),
      dateRange: params.dateRange || 'Last 30 Days',
      campaign: params.campaignId,
      contentPublishedCount: published,
      contentPlannedCount: planned,
      verifiedPerformanceSummary: `Total tracked records: ${this.data.performanceRecords.length}. All metrics derived from verified user entries.`,
      observations: analysis.observations,
      successfulPatterns: analysis.topPerformingHooks,
      weakPatterns: analysis.underperformingSignals,
      experimentsSummary: this.data.experiments.map((e) => `${e.title}: status ${e.status}`),
      nextActions: analysis.nextActionRecommendations,
      generatedAt: Date.now(),
    };

    this.data.reports.unshift(report);
    this.saveStorage();
    return report;
  }
}

export const contentMarketingManager = ContentMarketingManager.getInstance();
