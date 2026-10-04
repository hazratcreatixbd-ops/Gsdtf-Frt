/**
 * PART 7 — FRIDAY Business Intelligence & Planning Engine Types
 * Strict typed contracts for Business Profile, Goals, Research, Strategy,
 * Audience, SWOT, Ideas, Content Plans, Briefings, and Decision Support.
 */

export type DataConfidence = 'verified' | 'high' | 'medium' | 'estimated' | 'unverified';

export type InformationType = 'verified_fact' | 'user_provided' | 'inference' | 'assumption' | 'unknown';

export interface VerifiedFinding {
  fact: string;
  source: string;
  sourceUrl?: string;
  dateAccessed?: string;
  confidence: DataConfidence;
  type: InformationType;
  interpretation?: string;
}

export interface BusinessProfile {
  businessName: string;
  description: string;
  industry: string;
  products: string[];
  services: string[];
  targetAudience: string;
  targetMarkets: string[];
  locations: string[];
  businessGoals: string[];
  brandVoice: string;
  competitors: string[];
  website: string;
  socialLinks: Record<string, string>;
  preferredChannels: string[];
  budgetRange?: string;
  currentChallenges: string[];
  strengths: string[];
  weaknesses: string[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalStatus = 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface BusinessGoal {
  id: string;
  title: string;
  description: string;
  priority: GoalPriority;
  status: GoalStatus;
  deadline?: string;
  measurableTarget?: string;
  progress: number; // 0 to 100
  relatedTasks: string[];
  relatedResearch: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MarketResearchResult {
  id: string;
  market: string;
  industry: string;
  geography: string;
  targetAudience: string;
  findings: VerifiedFinding[];
  overview: string;
  customerNeeds: string[];
  commonProblems: string[];
  knownCompetitors: string[];
  pricingSignals: string[];
  contentTrends: string[];
  distributionChannels: string[];
  potentialOpportunities: string[];
  potentialRisks: string[];
  verificationNote: string;
  createdAt: number;
}

export interface CompetitorSnapshot {
  id: string;
  competitorName: string;
  website?: string;
  whoTheyAre: string;
  whatTheyOffer: string[];
  whoTheyTarget: string;
  publicPositioning: string;
  publicContentApproach: string;
  publicStrengths: string[];
  publicGaps: string[];
  opportunitiesForUser: string[];
  sources: string[];
  findings: VerifiedFinding[];
  createdAt: number;
}

export interface AudienceAnalysis {
  id: string;
  targetMarket: string;
  primaryAudience: {
    description: string;
    location: string;
    ageRange?: string;
    interests: string[];
    needs: string[];
    painPoints: string[];
    buyingMotivations: string[];
    objections: string[];
    preferredContent: string[];
    preferredChannels: string[];
  };
  secondaryAudience?: {
    description: string;
    needs: string[];
    channels: string[];
  };
  facts: string[];
  assumptions: string[];
  hypotheses: string[];
  createdAt: number;
}

export interface SWOTItem {
  point: string;
  origin: 'user-provided' | 'researched' | 'inferred';
  details?: string;
}

export interface SWOTAnalysis {
  id: string;
  businessName: string;
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  risks: SWOTItem[];
  createdAt: number;
}

export interface BusinessIdea {
  id: string;
  concept: string;
  targetCustomer: string;
  problemSolved: string;
  proposedSolution: string;
  potentialRevenueModel: string;
  requiredResources: string[];
  risks: string[];
  firstValidationStep: string;
  disclaimer: string; // "Ideas require market testing; profitability and success are not guaranteed."
  createdAt: number;
}

export interface StrategyMilestone {
  title: string;
  deadline?: string;
  actionItems: string[];
  requiredTasks: string[];
}

export interface BusinessStrategy {
  id: string;
  title: string;
  goal: string;
  assumptions: string[];
  strategicApproach: string;
  milestones: StrategyMilestone[];
  generatedTasks: { title: string; priority: string; category: string }[];
  risksAndMitigations: { risk: string; mitigation: string }[];
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  createdAt: number;
}

export interface ContentIdea {
  platform: 'YouTube' | 'Facebook' | 'Instagram' | 'TikTok' | 'LinkedIn' | 'Pinterest' | 'Blog';
  theme: string;
  hook: string;
  title: string;
  description: string;
  callToAction: string;
  repurposingIdeas: string[];
}

export interface ContentStrategyPlan {
  id: string;
  businessName: string;
  pillars: string[];
  themes: string[];
  publishingCadence: Record<string, string>;
  contentIdeas: ContentIdea[];
  disclaimer: string; // "Content drafted for planning purposes; direct publishing requires authorized account connection."
  createdAt: number;
}

export interface WeeklyPlan {
  id: string;
  weekLabel: string;
  mainGoals: string[];
  priorityProjects: string[];
  researchTasks: string[];
  contentTasks: string[];
  marketingTasks: string[];
  followUpTasks: string[];
  administrativeTasks: string[];
  metricsToMonitor: string[];
  endOfWeekReviewChecklist: string[];
  approvedByCustomer: boolean;
  createdAt: number;
}

export interface DailyBriefing {
  id: string;
  date: string;
  todaysGoals: string[];
  pendingTasks: string[];
  deadlines: string[];
  activeProjects: string[];
  researchUpdates: string[];
  connectedMetrics: string[];
  recommendedNextActions: string[];
  generatedAt: number;
}

export interface ResearchRecord {
  id: string;
  query: string;
  topic: string;
  findings: string[];
  sources: { title: string; url?: string; date?: string; confidence: DataConfidence }[];
  assumptions: string[];
  confidence: DataConfidence;
  relatedBusinessGoal?: string;
  relatedCompetitor?: string;
  relatedProject?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DecisionOption {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  verifiedCosts?: string;
  risks: string[];
  assumptions: string[];
}

export interface DecisionEvaluation {
  id: string;
  question: string;
  options: DecisionOption[];
  keyDifferences: string[];
  unknowns: string[];
  criticalQuestions: string[];
  recommendationFraming: string; // Explicitly clarifies user retains final authority
  createdAt: number;
}

export interface BusinessReport {
  id: string;
  title: string;
  date: string;
  objective: string;
  executiveSummary: string;
  researchFindings: string[];
  keyFacts: string[];
  assumptions: string[];
  analysis: string;
  risks: string[];
  opportunities: string[];
  actionPlan: string[];
  tasks: string[];
  sources: string[];
  createdAt: number;
}
