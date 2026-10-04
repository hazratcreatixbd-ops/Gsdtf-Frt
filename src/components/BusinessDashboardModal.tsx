import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Target,
  Search,
  Users,
  Compass,
  FileText,
  TrendingUp,
  ShieldAlert,
  Calendar,
  Sparkles,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Share2,
  Video,
  Repeat,
  Layers,
  BarChart3,
  BookOpen,
  Send,
  Sliders,
  Clock,
  Tag,
} from 'lucide-react';
import { businessIntelligenceManager } from '../services/BusinessIntelligenceManager';
import { contentMarketingManager } from '../services/ContentMarketingManager';
import { publishingManager } from '../services/Publishing/PublishingAdapter';
import {
  BusinessProfile,
  BusinessGoal,
  CompetitorSnapshot,
  AudienceAnalysis,
  SWOTAnalysis,
  BusinessStrategy,
  WeeklyPlan,
  ResearchRecord,
  BusinessReport,
} from '../types/business';
import {
  ContentProfile,
  ContentPillar,
  ContentIdea,
  ContentBrief,
  ContentScript,
  ContentCalendarItem,
  WeeklyContentPlan,
  ContentCampaign,
  ContentPerformanceRecord,
  ContentExperiment,
  PlatformPublishingCapabilities,
  MarketingReport,
} from '../types/content';

export type DashboardTab =
  | 'overview'
  | 'goals'
  | 'research'
  | 'competitors'
  | 'content_studio'
  | 'repurposing'
  | 'calendar_campaigns'
  | 'performance_experiments'
  | 'reports_library';

interface BusinessDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: DashboardTab;
}

