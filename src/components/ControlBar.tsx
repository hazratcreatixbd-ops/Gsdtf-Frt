import React from 'react';
import { FridayState } from '../types/friday';
import { Mic, MicOff, PhoneOff, Hand, Power } from 'lucide-react';

interface ControlBarProps {
  state: FridayState;
  isMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  state,
  isMuted,
  onConnect,
  onDisconnect,
  onToggleMute,
  onInterrupt,
}) => {
  const isConnected = state !== 'disconnected';

  return (
    <div className="w-full max-w-sm mx-auto px-6 pb-8 pt-2 z-20">
      <div className="relative flex items-center justify-between px-6 py-3 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        {/* Left: Microphone Mute/Unmute */}
        <button
          onClick={onToggleMute}
          disabled={!isConnected}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all duration-200 active:scale-90 touch-manipulation ${
            !isConnected
              ? 'border-slate-800 text-slate-700 bg-slate-950/40 cursor-not-allowed'
              : isMuted
              ? 'border-rose-500/50 bg-rose-950/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
              : 'border-slate-700/60 bg-slate-800/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Center: Main Primary Voice Control */}
        <div className="relative -top-4">
          <div className="relative group">
            {/* Glowing red/blue ambient aura */}
            <div
              className={`absolute -inset-1 rounded-full blur-md transition-all duration-300 ${
                state === 'speaking'
                  ? 'bg-gradient-to-r from-rose-500 to-cyan-500 opacity-90 animate-pulse'
                  : state === 'listening'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 opacity-80 animate-pulse'
                  : state === 'connecting'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400 opacity-60 animate-spin'
                  : 'bg-gradient-to-r from-cyan-600/30 to-rose-600/30 opacity-40'
              }`}
            />

            <button
              onClick={() => {
                if (state === 'disconnected') {
                  onConnect();
                } else if (state === 'speaking') {
                  onInterrupt();
                } else {
                  // While listening, tap to interrupt or restart turn
                  onInterrupt();
                }
              }}
              aria-label={
                state === 'disconnected'
                  ? 'Start FRIDAY'
                  : state === 'speaking'
                  ? 'Interrupt FRIDAY'
                  : 'FRIDAY listening'
              }
              className={`relative flex flex-col items-center justify-center w-18 h-18 rounded-full border-2 transition-all duration-300 active:scale-95 shadow-2xl touch-manipulation ${
                state === 'speaking'
                  ? 'bg-gradient-to-b from-rose-950 to-slate-950 border-rose-400 text-rose-200'
                  : state === 'listening'
                  ? 'bg-gradient-to-b from-cyan-950 to-slate-950 border-cyan-400 text-cyan-200'
                  : state === 'connecting'
                  ? 'bg-gradient-to-b from-blue-950 to-slate-950 border-blue-400 text-blue-200'
                  : 'bg-gradient-to-b from-slate-900 to-slate-950 border-cyan-500/60 text-cyan-300 hover:border-cyan-400'
              }`}
            >
              {state === 'speaking' ? (
                <>
                  <Hand className="w-6 h-6 text-rose-300 animate-bounce" />
                  <span className="text-[8px] font-mono tracking-wider uppercase mt-1 text-rose-300 font-semibold">
                    Interrupt
                  </span>
                </>
              ) : state === 'listening' ? (
                <>
                  <div className="relative">
                    <Mic className="w-6 h-6 text-cyan-300" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  </div>
                  <span className="text-[8px] font-mono tracking-wider uppercase mt-1 text-cyan-300 font-semibold">
                    Listening
                  </span>
                </>
              ) : state === 'connecting' ? (
                <>
                  <div className="w-5 h-5 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
                  <span className="text-[8px] font-mono tracking-wider uppercase mt-1 text-blue-300">
                    Sync
                  </span>
                </>
              ) : (
                <>
                  <Power className="w-6 h-6 text-cyan-300" />
                  <span className="text-[8px] font-mono tracking-wider uppercase mt-1 text-cyan-300 font-semibold">
                    Start
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Disconnect / Hang Up Session */}
        <button
          onClick={onDisconnect}
          disabled={!isConnected}
          title="Disconnect FRIDAY"
          className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all duration-200 active:scale-90 touch-manipulation ${
            !isConnected
              ? 'border-slate-800 text-slate-700 bg-slate-950/40 cursor-not-allowed'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 hover:text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
          }`}
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
