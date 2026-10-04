import React from 'react';
import { WorkerEntity } from '../types/WorldTypes';

interface WorkerBarProps {
  workers: WorkerEntity[];
  selectedWorkerId: string;
  onSelectWorker: (id: string) => void;
}

export const WorkerBar: React.FC<WorkerBarProps> = ({
  workers,
  selectedWorkerId,
  onSelectWorker,
}) => {
  return (
    <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1 px-1">
      {workers.map((worker) => {
        const isSelected = worker.id === selectedWorkerId;
        const isWorking = worker.status === 'WORKING';
        const isWaiting = worker.status === 'WAITING';

        return (
          <button
            key={worker.id}
            onClick={() => onSelectWorker(worker.id)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all duration-200 shrink-0 ${
              isSelected
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)] scale-102'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-700'
            }`}
          >
            <span className="text-sm">{worker.avatar}</span>
            <div className="flex flex-col text-left">
              <span className="font-bold text-white leading-tight">{worker.name}</span>
              <span className="text-[9px] text-slate-400 font-normal leading-tight">{worker.role}</span>
            </div>
            {/* Status Dot */}
            <span
              className={`w-2 h-2 rounded-full ml-1 ${
                isWorking
                  ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-ping'
                  : isWaiting
                  ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse'
                  : 'bg-emerald-400'
              }`}
              title={`Status: ${worker.status}`}
            />
          </button>
        );
      })}
    </div>
  );
};
