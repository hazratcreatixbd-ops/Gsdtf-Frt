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
    <div className="relative flex items-center space-x-3 px-3.5 py-1.5 rounded-2xl border border-cyan-500/30 bg-[#030714]/90 backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.15)] font-mono">
      {/* Central Glowing AI Core Orb */}
      <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
        {/* Outer Rotating Particle Ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/40 animate-[spin_12s_linear_infinite]" />
        
        {/* Core Sphere */}
        <div
          onClick={onCoreClick}
          style={{ transform: `scale(${audioScale})` }}
          className={`relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr ${getCoreGlow()} border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95`}
          title="FRIDAY Core: Click to Start / Interrupt"
        >
          {/* Inner Neural Node */}
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-200 shadow-[0_0_10px_#67e8f9] animate-pulse" />
        </div>
      </div>

      {/* Core Telemetry & Status Pill */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-1.5">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span className="text-[11px] font-bold text-white tracking-widest">FRIDAY CORE</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ml-1 ${
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
        <div className="flex items-center space-x-2 mt-0.5">
          <span className="text-[9px] text-cyan-300 font-semibold tracking-wider uppercase">
            {getStatusLabel()}
          </span>
          <span className="text-[8px] text-slate-500 hidden sm:inline">• Live Neural HUD</span>
        </div>
      </div>

      {/* Quick Action: Start AI / Mic Toggle */}
      <button
        onClick={() => {
          if (state === 'disconnected') {
            onCoreClick();
          } else {
            onToggleMute();
          }
        }}
        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ml-1 active:scale-95 ${
          state === 'disconnected'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
            : isMuted
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
            : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
        }`}
      >
        {state === 'disconnected' ? (
          <span>CONNECT</span>
        ) : isMuted ? (
          <>
            <MicOff className="w-3 h-3 text-amber-400" />
            <span>UNMUTE</span>
          </>
        ) : (
          <>
            <Mic className="w-3 h-3 text-cyan-400" />
            <span>MUTE</span>
          </>
        )}
      </button>
    </div>
  );
};
