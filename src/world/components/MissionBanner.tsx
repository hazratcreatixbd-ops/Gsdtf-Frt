import React from 'react';
import { Target, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { BusinessWorkflow } from '../../types/workflowEngine';

interface MissionBannerProps {
  workflow: BusinessWorkflow | null;
  onOpenWorkflowDetails?: () => void;
}

export const MissionBanner: React.FC<MissionBannerProps> = ({ workflow, onOpenWorkflowDetails }) => {
  const missionName = workflow ? workflow.goal : 'Autonomous Readiness & Operations Standby';
  const status = workflow ? workflow.status : 'STANDBY';
  const total = workflow ? workflow.steps.length : 0;
  const completed = workflow ? workflow.steps.filter((s) => s.status === 'COMPLETED').length : 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 100;
  const leadWorker = workflow?.currentStep ? 'Hermes (Manager)' : 'Fleet Idle';

  return (
    <div
      onClick={onOpenWorkflowDetails}
      className="w-full max-w-full min-w-0 cursor-pointer p-2.5 sm:p-3 rounded-2xl border border-cyan-500/30 bg-slate-950/70 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono transition-all hover:border-cyan-500/60"
    >
      <div className="flex items-start sm:items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
        <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shrink-0">
          <Target className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">CURRENT MISSION</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                status === 'RUNNING'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 animate-pulse'
                  : status === 'WAITING_FOR_APPROVAL'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse'
                  : status === 'COMPLETED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {status}
            </span>
          </div>
          <div className="font-bold text-white text-xs break-words [overflow-wrap:anywhere] mt-0.5">
            {missionName}
          </div>
        </div>
      </div>

      {/* Progress & Lead Worker */}
      <div className="flex items-center justify-between sm:justify-end space-x-4 text-[11px] w-full sm:w-auto pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/70 shrink-0">
        <div className="min-w-0">
          <span className="text-slate-500 text-[9px] sm:text-[10px] block">LEAD AGENT</span>
          <span className="text-slate-200 truncate block">{leadWorker}</span>
        </div>
        <div className="w-28 sm:min-w-[100px] space-y-1 shrink-0">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">PROGRESS</span>
            <span className="text-cyan-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
