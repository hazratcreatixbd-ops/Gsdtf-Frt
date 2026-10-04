import React, { useState, useEffect } from 'react';
import { FridayState } from '../../types/friday';
import { WorkerEntity } from '../types/WorldTypes';
import { workerRegistry } from '../workers/WorkerRegistry';
import { businessWorkflowEngine } from '../../services/BusinessWorkflowEngine';
import { BusinessWorkflow } from '../../types/workflowEngine';
import { WorldCore } from './WorldCore';
import { SystemModules } from './SystemModules';
import { WorkerBar } from './WorkerBar';
import { AgentTown } from './AgentTown';
import { WorkerDetailModal } from './WorkerDetailModal';
import { VoiceAgentNotesPanel } from './VoiceAgentNotesPanel';
import { LeftInfoPanel } from './LeftInfoPanel';
import { MissionBanner } from './MissionBanner';
import { WorldMemoryModal } from './WorldMemoryModal';
import { ManagerOperationsPanel } from './ManagerOperationsPanel';
import { X, Activity, MessageSquare, Building2, LayoutGrid, Radio, Bookmark, Cpu } from 'lucide-react';
import { androidBridge } from '../../services/AndroidBridge/AndroidBridge';

interface WorldShellProps {
  state: FridayState;
  isMuted: boolean;
  userVolume: number;
  fridayVolume: number;
  onExitWorld: () => void;
  onCoreClick: () => void;
  onToggleMute: () => void;
  onSendText: (text: string) => void;
  onOpenSettings?: () => void;
  onOpenBusinessWorkflowManager?: () => void;
  onOpenLiveResults?: () => void;
}

type WorkspaceViewMode = 'town' | 'intel' | 'voice' | 'panorama';

