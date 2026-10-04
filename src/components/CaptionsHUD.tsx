import React, { useEffect, useRef } from 'react';
import { TranscriptionItem } from '../types/friday';
import { Sparkles, User, ChevronDown } from 'lucide-react';

interface CaptionsHUDProps {
  transcriptions: TranscriptionItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const CaptionsHUD: React.FC<CaptionsHUDProps> = ({
  transcriptions,
  isOpen,
  onClose,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptions, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-md mx-auto px-4 z-20 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-xl p-3 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider uppercase text-[10px]">
              Live Dialogue Stream
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            <span>Minimize</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Captions scroll box */}
        <div className="max-h-36 overflow-y-auto space-y-2 py-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {transcriptions.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono text-center py-2 italic">
              Speak to FRIDAY to see live spoken dialogue...
            </p>
          ) : (
            transcriptions.slice(-6).map((item) => (
              <div
                key={item.id}
                className={`flex items-start space-x-2 text-xs leading-relaxed ${
                  item.role === 'friday' ? 'text-cyan-200' : 'text-slate-300'
                }`}
              >
                <div
                  className={`mt-0.5 p-1 rounded-md shrink-0 ${
                    item.role === 'friday'
                      ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.role === 'friday' ? (
                    <Sparkles className="w-2.5 h-2.5" />
                  ) : (
                    <User className="w-2.5 h-2.5" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 mr-1.5">
                    {item.role === 'friday' ? 'FRIDAY' : 'You'}:
                  </span>
                  <span className="font-sans font-normal">{item.text}</span>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
