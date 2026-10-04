import React, { useState, useEffect } from 'react';
import { FridayState } from '../../types/friday';
import { WorldActivityEvent } from '../types/WorldTypes';
import { worldEventBus } from '../events/WorldEventBus';
import { Mic, MicOff, Send, Volume2, Sparkles, Terminal, Bookmark } from 'lucide-react';
import { businessMemoryManager } from '../../services/BusinessMemoryManager';
import { advancedMemoryManager } from '../../services/memory/AdvancedMemoryManager';
import { Memory } from '../../services/memory/MemoryTypes';

interface VoiceAgentNotesPanelProps {
  state: FridayState;
  isMuted: boolean;
  userVolume: number;
  fridayVolume: number;
  onToggleMute: () => void;
  onSendText: (text: string) => void;
}

export const VoiceAgentNotesPanel: React.FC<VoiceAgentNotesPanelProps> = ({
  state,
  isMuted,
  userVolume,
  fridayVolume,
  onToggleMute,
  onSendText,
}) => {
  const [activeTab, setActiveTab] = useState<'VOICE' | 'AGENT' | 'NOTES'>('AGENT');
  const [events, setEvents] = useState<WorldActivityEvent[]>(worldEventBus.getHistory());
  const [textInput, setTextInput] = useState('');
  const [activeMemories, setActiveMemories] = useState<Memory[]>(
    advancedMemoryManager.getAllMemories().filter((m) => m.status === 'ACTIVE')
  );
  const memory = businessMemoryManager.getBusinessMemory();

  useEffect(() => {
    const unsub = worldEventBus.on('*', () => {
      setEvents(worldEventBus.getHistory());
    });
    const unsubMem = advancedMemoryManager.subscribe((list) => {
      setActiveMemories(list.filter((m) => m.status === 'ACTIVE'));
    });
    return () => {
      unsub();
      unsubMem();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');
    onSendText(text);
  };

  return (
    <div className="relative flex flex-col h-full rounded-2xl border border-cyan-500/30 bg-[#030714]/90 backdrop-blur-xl shadow-xl overflow-hidden font-mono w-full min-w-0 max-w-full">
      {/* Top Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-2 py-1.5 text-xs">
        <div className="flex items-center space-x-1">
          {(['VOICE', 'AGENT', 'NOTES'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-500 pr-1">YOU • FRIDAY</span>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
        {/* TAB 1: VOICE */}
        {activeTab === 'VOICE' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase">Session State</span>
                <span className="text-cyan-400 font-bold uppercase">{state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase">Microphone</span>
                <span className={isMuted ? 'text-amber-400' : 'text-emerald-400'}>
                  {isMuted ? 'MUTED' : 'LIVE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase">Model Channel</span>
                <span className="text-slate-300">gemini-3.8-live</span>
              </div>
            </div>

            {/* Audio Activity Meters */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>USER MIC SIGNAL</span>
                <span className="font-bold text-cyan-400">{Math.round(userVolume * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, userVolume * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>FRIDAY VOICE OUTPUT</span>
                <span className="font-bold text-rose-400">{Math.round(fridayVolume * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, fridayVolume * 100)}%` }}
                />
              </div>
            </div>

            {/* Central Preserved Single Mic Control */}
            <div className="pt-2 text-center">
              <button
                onClick={onToggleMute}
                className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-98 ${
                  isMuted
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 shadow-rose-500/20'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMuted ? 'UNMUTE MICROPHONE' : 'MUTE MICROPHONE'}</span>
              </button>
              <p className="text-[10px] text-slate-500 mt-1">Tap once to mute / unmute speech capture</p>
            </div>
          </div>
        )}

        {/* TAB 2: AGENT ACTIVITY STREAM */}
        {activeTab === 'AGENT' && (
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              Real-Time Worker Events ({events.length})
            </div>
            {events.map((evt) => (
              <div
                key={evt.id}
                className={`p-2.5 rounded-xl border text-[11px] space-y-1 transition-all ${
                  evt.level === 'success'
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : evt.level === 'warn'
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    : evt.level === 'error'
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-cyan-400">{evt.workerName || 'Core Manager'}</span>
                  <span className="text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="font-semibold">{evt.title}</div>
                <div className="text-[10px] opacity-80 whitespace-pre-wrap">{evt.details}</div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: NOTES & MEMORY */}
        {activeTab === 'NOTES' && (
          <div className="space-y-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              Active Memory Notes
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="text-cyan-300 font-bold">[Entity Briefing]</div>
              <p className="text-slate-300">{memory.businessName}</p>
              <div className="text-slate-500 text-[10px]">Audience: {memory.targetAudience}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="text-amber-300 font-bold">[Operational Model]</div>
              <p className="text-slate-300">
                {memory.projectInformation?.operationalModel || 'AI-assisted high-velocity digital agency.'}
              </p>
            </div>

            {memory.approvedStrategies.slice(0, 2).map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-[11px]">
                <div className="text-emerald-400 font-semibold">{s.title}</div>
                <p className="text-slate-400 text-[10px]">{s.summary}</p>
              </div>
            ))}

            {/* Part 12 Active Memories */}
            {activeMemories.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">
                  Memory Core ({activeMemories.length})
                </div>
                {activeMemories.slice(0, 3).map((m) => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/25 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-bold text-cyan-300">{m.type.replace('_', ' ')}</span>
                      <span className="text-slate-500">{m.importance}</span>
                    </div>
                    <div className="font-semibold text-white truncate">{m.title}</div>
                    <p className="text-slate-400 text-[10px] line-clamp-2">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Command Input Bar */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type instruction or command for FRIDAY..."
            className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 focus:border-cyan-500 outline-none"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="absolute right-1.5 p-1 rounded-lg text-cyan-400 hover:text-cyan-200 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
