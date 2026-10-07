import React, { useState, useEffect } from 'react';
import { FridayState } from '../types/friday';
import { Info, Bookmark, Smartphone, Briefcase, Bot, Building2, Compass } from 'lucide-react';
import { androidBridge } from '../services/AndroidBridge/AndroidBridge';
import { businessWorkflowEngine } from '../services/BusinessWorkflowEngine';
import fridayLogo from '../assets/images/friday_ai_logo_1791304809584.jpg';

interface StateIndicatorProps {
  state: FridayState;
  taskCount?: number;
  onOpenSettings: () => void;
  onOpenArchives?: () => void;
  onOpenDeviceControl?: () => void;
  onOpenBusinessDashboard?: () => void;
  onOpenAgentOrchestrator?: () => void;
  onOpenBusinessWorkflowManager?: () => void;
  onOpenLiveResults?: () => void;
  onOpenWorld?: () => void;
}

export const StateIndicator: React.FC<StateIndicatorProps> = ({
  state,
  taskCount = 0,
  onOpenSettings,
  onOpenArchives,
  onOpenDeviceControl,
  onOpenBusinessDashboard,
  onOpenAgentOrchestrator,
  onOpenBusinessWorkflowManager,
  onOpenLiveResults,
  onOpenWorld,
}) => {
  const [isNativeDevice, setIsNativeDevice] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    setIsNativeDevice(androidBridge.isAvailable());
    const unsub = businessWorkflowEngine.subscribeApprovals((approvals) => {
      setPendingApprovalsCount(approvals.length);
    });
    return () => unsub();
  }, []);

  const getStatusBadge = () => {
    switch (state) {
      case 'speaking':
        return {
          label: 'FRIDAY SPEAKING',
          dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse',
          badge: 'text-rose-300 border-rose-500/40 bg-rose-950/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
        };
      case 'listening':
        return {
          label: 'LISTENING',
          dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-ping',
          badge: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]',
        };
      case 'thinking':
        return {
          label: 'THINKING',
          dot: 'bg-indigo-400 animate-spin',
          badge: 'text-indigo-300 border-indigo-500/40 bg-indigo-950/40',
        };
      case 'connecting':
        return {
          label: 'CONNECTING',
          dot: 'bg-blue-400 animate-pulse',
          badge: 'text-blue-300 border-blue-500/40 bg-blue-950/40',
        };
      case 'disconnected':
      default:
        return {
          label: 'STANDBY',
          dot: 'bg-slate-500',
          badge: 'text-slate-400 border-slate-800 bg-slate-900/60',
        };
    }
  };

  const status = getStatusBadge();

  return (
    <header className="w-full max-w-2xl mx-auto px-3 sm:px-6 pt-3 pb-2 z-20 flex flex-wrap items-center justify-between gap-2 min-w-0">
      {/* Brand */}
      <div className="flex items-center space-x-2 shrink-0 min-w-0">
        <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-slate-950 border border-cyan-400/40 shadow-[0_0_14px_rgba(6,182,212,0.35)] shrink-0">
          <img
            src={fridayLogo}
            alt="FRIDAY AI Core Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-bold tracking-widest text-slate-100 font-mono leading-tight">
            FRIDAY
          </h1>
          <span className="text-[8px] sm:text-[9px] font-mono uppercase text-slate-400 tracking-wider block leading-tight">
            AI Assistant
          </span>
        </div>
      </div>

      {/* Minimal State Pill & Info trigger */}
      <div className="flex items-center flex-wrap justify-end gap-1.5 min-w-0 max-w-full">
        {onOpenWorld && (
          <button
            onClick={onOpenWorld}
            title="Enter FRIDAY World (Agent Town & Workspace — Part 11)"
            className="shrink-0 flex items-center space-x-1 px-2.5 py-1 rounded-full border border-cyan-400 bg-gradient-to-r from-cyan-950 via-cyan-900 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-200 hover:text-white font-mono text-[10px] sm:text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.45)] ring-1 ring-cyan-400/50 transition-all active:scale-95 cursor-pointer z-30"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-[spin_8s_linear_infinite]" />
            <span>WORLD</span>
          </button>
        )}

        <div
          className={`shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md transition-all duration-300 ${status.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className="text-[9px] sm:text-[10px] font-mono font-semibold tracking-widest">
            {status.label}
          </span>
        </div>

        {onOpenLiveResults && (
          <button
            onClick={onOpenLiveResults}
            title="Part 14 Live Mobile Execution & Results Workspace"
            className="shrink-0 flex items-center space-x-1 px-2.5 py-1 rounded-xl border border-emerald-500/50 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 hover:text-white font-mono text-[10px] font-bold tracking-wider transition-all cursor-pointer"
          >
            <span>LIVE RESULTS</span>
          </button>
        )}

        {onOpenArchives && (
          <button
            onClick={onOpenArchives}
            title="FRIDAY Archives (Tasks & Reminders)"
            className="shrink-0 relative p-1.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {taskCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            )}
          </button>
        )}

        {onOpenBusinessDashboard && (
          <button
            onClick={onOpenBusinessDashboard}
            title="Business Intelligence & Strategy"
            className="shrink-0 p-1.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
          >
            <Briefcase className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenBusinessWorkflowManager && (
          <button
            onClick={onOpenBusinessWorkflowManager}
            title="FRIDAY Autonomous Business Manager & Workflow Engine (Part 10)"
            className="shrink-0 relative p-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-cyan-100 transition-all focus:outline-none shadow-[0_0_10px_rgba(6,182,212,0.25)]"
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-950 shadow-[0_0_6px_#fbbf24] animate-bounce" />
            )}
          </button>
        )}

        {onOpenAgentOrchestrator && (
          <button
            onClick={onOpenAgentOrchestrator}
            title="Agent & Worker Orchestration (Part 9)"
            className="shrink-0 p-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-cyan-200 transition-all focus:outline-none shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          >
            <Bot className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenDeviceControl && (
          <button
            onClick={onOpenDeviceControl}
            title={`Device Control (${isNativeDevice ? 'Android Native Connected' : 'Preview / Simulated'})`}
            className="shrink-0 relative p-1.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                isNativeDevice
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-amber-400/80'
              }`}
            />
          </button>
        )}

        <button
          onClick={onOpenSettings}
          title="About FRIDAY"
          className="shrink-0 p-1.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
