import React from 'react';
import { X, Sparkles, Languages, Zap, Globe, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">
                FRIDAY ARCHITECTURE
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-Time Voice-to-Voice AI Companion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Engine specifications */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-semibold">
              <Zap className="w-4 h-4" />
              <span>CORE SPECIFICATIONS</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Model</span>
                <span className="text-slate-200 font-semibold">gemini-3.8-live</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Audio Pipeline</span>
                <span className="text-cyan-300 font-semibold">Audio-to-Audio PCM</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Input Stream</span>
                <span className="text-slate-200">16kHz 16-bit Mono</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Output Playback</span>
                <span className="text-slate-200">24kHz Web Audio API</span>
              </div>
            </div>
          </div>

          {/* Multilingual Voice Support */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono font-semibold">
              <Languages className="w-4 h-4" />
              <span>MULTILINGUAL VOICE INTELLIGENCE</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              FRIDAY natively listens and answers in multiple languages without changing her charming female persona. Speak freely in:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-2">
                <span className="text-emerald-400 font-semibold font-mono">বাংলা</span>
                <span className="text-slate-400 text-[11px]">Bengali</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-2">
                <span className="text-emerald-400 font-semibold font-mono">English</span>
                <span className="text-slate-400 text-[11px]">Natural British/US</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-2">
                <span className="text-emerald-400 font-semibold font-mono">हिन्दी</span>
                <span className="text-slate-400 text-[11px]">Hindi</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-2">
                <span className="text-emerald-400 font-semibold font-mono">العربية</span>
                <span className="text-slate-400 text-[11px]">Arabic</span>
              </div>
            </div>
          </div>

          {/* Voice-Triggered Actions (Tools) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center space-x-2 text-purple-400 text-xs font-mono font-semibold">
              <Globe className="w-4 h-4" />
              <span>VOICE FUNCTION CALLS</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              FRIDAY can execute real actions via browser tool calling. Try saying:
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside font-mono">
              <li>
                <span className="text-cyan-300">"FRIDAY, open YouTube"</span>
              </li>
              <li>
                <span className="text-cyan-300">"Open Wikipedia and look up Quantum Computing"</span>
              </li>
              <li>
                <span className="text-cyan-300">"What time is it right now?"</span>
              </li>
            </ul>
          </div>

          {/* Natural Interruption reminder */}
          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Natural Interruption Enabled:</strong> You don't have to wait for FRIDAY to finish speaking. Simply speak over her or tap the orb, and she will immediately stop playback and listen to your new speech.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            Ready to Converse
          </button>
        </div>
      </div>
    </div>
  );
};