export const WorldShell: React.FC<WorldShellProps> = ({
  state,
  isMuted,
  userVolume,
  fridayVolume,
  onExitWorld,
  onCoreClick,
  onToggleMute,
  onSendText,
  onOpenSettings,
  onOpenBusinessWorkflowManager,
  onOpenLiveResults,
}) => {
  const [workers, setWorkers] = useState<WorkerEntity[]>(workerRegistry.getAllWorkers());
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('worker-manager');
  const [selectedWorkerForModal, setSelectedWorkerForModal] = useState<WorkerEntity | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<BusinessWorkflow | null>(
    businessWorkflowEngine.getActiveWorkflow()
  );
  const [activeViewMode, setActiveViewMode] = useState<WorkspaceViewMode>('town');
  const [isMemoryCoreOpen, setIsMemoryCoreOpen] = useState(false);
  const [isManagerPanelOpen, setIsManagerPanelOpen] = useState(false);

  useEffect(() => {
    // Notify native android wrapper to switch to landscape where supported
    if (androidBridge.isAvailable()) {
      androidBridge.postMessage({
        action: 'set_orientation',
        orientation: 'landscape',
      });
    }

    const unsubWorkflow = businessWorkflowEngine.subscribe((wf) => {
      setActiveWorkflow(wf);
      setWorkers([...workerRegistry.getAllWorkers()]);
    });

    return () => {
      unsubWorkflow();
      if (androidBridge.isAvailable()) {
        androidBridge.postMessage({
          action: 'set_orientation',
          orientation: 'portrait',
        });
      }
    };
  }, []);

  const handleSelectWorker = (id: string) => {
    setSelectedWorkerId(id);
    workerRegistry.selectWorker(id);
    const found = workerRegistry.getWorker(id);
    if (found) {
      setSelectedWorkerForModal(found);
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#020510] text-slate-100 font-sans overflow-hidden flex flex-col select-none">
      {/* Futuristic Background Atmospheric Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0, 195, 255, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.25) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* TOP COMMAND BRIDGE: FRIDAY Brand, System Modules, Core HUD, Mission, and Top-Right X Exit Button */}
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-4 py-2 border-b border-cyan-500/25 bg-slate-950/90 backdrop-blur-md shrink-0 gap-2">
        {/* Left: Brand & World Badge */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="flex items-center space-x-2 font-mono">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs sm:text-sm font-black tracking-widest text-white">FRIDAY WORLD</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase tracking-wider hidden xs:inline">
                  AGENT TOWN
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono hidden sm:inline">
                {workers.length} / {workers.length} STATIONS ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Center: System Modules ([MEMORY] [SKILLS] [SOUL] [SETTINGS]) + Central FRIDAY AI Core HUD */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* 1. System Modules (Memory / Skills / Soul / Settings) */}
          <div className="flex items-center shrink-0">
            <SystemModules
              onOpenSettings={onOpenSettings}
              onOpenMemory={() => setIsMemoryCoreOpen(true)}
            />
          </div>

          {/* 2. Central FRIDAY AI Core HUD */}
          <div className="flex items-center shrink-0">
            <WorldCore
              state={state}
              isMuted={isMuted}
              userVolume={userVolume}
              fridayVolume={fridayVolume}
              onCoreClick={onCoreClick}
              onToggleMute={onToggleMute}
            />
          </div>

          {/* 3. Current Mission Banner (on extra wide screens) */}
          <div className="hidden 2xl:flex items-center shrink-0 max-w-sm">
            <MissionBanner
              workflow={activeWorkflow}
              onOpenWorkflowDetails={onOpenBusinessWorkflowManager}
            />
          </div>
        </div>

        {/* Right: EXTREME TOP-RIGHT X EXIT BUTTON (Always pinned and visible) */}
        <div className="flex items-center space-x-2 shrink-0 ml-auto z-40">
          <button
            onClick={onExitWorld}
            title="Exit World & Return to Home Interface"
            className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-rose-500/60 bg-gradient-to-r from-rose-950/80 to-rose-900/60 hover:from-rose-900 hover:to-rose-800 text-rose-200 hover:text-white transition-all duration-200 shadow-[0_0_14px_rgba(244,63,94,0.35)] active:scale-95 font-mono text-xs font-bold tracking-wider cursor-pointer"
          >
            <span className="font-extrabold tracking-widest hidden sm:inline">EXIT WORLD</span>
            <span className="font-extrabold tracking-widest sm:hidden">EXIT</span>
            <X className="w-4 h-4 text-rose-300 font-bold" />
          </button>
        </div>
      </header>

      {/* WORKSPACE SUB-BAR: View selector tabs for responsive views and 16:9 full panorama toggle */}
      <div className="relative z-20 flex items-center justify-between px-3 py-1.5 bg-[#030714] border-b border-cyan-500/20 text-xs font-mono shrink-0 gap-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveViewMode('town')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeViewMode === 'town'
                ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>AGENT TOWN (17 WORKERS)</span>
          </button>

          <button
            onClick={() => setActiveViewMode('intel')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeViewMode === 'intel'
                ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>INTEL & RADAR</span>
          </button>

          <button
            onClick={() => setActiveViewMode('voice')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeViewMode === 'voice'
                ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>VOICE & NOTES</span>
          </button>

          <button
            onClick={() => setIsMemoryCoreOpen(true)}
            title="Open Dedicated FRIDAY World Memory Core (Part 12)"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all cursor-pointer whitespace-nowrap bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          >
            <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
            <span>MEMORY CORE</span>
          </button>

          <button
            onClick={() => setIsManagerPanelOpen(true)}
            title="Open FRIDAY CEO / Manager Operations Panel (Part 13)"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all cursor-pointer whitespace-nowrap bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-900/60 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>CEO / MANAGER OPERATIONS</span>
          </button>

          {onOpenLiveResults && (
            <button
              onClick={onOpenLiveResults}
              title="Open Part 14 Live Mobile Execution & Result Workspace"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all cursor-pointer whitespace-nowrap bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>LIVE MOBILE RESULTS (PART 14)</span>
            </button>
          )}

          <button
            onClick={() => setActiveViewMode(activeViewMode === 'panorama' ? 'town' : 'panorama')}
            title="Toggle full 16:9 multi-column workspace view"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeViewMode === 'panorama'
                ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-emerald-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
            <span>16:9 FULL PANORAMA</span>
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-[10px] text-slate-400 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>AUTONOMOUS WORKFORCE ACTIVE</span>
        </div>
      </div>

      {/* MAIN IMMERSIVE 16:9-STYLE WORKSPACE CANVAS */}
      <main className="relative z-20 flex-1 p-2 sm:p-2.5 overflow-hidden min-h-0">
        {/* CASE A: FULL 16:9 PANORAMA OR WIDE SCREEN (ALL 3 PANELS VISIBLE SIDE-BY-SIDE) */}
        {(activeViewMode === 'panorama' || activeViewMode === 'town') && (
          <div
            className={`h-full w-full flex flex-row gap-2.5 overflow-hidden ${
              activeViewMode === 'panorama'
                ? 'min-w-[1020px] overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-500/20'
                : ''
            }`}
          >
            {/* ZONE 1: Left Information Panel (Telemetry, Sat-Link Feed, Headlines) */}
            <div
              className={`flex-col h-full shrink-0 overflow-y-auto scrollbar-none ${
                activeViewMode === 'panorama'
                  ? 'flex w-60'
                  : 'hidden xl:flex w-56 2xl:w-64'
              }`}
            >
              <LeftInfoPanel />
            </div>

            {/* ZONE 2: LARGE CENTRAL AGENT TOWN / WORKER WORLD (Dominant Visual Space) */}
            <div className="flex-1 flex flex-col h-full min-w-0 space-y-2 overflow-hidden">
              {/* Mission Banner directly above Agent Town */}
              <div className="shrink-0">
                <MissionBanner
                  workflow={activeWorkflow}
                  onOpenWorkflowDetails={onOpenBusinessWorkflowManager}
                />
              </div>

              {/* Worker Bar directly above Agent Town Campus */}
              <div className="shrink-0 bg-slate-950/80 p-1 rounded-xl border border-cyan-500/25">
                <WorkerBar
                  workers={workers}
                  selectedWorkerId={selectedWorkerId}
                  onSelectWorker={handleSelectWorker}
                />
              </div>

              {/* Large Central Agent Town Campus with Visible Workers */}
              <div className="flex-1 min-h-0">
                <AgentTown
                  workers={workers}
                  selectedWorkerId={selectedWorkerId}
                  onSelectWorker={handleSelectWorker}
                />
              </div>
            </div>

            {/* ZONE 3: Right Panel (Voice telemetry, Agent activity feed, Notes) */}
            <div
              className={`flex-col h-full shrink-0 overflow-hidden ${
                activeViewMode === 'panorama'
                  ? 'flex w-72'
                  : 'hidden lg:flex w-72 xl:w-80'
              }`}
            >
              <VoiceAgentNotesPanel
                state={state}
                isMuted={isMuted}
                userVolume={userVolume}
                fridayVolume={fridayVolume}
                onToggleMute={onToggleMute}
                onSendText={onSendText}
              />
            </div>
          </div>
        )}

        {/* CASE B: INTEL VIEW (When user clicks Intel & Radar on narrower viewport) */}
        {activeViewMode === 'intel' && (
          <div className="h-full w-full flex flex-col max-w-2xl mx-auto overflow-y-auto p-1">
            <LeftInfoPanel />
          </div>
        )}

        {/* CASE C: VOICE & NOTES VIEW (When user clicks Voice & Notes on narrower viewport) */}
        {activeViewMode === 'voice' && (
          <div className="h-full w-full flex flex-col max-w-2xl mx-auto overflow-hidden p-1">
            <VoiceAgentNotesPanel
              state={state}
              isMuted={isMuted}
              userVolume={userVolume}
              fridayVolume={fridayVolume}
              onToggleMute={onToggleMute}
              onSendText={onSendText}
            />
          </div>
        )}
      </main>

      {/* Part 12: Dedicated FRIDAY World Memory Core Panel */}
      <WorldMemoryModal
        isOpen={isMemoryCoreOpen}
        onClose={() => setIsMemoryCoreOpen(false)}
      />

      {/* Part 13: Dedicated FRIDAY CEO / Manager Operations Panel */}
      <ManagerOperationsPanel
        isOpen={isManagerPanelOpen}
        onClose={() => setIsManagerPanelOpen(false)}
      />

      {/* Worker Detail Inspection Modal */}
      {selectedWorkerForModal && (
        <WorkerDetailModal
          worker={selectedWorkerForModal}
          onClose={() => setSelectedWorkerForModal(null)}
          onOpenOperations={() => {
            setSelectedWorkerForModal(null);
            setIsManagerPanelOpen(true);
          }}
        />
      )}
    </div>
  );
};
