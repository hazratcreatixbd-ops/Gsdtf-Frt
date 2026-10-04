import React from 'react';
import { Radio, Wifi, Globe, Activity, Eye, ShieldAlert } from 'lucide-react';

export const LeftInfoPanel: React.FC = () => {
  return (
    <div className="flex flex-col space-y-3 font-mono text-xs w-full max-w-full shrink-0">
      {/* 1. Media Link Box */}
      <div className="p-3 rounded-2xl border border-cyan-500/30 bg-[#040816]/90 backdrop-blur-xl shadow-lg space-y-2">
        <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
          <div className="flex items-center space-x-1">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>MEDIA LINK</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            ONLINE
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Telemetry:</span>
            <span className="text-slate-200">WebSocket /api/live</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Audio Rate:</span>
            <span className="text-slate-200">24kHz PCM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Latency:</span>
            <span className="text-emerald-400">&lt; 180ms</span>
          </div>
        </div>
      </div>

      {/* 2. Sat-Link Visual Feed / Radar Box */}
      <div className="p-3 rounded-2xl border border-slate-800 bg-[#040816]/90 backdrop-blur-xl shadow-lg space-y-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <div className="flex items-center space-x-1">
            <Globe className="w-3 h-3 text-indigo-400" />
            <span>SAT-LINK FEED</span>
          </div>
          <div className="flex space-x-1 text-[8px]">
            <span className="px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">2D</span>
            <span className="px-1 rounded bg-slate-900 text-slate-500">3D</span>
          </div>
        </div>

        {/* Radar Map Graphic Simulation */}
        <div className="relative w-full h-24 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
          {/* Subtle Radar Rings */}
          <div className="absolute w-20 h-20 rounded-full border border-dashed border-cyan-500/20" />
          <div className="absolute w-12 h-12 rounded-full border border-cyan-500/30" />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-ping" />
          {/* Radar Sweep Line */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-500/10 to-transparent animate-[spin_4s_linear_infinite]" />
          <span className="absolute bottom-1 text-[8px] text-slate-500 font-mono">
            GEO: ACTIVE PREVIEW
          </span>
        </div>
      </div>

      {/* 3. Today Headlines / Activities */}
      <div className="p-3 rounded-2xl border border-slate-800 bg-[#040816]/90 backdrop-blur-xl shadow-lg space-y-2 flex-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>HEADLINES & INTEL</span>
          </div>
        </div>

        <div className="space-y-1.5 text-[9px] text-slate-400">
          <div className="flex items-start space-x-1">
            <span className="text-cyan-400">•</span>
            <span>Neural broadcast connected to live session</span>
          </div>
          <div className="flex items-start space-x-1">
            <span className="text-cyan-400">•</span>
            <span>Agent Town workspace stations synchronized</span>
          </div>
          <div className="flex items-start space-x-1">
            <span className="text-cyan-400">•</span>
            <span>Business Workflow Engine standing by</span>
          </div>
        </div>
      </div>
    </div>
  );
};