export const BusinessDashboardModal: React.FC<BusinessDashboardModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

  // Business Intelligence State (Part 7)
  const [profile, setProfile] = useState<BusinessProfile>(businessIntelligenceManager.getProfile());
  const [goals, setGoals] = useState<BusinessGoal[]>(businessIntelligenceManager.getGoals());
  const [researchRecords, setResearchRecords] = useState<ResearchRecord[]>(businessIntelligenceManager.getAllResearchRecords());
  const [competitors, setCompetitors] = useState<CompetitorSnapshot[]>([]);
  const [audiences, setAudiences] = useState<AudienceAnalysis[]>([]);
  const [swots, setSwots] = useState<SWOTAnalysis[]>([]);
  const [strategies, setStrategies] = useState<BusinessStrategy[]>([]);
  const [reports, setReports] = useState<BusinessReport[]>([]);

  // Content & Marketing Engine State (Part 8)
  const [contentProfile, setContentProfile] = useState<ContentProfile>(contentMarketingManager.getContentProfile());
  const [pillars, setPillars] = useState<ContentPillar[]>(contentMarketingManager.getContentPillars());
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [briefs, setBriefs] = useState<ContentBrief[]>([]);
  const [scripts, setScripts] = useState<ContentScript[]>([]);
  const [calendarItems, setCalendarItems] = useState<ContentCalendarItem[]>([]);
  const [weeklyContentPlans, setWeeklyContentPlans] = useState<WeeklyContentPlan[]>([]);
  const [campaigns, setCampaigns] = useState<ContentCampaign[]>([]);
  const [performanceRecords, setPerformanceRecords] = useState<ContentPerformanceRecord[]>([]);
  const [experiments, setExperiments] = useState<ContentExperiment[]>([]);
  const [publishingCaps, setPublishingCaps] = useState<PlatformPublishingCapabilities[]>(publishingManager.getAllCapabilities());
  const [marketingReports, setMarketingReports] = useState<MarketingReport[]>([]);

  // Local form states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<BusinessProfile>>({});
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Content generation quick inputs
  const [topicInput, setTopicInput] = useState('');
  const [selectedPillarName, setSelectedPillarName] = useState('');
  const [repurposeTextInput, setRepurposeTextInput] = useState('');
  const [repurposeResult, setRepurposeResult] = useState<any>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const unsubBiz = businessIntelligenceManager.subscribe((data) => {
      setProfile(data.profile);
      setGoals(data.goals);
      setResearchRecords(data.researchRecords);
      setCompetitors(data.competitors);
      setAudiences(data.audiences);
      setSwots(data.swots);
      setStrategies(data.strategies);
      setReports(data.reports);
    });

    const unsubContent = contentMarketingManager.subscribe((data) => {
      setContentProfile(data.profile);
      setPillars(data.pillars);
      setIdeas(data.ideas);
      setBriefs(data.briefs);
      setScripts(data.scripts);
      setCalendarItems(data.calendarItems);
      setWeeklyContentPlans(data.weeklyPlans);
      setCampaigns(data.campaigns);
      setPerformanceRecords(data.performanceRecords);
      setExperiments(data.experiments);
      setMarketingReports(data.reports);
      setPublishingCaps(publishingManager.getAllCapabilities());
    });

    return () => {
      unsubBiz();
      unsubContent();
    };
  }, []);

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    businessIntelligenceManager.updateProfile(profileForm);
    setIsEditingProfile(false);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    businessIntelligenceManager.createGoal({
      title: newGoalTitle.trim(),
      priority: newGoalPriority,
      deadline: newGoalDeadline.trim() || undefined,
    });
    setNewGoalTitle('');
    setNewGoalDeadline('');
  };

  const handleExportReport = (report: BusinessReport) => {
    const text = businessIntelligenceManager.exportReportAsText(report.id);
    if (!text) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setExportNotice(`Report "${report.title}" copied to clipboard.`);
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  const handleGenerateIdeas = () => {
    const topic = topicInput.trim() || profile.industry;
    contentMarketingManager.generateContentIdeas({ topic, pillar: selectedPillarName || undefined });
    setExportNotice(`Generated fresh ideas for "${topic}".`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleGenerateScript = (title: string) => {
    contentMarketingManager.writeContentScript({
      title,
      targetDuration: '60s',
      platform: 'YouTube Shorts',
    });
    setExportNotice(`Drafted 60-second script for "${title}".`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleRepurposeText = () => {
    if (!repurposeTextInput.trim()) return;
    const res = contentMarketingManager.repurposeContent({
      originalTitle: 'Core Strategy Insight',
      originalPlatform: 'YouTube',
      originalContent: repurposeTextInput.trim(),
    });
    setRepurposeResult(res);
  };

  const renderConfidenceBadge = (confidence: string, type?: string) => {
    let color = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30';
    if (type === 'verified_fact') {
      color = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
    } else if (type === 'assumption' || type === 'unknown') {
      color = 'bg-amber-950/60 text-amber-300 border-amber-500/30';
    }

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono border ${color}`}>
        {type ? type.replace('_', ' ').toUpperCase() : confidence.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[880px] flex flex-col rounded-3xl bg-[#070b14] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold font-mono tracking-wider text-slate-100 uppercase">
                  FRIDAY Intelligence & Marketing Engine
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PARTS 7 & 8
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Business Intelligence, Strategy & High-Velocity Content Production
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Export / Notification Banner */}
        {exportNotice && (
          <div className="px-6 py-2 bg-cyan-950/80 border-b border-cyan-500/40 text-cyan-200 text-xs font-mono flex items-center justify-between animate-in fade-in">
            <span>{exportNotice}</span>
            <button onClick={() => setExportNotice(null)} className="text-cyan-400 hover:text-cyan-200 text-[10px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Tabs Bar */}
        <div className="flex items-center space-x-1 px-6 py-2 border-b border-slate-800/60 bg-slate-950/40 overflow-x-auto shrink-0 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: Briefcase },
            { id: 'goals', label: `Goals (${goals.length})`, icon: Target },
            { id: 'research', label: `Research & Memory (${researchRecords.length})`, icon: Search },
            { id: 'competitors', label: 'Competitors & Audience', icon: Users },
            { id: 'content_studio', label: `Content Studio (${ideas.length + briefs.length})`, icon: Video },
            { id: 'repurposing', label: 'Repurposing & Captions', icon: Repeat },
            { id: 'calendar_campaigns', label: `Calendar & Funnel (${calendarItems.length})`, icon: Calendar },
            { id: 'performance_experiments', label: `Performance & A/B (${performanceRecords.length})`, icon: BarChart3 },
            { id: 'reports_library', label: `Library & Reports (${reports.length + marketingReports.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 text-xs">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Business Profile Card */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold font-mono text-cyan-300 uppercase">Business Profile</h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Voice updateable: "FRIDAY, remember that my business targets US customers")
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (!isEditingProfile) setProfileForm(profile);
                      setIsEditingProfile(!isEditingProfile);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 transition-all"
                  >
                    {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>

                {isEditingProfile ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Business Name</label>
                      <input
                        type="text"
                        value={profileForm.businessName || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Industry / Niche</label>
                      <input
                        type="text"
                        value={profileForm.industry || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Target Markets (comma separated)</label>
                      <input
                        type="text"
                        value={(profileForm.targetMarkets || []).join(', ')}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            targetMarkets: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      >
                        Save Profile
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Name & Industry</span>
                      <p className="font-semibold text-slate-100">{profile.businessName}</p>
                      <p className="text-slate-400 text-[11px]">{profile.industry}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Target Markets</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profile.targetMarkets.map((m, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 text-[10px] font-mono border border-slate-700">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Target Audience Persona</span>
                      <p className="text-slate-300 leading-relaxed mt-0.5">{profile.targetAudience}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    contentMarketingManager.generateContentIdeas({ topic: profile.industry });
                    setActiveTab('content_studio');
                  }}
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
                >
                  <Video className="w-4 h-4 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-mono text-xs font-semibold text-slate-200">Generate Video Ideas</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">High-retention concepts and hooks</div>
                </button>

                <button
                  onClick={() => {
                    contentMarketingManager.createWeeklyContentPlan();
                    setActiveTab('calendar_campaigns');
                  }}
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
                >
                  <Calendar className="w-4 h-4 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-mono text-xs font-semibold text-slate-200">Plan Weekly Content</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">7-day multi-platform schedule</div>
                </button>

                <button
                  onClick={() => {
                    businessIntelligenceManager.generateSWOTAnalysis();
                    setActiveTab('competitors');
                  }}
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
                >
                  <TrendingUp className="w-4 h-4 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-mono text-xs font-semibold text-slate-200">Run SWOT Analysis</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Categorized by verified origin</div>
                </button>
              </div>

              {/* Data Quality & Publishing Honesty Protocol */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-start space-x-3 text-cyan-200/90 text-[11px] leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-cyan-300">FRIDAY Honesty & Publishing Guardrails:</span>
                  <p className="mt-0.5 text-slate-400">
                    FRIDAY scripts, formats, and schedules content. Direct social media publishing only triggers when an actual authorized integration is actively authenticated. We never fake publications, metrics, or views.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOALS */}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              <form onSubmit={handleCreateGoal} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-slate-200 uppercase">Create New Business Goal</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Goal title, e.g. 'Launch YouTube Content Engine'"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <select
                      value={newGoalPriority}
                      onChange={(e) => setNewGoalPriority(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-500"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={!newGoalTitle.trim()}
                      className="w-full px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs transition-all flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Goal</span>
                    </button>
                  </div>
                </div>
              </form>

              <div className="space-y-3">
                {goals.map((g) => (
                  <div key={g.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-100 text-sm">{g.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {g.status.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          businessIntelligenceManager.updateGoal(g.id, {
                            status: g.status === 'completed' ? 'active' : 'completed',
                            progress: g.status === 'completed' ? 0 : 100,
                          })
                        }
                        className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-emerald-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RESEARCH & MEMORY */}
          {activeTab === 'research' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search stored research memory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => businessIntelligenceManager.conductMarketResearch({ market: searchQuery || profile.industry })}
                  className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono text-xs border border-cyan-500/40"
                >
                  Scan Market
                </button>
              </div>

              <div className="space-y-3">
                {researchRecords.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{rec.topic}</span>
                      {renderConfidenceBadge(rec.confidence)}
                    </div>
                    {rec.findings.map((f, i) => (
                      <p key={i} className="text-slate-300 text-xs">• {f}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: COMPETITORS & AUDIENCE */}
          {activeTab === 'competitors' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold text-cyan-300 uppercase">Public Competitors & SWOT</h3>
                <button
                  onClick={() => businessIntelligenceManager.generateSWOTAnalysis()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-rose-300 text-[10px] font-mono border border-slate-700"
                >
                  Refresh SWOT
                </button>
              </div>

              {swots.map((swot) => (
                <div key={swot.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                    <span className="font-mono font-bold text-emerald-300 text-xs uppercase block">Strengths</span>
                    {swot.strengths.map((s, i) => (
                      <div key={i} className="text-xs text-slate-200">• {s.point}</div>
                    ))}
                  </div>
                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                    <span className="font-mono font-bold text-rose-300 text-xs uppercase block">Risks / Threats</span>
                    {swot.risks.map((r, i) => (
                      <div key={i} className="text-xs text-slate-200">• {r.point}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: CONTENT STUDIO (Part 8) */}
          {activeTab === 'content_studio' && (
            <div className="space-y-6">
              {/* Generator Bar */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Video className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-mono text-xs font-bold text-slate-200 uppercase">Content Idea & Script Generator</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder={`Enter topic or theme (e.g. "${profile.industry}")`}
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleGenerateIdeas}
                      className="w-full px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate 5 Ideas</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ideas Grid */}
              <div className="space-y-3">
                <h4 className="font-mono text-xs font-bold text-cyan-300 uppercase">Generated Ideas & Hook Blueprints</h4>
                {ideas.map((idea) => (
                  <div key={idea.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-100 text-sm">{idea.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {idea.targetPlatform}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1">Hook: "{idea.hook}"</p>
                      </div>
                      <button
                        onClick={() => handleGenerateScript(idea.title)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono border border-slate-700 shrink-0"
                      >
                        Write Script
                      </button>
                    </div>
                  </div>
                ))}

                {ideas.length === 0 && (
                  <div className="p-6 text-center text-slate-500 font-mono text-xs rounded-xl border border-dashed border-slate-800">
                    No ideas generated yet. Click "Generate 5 Ideas" or ask FRIDAY by voice: "FRIDAY, give me ten video ideas."
                  </div>
                )}
              </div>

              {/* Scripts List */}
              {scripts.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <h4 className="font-mono text-xs font-bold text-emerald-300 uppercase">Drafted Scripts ({scripts.length})</h4>
                  {scripts.map((script) => (
                    <div key={script.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-sm">{script.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {script.targetDuration} • {script.estimatedWordCount} words ({script.estimatedReadingTime})
                        </span>
                      </div>
                      <div className="space-y-2 pt-1 pl-2 border-l-2 border-emerald-500/40">
                        {script.sections.map((sec, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-mono text-[10px] text-emerald-400 block">{sec.type} - {sec.title}</span>
                            <p className="text-slate-200 mt-0.5">{sec.spokenText}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: REPURPOSING & CAPTIONS */}
          {activeTab === 'repurposing' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <div className="flex items-center space-x-2">
                  <Repeat className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-mono text-xs font-bold text-slate-200 uppercase">6-Platform Content Repurposing Engine</h3>
                </div>
                <textarea
                  rows={3}
                  placeholder="Paste long-form video transcript, script, or article..."
                  value={repurposeTextInput}
                  onChange={(e) => setRepurposeTextInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleRepurposeText}
                  disabled={!repurposeTextInput.trim()}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs transition-all flex items-center space-x-1"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Repurpose Across YouTube, Shorts, LinkedIn, Instagram, TikTok & Pinterest</span>
                </button>
              </div>

              {repurposeResult && (
                <div className="space-y-4">
                  <h4 className="font-mono text-xs font-bold text-cyan-300 uppercase">
                    Repurposed Output Variations ({repurposeResult.variations.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {repurposeResult.variations.map((v: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100 text-xs">{v.platform}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {v.originType}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs font-mono">{v.title}</p>
                        <p className="text-slate-400 text-xs whitespace-pre-line">{v.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: CALENDAR & CAMPAIGNS */}
          {activeTab === 'calendar_campaigns' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold text-cyan-300 uppercase">Weekly Plan & Scheduled Content</h3>
                <button
                  onClick={() => contentMarketingManager.createWeeklyContentPlan()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40"
                >
                  Generate 7-Day Plan
                </button>
              </div>

              {weeklyContentPlans.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                  <span className="font-bold text-slate-100 text-sm">{weeklyContentPlans[0].weekLabel}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {weeklyContentPlans[0].items.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="font-mono text-[10px] text-cyan-400 font-bold block">
                          {item.day} — {item.platform}
                        </span>
                        <p className="text-slate-200 mt-0.5">{item.topic}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Hook: {item.hook}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: PERFORMANCE & EXPERIMENTS */}
          {activeTab === 'performance_experiments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-xs font-bold text-cyan-300 uppercase">Verified Performance Data</h3>
                  <p className="text-[11px] text-slate-400">Strictly separates verified facts from interpretations and hypotheses</p>
                </div>
                <button
                  onClick={() =>
                    contentMarketingManager.createExperiment({
                      title: 'Curiosity Hook vs Direct Proof Hook',
                      hypothesis: 'Opening with direct ROI proof increases short-form retention by 15%.',
                      variable: 'hook_style',
                      optionA: { description: 'Curiosity mystery opener' },
                      optionB: { description: 'Direct screen recording with hard numbers' },
                      measurementMetric: 'Average percentage viewed (retention)',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 text-[10px] font-mono border border-slate-700"
                >
                  Create A/B Experiment
                </button>
              </div>

              {experiments.length > 0 ? (
                <div className="space-y-3">
                  {experiments.map((exp) => (
                    <div key={exp.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-sm">{exp.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {exp.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs">Hypothesis: {exp.hypothesis}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <span className="font-mono text-[10px] text-slate-400 block">Option A</span>
                          <span>{exp.optionA.description}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-slate-800">
                          <span className="font-mono text-[10px] text-slate-400 block">Option B</span>
                          <span>{exp.optionB.description}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 font-mono text-xs rounded-xl border border-dashed border-slate-800">
                  No active A/B experiments. Click "Create A/B Experiment" or tell FRIDAY to start an experiment.
                </div>
              )}
            </div>
          )}

          {/* TAB 9: REPORTS & LIBRARY */}
          {activeTab === 'reports_library' && (
            <div className="space-y-6">
              {/* Publishing Platform Capabilities & Honesty status */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs font-bold text-slate-200 uppercase">Publishing Adapter Status</h3>
                  <span className="text-[10px] font-mono text-slate-500">Safe sandbox & mock adapters active</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {publishingCaps.map((cap) => (
                    <div key={cap.platform} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                      <span className="font-semibold text-slate-200 font-mono block">{cap.platform}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {cap.isConnected ? 'Connected' : 'Draft Only (Requires OAuth)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reports List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs font-bold text-cyan-300 uppercase">Compiled Strategic Reports</h3>
                  <button
                    onClick={() =>
                      contentMarketingManager.generateMarketingReport({
                        title: 'Executive Content Performance & Growth Report',
                        dateRange: 'Past 30 Days',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-mono font-bold"
                  >
                    Compile Marketing Report
                  </button>
                </div>

                {reports.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-sm">{rep.title}</span>
                      <button
                        onClick={() => handleExportReport(rep)}
                        className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-mono border border-slate-700"
                      >
                        Copy Text
                      </button>
                    </div>
                    <p className="text-slate-300 text-xs">{rep.executiveSummary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
