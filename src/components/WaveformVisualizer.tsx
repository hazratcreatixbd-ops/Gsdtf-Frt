import React, { useEffect, useState } from 'react';
import { FridayState } from '../types/friday';

interface WaveformVisualizerProps {
  state: FridayState;
  userVolume: number;
  fridayVolume: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  state,
  userVolume,
  fridayVolume,
}) => {
  const [tick, setTick] = useState(0);

  // Smooth breathing animation loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      setTick((t) => t + 0.05);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const activeVolume =
    state === 'speaking' ? fridayVolume : state === 'listening' ? userVolume : 0;
  const barCount = 32;

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-14 px-6 py-2 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      {Array.from({ length: barCount }).map((_, i) => {
        // Bell curve envelope: taller in center, tapering to sides
        const distFromCenter =
          Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
        const envelope = Math.max(0.12, 1 - Math.pow(distFromCenter, 1.3));

        // Smooth breathing wave even at 0 volume
        const breathingFactor =
          Math.sin(tick * 2 + i * 0.35) * 0.15 + 0.2;

        let heightPercent: number;
        let barColor: string;

        if (state === 'speaking') {
          // Energetic speaking: alternating red & blue frequency spikes reacting to FRIDAY's voice
          const jitter = Math.sin(tick * 4 + i * 0.8);
          const amp = Math.min(1, activeVolume * 1.4);
          const dynamicFactor = breathingFactor * 0.4 + amp * (0.6 + 0.4 * Math.abs(jitter));
          heightPercent = Math.min(100, Math.max(10, envelope * dynamicFactor * 100));

          barColor =
            i % 2 === 0
              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
              : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
        } else if (state === 'listening') {
          // Listening: Cyan-blue dominant with subtle crimson accents, reacting to user mic
          const amp = Math.min(1, activeVolume * 1.5);
          const dynamicFactor = breathingFactor * 0.6 + amp * 0.7;
          heightPercent = Math.min(100, Math.max(8, envelope * dynamicFactor * 100));

          barColor =
            amp > 0.05
              ? (i % 3 === 0
                  ? 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.5)]'
                  : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]')
              : 'bg-cyan-500/70 shadow-[0_0_4px_rgba(6,182,212,0.3)]';
        } else if (state === 'connecting') {
          // Connecting: Scanning wave
          const scan = (Math.sin(tick * 3 - i * 0.3) + 1) / 2;
          heightPercent = Math.max(10, envelope * scan * 60);
          barColor = 'bg-blue-400/80 shadow-[0_0_6px_rgba(96,165,250,0.4)]';
        } else {
          // Disconnected / Standby: Calm subtle resting glow
          heightPercent = Math.max(8, envelope * breathingFactor * 40);
          barColor = 'bg-slate-700/40';
        }

        return (
          <div
            key={i}
            className={`w-1 sm:w-1.5 rounded-full transition-all duration-75 ${barColor}`}
            style={{
              height: `${heightPercent}%`,
              opacity: state === 'disconnected' ? 0.35 : 0.95,
            }}
          />
        );
      })}
    </div>
  );
};
