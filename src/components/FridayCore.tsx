import React, { useEffect, useRef } from 'react';
import { FridayState } from '../types/friday';
import { Mic, MicOff, Hand } from 'lucide-react';

interface FridayCoreProps {
  state: FridayState;
  userVolume: number;
  fridayVolume: number;
  isMuted?: boolean;
  onClick: () => void;
}

export const FridayCore: React.FC<FridayCoreProps> = ({
  state,
  userVolume,
  fridayVolume,
  isMuted = false,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Active audio volume depending on current state
  const currentVolume =
    state === 'speaking'
      ? fridayVolume
      : state === 'listening'
      ? userVolume
      : 0;

  const volRef = useRef(currentVolume);
  volRef.current = currentVolume;

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.035;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const currentState = stateRef.current;
      const rawVol = volRef.current;

      ctx.clearRect(0, 0, width, height);

      // Base breathing modulation (calm smooth breathing when idle or listening)
      const breathing = Math.sin(time * 1.5) * 6;
      const breathingFast = Math.sin(time * 3.0) * 8;
      const vol = Math.min(1, rawVol);

      // Futuristic Red & Blue Palette
      // Blue: Arc Cyan / Electric Blue (0, 195, 255)
      // Red: Neon Crimson / Scarlet (255, 38, 75)
      const blueR = '0, 195, 255';
      const redR = '255, 38, 75';

      let baseRadius = width * 0.23;
      let activeRadius = baseRadius + breathing;

      if (currentState === 'speaking') {
        activeRadius = baseRadius + breathingFast * 0.5 + vol * 42;
      } else if (currentState === 'listening') {
        activeRadius = baseRadius + breathing + vol * 30;
      } else if (currentState === 'connecting') {
        activeRadius = baseRadius + Math.sin(time * 4) * 5;
      } else {
        // Disconnected
        activeRadius = baseRadius * 0.9 + Math.sin(time * 0.8) * 3;
      }

      // 1. Dual-Tone Outer Futuristic Atmospheric Glow (Red on one hemisphere/angle, Blue on other)
      const glowRadius = activeRadius * 1.95;
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        activeRadius * 0.3,
        centerX,
        centerY,
        glowRadius
      );

      const glowIntensity =
        currentState === 'disconnected'
          ? 0.12
          : currentState === 'speaking'
          ? 0.45 + vol * 0.5
          : 0.28 + vol * 0.35;

      glowGrad.addColorStop(0, `rgba(255, 255, 255, ${glowIntensity * 0.8})`);
      glowGrad.addColorStop(0.35, `rgba(${blueR}, ${glowIntensity})`);
      glowGrad.addColorStop(0.7, `rgba(${redR}, ${glowIntensity * 0.7})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Harmonic Fluid Quantum Energy Rings (Intertwined Red & Blue Waves)
      const layers = currentState === 'disconnected' ? 2 : 4;
      for (let layer = 0; layer < layers; layer++) {
        const isBlue = layer % 2 === 0;
        const colorBase = isBlue ? blueR : redR;
        const layerRadius = activeRadius * (1 - layer * 0.08);
        const waveCount = 4 + layer * 2;
        const waveSpeed =
          currentState === 'speaking'
            ? 2.8 + layer * 0.5
            : currentState === 'listening'
            ? 1.5 + layer * 0.3
            : 0.8;
        const waveAmp =
          currentState === 'disconnected'
            ? 3
            : (6 + vol * 26) * (1 - layer * 0.15);

        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.04) {
          const wavePhase = (layer * Math.PI) / 3;
          const offset =
            Math.sin(a * waveCount + time * waveSpeed + wavePhase) *
            Math.cos(a * 2 - time * 0.6) *
            waveAmp;
          const r = layerRadius + offset;
          const x = centerX + Math.cos(a) * r;
          const y = centerY + Math.sin(a) * r;

          if (a === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        const strokeAlpha =
          currentState === 'disconnected'
            ? 0.2
            : 0.55 + vol * 0.45 - layer * 0.1;
        ctx.strokeStyle = `rgba(${colorBase}, ${strokeAlpha})`;
        ctx.lineWidth = 2.2 - layer * 0.35;
        ctx.shadowBlur = currentState === 'disconnected' ? 6 : 14 + vol * 16;
        ctx.shadowColor = `rgba(${colorBase}, 0.9)`;
        ctx.stroke();
      }

      // 3. Central Luminous Core Orb
      const coreRadius = activeRadius * 0.72;
      const coreGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.25,
        centerY - coreRadius * 0.25,
        2,
        centerX,
        centerY,
        coreRadius
      );

      if (currentState === 'disconnected') {
        coreGrad.addColorStop(0, 'rgba(148, 163, 184, 0.4)');
        coreGrad.addColorStop(0.5, 'rgba(30, 41, 59, 0.5)');
        coreGrad.addColorStop(1, 'rgba(3, 7, 18, 0.85)');
      } else {
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        coreGrad.addColorStop(0.3, `rgba(${blueR}, 0.85)`);
        coreGrad.addColorStop(0.65, `rgba(${redR}, 0.6)`);
        coreGrad.addColorStop(1, 'rgba(5, 8, 20, 0.92)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = currentState === 'disconnected' ? 8 : 22 + vol * 24;
      ctx.shadowColor =
        currentState === 'speaking'
          ? `rgba(${redR}, 0.9)`
          : `rgba(${blueR}, 0.9)`;
      ctx.fill();

      // 4. Concentric High-Tech HUD Rings with Red/Blue Nodes
      if (currentState !== 'disconnected') {
        ctx.save();
        ctx.translate(centerX, centerY);

        // Ring 1: Clockwise Blue Segmented HUD Ring
        ctx.rotate(time * 0.4);
        const hudR1 = activeRadius * 1.32;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${blueR}, 0.45)`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${blueR}, 0.6)`;

        ctx.beginPath();
        ctx.arc(0, 0, hudR1, 0, Math.PI * 0.6);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, hudR1, Math.PI * 0.8, Math.PI * 1.4);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, hudR1, Math.PI * 1.6, Math.PI * 2.1);
        ctx.stroke();

        // Ring 2: Counter-Clockwise Crimson Red Accent Ring
        ctx.rotate(-time * 0.7);
        const hudR2 = activeRadius * 1.45;
        ctx.strokeStyle = `rgba(${redR}, 0.4)`;
        ctx.shadowColor = `rgba(${redR}, 0.5)`;

        ctx.beginPath();
        ctx.arc(0, 0, hudR2, Math.PI * 0.2, Math.PI * 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, hudR2, Math.PI * 1.1, Math.PI * 1.4);
        ctx.stroke();

        // 3 Glowing Quantum Nodes (Alternating Red and Blue)
        for (let p = 0; p < 3; p++) {
          const angle = p * ((Math.PI * 2) / 3) + time * 0.6;
          const px = Math.cos(angle) * (hudR1 + 4);
          const py = Math.sin(angle) * (hudR1 + 4);
          const isNodeRed = p % 2 === 1;

          ctx.beginPath();
          ctx.arc(px, py, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = isNodeRed ? '#ff264b' : '#00c3ff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = isNodeRed ? '#ff264b' : '#00c3ff';
          ctx.fill();
        }

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none my-auto">
      {/* Outer ambient red & blue futuristic glow aura */}
      <div
        className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
          state === 'speaking'
            ? 'w-80 h-80 sm:w-96 sm:h-96 bg-gradient-to-tr from-rose-600/30 via-cyan-500/25 to-blue-600/30 blur-3xl'
            : state === 'listening'
            ? 'w-72 h-72 sm:w-88 sm:h-88 bg-gradient-to-tr from-cyan-500/25 via-blue-600/20 to-rose-600/20 blur-3xl'
            : state === 'connecting'
            ? 'w-64 h-64 bg-cyan-600/20 blur-2xl animate-pulse'
            : 'w-56 h-56 bg-slate-800/15 blur-2xl'
        }`}
      />

      {/* Main Touch-Responsive Central Orb */}
      <button
        onClick={onClick}
        type="button"
        aria-label={
          state === 'disconnected'
            ? 'Awaken FRIDAY'
            : state === 'speaking'
            ? 'Interrupt FRIDAY'
            : 'FRIDAY listening'
        }
        className="relative z-10 group cursor-pointer focus:outline-none transition-transform duration-300 active:scale-95 touch-manipulation"
      >
        <canvas
          ref={canvasRef}
          width={380}
          height={380}
          className="w-72 h-72 sm:w-84 sm:h-84 drop-shadow-[0_0_35px_rgba(0,195,255,0.25)]"
        />

        {/* Central Tactical Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {state === 'disconnected' && (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border border-cyan-400/50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(0,195,255,0.35)] transition-all group-hover:scale-105 overflow-hidden">
                <img
                  src="./friday-logo.svg"
                  alt="FRIDAY Core"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 object-contain rounded-full"
                />
              </div>
              <span className="mt-3 text-[11px] font-mono tracking-widest text-cyan-300/90 uppercase font-semibold">
                Tap to Awaken
              </span>
            </div>
          )}

          {state === 'connecting' && (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 border-b-rose-500 rounded-full animate-spin" />
              <span className="mt-3 text-[10px] font-mono tracking-widest text-cyan-300 uppercase">
                Connecting
              </span>
            </div>
          )}

          {state === 'listening' && (
            <div className="flex flex-col items-center">
              <div className="w-13 h-13 rounded-full border border-cyan-400/40 bg-slate-950/40 backdrop-blur-md flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,195,255,0.3)]">
                {isMuted ? (
                  <MicOff className="w-6 h-6 text-rose-400" />
                ) : (
                  <div className="relative">
                    <Mic className="w-6 h-6 text-cyan-300" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                  </div>
                )}
              </div>
            </div>
          )}

          {state === 'speaking' && (
            <div className="flex flex-col items-center">
              <div className="w-13 h-13 rounded-full border border-rose-500/50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center text-rose-300 shadow-[0_0_20px_rgba(255,38,75,0.35)]">
                <Hand className="w-6 h-6 text-rose-300 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
};
