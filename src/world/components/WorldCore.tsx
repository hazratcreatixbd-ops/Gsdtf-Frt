import React from 'react';
import { FridayState } from '../../types/friday';
import { Mic, MicOff, Cpu, Radio } from 'lucide-react';

interface WorldCoreProps {
  state: FridayState;
  isMuted: boolean;
  userVolume: number;
  fridayVolume: number;
  onCoreClick: () => void;
  onToggleMute: () => void;
}

export const WorldCore: React.FC<WorldCoreProps> = ({
  state,
  isMuted,
  userVolume,
  fridayVolume,
  onCoreClick,
  onToggleMute,
}) => {
  const getCoreGlow = () => {
    switch (state) {
      case 'speaking':
        return 'from-rose-500/40 via-rose-600/30 to-rose-950/20 shadow-[0_0_25px_rgba(244,63,94,0.6)] border-rose-400';
      case 'thinking':
        return 'from-indigo-500/40 via-indigo-600/30 to-indigo-950/20 shadow-[0_0_25px_rgba(99,102,241,0.6)] border-indigo-400 animate-spin';
      case 'listening':
        return 'from-cyan-400/40 via-cyan-500/30 to-cyan-950/20 shadow-[0_0_25px_rgba(34,211,238,0.6)] border-cyan-400';
      case 'connecting':
        return 'from-blue-500/40 via-blue-600/30 to-blue-950/20 shadow-[0_0_20px_rgba(59,130,246,0.5)] border-blue-400 animate-pulse';
      case 'disconnected':
      default:
        return 'from-slate-700/30 via-slate-800/20 to-slate-950/10 shadow-[0_0_15px_rgba(100,116,139,0.3)] border-slate-600';
    }
  };

  const getStatusLabel = () => {
    switch (state) {
      case 'speaking':
        return 'SPEAKING';
      case 'thinking':
        return 'THINKING';
      case 'listening':
        return isMuted ? 'MUTED' : 'LISTENING';
      case 'connecting':
        return 'CONNECTING';
      case 'disconnected':
      default:
        return 'STANDBY';
    }
  };

  const audioScale = Math.max(1, 1 + (state === 'speaking' ? fridayVolume * 0.35 : userVolume * 0.35));

  return (
    <div className="relative flex-1 w-full flex items-center justify-between gap-2 sm:gap-3.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-cyan-500/35 bg-[#030714]/95 backdrop-blur-xl shadow-[0_0_24px_rgba(6,182,212,0.18)] font-mono min-w-0 max-w-full">
      {/* Subtle Ambient Inner Glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/[0.06] via-transparent to-blue-500/[0.08] pointer-events-none" />

      {/* Left Group: Central Glowing AI Core Orb + Core Telemetry & Status Pill */}
      <div className="relative z-10 flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
        <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 shrink-0">
          {/* Outer Rotating Particle Ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/45 animate-[spin_12s_linear_infinite]" />

          {/* Core Sphere */}
          <div
            onClick={onCoreClick}
            style={{ transform: `scale(${audioScale})` }}
            className={`relative flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr ${getCoreGlow()} border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95`}
            title="FRIDAY Core: Click to Start / Interrupt"
          >
            {/* Inner Neural Node */}
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-200 shadow-[0_0_10px_#67e8f9] animate-pulse" />
          </div>
        </div>

        {/* Core Telemetry & Status Pill */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0">
            <Cpu className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[10px] sm:text-xs font-extrabold text-white tracking-wider sm:tracking-widest truncate">
              FRIDAY CORE
            </span>
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ml-1 shrink-0 ${
                state === 'speaking'
                  ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-pulse'
                  : state === 'listening'
                  ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-ping'
                  : state === 'thinking'
                  ? 'bg-indigo-400 animate-spin'
                  : 'bg-slate-500'
              }`}
            />
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] text-cyan-300 font-bold tracking-wider uppercase truncate">
              {getStatusLabel()}
            </span>
            <span className="text-[8px] sm:text-[9px] text-slate-400 hidden sm:inline truncate">
              • Live Neural HUD
            </span>
          </div>
        </div>
      </div>

      {/* Right Action: Start AI / Mic Toggle */}
      <button
        onClick={() => {
          if (state === 'disconnected') {
            onCoreClick();
          } else {
            onToggleMute();
          }
        }}
        className={`relative z-10 flex items-center justify-center space-x-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[9px] sm:text-[11px] font-extrabold tracking-wider transition-all shrink-0 active:scale-95 cursor-pointer ${
          state === 'disconnected'
            ? 'bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.45)]'
            : isMuted
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
            : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
        }`}
      >
        {state === 'disconnected' ? (
          <span>CONNECT</span>
        ) : isMuted ? (
          <>
            <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <span>UNMUTE</span>
          </>
        ) : (
          <>
            <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
            <span>MUTE</span>
          </>
        )}
      </button>
    </div>
  );
};
