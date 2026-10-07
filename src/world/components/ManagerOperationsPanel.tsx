/**
 * PART 13 — FRIDAY CEO & Operations Command Panel
 * Dedicated operations view for Hermes (CEO/Manager), Chronos (Planner),
 * live DAG task breakdowns, approval requests, and workflow timelines.
 */

import React, { useState, useEffect } from 'react';
import { managerEngine } from '../manager/ManagerEngine';
import { approvalGate } from '../manager/ApprovalGate';
import { workerTaskQueue } from '../manager/WorkerTaskQueue';
import {
  ManagerDashboardData,
  DAGTask,
  ApprovalRequest,
  TimelineEvent,
} from '../manager/ManagerTypes';
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Zap,
  ChevronRight,
  ArrowRight,
  Send,
  Layers,
  Sparkles,
  RefreshCw,
  Cpu,
  UserCheck,
} from 'lucide-react';

interface ManagerOperationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagerOperationsPanel: React.FC<ManagerOperationsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [dashboard, setDashboard] = useState<ManagerDashboardData>(managerEngine.getDashboardData());
  const [goalInput, setGoalInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'DAG' | 'TIMELINE' | 'APPROVALS'>('DAG');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setDashboard(managerEngine.getDashboardData());
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const triggerFeedback = (text: string) => {
    setFeedback(text);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDispatchGoal = async (goalToRun?: string) => {
    const text = (goalToRun || goalInput).trim();
    if (!text) return;

    setIsExecuting(true);
    triggerFeedback(`Dispatched goal to Hermes (CEO/Manager): "${text}"`);
    try {
      await managerEngine.executeGoal(text);
      setDashboard(managerEngine.getDashboardData());
      triggerFeedback(`Workflow completed under executive review!`);
    } catch (e: any) {
      triggerFeedback(`Workflow execution notice: ${e.message}`);
    } finally {
      setIsExecuting(false);
      setGoalInput('');
    }
  };

  const handleRunDemoScenario = () => {
    handleDispatchGoal('Analyze a hypothetical business opportunity in AI video editing.');
  };

  const handleApprove = (reqId: string) => {
    approvalGate.approve(reqId, 'Approved in Manager Operations Panel');
    setDashboard(managerEngine.getDashboardData());
    triggerFeedback('Approval granted. Worker execution proceeding.');
  };

  const handleReject = (reqId: string) => {
    approvalGate.reject(reqId, 'Rejected in Manager Operations Panel');
    setDashboard(managerEngine.getDashboardData());
    triggerFeedback('Action rejected by user.');
  };

  const handleCancelApproval = (reqId: string) => {
    approvalGate.cancel(reqId);
    setDashboard(managerEngine.getDashboardData());
    triggerFeedback('Approval request cancelled.');
  };

  const handleRetryTask = (workflowId: string, taskId: string) => {
    workerTaskQueue.retryTask(workflowId, taskId);
    setDashboard(managerEngine.getDashboardData());
    triggerFeedback('Task scheduled for retry.');
  };

  const handleTogglePause = () => {
    if (workerTaskQueue.isQueuePaused()) {
      workerTaskQueue.resume();
      triggerFeedback('Workflow execution resumed.');
    } else {
      workerTaskQueue.pause();
      triggerFeedback('Workflow execution paused.');
    }
    setDashboard(managerEngine.getDashboardData());
  };

  const currentWf = dashboard.currentWorkflow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-mono select-none">
      <div className="relative w-full max-w-6xl h-[92vh] rounded-3xl border border-cyan-500/40 bg-[#030714] text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden">
        {/* TOP COMMAND STRIP */}
        <header className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-cyan-500/30 bg-slate-950/95 shrink-0 min-w-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <h2 className="text-xs sm:text-base font-black tracking-widest text-white uppercase break-words">
                  FRIDAY CEO / MANAGER OPERATIONS
                </h2>
                <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-extrabold uppercase shrink-0">
                  PART 13
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold hidden sm:inline shrink-0">
                  HERMES & CHRONOS ACTIVE
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                CEO Triage • Planner DAG Decomposition • Parallel Execution • Astra Verification
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 ml-auto">
            {/* Quick Demo Workflow Button */}
            <button
              onClick={handleRunDemoScenario}
              disabled={isExecuting}
              title="Dispatch Deterministic Test Scenario (Analyze AI Video Editing Market)"
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl border border-cyan-400/80 bg-gradient-to-r from-cyan-950 via-cyan-900/60 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-200 hover:text-white font-bold text-[10px] sm:text-[11px] tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">RUN DEMO SCENARIO</span>
              <span className="sm:hidden">DEMO</span>
            </button>

            {/* Pause / Resume Button */}
            <button
              onClick={handleTogglePause}
              title={workerTaskQueue.isQueuePaused() ? 'Resume Queue' : 'Pause Queue'}
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs flex items-center space-x-1 cursor-pointer shrink-0"
            >
              {workerTaskQueue.isQueuePaused() ? (
                <Play className="w-4 h-4 text-emerald-400" />
              ) : (
                <Pause className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close Operations Panel (Return to Agent Town)"
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* FEEDBACK TOAST */}
        {feedback && (
          <div className="px-4 py-2 bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-cyan-950/90 border-b border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between shrink-0 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-[10px]">
              DISMISS
            </button>
          </div>
        )}

        {/* 1. OPERATIONS DASHBOARD STATS (6 COUNTERS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-slate-950/80 border-b border-cyan-500/20 shrink-0 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-cyan-500/20">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">ACTIVE WORKFLOWS</span>
            <span className="text-lg font-black text-cyan-300">{dashboard.activeWorkflows}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-emerald-500/20">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">ACTIVE WORKERS</span>
            <span className="text-lg font-black text-emerald-300">{dashboard.activeWorkers} / 17</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-amber-500/20">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">WAITING TASKS</span>
            <span className="text-lg font-black text-amber-300">{dashboard.waitingTasks}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-rose-500/20">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">FAILED TASKS</span>
            <span className={`text-lg font-black ${dashboard.failedTasks > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
              {dashboard.failedTasks}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-indigo-500/20">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">WAITING APPROVAL</span>
            <span className={`text-lg font-black ${dashboard.waitingApproval > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
              {dashboard.waitingApproval}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-cyan-500/20">
            <span className="text-[9px] text-slate-400 font-bold uppercase block">COMPLETED TASKS</span>
            <span className="text-lg font-black text-cyan-400">{dashboard.completedTasks}</span>
          </div>
        </div>

        {/* 2. GOAL DISPATCHER INPUT */}
        <div className="p-3 border-b border-slate-800/80 bg-[#040818] shrink-0 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDispatchGoal();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Assign high-level goal to Hermes (e.g. 'Research AI video editing market and prepare business opportunity report')..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <button
              type="submit"
              disabled={!goalInput.trim() || isExecuting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>DISPATCH</span>
            </button>
          </form>
        </div>

        {/* 3. TABS: DAG WORKFLOW | TIMELINE | APPROVALS */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2 text-xs shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('DAG')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                activeTab === 'DAG'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TASK GRAPH / DAG ({currentWf ? currentWf.tasks.length : 0})
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                activeTab === 'TIMELINE'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LIVE TIMELINE ({dashboard.timeline.length})
            </button>
            <button
              onClick={() => setActiveTab('APPROVALS')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                activeTab === 'APPROVALS'
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              APPROVAL GATE ({dashboard.activeApprovals.length})
            </button>
          </div>

          {currentWf && (
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="text-slate-400">Progress:</span>
              <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${currentWf.progressPercent}%` }}
                />
              </div>
              <span className="font-bold text-cyan-300">{currentWf.progressPercent}%</span>
            </div>
          )}
        </div>

        {/* 4. MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#020510] scrollbar-thin scrollbar-thumb-cyan-500/20">
          {/* TAB A: TASK GRAPH / DAG */}
          {activeTab === 'DAG' && (
            <div className="space-y-4">
              {currentWf ? (
                <>
                  {/* Current Goal Header */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-[10px]">
                        <span className="font-bold text-cyan-400">WORKFLOW: {currentWf.workflowId}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">EXECUTION: {currentWf.executionMode}</span>
                        <span className="text-slate-600">•</span>
                        <span
                          className={`font-bold ${
                            currentWf.status === 'COMPLETED'
                              ? 'text-emerald-400'
                              : currentWf.status === 'RUNNING'
                              ? 'text-cyan-400 animate-pulse'
                              : currentWf.status === 'WAITING_APPROVAL'
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          STATUS: {currentWf.status}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white">{currentWf.goal}</h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 block">Deliverable</span>
                      <span className="text-[11px] font-bold text-emerald-400">{currentWf.analysis.expectedOutput}</span>
                    </div>
                  </div>

                  {/* DAG Tasks List */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Decomposed Task Graph ({currentWf.tasks.length} steps)
                    </div>

                    {currentWf.tasks.map((task, idx) => {
                      const isComplete = task.status === 'COMPLETED';
                      const isRunning = task.status === 'RUNNING';
                      const isWaitingAppr = task.status === 'WAITING_APPROVAL';
                      const isVerifying = task.status === 'VERIFYING';
                      const isFailed = task.status === 'FAILED';

                      return (
                        <div
                          key={task.id}
                          className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
                            isRunning
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                              : isWaitingAppr
                              ? 'bg-amber-950/30 border-amber-500/50'
                              : isVerifying
                              ? 'bg-indigo-950/30 border-indigo-500/50'
                              : isComplete
                              ? 'bg-slate-900/50 border-emerald-500/30'
                              : isFailed
                              ? 'bg-rose-950/30 border-rose-500/50'
                              : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-white text-xs">{task.title}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-bold">
                                {task.workerName} ({task.role})
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              {isFailed && (
                                <button
                                  onClick={() => handleRetryTask(currentWf.workflowId, task.id)}
                                  className="px-2 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 text-[9px] font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  <span>RETRY</span>
                                </button>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  isComplete
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                    : isRunning
                                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 animate-pulse'
                                    : isWaitingAppr
                                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                    : isVerifying
                                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                                    : isFailed
                                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                    : 'bg-slate-900 text-slate-400'
                                }`}
                              >
                                {task.status}
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-relaxed pl-7">{task.description}</p>

                          {/* Task Dependencies & Verification Badges */}
                          <div className="flex flex-wrap items-center justify-between pl-7 text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                            <div className="flex items-center space-x-2">
                              <span>Prerequisites: {task.dependencies.length > 0 ? `${task.dependencies.length} tasks` : 'None (Stage 1)'}</span>
                              {task.verification && (
                                <span className="text-emerald-400 font-semibold">
                                  ✓ Astra Verified ({task.verification.score}/100)
                                </span>
                              )}
                              {task.review && (
                                <span className="text-cyan-400 font-semibold">
                                  ✓ Athena Reviewed ({task.review.qualityScore}/100)
                                </span>
                              )}
                            </div>
                            <span>Priority: {task.priority}</span>
                          </div>

                          {/* Output Preview */}
                          {task.result?.summary && (
                            <div className="ml-7 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                              <span className="text-cyan-400 font-bold block mb-0.5">Result Summary:</span>
                              {task.result.summary}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Final Executive Synthesis if completed */}
                  {currentWf.finalSummary && (
                    <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-2 text-xs">
                      <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>Executive Briefing from Hermes (CEO / Manager)</span>
                      </div>
                      <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {currentWf.finalSummary}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-cyan-400/60" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      No active workflow yet.
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Submit a high-level goal or run the demo scenario above to witness the CEO → Planner → Worker operating system in action.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB B: LIVE TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">
                Real-Time Operational Milestones ({dashboard.timeline.length})
              </div>

              {dashboard.timeline.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No events recorded yet.</div>
              ) : (
                dashboard.timeline.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      evt.level === 'success'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : evt.level === 'warn'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : evt.level === 'error'
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-cyan-400">{evt.actor}</span>
                      <span className="text-slate-500">{evt.timeFormatted}</span>
                    </div>
                    <div className="font-semibold text-white">{evt.action}</div>
                    <div className="text-[10px] opacity-80 whitespace-pre-wrap">{evt.details}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB C: APPROVAL GATE */}
          {activeTab === 'APPROVALS' && (
            <div className="space-y-3">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">
                Human-in-the-Loop Approval Queue ({dashboard.activeApprovals.length})
              </div>

              {dashboard.activeApprovals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  All sensitive tasks clear. No pending human approvals required.
                </div>
              ) : (
                dashboard.activeApprovals.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/50 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-amber-300 text-sm">{req.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                        RISK: {req.riskLevel}
                      </span>
                    </div>

                    <p className="text-slate-200 text-xs leading-relaxed">{req.description}</p>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-amber-500/20">
                      <button
                        onClick={() => handleCancelApproval(req.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-500/50 bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold text-xs cursor-pointer"
                      >
                        REJECT
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-4 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer"
                      >
                        APPROVE EXECUTION
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
