import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Search,
  Briefcase,
  PenTool,
  Share2,
  MessageSquare,
  BarChart2,
  Send,
  Video,
  FileCheck,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Terminal,
  Database,
  History,
  Info,
} from 'lucide-react';
import { agentOrchestrator } from '../services/agents/AgentOrchestrator';
import { agentMemory } from '../services/agents/AgentMemory';
import {
  WorkflowPlan,
  WorkerStatusInfo,
  AgentTask,
  VerificationResult,
  AgentMemoryItem,
} from '../services/agents/AgentTypes';

interface AgentOrchestratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentOrchestratorModal: React.FC<AgentOrchestratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'workers' | 'verification' | 'logs_memory' | 'history'>('workflow');
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowPlan | null>(agentOrchestrator.getActiveWorkflow());
  const [workers, setWorkers] = useState<WorkerStatusInfo[]>(agentOrchestrator.getWorkersStatus());
  const [history, setHistory] = useState<WorkflowPlan[]>(agentOrchestrator.getWorkflowHistory());
  const [memories, setMemories] = useState<AgentMemoryItem[]>(agentMemory.getAllMemories());
  const [goalInput, setGoalInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Subscribe to live agent orchestrator events
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = agentOrchestrator.subscribe((plan) => {
      setActiveWorkflow(plan);
      setWorkers(agentOrchestrator.getWorkersStatus());
      setHistory(agentOrchestrator.getWorkflowHistory());
      setMemories(agentMemory.getAllMemories());
    });

    const interval = setInterval(() => {
      setWorkers(agentOrchestrator.getWorkersStatus());
      setMemories(agentMemory.getAllMemories());
    }, 1500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartGoal = async (targetGoal?: string) => {
    const goal = (targetGoal || goalInput).trim();
    if (!goal) return;
    setIsSubmitting(true);
    try {
      await agentOrchestrator.orchestrateGoal(goal);
      setGoalInput('');
    } catch (err) {
      console.error('Failed to orchestrate goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = () => {
    agentOrchestrator.pauseWorkflow();
    setActiveWorkflow(agentOrchestrator.getActiveWorkflow());
  };

  const handleResume = async () => {
    await agentOrchestrator.resumeWorkflow();
    setActiveWorkflow(agentOrchestrator.getActiveWorkflow());
  };

  const handleCancel = () => {
    agentOrchestrator.cancelWorkflow();
    setActiveWorkflow(agentOrchestrator.getActiveWorkflow());
  };

  const handleApprove = async (taskId: string, approved: boolean) => {
    await agentOrchestrator.approveTask(taskId, approved);
    setActiveWorkflow(agentOrchestrator.getActiveWorkflow());
  };

  const getWorkerIcon = (workerType: string) => {
    const t = workerType.toLowerCase();
    if (t.includes('research')) return <Search className="w-4 h-4 text-cyan-400" />;
    if (t.includes('bi') || t.includes('intelligence')) return <Briefcase className="w-4 h-4 text-amber-400" />;
    if (t.includes('content')) return <PenTool className="w-4 h-4 text-violet-400" />;
    if (t.includes('linkedin')) return <Share2 className="w-4 h-4 text-blue-400" />;
    if (t.includes('social')) return <Share2 className="w-4 h-4 text-pink-400" />;
    if (t.includes('engagement')) return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    if (t.includes('analytics')) return <BarChart2 className="w-4 h-4 text-teal-400" />;
    if (t.includes('publishing')) return <Send className="w-4 h-4 text-indigo-400" />;
    if (t.includes('media')) return <Video className="w-4 h-4 text-orange-400" />;
    if (t.includes('verify') || t.includes('verification')) return <FileCheck className="w-4 h-4 text-emerald-400" />;
    return <Cpu className="w-4 h-4 text-slate-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'in_progress':
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse">
            <Cpu className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case 'waiting_for_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-3 h-3 animate-bounce" /> Awaiting Approval
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
            <Pause className="w-3 h-3" /> Paused
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  const getVerificationBadge = (grade?: string) => {
    switch (grade) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> GRADE: PASS
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> GRADE: NEEDS REVIEW
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <XCircle className="w-4 h-4 text-rose-400" /> GRADE: FAILED
          </span>
        );
      default:
        return null;
    }
  };

  // Find verification task output if available
  const verificationTask = activeWorkflow?.tasks.find((t) => t.workerType.includes('verify'));
  const verificationResult: VerificationResult | null = verificationTask?.output?.verification || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-950 border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.15)] overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Bot className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  FRIDAY AGENT ORCHESTRATION & WORKER ENGINE
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  PART 9
                </span>
              </div>
              <p className="text-xs text-slate-400">
                10 Specialized AI Workers • DAG Task Decomposition • Human Approval Checkpoints
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {activeWorkflow && getStatusBadge(activeWorkflow.status)}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Goal Orchestration Bar */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/60 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartGoal()}
              placeholder="Enter high-level goal, e.g. 'Research AI productivity market and build complete LinkedIn & YouTube content strategy'"
              className="w-full pl-4 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
            <Sparkles className="absolute right-3 top-3 w-4 h-4 text-cyan-400/60 pointer-events-none" />
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => handleStartGoal()}
              disabled={isSubmitting || !goalInput.trim()}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSubmitting ? 'Decomposing...' : 'Orchestrate Goal'}</span>
            </button>
            {activeWorkflow?.status === 'running' && (
              <button
                onClick={handlePause}
                title="Pause Workflow"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-yellow-500/30 transition-colors"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {activeWorkflow?.status === 'paused' && (
              <button
                onClick={handleResume}
                title="Resume Workflow"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            {activeWorkflow && (activeWorkflow.status === 'running' || activeWorkflow.status === 'paused' || activeWorkflow.status === 'waiting_for_approval') && (
              <button
                onClick={handleCancel}
                title="Cancel Workflow"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Sample Goals Bar */}
        <div className="px-6 py-2 bg-slate-950/60 border-b border-slate-900 flex items-center space-x-2 overflow-x-auto text-[11px] text-slate-400 scrollbar-none">
          <span className="font-mono text-cyan-400 uppercase tracking-wider text-[10px] shrink-0">Sample Pipelines:</span>
          <button
            onClick={() => handleStartGoal('Research AI SaaS market and create 7-day multi-platform content roadmap')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            📊 Market Scan & 7-Day Strategy
          </button>
          <button
            onClick={() => handleStartGoal('Conduct competitor analysis, draft LinkedIn thought leadership carousel, and prepare publishing package')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            💼 LinkedIn Thought Leadership & Publishing
          </button>
          <button
            onClick={() => handleStartGoal('Repurpose YouTube script across Instagram, TikTok, and Pinterest with quality audit')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            🔄 Omnichannel Repurposing & Verification
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800/80 bg-slate-900/40 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'workflow'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Active Workflow & DAG Graph</span>
            {activeWorkflow && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800">
                {activeWorkflow.tasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('workers')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'workers'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Specialized Workers Matrix (10)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {workers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'verification'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verification & Quality Audit</span>
            {activeWorkflow?.verificationGrade && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-emerald-400">
                {activeWorkflow.verificationGrade}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs_memory')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'logs_memory'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Logs & Shared Agent Memory</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
              {memories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Workflow History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
              {history.length}
            </span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: WORKFLOW & DAG GRAPH */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {!activeWorkflow ? (
                <div className="py-16 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80">
                  <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-300 mb-1">
                    No Active Orchestration Workflow
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                    Enter a business, content, or research goal above to trigger FRIDAY's Goal Analyzer,
                    Task Planner, and DAG Worker Execution Pipeline.
                  </p>
                  <button
                    onClick={() => handleStartGoal('Execute complete marketing & business intelligence workflow')}
                    className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors"
                  >
                    Launch Demo Workflow
                  </button>
                </div>
              ) : (
                <>
                  {/* Workflow Overview Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                          Goal Directive
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {activeWorkflow.goal}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {getVerificationBadge(activeWorkflow.verificationGrade)}
                        {getStatusBadge(activeWorkflow.status)}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-slate-400">
                        <span>Pipeline Progress</span>
                        <span>{activeWorkflow.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-500 rounded-full"
                          style={{ width: `${activeWorkflow.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Spoken Voice Summary Preview */}
                    <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start space-x-3">
                      <Bot className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">
                          FRIDAY Voice Status
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 italic">
                          "{agentOrchestrator.generateVoiceSummary(activeWorkflow)}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pending Approval Banner if any task awaits approval */}
                  {activeWorkflow.tasks.some((t) => t.status === 'waiting_for_approval') && (
                    <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] space-y-3">
                      <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 animate-bounce" />
                        <span>HUMAN APPROVAL REQUIRED (SAFETY CHECKPOINT)</span>
                      </div>
                      <p className="text-xs text-amber-200/90 leading-relaxed">
                        In accordance with FRIDAY's Autonomous Safety Rules, external publishing, sensitive communications,
                        or high-impact strategy actions cannot execute without your explicit review and confirmation.
                      </p>
                      {activeWorkflow.tasks
                        .filter((t) => t.status === 'waiting_for_approval')
                        .map((task) => (
                          <div
                            key={task.id}
                            className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white text-xs">{task.title}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {task.workerType}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">{task.description}</p>
                              {task.approvalDetails && (
                                <p className="text-[11px] text-cyan-300 font-mono">
                                  Action: {task.approvalDetails.action} — {task.approvalDetails.summary}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <button
                                onClick={() => handleApprove(task.id, true)}
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve & Execute</span>
                              </button>
                              <button
                                onClick={() => handleApprove(task.id, false)}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-colors flex items-center space-x-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* DAG Tasks List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                        Directed Acyclic Graph (DAG) Tasks ({activeWorkflow.tasks.length})
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Sequential & parallel execution managed by AgentExecutionQueue
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {activeWorkflow.tasks.map((task, index) => {
                        const isExpanded = selectedTask?.id === task.id;
                        return (
                          <div
                            key={task.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              task.status === 'in_progress'
                                ? 'bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                                : task.status === 'waiting_for_approval'
                                ? 'bg-amber-950/20 border-amber-500/40'
                                : task.status === 'completed'
                                ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                                : 'bg-slate-950/40 border-slate-900 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-slate-300">
                                  {index + 1}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {getWorkerIcon(task.workerType)}
                                  <span className="text-xs font-bold text-white tracking-wide">
                                    {task.title}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                  {task.workerType}
                                </span>
                                {task.dependencies.length > 0 && (
                                  <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                                    Depends on: {task.dependencies.length} tasks
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                {getStatusBadge(task.status)}
                                <button
                                  onClick={() => setSelectedTask(isExpanded ? null : task)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                >
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-slate-400 mt-2 pl-10">
                              {task.description}
                            </p>

                            {/* Expanded Details Pane */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs pl-10">
                                {task.input && Object.keys(task.input).length > 0 && (
                                  <div>
                                    <span className="font-mono text-cyan-400 text-[10px] uppercase font-semibold">
                                      Task Input Parameters:
                                    </span>
                                    <pre className="p-3 mt-1 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                                      {JSON.stringify(task.input, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {task.output && (
                                  <div>
                                    <span className="font-mono text-emerald-400 text-[10px] uppercase font-semibold">
                                      Worker Deliverable Output:
                                    </span>
                                    <pre className="p-3 mt-1 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-60">
                                      {JSON.stringify(task.output, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {task.artifacts && task.artifacts.length > 0 && (
                                  <div>
                                    <span className="font-mono text-violet-400 text-[10px] uppercase font-semibold">
                                      Generated Deliverable Artifacts ({task.artifacts.length}):
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                      {task.artifacts.map((art) => (
                                        <div
                                          key={art.id}
                                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                                        >
                                          <div>
                                            <div className="font-medium text-slate-200 text-xs">{art.name}</div>
                                            <div className="text-[10px] font-mono text-slate-500">{art.type}</div>
                                          </div>
                                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/30">
                                            Ready
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: SPECIALIZED WORKERS MATRIX (10) */}
          {activeTab === 'workers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Specialized Worker Fleet (10 Workers)</h3>
                  <p className="text-xs text-slate-400">
                    Each worker has a designated responsibility domain and dedicated capability registry.
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Active in Orchestrator: <span className="text-cyan-400 font-bold">{workers.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                          {getWorkerIcon(worker.id)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{worker.name}</h4>
                          <span className="text-[10px] font-mono text-slate-500">{worker.id}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                          worker.status === 'busy'
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {worker.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {worker.description}
                    </p>

                    <div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase mb-1.5">
                        Capabilities & Tools:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {worker.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Tasks Handled:</span>
                      <span className="text-emerald-400 font-bold">{worker.tasksCompleted} completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: VERIFICATION & QUALITY AUDIT */}
          {activeTab === 'verification' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    Verification Worker Quality Audit
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Deliverable Validation & Safety Screening
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Audits field completeness, checks factual claims, detects unsupported hype, and ensures publishing honesty.
                  </p>
                </div>
                {getVerificationBadge(activeWorkflow?.verificationGrade || 'PASS')}
              </div>

              {verificationResult ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Passed Checks */}
                  <div className="p-5 rounded-2xl bg-emerald-950/10 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified & Passed Criteria ({verificationResult.passedChecks.length})</span>
                    </div>
                    <ul className="space-y-2 text-xs text-emerald-200/80">
                      {verificationResult.passedChecks.map((check, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{check}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warnings & Unsupported Claims */}
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-amber-950/10 border border-amber-500/20 space-y-3">
                      <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Notices & Warnings ({verificationResult.warnings.length})</span>
                      </div>
                      {verificationResult.warnings.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No warnings issued.</p>
                      ) : (
                        <ul className="space-y-2 text-xs text-amber-200/80">
                          {verificationResult.warnings.map((warn, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>{warn}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <div className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                        Verification Recommendation
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{verificationResult.recommendation}"
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80">
                  <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    Verification Worker will generate a formal audit grade once workflow tasks execute.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LOGS & SHARED AGENT MEMORY */}
          {activeTab === 'logs_memory' && (
            <div className="space-y-6">
              {/* Live DAG Execution Logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                    Orchestrator Execution Logs
                  </h4>
                  <span className="text-[11px] text-slate-500">Live DAG trace events</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs max-h-64 overflow-y-auto space-y-1.5">
                  {(!activeWorkflow?.executionLogs || activeWorkflow.executionLogs.length === 0) ? (
                    <div className="text-slate-600 italic">No execution logs recorded yet.</div>
                  ) : (
                    activeWorkflow.executionLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-[11px]">
                        <span className="text-slate-500 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`font-semibold shrink-0 uppercase ${
                            log.level === 'error'
                              ? 'text-rose-400'
                              : log.level === 'warn'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          [{log.level}]
                        </span>
                        <span className="text-slate-300">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Shared Agent Memory */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                      Shared Agent Memory Cache ({memories.length})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Cross-worker contextual memory shared among all 10 specialized workers.
                    </p>
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="business_context">Business Context</option>
                    <option value="research_summary">Research Summary</option>
                    <option value="approved_strategy">Approved Strategy</option>
                    <option value="content_preference">Content Preference</option>
                    <option value="performance_insight">Performance Insight</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {memories
                    .filter((m) => filterCategory === 'all' || m.category === filterCategory)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                          {item.content}
                        </p>
                        <div className="text-[10px] font-mono text-slate-600">
                          Updated: {new Date(item.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WORKFLOW HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Archived Orchestration Workflows</h3>
                <span className="text-xs text-slate-400">Total: {history.length}</span>
              </div>

              {history.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80">
                  <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No completed workflows in history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((wf) => (
                    <div
                      key={wf.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{wf.goal}</span>
                          {getStatusBadge(wf.status)}
                          {getVerificationBadge(wf.verificationGrade)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {wf.tasks.length} tasks executed • Created {new Date(wf.createdAt).toLocaleString()}
                        </div>
                        {wf.summaryReport && (
                          <p className="text-xs text-slate-300 italic max-w-xl">
                            "{wf.summaryReport}"
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        <button
                          onClick={() => {
                            setActiveWorkflow(wf);
                            setActiveTab('workflow');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium transition-colors"
                        >
                          View DAG & Deliverables
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Status Bar */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Orchestrator Online</span>
            </span>
            <span>•</span>
            <span>10 Workers Ready</span>
            <span>•</span>
            <span>Safety Checkpoints Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
