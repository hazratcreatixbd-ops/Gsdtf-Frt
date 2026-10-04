import React, { useState } from 'react';
import { WorkerEntity, WorkerRole } from '../types/WorldTypes';
import { Building2, Sparkles, Terminal, Activity, CheckCircle2, ChevronRight, Layers, Eye } from 'lucide-react';

interface AgentTownProps {
  workers: WorkerEntity[];
  selectedWorkerId: string;
  onSelectWorker: (id: string) => void;
}

type DepartmentFilter = 'ALL' | 'EXECUTIVE' | 'RESEARCH' | 'STRATEGY' | 'CREATIVE' | 'SECURITY' | 'TECH_DEV';

export const AgentTown: React.FC<AgentTownProps> = ({
  workers,
  selectedWorkerId,
  onSelectWorker,
}) => {
  const [activeDepartment, setActiveDepartment] = useState<DepartmentFilter>('ALL');

  // Group workers into real architectural zones
  const executiveWorkers = workers.filter((w) => w.workstation.zone === 'executive');
  const researchWorkers = workers.filter((w) => w.workstation.zone === 'research_lab');
  const strategyWorkers = workers.filter((w) => w.workstation.zone === 'business_hub');
  const creativeWorkers = workers.filter((w) => w.workstation.zone === 'creative_studio');
  const securityWorkers = workers.filter((w) => w.workstation.zone === 'audit_station');
  const techWorkers = workers.filter((w) => w.workstation.zone === 'tech_dev');

  const departments = [
    { id: 'ALL' as DepartmentFilter, label: 'ALL DEPARTMENTS', count: workers.length },
    { id: 'EXECUTIVE' as DepartmentFilter, label: 'EXECUTIVE', count: executiveWorkers.length },
    { id: 'RESEARCH' as DepartmentFilter, label: 'RESEARCH', count: researchWorkers.length },
    { id: 'STRATEGY' as DepartmentFilter, label: 'STRATEGY', count: strategyWorkers.length },
    { id: 'CREATIVE' as DepartmentFilter, label: 'CREATIVE', count: creativeWorkers.length },
    { id: 'SECURITY' as DepartmentFilter, label: 'SECURITY', count: securityWorkers.length },
    { id: 'TECH_DEV' as DepartmentFilter, label: 'DEV & DEVICE', count: techWorkers.length },
  ];

  const renderWorkerCard = (worker: WorkerEntity) => {
    const isSelected = worker.id === selectedWorkerId;
    const isWorking = worker.status === 'WORKING';
    const isWaiting = worker.status === 'WAITING';

    return (
      <div
        key={worker.id}
        onClick={() => onSelectWorker(worker.id)}
        className={`relative flex flex-col p-2.5 rounded-xl border backdrop-blur-md cursor-pointer transition-all duration-200 select-none group ${
          isSelected
            ? 'bg-slate-900 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.45)] ring-1 ring-cyan-400/50 scale-[1.02]'
            : isWorking
            ? 'bg-slate-950/90 border-cyan-500/70 shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse'
            : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-600 hover:bg-slate-900/60'
        }`}
      >
        {/* Holographic Top Ring & Corner Bracket for Selected Worker */}
        {isSelected && (
          <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
        )}

        {/* Top: Avatar & Status LED */}
        <div className="flex items-center justify-between mb-1.5">
          <div
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border shadow-inner text-xl overflow-hidden"
            style={{ borderColor: `${worker.accentColor}70` }}
          >
            <span>{worker.avatar}</span>
            {isWorking && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent animate-[scan_2s_linear_infinite]" />
            )}
          </div>

          <div className="flex flex-col items-end">
            <span
              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider ${
                isWorking
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 animate-pulse'
                  : isWaiting
                  ? 'bg-amber-950 text-amber-300 border border-amber-400 animate-pulse'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isWorking
                    ? 'bg-cyan-400 shadow-[0_0_4px_#22d3ee] animate-ping'
                    : isWaiting
                    ? 'bg-amber-400 shadow-[0_0_4px_#fbbf24]'
                    : 'bg-emerald-400'
                }`}
              />
              <span>{isWorking ? 'WORKING' : isWaiting ? 'WAIT' : 'READY'}</span>
            </span>
            <span className="text-[8px] font-mono text-slate-500 mt-1">
              {worker.workstation.deskLabel.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Middle: Name & Role */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <span className="font-mono font-extrabold text-white text-xs tracking-tight group-hover:text-cyan-200">
              {worker.name}
            </span>
            <span className="text-[8px] font-mono text-slate-500">
              #{worker.metrics.tasksCompleted}
            </span>
          </div>
          <span
            className="text-[9px] font-mono font-semibold tracking-wider uppercase mt-0.5"
            style={{ color: worker.accentColor }}
          >
            {worker.role.replace('_', ' ')}
          </span>
        </div>

        {/* Bottom: Active Task Ticker or Station Description */}
        <div className="mt-2 pt-1.5 border-t border-slate-800/80">
          {isWorking && worker.currentTask ? (
            <div className="text-[9px] font-mono text-cyan-200 font-semibold truncate flex items-center space-x-1 animate-pulse">
              <span>⚡</span>
              <span className="truncate">{worker.currentTask}</span>
            </div>
          ) : (
            <div className="text-[9px] font-mono text-slate-400 truncate">
              {worker.capabilities[0]}
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${worker.progress}%`,
                backgroundColor: isWorking ? '#22d3ee' : worker.accentColor,
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col rounded-2xl border border-cyan-500/30 bg-[#040816]/95 backdrop-blur-xl shadow-2xl overflow-hidden font-mono select-none">
      {/* Agent Town Campus Header */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 border-b border-cyan-500/25 bg-slate-950/80 gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
            <Building2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black tracking-widest text-white uppercase">AGENT TOWN</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold">
                CAMPUS ACTIVE
              </span>
            </div>
            <span className="text-[9px] text-slate-400 hidden sm:inline">
              17 Specialized Autonomous Stations • Real Workforce Topology
            </span>
          </div>
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setActiveDepartment(dept.id)}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold tracking-wider transition-all whitespace-nowrap ${
                activeDepartment === dept.id
                  ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {dept.label} ({dept.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Architectural Campus Canvas (Scrollable 3x2 Departmental Suites) */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-3 scrollbar-thin scrollbar-thumb-cyan-500/20">
        {/* ROOM 1: EXECUTIVE SUITE */}
        {(activeDepartment === 'ALL' || activeDepartment === 'EXECUTIVE') && (
          <div className="p-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300 pb-1 border-b border-cyan-500/20">
              <div className="flex items-center space-x-2">
                <span>🏛️</span>
                <span className="tracking-wider uppercase">ROOM A: EXECUTIVE SUITE & DISPATCH</span>
              </div>
              <span className="text-[9px] text-cyan-400/80 font-normal">2 Command Stations</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
              {executiveWorkers.map(renderWorkerCard)}
            </div>
          </div>
        )}

        {/* ROOM 2: RESEARCH & SIGNALS LAB */}
        {(activeDepartment === 'ALL' || activeDepartment === 'RESEARCH') && (
          <div className="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300 pb-1 border-b border-indigo-500/20">
              <div className="flex items-center space-x-2">
                <span>🔬</span>
                <span className="tracking-wider uppercase">ROOM B: RESEARCH LAB & MARKET SIGNALS</span>
              </div>
              <span className="text-[9px] text-indigo-400/80 font-normal">3 Research Stations</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
              {researchWorkers.map(renderWorkerCard)}
            </div>
          </div>
        )}

        {/* ROOM 3: STRATEGIC BUSINESS & QUANT HUB */}
        {(activeDepartment === 'ALL' || activeDepartment === 'STRATEGY') && (
          <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300 pb-1 border-b border-emerald-500/20">
              <div className="flex items-center space-x-2">
                <span>📈</span>
                <span className="tracking-wider uppercase">ROOM C: STRATEGY & BUSINESS QUANT HUB</span>
              </div>
              <span className="text-[9px] text-emerald-400/80 font-normal">2 Strategy Stations</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
              {strategyWorkers.map(renderWorkerCard)}
            </div>
          </div>
        )}

        {/* ROOM 4: CREATIVE STUDIO & MEDIA SUITE */}
        {(activeDepartment === 'ALL' || activeDepartment === 'CREATIVE') && (
          <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-950/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-300 pb-1 border-b border-rose-500/20">
              <div className="flex items-center space-x-2">
                <span>🎨</span>
                <span className="tracking-wider uppercase">ROOM D: CREATIVE STUDIO & MEDIA PACKAGING</span>
              </div>
              <span className="text-[9px] text-rose-400/80 font-normal">2 Creative Stations</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
              {creativeWorkers.map(renderWorkerCard)}
            </div>
          </div>
        )}

        {/* ROOM 5: SECURITY VAULT & QUALITY GATE */}
        {(activeDepartment === 'ALL' || activeDepartment === 'SECURITY') && (
          <div className="p-3 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 pb-1 border-b border-purple-500/20">
              <div className="flex items-center space-x-2">
                <span>🛡️</span>
                <span className="tracking-wider uppercase">ROOM E: QUALITY GATE & SECURITY VAULT</span>
              </div>
              <span className="text-[9px] text-purple-400/80 font-normal">2 Audit Stations</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
              {securityWorkers.map(renderWorkerCard)}
            </div>
          </div>
        )}

        {/* ROOM 6: TECH AUTOMATION & DEVICE CORE */}
        {(activeDepartment === 'ALL' || activeDepartment === 'TECH_DEV') && (
          <div className="p-3 rounded-2xl border border-teal-500/30 bg-teal-950/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-teal-300 pb-1 border-b border-teal-500/20">
              <div className="flex items-center space-x-2">
                <span>💻</span>
                <span className="tracking-wider uppercase">ROOM F: TECH DEV, DIAGNOSTICS & ANDROID BRIDGE</span>
              </div>
              <span className="text-[9px] text-teal-400/80 font-normal">6 Dev Stations</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
              {techWorkers.map(renderWorkerCard)}
            </div>
          </div>
        )}
      </div>

      {/* Agent Town Footer Status Strip */}
      <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200">17 Autonomous Stations Online</span>
          <span className="text-slate-500 hidden sm:inline">• Click any station to focus</span>
        </div>
        <div className="flex items-center space-x-1.5 text-cyan-400">
          <Terminal className="w-3 h-3" />
          <span>Event Stream Synced</span>
        </div>
      </div>
    </div>
  );
};
