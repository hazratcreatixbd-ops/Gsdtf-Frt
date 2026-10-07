import React, { useState } from 'react';
import { WorkerEntity } from '../types/WorldTypes';
import { X, CheckCircle2, Play, AlertCircle, Sparkles, Terminal, Cpu } from 'lucide-react';
import { workerRegistry } from '../workers/WorkerRegistry';
import { workerCapabilityRegistry } from '../manager/WorkerCapabilityRegistry';

interface WorkerDetailModalProps {
  worker: WorkerEntity | null;
  onClose: () => void;
  onOpenOperations?: () => void;
}

export const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({
  worker,
  onClose,
  onOpenOperations,
}) => {
  const [taskInput, setTaskInput] = useState('');

  if (!worker) return null;

  const capabilityMeta = workerCapabilityRegistry.getCapability(worker.id);

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    workerRegistry.assignTask(worker.id, taskInput.trim());
    setTaskInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-3xl border border-cyan-500/40 bg-[#040816] text-slate-100 p-4 sm:p-5 shadow-2xl space-y-4 font-mono min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3 min-w-0">
          <div className="flex items-start space-x-2.5 sm:space-x-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-xl shadow-inner shrink-0">
              {worker.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white break-words">{worker.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shrink-0">
                  {worker.role}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    worker.status === 'WORKING'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 animate-pulse'
                      : worker.status === 'READY'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {worker.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 break-words">{worker.description}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location & Meta Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-slate-500 block text-[10px]">ROOM & ZONE</span>
            <span className="text-slate-200">{worker.workstation.roomName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">WORKSTATION</span>
            <span className="text-cyan-300">{worker.workstation.deskLabel}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">ASSIGNED BY</span>
            <span className="text-slate-300">{worker.assignedBy}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">LIFETIME TASKS</span>
            <span className="text-emerald-400">{worker.metrics.tasksCompleted} Completed</span>
          </div>
        </div>

        {/* Current Task & Progress */}
        <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 uppercase text-[10px]">CURRENT ASSIGNMENT</span>
            <span className="text-cyan-400 font-bold">{worker.progress}%</span>
          </div>
          <div className="text-slate-200 font-semibold">
            {worker.currentTask || 'Idle at designated workstation awaiting task dispatch.'}
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${worker.progress}%` }}
            />
          </div>
        </div>

        {/* Capabilities & Part 13 Registry Metadata */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase">CAPABILITY REGISTRY</span>
            {capabilityMeta && (
              <div className="flex items-center space-x-2 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  LOAD: {capabilityMeta.currentLoad} / {capabilityMeta.maxConcurrentTasks}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  RISK: {capabilityMeta.riskLevel}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {worker.capabilities.map((cap, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center space-x-1"
              >
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>{cap}</span>
              </span>
            ))}
          </div>
          {capabilityMeta && capabilityMeta.requiredTools.length > 0 && (
            <div className="text-[10px] text-slate-400 pt-1">
              <span className="text-slate-500 uppercase mr-1.5">BOUND TOOLS:</span>
              <span className="text-cyan-300">{capabilityMeta.requiredTools.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">LATEST ACTIVITY</span>
          <p className="text-slate-300">{worker.lastActivity}</p>
        </div>

        {/* Open CEO / Manager Operations Panel Button */}
        {onOpenOperations && (
          <button
            type="button"
            onClick={onOpenOperations}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 font-bold text-xs transition-all cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>OPEN CEO / MANAGER OPERATIONS PANEL</span>
          </button>
        )}

        {/* Quick Assign Form */}
        <form onSubmit={handleAssign} className="flex gap-2 pt-1 border-t border-slate-800">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder={`Dispatch direct task to ${worker.name}...`}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!taskInput.trim()}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50"
          >
            Dispatch
          </button>
        </form>
      </div>
    </div>
  );
};
