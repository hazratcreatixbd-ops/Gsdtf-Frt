import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Languages, Zap, Globe, ShieldCheck, Server, CheckCircle2, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { LiveSession, EndpointHealthReport } from '../services/LiveSession';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [serverUrl, setServerUrl] = useState<string>(() => LiveSession.getServerBaseUrl());
  const [savedNotice, setSavedNotice] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [testingWs, setTestingWs] = useState(false);
  const [healthReport, setHealthReport] = useState<EndpointHealthReport | null>(null);

  const runDiagnostics = useCallback(async (targetUrl?: string, fullWsTest = false) => {
    if (fullWsTest) {
      setTestingWs(true);
    } else {
      setCheckingHealth(true);
    }
    try {
      const report = await LiveSession.checkServerHealth(targetUrl, fullWsTest);
      setHealthReport(report);
    } finally {
      setCheckingHealth(false);
      setTestingWs(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const current = LiveSession.getServerBaseUrl();
      setServerUrl(current);
      runDiagnostics(current, false);
    }
  }, [isOpen, runDiagnostics]);

  if (!isOpen) return null;

  const handleSaveServerUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = LiveSession.normalizeServerUrl(serverUrl);
    setServerUrl(clean);
    try {
      if (clean) {
        localStorage.setItem('friday_server_url', clean);
      } else {
        localStorage.removeItem('friday_server_url');
      }
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch {}
    await runDiagnostics(clean, true);
  };

  const renderEndpointStatusBadge = () => {
    if (checkingHealth || testingWs) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/40 text-cyan-300 flex items-center space-x-1">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          <span>{testingWs ? 'TESTING LIVE WS...' : 'CHECKING...'}</span>
        </span>
      );
    }
    if (!healthReport) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
          UNVERIFIED
        </span>
      );
    }
    if (healthReport.reachable && healthReport.hasGeminiKey && healthReport.wsHandshakeOk) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 flex items-center space-x-1">
          <Wifi className="w-2.5 h-2.5" />
          <span>ONLINE ({healthReport.latencyMs}ms)</span>
        </span>
      );
    }
    if (healthReport.reachable && !healthReport.hasGeminiKey) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-amber-300 flex items-center space-x-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>MISSING API KEY</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-rose-300 flex items-center space-x-1">
        <WifiOff className="w-2.5 h-2.5" />
        <span>UNREACHABLE / OFFLINE</span>
      </span>
    );
  };

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
          {/* Android / Mobile Live Server Endpoint Configuration & Real Diagnostics */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center justify-between text-cyan-400 text-xs font-mono font-semibold gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <Server className="w-4 h-4 shrink-0" />
                <span className="truncate">FRIDAY SERVER ENDPOINT</span>
              </div>
              {renderEndpointStatusBadge()}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your deployed Cloud Run or LAN FRIDAY backend URL (e.g. <code className="text-cyan-300">https://your-friday-server.run.app</code> or <code className="text-cyan-300">http://192.168.1.100:3000</code>). Saving automatically normalizes the URL and verifies live WebSocket reachability.
            </p>
            <form onSubmit={handleSaveServerUrl} className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://your-friday-server.run.app"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 outline-none"
              />
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {savedNotice ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Saved</span>
                    </>
                  ) : (
                    <span>Save & Verify</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => runDiagnostics(serverUrl, true)}
                  disabled={checkingHealth || testingWs}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                  title="Test HTTP Health & Gemini Live WebSocket Handshake"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth || testingWs ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Test WS</span>
                </button>
              </div>
            </form>

            {/* Real-Time Connection Diagnostic Trace */}
            {healthReport && (
              <div
                className={`mt-2 p-2.5 rounded-xl border text-[11px] font-mono space-y-1 ${
                  healthReport.reachable && healthReport.wsHandshakeOk
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Resolved WS:</span>
                  <span className="truncate text-slate-200">{healthReport.wsUrl}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Endpoint Type:</span>
                  <span>
                    {healthReport.isPreviewEndpoint
                      ? 'AI Studio Dev/Preview Container (Sleeps when idle)'
                      : 'Custom / Deployed Server'}
                  </span>
                </div>
                {healthReport.errorReason ? (
                  <div className="text-rose-300 pt-0.5 break-words leading-snug">
                    Diagnostic: {healthReport.errorReason}
                  </div>
                ) : (
                  <div className="text-emerald-300 pt-0.5">
                    Diagnostic: Backend HTTP /api/health & Gemini Live /api/live ready ({healthReport.model || 'gemini-3.8-live'}).
                  </div>
                )}
              </div>
            )}
          </div>

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
