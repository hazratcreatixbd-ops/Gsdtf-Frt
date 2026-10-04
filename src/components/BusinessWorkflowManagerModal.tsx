import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ShieldCheck,
  Building2,
  Sparkles,
  Download,
  Plus,
  RefreshCw,
  Eye,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Copy,
  Layers,
  BarChart3,
  Share2,
  Bookmark,
  Check,
} from 'lucide-react';
import {
  BusinessWorkflow,
  WorkflowStep,
  WorkflowApproval,
  WorkflowStatus,
  StructuredBusinessMemory,
  BusinessCampaignExtended,
} from '../types/workflowEngine';
import { businessWorkflowEngine } from '../services/BusinessWorkflowEngine';
import { businessMemoryManager } from '../services/BusinessMemoryManager';
import { campaignManager } from '../services/CampaignManager';
import { publishingManager } from '../services/Publishing/PublishingAdapter';

interface BusinessWorkflowManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessWorkflowManagerModal: React.FC<BusinessWorkflowManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'approvals' | 'campaigns' | 'memory' | 'safety'>('workflows');
  const [activeWorkflow, setActiveWorkflow] = useState<BusinessWorkflow | null>(null);
  const [workflowsList, setWorkflowsList] = useState<BusinessWorkflow[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<WorkflowApproval[]>([]);
  const [campaigns, setCampaigns] = useState<BusinessCampaignExtended[]>([]);
  const [businessMemory, setBusinessMemory] = useState<StructuredBusinessMemory>(businessMemoryManager.getBusinessMemory());
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportModalContent, setReportModalContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // New Campaign Form state
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignObjective, setNewCampaignObjective] = useState('');
  const [newCampaignAudience, setNewCampaignAudience] = useState('');

  // Editing Memory state
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [editBizName, setEditBizName] = useState('');
  const [editAudience, setEditAudience] = useState('');
  const [editVoice, setEditVoice] = useState('');

  // Editing Step state
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editStepTitle, setEditStepTitle] = useState('');
  const [editStepDesc, setEditStepDesc] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const updateAll = () => {
      const active = businessWorkflowEngine.getActiveWorkflow();
      setActiveWorkflow(active);
      setWorkflowsList(businessWorkflowEngine.listWorkflows());
      setPendingApprovals(businessWorkflowEngine.getPendingApprovals());
      setCampaigns(campaignManager.getCampaigns());
      setBusinessMemory(businessMemoryManager.getBusinessMemory());
      if (active && active.steps.length > 0 && !selectedStep) {
        setSelectedStep(active.steps[0]);
      }
    };

    updateAll();

    const unsubWf = businessWorkflowEngine.subscribe((wf) => {
      setActiveWorkflow(wf);
      setWorkflowsList(businessWorkflowEngine.listWorkflows());
      setPendingApprovals(businessWorkflowEngine.getPendingApprovals());
      if (wf.steps.length > 0 && (!selectedStep || selectedStep.stepId === wf.currentStep)) {
        const found = wf.steps.find((s) => s.stepId === wf.currentStep) || wf.steps[0];
        setSelectedStep(found);
      }
    });

    const unsubApp = businessWorkflowEngine.subscribeApprovals((apps) => {
      setPendingApprovals(apps);
    });

    return () => {
      unsubWf();
      unsubApp();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateWorkflow = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!goalInput.trim()) return;
    setIsProcessing(true);
    try {
      const wf = businessWorkflowEngine.createWorkflow(goalInput.trim());
      setActiveWorkflow(wf);
      setSelectedStep(wf.steps[0]);
      setGoalInput('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartWorkflow = async () => {
    if (!activeWorkflow) return;
    setIsProcessing(true);
    try {
      await businessWorkflowEngine.startWorkflow(activeWorkflow.workflowId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteNextStep = async () => {
    if (!activeWorkflow) return;
    setIsProcessing(true);
    try {
      await businessWorkflowEngine.executeNextStep(activeWorkflow.workflowId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePause = () => {
    businessWorkflowEngine.pauseWorkflow();
  };

  const handleResume = async () => {
    setIsProcessing(true);
    try {
      await businessWorkflowEngine.resumeWorkflow();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    businessWorkflowEngine.cancelWorkflow();
  };

  const handleRetry = async () => {
    setIsProcessing(true);
    try {
      await businessWorkflowEngine.retryWorkflow();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (workflowId: string, stepId: string) => {
    setIsProcessing(true);
    try {
      await businessWorkflowEngine.approveStep(workflowId, stepId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (workflowId: string, stepId: string) => {
    setIsProcessing(true);
    try {
      await businessWorkflowEngine.rejectStep(workflowId, stepId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveStepEdit = () => {
    if (!activeWorkflow || !editingStep) return;
    businessWorkflowEngine.editStep(activeWorkflow.workflowId, editingStep.stepId, {
      title: editStepTitle.trim() || editingStep.title,
      description: editStepDesc.trim() || editingStep.description,
    });
    setEditingStep(null);
  };

  const handleSaveMemory = () => {
    const updated = businessMemoryManager.updateBusinessMemory({
      businessName: editBizName.trim() || businessMemory.businessName,
      targetAudience: editAudience.trim() || businessMemory.targetAudience,
      brandVoice: editVoice.trim() || businessMemory.brandVoice,
    });
    setBusinessMemory(updated);
    setIsEditingMemory(false);
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim() || !newCampaignObjective.trim()) return;
    campaignManager.createCampaign({
      name: newCampaignName.trim(),
      objective: newCampaignObjective.trim(),
      audience: newCampaignAudience.trim() || 'Core Audience',
      platforms: ['YouTube', 'LinkedIn', 'Instagram'],
    });
    setCampaigns(campaignManager.getCampaigns());
    setNewCampaignName('');
    setNewCampaignObjective('');
    setNewCampaignAudience('');
    setShowNewCampaignModal(false);
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completedSteps = activeWorkflow ? activeWorkflow.steps.filter((s) => s.status === 'COMPLETED').length : 0;
  const totalSteps = activeWorkflow ? activeWorkflow.steps.length : 0;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const pipelineStages = [
    'RESEARCH',
    'BUSINESS_ANALYSIS',
    'STRATEGY',
    'CONTENT_PLAN',
    'CONTENT_CREATION',
    'QUALITY_CHECK',
    'MEDIA_PREPARATION',
    'PUBLISHING',
    'PERFORMANCE_MONITORING',
    'ANALYSIS',
    'REPORT',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[880px] flex flex-col rounded-3xl border border-cyan-500/40 bg-[#040816] text-slate-100 shadow-[0_20px_70px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Futuristic Top Glowing Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-rose-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-mono">
                  FRIDAY Autonomous Business Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  PART 10
                </span>
                {activeWorkflow && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                      activeWorkflow.status === 'RUNNING'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 animate-pulse'
                        : activeWorkflow.status === 'WAITING_FOR_APPROVAL'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse'
                        : activeWorkflow.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {activeWorkflow.status}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                End-to-End Workflow Engine • Human-in-the-Loop Gate • Real Platform Safety
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {pendingApprovals.length > 0 && (
              <button
                onClick={() => setActiveTab('approvals')}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold hover:bg-amber-500/30 transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>{pendingApprovals.length} Approval Pending</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-5 py-2 border-b border-slate-800/80 bg-slate-900/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              activeTab === 'workflows'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workflows & Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              activeTab === 'approvals'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Approval Center</span>
            {pendingApprovals.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              activeTab === 'campaigns'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Campaign Manager</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              activeTab === 'memory'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Business Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              activeTab === 'safety'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Platform Safety Audit</span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-sm text-slate-300">
          {/* TAB 1: Workflows & DAG Pipeline */}
          {activeTab === 'workflows' && (
            <div className="space-y-5">
              {/* Natural Language Goal Planning Box */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                    Autonomous Business Goal Converter
                  </span>
                </div>
                <form onSubmit={handleCreateWorkflow} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="e.g. Help me grow my video business, create a 30-day marketing plan..."
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!goalInput.trim() || isProcessing}
                    className="flex items-center justify-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Plan Workflow</span>
                  </button>
                </form>
              </div>

              {/* Active Workflow Overview & Actions */}
              {activeWorkflow ? (
                <div className="space-y-4">
                  {/* Workflow Card Header */}
                  <div className="p-4 rounded-2xl border border-cyan-500/30 bg-slate-900/50 backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-bold text-white font-mono">{activeWorkflow.goal}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            {activeWorkflow.priority} PRIORITY
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{activeWorkflow.description}</p>
                      </div>

                      {/* Action Control Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {activeWorkflow.status === 'PLANNED' && (
                          <button
                            onClick={handleStartWorkflow}
                            disabled={isProcessing}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-md shadow-cyan-500/30"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Execution</span>
                          </button>
                        )}

                        {activeWorkflow.status === 'RUNNING' && (
                          <>
                            <button
                              onClick={handleExecuteNextStep}
                              disabled={isProcessing}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium transition-all"
                            >
                              <Play className="w-3 h-3" />
                              <span>Step by Step</span>
                            </button>
                            <button
                              onClick={handlePause}
                              disabled={isProcessing}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-xs font-mono transition-all"
                            >
                              <Pause className="w-3 h-3" />
                              <span>Pause</span>
                            </button>
                          </>
                        )}

                        {activeWorkflow.status === 'PAUSED' && (
                          <button
                            onClick={handleResume}
                            disabled={isProcessing}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono transition-all"
                          >
                            <Play className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                        )}

                        {(activeWorkflow.status === 'FAILED' || activeWorkflow.status === 'CANCELLED') && (
                          <button
                            onClick={handleRetry}
                            disabled={isProcessing}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 text-xs font-mono transition-all"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}

                        {activeWorkflow.status !== 'COMPLETED' && activeWorkflow.status !== 'CANCELLED' && (
                          <button
                            onClick={handleCancel}
                            disabled={isProcessing}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 transition-all"
                            title="Cancel Workflow"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const rep = businessWorkflowEngine.generateWorkflowReport(activeWorkflow.workflowId);
                            setReportModalContent(rep);
                          }}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-all"
                          title="View Executive Report"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Report</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          Progress: {completedSteps} / {totalSteps} Stages
                        </span>
                        <span className="text-cyan-400 font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* High-level Pipeline Stages Visualizer */}
                  <div className="p-3 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-x-auto scrollbar-none">
                    <div className="flex items-center space-x-2 min-w-max">
                      {pipelineStages.map((stageName, idx) => {
                        const matchingSteps = activeWorkflow.steps.filter((s) => s.stage === stageName);
                        const isDone = matchingSteps.length > 0 && matchingSteps.every((s) => s.status === 'COMPLETED');
                        const isCurrent = activeWorkflow.currentStage === stageName;
                        const isWaiting = matchingSteps.some((s) => s.status === 'WAITING_FOR_APPROVAL');

                        return (
                          <React.Fragment key={stageName}>
                            <div
                              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider transition-all ${
                                isWaiting
                                  ? 'bg-amber-950/70 border border-amber-500/60 text-amber-300 animate-pulse'
                                  : isCurrent
                                  ? 'bg-cyan-950/70 border border-cyan-500/60 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                                  : isDone
                                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500'
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : isWaiting ? (
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                              <span>{stageName.replace('_', ' ')}</span>
                            </div>
                            {idx < pipelineStages.length - 1 && (
                              <span className="text-slate-700 text-xs">→</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2-Column Layout: Steps List + Step Inspector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Step Sequence */}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                        Execution Stages DAG ({activeWorkflow.steps.length})
                      </div>
                      {activeWorkflow.steps.map((step, idx) => {
                        const isSelected = selectedStep?.stepId === step.stepId;
                        return (
                          <div
                            key={step.stepId}
                            onClick={() => setSelectedStep(step)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'border-cyan-500/60 bg-cyan-950/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                                : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-cyan-400 text-[11px]">
                                0{idx + 1}. {step.stage}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                                  step.status === 'COMPLETED'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                    : step.status === 'WAITING_FOR_APPROVAL'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                                    : step.status === 'RUNNING'
                                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 animate-pulse'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {step.status}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-200 mb-0.5">{step.title}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">{step.description}</div>
                            {step.requiresApproval && (
                              <div className="mt-1 flex items-center space-x-1 text-[10px] text-amber-400 font-mono">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Human Approval Required</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Right: Selected Step Inspector */}
                    <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-3">
                      {selectedStep ? (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <div>
                              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                                Stage Inspector: {selectedStep.stage}
                              </span>
                              <h4 className="text-sm font-bold text-white font-mono">{selectedStep.title}</h4>
                            </div>
                            <button
                              onClick={() => {
                                setEditingStep(selectedStep);
                                setEditStepTitle(selectedStep.title);
                                setEditStepDesc(selectedStep.description);
                              }}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                              title="Edit Stage Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-xs text-slate-400">{selectedStep.description}</div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                            <div>
                              <span className="text-slate-500">Worker Type:</span>{' '}
                              <span className="text-slate-200">{selectedStep.workerType}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Status:</span>{' '}
                              <span className="text-slate-200">{selectedStep.status}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Dependencies:</span>{' '}
                              <span className="text-slate-200">
                                {selectedStep.dependencies.length > 0 ? selectedStep.dependencies.length : 'None'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Approval Gate:</span>{' '}
                              <span className={selectedStep.requiresApproval ? 'text-amber-400' : 'text-slate-400'}>
                                {selectedStep.requiresApproval ? 'Active' : 'Not Required'}
                              </span>
                            </div>
                          </div>

                          {/* Output Preview */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                              Stage Output & Findings
                            </span>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 max-h-[140px] overflow-y-auto">
                              {selectedStep.output ? (
                                typeof selectedStep.output === 'string' ? (
                                  selectedStep.output
                                ) : (
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(selectedStep.output, null, 2)}</pre>
                                )
                              ) : (
                                <span className="text-slate-500 italic">No output recorded yet. Stage is pending execution.</span>
                              )}
                            </div>
                          </div>

                          {selectedStep.sourceReference && (
                            <div className="text-[10px] font-mono text-cyan-400/80">
                              Source: {selectedStep.sourceReference}
                            </div>
                          )}

                          {/* If step is waiting for approval */}
                          {selectedStep.status === 'WAITING_FOR_APPROVAL' && (
                            <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-950/30 flex items-center justify-between">
                              <span className="text-xs font-mono text-amber-300 font-semibold">
                                Ready for your authorization
                              </span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleApprove(activeWorkflow.workflowId, selectedStep.stepId)}
                                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition-all"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(activeWorkflow.workflowId, selectedStep.stepId)}
                                  className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-mono transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-slate-500 text-center py-10 font-mono">
                          Select a stage from the DAG list to inspect its inputs, outputs, and worker logs.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 font-mono space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No Autonomous Workflow Planned Yet</h3>
                  <p className="text-xs max-w-md mx-auto text-slate-500">
                    Type a high-level business goal above (or speak to FRIDAY) to autonomously break it down into research, strategy, content, quality audit, and safe distribution stages.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Centralized Approval Center */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Centralized Human-in-the-Loop Approval Layer</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    FRIDAY never silently publishes content, sends external messages, or executes irreversible actions without your explicit sign-off.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                  {pendingApprovals.length} Action{pendingApprovals.length === 1 ? '' : 's'} Pending
                </span>
              </div>

              {pendingApprovals.length > 0 ? (
                <div className="space-y-4">
                  {pendingApprovals.map((app) => (
                    <div
                      key={app.id}
                      className="p-5 rounded-2xl border border-amber-500/40 bg-slate-900/60 shadow-[0_4px_25px_rgba(245,158,11,0.15)] space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-5 h-5" />
                          </span>
                          <div>
                            <div className="text-xs font-mono uppercase text-amber-400 tracking-wider">
                              Action Authorization Request
                            </div>
                            <h4 className="text-sm sm:text-base font-bold text-white font-mono">{app.action}</h4>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(app.requestedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Required Disclosure Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-slate-500 block mb-0.5">WHY:</span>
                          <span className="text-slate-200">{app.why}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-slate-500 block mb-0.5">TARGET:</span>
                          <span className="text-cyan-300 font-semibold">{app.target}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
                        <span className="text-slate-500 block mb-0.5">CONTENT / PACKAGE:</span>
                        <div className="text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap">{app.content}</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
                        <span className="text-slate-500 block mb-0.5">EXPECTED RESULT:</span>
                        <span className="text-emerald-300">{app.expectedResult}</span>
                      </div>

                      {/* Control Buttons: APPROVE, REJECT, EDIT, CANCEL */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => handleReject(app.workflowId, app.stepId)}
                          disabled={isProcessing}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold transition-all"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>REJECT</span>
                        </button>

                        <button
                          onClick={() => {
                            const wf = workflowsList.find((w) => w.workflowId === app.workflowId);
                            const st = wf?.steps.find((s) => s.stepId === app.stepId);
                            if (st) {
                              setEditingStep(st);
                              setEditStepTitle(st.title);
                              setEditStepDesc(st.description);
                            }
                          }}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>EDIT</span>
                        </button>

                        <button
                          onClick={() => businessWorkflowEngine.cancelWorkflow(app.workflowId)}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>CANCEL WORKFLOW</span>
                        </button>

                        <button
                          onClick={() => handleApprove(app.workflowId, app.stepId)}
                          disabled={isProcessing}
                          className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 fill-current" />
                          <span>APPROVE ACTION</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 rounded-2xl border border-slate-800 bg-slate-950/40 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold text-white font-mono">No Actions Currently Awaiting Approval</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    All staged actions are either complete or non-sensitive. When a workflow reaches publishing or external communication, you will be prompted here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Campaign Manager */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Content Campaign Manager</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Coordinate multi-channel campaigns, track lifecycle status, duplicate, and archive.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewCampaignModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-md shadow-cyan-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Campaign</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map((camp) => (
                  <div
                    key={camp.campaignId}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-white font-mono">{camp.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                              camp.status === 'ACTIVE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : camp.status === 'PAUSED'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {camp.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{camp.objective}</p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-500">Audience:</span> {camp.audience}
                      </div>
                      <div>
                        <span className="text-slate-500">Platforms:</span> {camp.platforms.join(', ')}
                      </div>
                      <div>
                        <span className="text-slate-500">Timeline:</span> {camp.startDate} to {camp.endDate}
                      </div>
                    </div>

                    {/* Performance Indicators */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center font-mono text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 block">IMPRESSIONS</span>
                        <span className="font-bold text-cyan-300">{camp.performance.actualImpressions?.toLocaleString() ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">LEADS</span>
                        <span className="font-bold text-cyan-300">{camp.performance.leadsGenerated ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">CONVERSIONS</span>
                        <span className="font-bold text-emerald-400">{camp.performance.conversions ?? 0}</span>
                      </div>
                    </div>

                    {/* Actions: Pause, Resume, Duplicate, Archive, Report */}
                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-slate-800/60">
                      {camp.status === 'ACTIVE' ? (
                        <button
                          onClick={() => {
                            campaignManager.pauseCampaign(camp.campaignId);
                            setCampaigns(campaignManager.getCampaigns());
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono transition-all"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            campaignManager.resumeCampaign(camp.campaignId);
                            setCampaigns(campaignManager.getCampaigns());
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono transition-all"
                        >
                          Resume
                        </button>
                      )}

                      <button
                        onClick={() => {
                          campaignManager.duplicateCampaign(camp.campaignId);
                          setCampaigns(campaignManager.getCampaigns());
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-all"
                      >
                        Duplicate
                      </button>

                      <button
                        onClick={() => {
                          campaignManager.archiveCampaign(camp.campaignId);
                          setCampaigns(campaignManager.getCampaigns());
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-mono transition-all"
                      >
                        Archive
                      </button>

                      <button
                        onClick={() => {
                          const rep = campaignManager.generateCampaignReport(camp.campaignId);
                          setReportModalContent(rep);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-mono font-medium transition-all"
                      >
                        Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Business Memory */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                    <Bookmark className="w-4 h-4 text-cyan-400" />
                    <span>Structured Business Memory</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    FRIDAY's persistent recall of core company context, services, target audience, and approved strategies.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditBizName(businessMemory.businessName);
                    setEditAudience(businessMemory.targetAudience);
                    setEditVoice(businessMemory.brandVoice);
                    setIsEditingMemory(!isEditingMemory);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isEditingMemory ? 'Cancel Edit' : 'Edit Context'}</span>
                </button>
              </div>

              {isEditingMemory ? (
                <div className="p-4 rounded-2xl border border-cyan-500/40 bg-slate-900/70 space-y-3">
                  <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                    Edit Business Knowledge
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Business Name</label>
                    <input
                      type="text"
                      value={editBizName}
                      onChange={(e) => setEditBizName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={editAudience}
                      onChange={(e) => setEditAudience(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Brand Voice</label>
                    <input
                      type="text"
                      value={editVoice}
                      onChange={(e) => setEditVoice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => setIsEditingMemory(false)}
                      className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMemory}
                      className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold"
                    >
                      Save Memory
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Entity Identity</span>
                    <h4 className="text-base font-bold text-white font-mono">{businessMemory.businessName}</h4>
                    <p className="text-xs text-slate-300">
                      <span className="text-slate-500">Audience:</span> {businessMemory.targetAudience}
                    </p>
                    <p className="text-xs text-slate-300">
                      <span className="text-slate-500">Brand Voice:</span> {businessMemory.brandVoice}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Services Catalog</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {businessMemory.services.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-800 text-xs font-mono text-slate-300">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="pt-2 text-xs text-slate-400">
                      <span className="text-slate-500">Preferred Channels:</span>{' '}
                      {businessMemory.preferredPlatforms.join(', ')}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2 md:col-span-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      Approved Strategies & Historical Results
                    </span>
                    {businessMemory.approvedStrategies.length > 0 ? (
                      <div className="space-y-2">
                        {businessMemory.approvedStrategies.map((strat) => (
                          <div key={strat.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                            <div className="font-semibold text-cyan-300 font-mono">{strat.title}</div>
                            <div className="text-slate-400 mt-0.5">{strat.summary}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 font-mono py-2">
                        No approved strategies recorded yet. Workflows with approved strategies will appear here automatically.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Platform Safety Audit */}
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Social Platform Safety & Official API Verification</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  FRIDAY enforces a strict zero-hallucination policy regarding publishing. Direct broadcast is only enabled when official authorized APIs are detected.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {['YouTube', 'LinkedIn', 'Instagram', 'TikTok', 'Facebook', 'Pinterest'].map((platform) => {
                  const cap = publishingManager.getCapability(platform as any);
                  return (
                    <div
                      key={platform}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs font-mono">{platform}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cap.isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
                          }`}
                        />
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {cap.isConnected ? 'Official API Connected' : 'External Connection Required'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {cap.connectionStatusMessage || 'Metadata staging active.'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 text-xs font-mono text-cyan-200">
                <div className="font-bold mb-1">Autonomous Guardrail Guarantee:</div>
                When external connections are unconfigured, FRIDAY compiles complete ready-to-post packages (titles, scripts, optimized captions, and hashtags) and stages them cleanly with the status:
                <span className="block mt-1 font-bold text-white">
                  "Ready for publishing — external platform connection required."
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Spoken Status */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>FRIDAY Autonomous Business Engine Online</span>
          </div>
          <div>
            Active Workflows: {workflowsList.length} • Campaigns: {campaigns.length}
          </div>
        </div>
      </div>

      {/* Nested Modal: Executive Report Preview */}
      {reportModalContent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-cyan-500/40 bg-slate-950 text-slate-100 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Autonomous Business Report Preview</span>
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyText(reportModalContent)}
                  className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setReportModalContent(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs font-mono whitespace-pre-wrap text-slate-200">
              {reportModalContent}
            </div>
          </div>
        </div>
      )}

      {/* Nested Modal: Create Campaign */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-cyan-500/40 bg-slate-950 text-slate-100 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-white">Create New Marketing Campaign</h3>
              <button
                onClick={() => setShowNewCampaignModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g. 30-Day Growth Blitz"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Objective</label>
                <input
                  type="text"
                  value={newCampaignObjective}
                  onChange={(e) => setNewCampaignObjective(e.target.value)}
                  placeholder="e.g. Acquire 10 high-ticket video editing clients"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Target Audience</label>
                <input
                  type="text"
                  value={newCampaignAudience}
                  onChange={(e) => setNewCampaignAudience(e.target.value)}
                  placeholder="e.g. Founders and YouTube creators"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCampaignName.trim() || !newCampaignObjective.trim()}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nested Modal: Edit Step Details */}
      {editingStep && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-cyan-500/40 bg-slate-950 text-slate-100 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-white">Edit Stage Parameters</h3>
              <button
                onClick={() => setEditingStep(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Stage Title</label>
                <input
                  type="text"
                  value={editStepTitle}
                  onChange={(e) => setEditStepTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editStepDesc}
                  onChange={(e) => setEditStepDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none focus:border-cyan-500 resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStep(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStepEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
