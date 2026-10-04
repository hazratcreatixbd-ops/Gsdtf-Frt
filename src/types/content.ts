/**
 * PART 8 — FRIDAY Content & Marketing Engine Types
 * Strict typed definitions for Content Profile, Pillars, Ideas, Hooks, Briefs,
 * Scripts, Captions, Titles, Descriptions, Hashtags, Repurposing, Style Analysis,
 * Content Calendar, Campaigns, Funnels, Performance Memory, Experiments, and Publishing Adapters.
 */

export type ContentPlatform =
  | 'YouTube'
  | 'YouTube Shorts'
  | 'Facebook'
  | 'Instagram'
  | 'TikTok'
  | 'LinkedIn'
  | 'Pinterest';

export type HookStyle =
  | 'curiosity'
  | 'problem_solution'
  | 'educational'
  | 'story'
  | 'question'
  | 'surprising_fact'
  | 'transformation'
  | 'comparison'
  | 'list'
  | 'direct_benefit';

export type ContentFormat =
  | 'short_form_video'
  | 'long_form_video'
  | 'educational_video'
  | 'promotional_video'
  | 'storytelling'
  | 'documentary'
  | 'product_explanation'
  | 'social_carousel'
  | 'text_post'
  | 'infographic_pin';

export type BriefStatus =
  | 'idea'
  | 'brief'
  | 'drafting'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived';

export type IdeaSourceType = 'userProvided' | 'researchBased' | 'generated' | 'repurposed';

export interface ContentProfile {
  brandName: string;
  niche: string;
  audience: string;
  targetCountries: string[];
  language: string;
  tone: string;
  brandVoice: string;
  contentGoals: string[];
  platforms: ContentPlatform[];
  contentPillars: string[];
  forbiddenTopics: string[];
  preferredFormats: ContentFormat[];
  postingFrequency: Record<ContentPlatform | string, string>;
  visualStyle: string;
  CTAStyle: string;
  createdAt: number;
  updatedAt: number;
}

