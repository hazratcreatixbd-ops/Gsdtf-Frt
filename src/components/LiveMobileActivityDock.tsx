import React, { useState, useEffect } from 'react';
import { part14Orchestrator } from '../services/part14/Part14Orchestrator';
import { Part14ProjectWorkspace } from '../services/part14/Part14Types';
import { Activity, ChevronRight, ExternalLink } from 'lucide-react';

interface LiveMobileActivityDockProps {
  onOpenResultCenter: () => void;
  onOpenAssetInPhone: (url: string) => void;
}

export const LiveMobileActivityDock: React.FC<LiveMobileActivityDockProps> = ({
  onOpenResultCenter,
  onOpenAssetInPhone,
}) => {
  const [activeWs, setActiveWs] = useState<Part14ProjectWorkspace | null>(
    part14Orchestrator.getActiveWorkspace()
  );

  useEffect(() => {
    const unsub = part14Orchestrator.subscribe((_all, active) => {
      setActiveWs(active ? { ...active } : null);
    });
    return () => unsub();
  }, []);

  if (!activeWs) return null;

  const latestOp =
    activeWs.operations.find((o) => o.status === 'RUNNING' || o.status === 'WAITING_APPROVAL') ||
    activeWs.operations[activeWs.operations.length - 1];

  const primaryArtifactUrl =
    activeWs.demoWebsites[0]?.previewUrl ||
    activeWs.generatedImages[0]?.savedPath ||
    activeWs.savedAssets[0]?.publicUrl;

  return (
    <div className="w-full max-w-sm mx-auto px-4 mb-2 z-20">
      <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/35 backdrop-blur-xl shadow-lg flex items-center justify-between gap-2 text-xs font-mono">
        <button
          onClick={onOpenResultCenter}
          className="flex-1 flex items-center space-x-2 text-left min-w-0 cursor-pointer"
        >
          <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 truncate">
              <span className="font-bold">{latestOp?.workerName || 'Hermes'}</span>
              <span>·</span>
              <span>{activeWs.status}</span>
            </div>
            <div className="text-[11px] text-slate-200 truncate">
              {latestOp?.taskTitle || activeWs.currentStage}
            </div>
          </div>
        </button>

        <div className="flex items-center space-x-1.5 shrink-0">
          {primaryArtifactUrl && (
            <button
              onClick={() => onOpenAssetInPhone(primaryArtifactUrl)}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
              title="Open Real Result on Phone"
            >
              <span>OPEN</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={onOpenResultCenter}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Open Full Live Mobile Result Center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
