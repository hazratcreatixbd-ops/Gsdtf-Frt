import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  Languages,
  Zap,
  Globe,
  ShieldCheck,
  Server,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff,
  UserCheck,
  ShieldAlert,
  Mic,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  Copy,
  HelpCircle,
} from 'lucide-react';
import { LiveSession, EndpointHealthReport } from '../services/LiveSession';
import {
  speakerVerificationManager,
  SpeakerVerificationState,
  VerificationResult,
} from '../services/SpeakerVerificationManager';
import { wakeWordDetector, WakePhrase, WakeWordConfig } from '../services/WakeWordDetector';

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
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Authorized Speaker Verification State
  const [speakerState, setSpeakerState] = useState<SpeakerVerificationState>(() =>
    speakerVerificationManager.getCurrentState()
  );
  const [speakerEnabled, setSpeakerEnabled] = useState<boolean>(() => speakerVerificationManager.isEnabled());
  const [speakerResult, setSpeakerResult] = useState<VerificationResult | null>(() =>
    speakerVerificationManager.getLastResult()
  );
  const [enrollmentStep, setEnrollmentStep] = useState<number>(() =>
    speakerVerificationManager.getEnrollmentStep()
  );
  const [enrollmentMsg, setEnrollmentMsg] = useState<string>('');
  const [wakeConfig, setWakeConfig] = useState<WakeWordConfig>(() => wakeWordDetector.getConfig());
  const [wakeState, setWakeState] = useState<string>(() => wakeWordDetector.getState());

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

      const unsub = speakerVerificationManager.subscribe((st, res) => {
        setSpeakerState(st);
        setSpeakerResult(res);
        setSpeakerEnabled(speakerVerificationManager.isEnabled());
        setEnrollmentStep(speakerVerificationManager.getEnrollmentStep());
      });

      const unsubWake = wakeWordDetector.subscribe((ev) => {
        setWakeState(ev.state);
        setWakeConfig(wakeWordDetector.getConfig());
      });

      return () => {
        unsub();
        unsubWake();
      };
    }
  }, [isOpen, runDiagnostics]);

  const handleToggleWakeWord = () => {
    const updated = !wakeConfig.enabled;
    wakeWordDetector.saveConfig({ enabled: updated });
    setWakeConfig(wakeWordDetector.getConfig());
  };

  const handleSelectWakePhrase = (phrase: WakePhrase) => {
    wakeWordDetector.saveConfig({ wakePhrase: phrase });
    setWakeConfig(wakeWordDetector.getConfig());
  };

  const handleToggleRequireSpeaker = () => {
    const updated = !wakeConfig.requireAuthorizedSpeaker;
    wakeWordDetector.saveConfig({ requireAuthorizedSpeaker: updated });
    setWakeConfig(wakeWordDetector.getConfig());
  };

  const handleToggleSpeaker = () => {
    const next = !speakerEnabled;
    speakerVerificationManager.setEnabled(next);
    setSpeakerEnabled(next);
  };

  const handleStartEnrollment = () => {
    setEnrollmentMsg('');
    speakerVerificationManager.startEnrollment();
  };

  const handleCompleteStep = () => {
    const res = speakerVerificationManager.completeEnrollmentStep();
    setEnrollmentMsg(res.message);
  };

  const handleCancelEnrollment = () => {
    speakerVerificationManager.cancelEnrollment();
    setEnrollmentMsg('');
  };

  const handleResetVoiceprint = () => {
    speakerVerificationManager.resetVoiceprint();
    setEnrollmentMsg('Voiceprint reset successfully.');
    setTimeout(() => setEnrollmentMsg(''), 3000);
  };

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
    if (!serverUrl && LiveSession.isBundledLocalOrigin()) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-amber-300 flex items-center space-x-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>NOT CONFIGURED</span>
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCommand(label);
    setTimeout(() => setCopiedCommand(null), 2500);
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
              Enter your deployed Cloud Run, Render, or LAN FRIDAY backend URL (e.g. <code className="text-cyan-300">https://friday-server-xxxxxx-as.a.run.app</code> or <code className="text-cyan-300">http://192.168.1.100:3000</code>).
            </p>
            <form onSubmit={handleSaveServerUrl} className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://friday-server-xxxxxx-as.a.run.app"
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
                  <span className="truncate text-slate-200">{healthReport.wsUrl || 'None configured'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Endpoint Type:</span>
                  <span>
                    {healthReport.isPreviewEndpoint
                      ? 'AI Studio Dev/Preview Container (Sleeps when idle)'
                      : healthReport.reachable
                      ? 'Permanent Deployed Production Server'
                      : 'Unconfigured / Offline'}
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

            {/* AI Studio Preview Warning Notice */}
            {healthReport?.isPreviewEndpoint && (
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] font-mono text-amber-200/90 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>AI Studio Preview Container Detected</span>
                </div>
                <p className="text-[10px] text-amber-300/80 leading-relaxed font-sans">
                  AI Studio dev containers sleep when idle and reject external mobile traffic with Google authentication redirects. Standalone Android APKs need a permanently deployed backend (e.g. Google Cloud Run, Render, Railway, or local LAN IP).
                </p>
              </div>
            )}

            {/* Mobile-Friendly Deployment Instructions Accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDeployGuide(!showDeployGuide)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How to Deploy Backend (From Android Phone)</span>
                </div>
                {showDeployGuide ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {showDeployGuide && (
                <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs font-mono text-slate-300">
                  <div className="border-b border-slate-800/80 pb-2">
                    <p className="font-bold text-cyan-400">Option 1: Google Cloud Run (Recommended — Free Tier)</p>
                    <p className="text-[11px] text-slate-400 font-sans mt-1">
                      You can deploy directly from your Android phone using Google Cloud Shell in Chrome browser (<code className="text-cyan-300">shell.cloud.google.com</code>):
                    </p>
                    <div className="relative mt-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 overflow-x-auto">
                      <code>
                        gcloud run deploy friday-server \<br />
                        &nbsp;&nbsp;--source . \<br />
                        &nbsp;&nbsp;--platform managed \<br />
                        &nbsp;&nbsp;--region asia-southeast1 \<br />
                        &nbsp;&nbsp;--allow-unauthenticated \<br />
                        &nbsp;&nbsp;--set-env-vars GEMINI_API_KEY="YOUR_KEY" \<br />
                        &nbsp;&nbsp;--session-affinity \<br />
                        &nbsp;&nbsp;--timeout 3600
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            'gcloud run deploy friday-server --source . --platform managed --region asia-southeast1 --allow-unauthenticated --set-env-vars GEMINI_API_KEY="YOUR_KEY" --session-affinity --timeout 3600',
                            'cloudrun'
                          )
                        }
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
                        title="Copy command"
                      >
                        {copiedCommand === 'cloudrun' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="border-b border-slate-800/80 pb-2">
                    <p className="font-bold text-cyan-400">Option 2: Render.com (Zero CLI — 1-Click from GitHub)</p>
                    <p className="text-[11px] text-slate-400 font-sans mt-1">
                      1. Push repository to GitHub.<br />
                      2. Open <code className="text-cyan-300">dashboard.render.com</code> on your phone.<br />
                      3. Create <strong>New + Web Service</strong> → select repo → Docker.<br />
                      4. Add Environment Variable: <code className="text-cyan-300">GEMINI_API_KEY</code>.<br />
                      5. Copy the generated <code className="text-cyan-300">https://xxx.onrender.com</code> URL.
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-cyan-400">Option 3: Local Wi-Fi LAN Testing (Zero Cost)</p>
                    <p className="text-[11px] text-slate-400 font-sans mt-1">
                      If your PC and phone share the same Wi-Fi, run <code className="text-cyan-300">npm start</code> on your PC, then enter <code className="text-cyan-300">http://&lt;PC-LAN-IP&gt;:3000</code> above and tap Save & Verify.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AUTHORIZED SPEAKER VERIFICATION PANEL (Part 15B) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between text-purple-400 text-xs font-mono font-semibold">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>AUTHORIZED SPEAKER VERIFICATION</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                    speakerState === 'ACTIVE_VERIFIED'
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : speakerState === 'UNCERTAIN_SPEAKER'
                      ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                      : speakerState === 'UNAUTHORIZED_SPEAKER'
                      ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                      : speakerState === 'ENROLLING'
                      ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {speakerState === 'ACTIVE_VERIFIED'
                    ? 'VERIFIED'
                    : speakerState === 'UNCERTAIN_SPEAKER'
                    ? 'UNCERTAIN'
                    : speakerState === 'UNAUTHORIZED_SPEAKER'
                    ? 'UNAUTHORIZED'
                    : speakerState === 'ENROLLING'
                    ? `ENROLLING (${enrollmentStep}/3)`
                    : speakerState === 'DISABLED'
                    ? 'DISABLED'
                    : 'NOT ENROLLED'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleSpeaker}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                    speakerEnabled
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {speakerEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Protects cross-app actions (typing messages, sending, deleting, or device settings) by verifying your vocal resonance and acoustic signature. TV audio, background conversations, and unauthorized speakers are rejected.
            </p>

            {/* Verification Status & Confidence Display */}
            {speakerEnabled && speakerResult && (
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Match Confidence:</span>
                  <span className={speakerResult.authorized ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {(speakerResult.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      speakerResult.authorized ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.round(speakerResult.confidence * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {speakerResult.reason}
                </p>
              </div>
            )}

            {/* Interactive Enrollment Flow */}
            {speakerState === 'ENROLLING' && (
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono text-purple-300">
                  <span className="font-bold flex items-center space-x-1.5">
                    <Mic className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                    <span>Voice Enrollment: Step {enrollmentStep} of 3</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelEnrollment}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Cancel
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-purple-500/20 text-xs font-mono text-slate-200">
                  {enrollmentStep === 1 && (
                    <span>Please say clearly: <strong className="text-cyan-300">"FRIDAY, authorize my voice"</strong></span>
                  )}
                  {enrollmentStep === 2 && (
                    <span>Please say clearly: <strong className="text-cyan-300">"This is my voiceprint sample"</strong></span>
                  )}
                  {enrollmentStep === 3 && (
                    <span>Please say clearly: <strong className="text-cyan-300">"Security confirmation alpha"</strong></span>
                  )}
                </div>
                {enrollmentMsg && (
                  <p className="text-[10px] font-mono text-amber-300">{enrollmentMsg}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCompleteStep}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-slate-950 font-mono font-bold text-xs transition"
                  >
                    {enrollmentStep < 3 ? `Save Sample ${enrollmentStep} & Next` : 'Finalize & Authorize Voiceprint'}
                  </button>
                </div>
              </div>
            )}

            {/* Enrolled Controls */}
            {speakerState !== 'ENROLLING' && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {speakerVerificationManager.isEnrolled() ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStartEnrollment}
                      className="py-1.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-mono transition flex items-center space-x-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Re-enroll Voice</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetVoiceprint}
                      className="py-1.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs font-mono transition flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Reset Biometrics</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartEnrollment}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-950 text-xs font-mono font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Enroll Authorized Voiceprint</span>
                  </button>
                )}
              </div>
            )}

            {enrollmentMsg && speakerState !== 'ENROLLING' && (
              <p className="text-[10px] font-mono text-emerald-400">{enrollmentMsg}</p>
            )}

            <div className="flex items-start space-x-2 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
              <Lock className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
              <span>
                Privacy Guarantee: Acoustic vectors only. Raw voice recordings are never stored on disk or sent to external databases.
              </span>
            </div>
          </div>

          {/* HANDS-FREE WAKE WORD PANEL (Part 15.1) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between text-cyan-400 text-xs font-mono font-semibold">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                <span>HANDS-FREE WAKE WORD ACTIVATION</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                    wakeState === 'LISTENING'
                      ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 animate-pulse'
                      : wakeState === 'ACTIVATED'
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : wakeState === 'UNAUTHORIZED_REJECTED'
                      ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {wakeState}
                </span>
                <button
                  type="button"
                  onClick={handleToggleWakeWord}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                    wakeConfig.enabled
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {wakeConfig.enabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Allows FRIDAY to wake up automatically when you say the selected phrase. Integrates Voice Activity Detection (VAD) and noise suppression.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Configured Wake Phrase</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Hey FRIDAY', 'FRIDAY', 'Hey Assistant', 'Computer'] as WakePhrase[]).map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleSelectWakePhrase(phrase)}
                    className={`p-2 rounded-xl text-xs font-mono border text-left transition ${
                      wakeConfig.wakePhrase === phrase
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    "{phrase}"
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <span className="text-slate-300 text-[11px]">Require Enrolled Speaker Match:</span>
              <button
                type="button"
                onClick={handleToggleRequireSpeaker}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  wakeConfig.requireAuthorizedSpeaker
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {wakeConfig.requireAuthorizedSpeaker ? 'REQUIRED (FAIL CLOSED)' : 'OPEN'}
              </button>
            </div>
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