export interface ContentPillar {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  platform: ContentPlatform | 'Cross-Platform';
  purpose: string;
  examples: string[];
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface ContentIdea {
  id: string;
  title: string;
  concept: string;
  targetPlatform: ContentPlatform;
  format: ContentFormat;
  targetAudience: string;
  contentPillar: string;
  hook: string;
  objective: string;
  CTA: string;
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  sourceType: IdeaSourceType;
  createdAt: number;
}

export interface GeneratedHook {
  style: HookStyle;
  text: string;
  rationale: string;
}

export interface ContentBrief {
  id: string;
  title: string;
  platform: ContentPlatform;
  format: ContentFormat;
  objective: string;
  audience: string;
  pillar: string;
  hook: string;
  keyPoints: string[];
  CTA: string;
  visualDirection: string;
  estimatedDuration: string; // e.g. "30 seconds", "8 minutes"
  tone: string;
  language: string;
  references: string[];
  status: BriefStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ScriptSection {
  type: 'HOOK' | 'INTRO' | 'MAIN CONTENT' | 'TRANSITION' | 'PAYOFF' | 'CTA';
  title: string;
  spokenText: string;
  visualCue?: string;
  soundCue?: string;
  estimatedSeconds?: number;
}

export interface ContentScript {
  id: string;
  briefId?: string;
  title: string;
  platform: ContentPlatform;
  format: ContentFormat;
  targetDuration: string; // e.g. "15s", "30s", "60s", "90s", "custom"
  estimatedWordCount: number;
  estimatedReadingTime: string;
  sections: ScriptSection[];
  fullText: string;
  sourcesUsed: string[];
  isHumanized: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlatformCaption {
  platform: ContentPlatform;
  captionText: string;
  hookLine: string;
  body: string;
  callToAction: string;
  characterCount: number;
  recommendedLimit: number;
  hashtags: string[];
}

export interface TitleOption {
  title: string;
  style: 'high_curiosity' | 'action_oriented' | 'how_to' | 'contrarian' | 'direct_benefit';
  targetPlatform: ContentPlatform;
  characterCount: number;
}

export interface PlatformDescription {
  platform: ContentPlatform;
  text: string;
  includesTimestamps?: boolean;
  includesLinks?: boolean;
  hashtags: string[];
}

export interface HashtagSet {
  primary: string[];
  secondary: string[];
  niche: string[];
  branded: string[];
  allFormatted: string;
}

export interface RepurposedVariation {
  platform: ContentPlatform;
  format: ContentFormat;
  title: string;
  content: string;
  hook: string;
  callToAction: string;
  originType: 'ORIGINAL' | 'REPURPOSED';
}

export interface ContentRepurposePackage {
  id: string;
  originalTitle: string;
  originalPlatform: ContentPlatform;
  originalContent: string;
  variations: RepurposedVariation[];
  createdAt: number;
}

export interface ContentStyleSummary {
  id: string;
  referenceSource: string;
  analyzedAt: number;
  structure: string;
  pacing: string;
  hookStyle: string;
  contentFormat: string;
  tone: string;
  captionStyle: string;
  titlePatterns: string[];
  visualApproach: string;
  audioCharacteristics: string;
  editingCharacteristics: string;
  originalStrategyRecommendation: string;
}

export interface ContentCalendarItem {
  id: string;
  contentId: string;
  title: string;
  platform: ContentPlatform;
  format: ContentFormat;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  timezone: string;
  status: 'planned' | 'draft' | 'approved' | 'scheduled' | 'published' | 'cancelled';
  approvalState: 'pending_review' | 'approved_by_user' | 'rejected';
  associatedTaskId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WeeklyContentPlanItem {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  platform: ContentPlatform;
  topic: string;
  hook: string;
  format: ContentFormat;
  CTA: string;
  pillar: string;
  status: 'planned' | 'approved' | 'drafted';
}

export interface WeeklyContentPlan {
  id: string;
  weekLabel: string;
  targetBusinessGoal?: string;
  items: WeeklyContentPlanItem[];
  approvedByUser: boolean;
  createdAt: number;
}

export interface ContentCampaign {
  id: string;
  name: string;
  objective: string;
  targetAudience: string;
  platforms: ContentPlatform[];
  startDate: string;
  endDate: string;
  budget?: string;
  contentItemIds: string[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type FunnelStage = 'AWARENESS' | 'INTEREST' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';

export interface FunnelMapping {
  stage: FunnelStage;
  objective: string;
  recommendedFormats: ContentFormat[];
  contentIdeas: string[];
  targetPlatforms: ContentPlatform[];
}

export interface ContentPerformanceRecord {
  id: string;
  contentId: string;
  title: string;
  platform: ContentPlatform;
  impressions?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  watchTimeMinutes?: number;
  retentionPercent?: number;
  conversions?: number;
  dateRange: string;
  source: 'user_provided' | 'api_connected';
  notes: string;
  recordedAt: number;
}

export interface PerformanceObservation {
  type: 'FACT' | 'INTERPRETATION' | 'HYPOTHESIS';
  statement: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface PerformanceAnalysisReport {
  id: string;
  platformSummary: Record<string, { totalViews: number; totalEngagements: number }>;
  observations: PerformanceObservation[];
  topPerformingFormats: string[];
  topPerformingHooks: string[];
  underperformingSignals: string[];
  nextActionRecommendations: string[];
  analyzedAt: number;
}

export interface ContentExperiment {
  id: string;
  title: string;
  hypothesis: string;
  variable: 'hook_style' | 'title_concept' | 'format' | 'posting_time' | 'thumbnail_concept';
  optionA: { description: string; contentId?: string; metrics?: Record<string, number> };
  optionB: { description: string; contentId?: string; metrics?: Record<string, number> };
  measurementMetric: string;
  status: 'running' | 'concluded';
  result?: string;
  conclusion?: string;
  createdAt: number;
}

export interface PlatformPublishingCapabilities {
  platform: ContentPlatform;
  canDraft: boolean;
  canUpload: boolean;
  canSchedule: boolean;
  canDirectPublish: boolean;
  isConnected: boolean;
  connectionStatusMessage: string;
}

export interface PublishingResult {
  success: boolean;
  platform: ContentPlatform;
  status: 'draft_created' | 'scheduled' | 'published' | 'requires_authorization' | 'failed';
  externalId?: string;
  url?: string;
  message: string;
  timestamp: number;
}

export interface MarketingReport {
  id: string;
  title: string;
  dateRange: string;
  campaign?: string;
  contentPublishedCount: number;
  contentPlannedCount: number;
  verifiedPerformanceSummary: string;
  observations: PerformanceObservation[];
  successfulPatterns: string[];
  weakPatterns: string[];
  experimentsSummary: string[];
  nextActions: string[];
  generatedAt: number;
}
