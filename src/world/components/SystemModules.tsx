import React, { useState } from 'react';
import { SystemModuleName } from '../types/WorldTypes';
import { Bookmark, Wrench, Sparkles, Settings as SettingsIcon, X, CheckCircle2 } from 'lucide-react';
import { businessMemoryManager } from '../../services/BusinessMemoryManager';
import { WorldMemoryModal } from './WorldMemoryModal';

interface SystemModulesProps {
  onOpenSettings?: () => void;
  onOpenMemory?: () => void;
}

export const SystemModules: React.FC<SystemModulesProps> = ({ onOpenSettings, onOpenMemory }) => {
  const [activeModuleModal, setActiveModuleModal] = useState<SystemModuleName | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const memory = businessMemoryManager.getBusinessMemory();

  const modules = [
    {
      name: 'MEMORY' as SystemModuleName,
      label: 'MEMORY',
      color: '#38bdf8', // Cyan
      border: 'border-cyan-500/50',
      bg: 'bg-cyan-950/40',
      text: 'text-cyan-300',
      icon: <Bookmark className="w-3 h-3 text-cyan-400" />,
      tag: 'ACTIVE',
    },
    {
      name: 'SKILLS' as SystemModuleName,
      label: 'SKILLS',
      color: '#f59e0b', // Amber
      border: 'border-amber-500/50',
      bg: 'bg-amber-950/40',
      text: 'text-amber-300',
      icon: <Wrench className="w-3 h-3 text-amber-400" />,
      tag: '34 TOOLS',
    },
    {
      name: 'SOUL' as SystemModuleName,
      label: 'SOUL',
      color: '#10b981', // Emerald
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      icon: <Sparkles className="w-3 h-3 text-emerald-400" />,
      tag: 'KORE VOICE',
    },
    {
      name: 'SETTINGS' as SystemModuleName,
      label: 'SETTINGS',
      color: '#94a3b8', // Slate
      border: 'border-slate-600/50',
      bg: 'bg-slate-900/60',
      text: 'text-slate-300',
      icon: <SettingsIcon className="w-3 h-3 text-slate-400" />,
      tag: 'CONFIG',
    },
  ];

  return (
    <div className="relative flex items-center shrink-0 min-w-0">
      {/* Clean 2x2 Grid of System Modules: [MEMORY] [SKILLS] / [SOUL] [SETTINGS] */}
      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 font-mono shrink-0">
        {modules.map((mod) => (
          <button
            key={mod.name}
            onClick={() => {
              if (mod.name === 'MEMORY') {
                if (onOpenMemory) {
                  onOpenMemory();
                } else {
                  setIsMemoryModalOpen(true);
                }
              } else {
                setActiveModuleModal(mod.name);
              }
            }}
            className={`flex items-center justify-center sm:justify-start space-x-1 px-1.5 sm:px-2.5 py-1 rounded-xl border ${mod.border} ${mod.bg} ${mod.text} hover:scale-105 hover:brightness-125 transition-all text-[8.5px] sm:text-[10px] font-bold tracking-wider shadow-sm active:scale-95 cursor-pointer whitespace-nowrap`}
          >
            <span className="shrink-0">{mod.icon}</span>
            <span>[{mod.label}]</span>
          </button>
        ))}
      </div>

      {/* Futuristic Horizontal Circuit Line branching into Core */}
      <div className="hidden xl:flex items-center mx-2 w-7 h-7 shrink-0 pointer-events-none">
        <svg className="w-full h-full stroke-cyan-500/50 fill-none" viewBox="0 0 32 32">
          <line x1="0" y1="8" x2="16" y2="16" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="0" y1="24" x2="16" y2="16" stroke="#10b981" strokeWidth="1.5" />
          <line x1="16" y1="16" x2="32" y2="16" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="16" cy="16" r="2.5" fill="#38bdf8" className="animate-pulse" />
          <circle cx="30" cy="16" r="2" fill="#22d3ee" />
        </svg>
      </div>

      {/* Part 12: Full Advanced World Memory Modal */}
      <WorldMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
      />

      {/* Modal Dialog for Module Info */}
      {activeModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950 p-5 shadow-2xl text-slate-100 font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-cyan-400 font-bold text-sm">[ {activeModuleModal} MODULE ]</span>
              </div>
              <button
                onClick={() => setActiveModuleModal(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content for SKILLS */}
            {activeModuleModal === 'SKILLS' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  Autonomous skills engine featuring 34 connected tools and 17 specialized workers in Agent Town.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">• Business Planner</div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">• Content Creator</div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">• Market Research</div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">• Android Bridge</div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">• Safety Auditor</div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">• Media Packager</div>
                </div>
              </div>
            )}

            {/* Content for SOUL */}
            {activeModuleModal === 'SOUL' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  FRIDAY Persona and Tone architecture configured for executive efficiency, conversational warmth, and zero robotic filler.
                </p>
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-[11px] text-emerald-200">
                  <div>• Voice Model: Kore (Gemini Live Audio)</div>
                  <div>• Persona: Autonomous Executive Intelligence</div>
                  <div>• Principle: Never fake external completions</div>
                </div>
              </div>
            )}

            {/* Content for SETTINGS */}
            {activeModuleModal === 'SETTINGS' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  Configure audio channels, Android bridge intent protocols, and workspace topologies.
                </p>
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      setActiveModuleModal(null);
                      onOpenSettings();
                    }}
                    className="w-full py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold transition-all"
                  >
                    Open System Settings Modal
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
