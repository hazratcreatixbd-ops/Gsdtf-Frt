/**
 * PART 6 — FRIDAY Device Control Drawer
 * Expandable status and diagnostic drawer showing Android Native Bridge status,
 * device capabilities, accessibility state, and background task queue.
 */

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Youtube,
  MessageSquare,
  Globe,
  Layers,
  Clock,
  RefreshCw,
  X,
  ExternalLink,
  Shield,
  Activity,
  Home,
  Search,
  Play,
  Sparkles,
  History,
  Grid,
} from 'lucide-react';
import { androidBridge } from '../services/AndroidBridge/AndroidBridge';
import { backgroundExecutionQueue } from '../services/AndroidBridge/BackgroundExecutionQueue';
import { nativeEventBus } from '../services/AndroidBridge/NativeEventBus';
import {
  AndroidCapabilities,
  AndroidDeviceInfo,
  BackgroundTaskSpec,
  NativeEvent,
  InstalledAppInfo,
} from '../types/android';

interface DeviceControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceControlDrawer: React.FC<DeviceControlDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'diagnostics'>('workspace');
  const [isAvailable, setIsAvailable] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<AndroidDeviceInfo>({
    platform: 'web',
    isNativeWrapper: false,
  });
  const [capabilities, setCapabilities] = useState<AndroidCapabilities>({
    android: false,
    browser: true,
    youtube: false,
    whatsapp: false,
    accessibility: false,
    notifications: false,
    backgroundExecution: false,
    installedAppsCheck: false,
    directAppLaunch: false,
  });
  const [accessibilityStatus, setAccessibilityStatus] = useState<any>(null);
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTaskSpec[]>([]);
  const [recentEvents, setRecentEvents] = useState<NativeEvent[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledAppInfo[]>([]);
  const [recentApps, setRecentApps] = useState<InstalledAppInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  const refreshDiagnostics = async () => {
    const avail = androidBridge.isAvailable();
    setIsAvailable(avail);

    const info = await androidBridge.getDeviceInfo();
    setDeviceInfo(info);

    const caps = androidBridge.getSupportedCapabilities();
    setCapabilities(caps);

    const acc = await androidBridge.requestAccessibilityStatus();
    setAccessibilityStatus(acc);

    const apps = await androidBridge.getInstalledApps();
    setInstalledApps(apps);

    const rec = await androidBridge.getRecentApps();
    if (rec.success && Array.isArray(rec.data)) {
      setRecentApps(rec.data);
    }

    setBackgroundTasks(backgroundExecutionQueue.getTasks());
    setRecentEvents(nativeEventBus.getHistory().slice(0, 10));
  };

  useEffect(() => {
    if (isOpen) {
      refreshDiagnostics();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubBg = backgroundExecutionQueue.subscribe((tasks) => setBackgroundTasks(tasks));
    const unsubEvents = nativeEventBus.onAny(() => {
      setRecentEvents(nativeEventBus.getHistory().slice(0, 10));
    });
    return () => {
      unsubBg();
      unsubEvents();
    };
  }, []);

  const handleGoHome = async () => {
    const res = await androidBridge.goHome();
    const prefix = res.executionMode === 'CONNECTED_NATIVE' ? '[Real Device] ' : '[Preview / Simulated] ';
    setLaunchMessage(prefix + res.message);
    setTimeout(() => setLaunchMessage(null), 3500);
  };

  const handleLaunchApp = async (app: InstalledAppInfo) => {
    const res = await androidBridge.launchApp(app.packageName, app.appName);
    const prefix = res.executionMode === 'CONNECTED_NATIVE' ? '[Real Device] ' : '[Preview / Simulated] ';
    setLaunchMessage(prefix + res.message);
    const rec = await androidBridge.getRecentApps();
    if (rec.success && Array.isArray(rec.data)) {
      setRecentApps(rec.data);
    }
    setTimeout(() => setLaunchMessage(null), 3500);
  };

  const filteredApps = installedApps.filter(
    (app) =>
      app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.category && app.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-slate-950/95 border-l border-cyan-500/40 p-5 overflow-y-auto flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.25)] animate-in slide-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                <span>SECOND HOME</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  WORKSPACE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Android App Launcher & Universal Subsystem
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshDiagnostics}
              className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-slate-800 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800 transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1.5 mt-3 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'workspace'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Workspace & Apps</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'diagnostics'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Real Device vs Preview Indicator Banner */}
        <div className={`mt-3 p-3 rounded-2xl border flex items-center justify-between text-xs font-mono transition-all ${
          isAvailable
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            {isAvailable ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="font-bold tracking-wider block text-[11px] truncate">
                {isAvailable ? 'CONNECTED ANDROID DEVICE' : 'PREVIEW / SIMULATED ENVIRONMENT'}
              </span>
              <span className="text-[10px] text-slate-400 font-sans block truncate">
                {isAvailable
                  ? 'Real hardware actions execute directly via Android Native Bridge.'
                  : 'Demonstrating in web sandbox. Real execution occurs in FRIDAY Android APK.'}
              </span>
            </div>
          </div>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border shrink-0 ml-2 font-mono ${
            isAvailable ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40' : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
          }`}>
            {isAvailable ? 'REAL ACTION' : 'SIMULATED'}
          </span>
        </div>

        {/* Active Feedback Banner */}
        {launchMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs font-mono flex items-center space-x-2 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">{launchMessage}</span>
          </div>
        )}

        {/* TAB 1: SECOND HOME / WORKSPACE SECTION */}
        {activeTab === 'workspace' && (
          <div className="space-y-4 mt-4">
            {/* Quick Home Screen Button */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-100 flex items-center space-x-1.5">
                  <Home className="w-4 h-4 text-cyan-400" />
                  <span>Android Home Screen</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Voice: "FRIDAY, go to the home screen"
                </p>
              </div>
              <button
                onClick={handleGoHome}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center space-x-1.5 transition-all shadow-sm ${
                  isAvailable
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 border-emerald-500/40'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border-cyan-500/40'
                }`}
              >
                <span>{isAvailable ? 'Go Home (Real)' : 'Simulate Home'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Recent Apps Session Tray */}
            {recentApps.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                    <History className="w-3 h-3 text-cyan-400" />
                    <span>Recently Opened in Workspace</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">{recentApps.length} active</span>
                </div>
                <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                  {recentApps.map((app) => (
                    <button
                      key={app.packageName}
                      onClick={() => handleLaunchApp(app)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-mono shrink-0 flex items-center space-x-1.5 transition-colors"
                    >
                      <Play className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{app.appName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* App Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search installed apps (Chrome, YouTube, Calculator)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Discovered Installed Apps Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                  Discovered Applications ({filteredApps.length})
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Launchable</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                {filteredApps.map((app) => (
                  <div
                    key={app.packageName}
                    className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex items-center justify-between space-x-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-medium text-slate-200 truncate">{app.appName}</span>
                        {app.category && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {app.category}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 truncate block">
                        {app.packageName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleLaunchApp(app)}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-mono shrink-0 transition-colors flex items-center space-x-1 ${
                        isAvailable
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                          : 'bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/20'
                      }`}
                      title={`Launch ${app.appName} (${isAvailable ? 'Real Device Action' : 'Simulated in Preview'})`}
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>{isAvailable ? 'Launch (Real)' : 'Simulate'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Natural Voice Command Examples */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono uppercase text-cyan-400 tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Voice Command Matching</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  “FRIDAY, open Chrome”
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  “FRIDAY, open YouTube”
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  “FRIDAY, open WhatsApp”
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  “FRIDAY, open Calculator”
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  “FRIDAY, open Settings”
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  “FRIDAY, go to home screen”
                </div>
              </div>
            </div>

            {/* Android Security & Boundaries */}
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 text-[11px] space-y-1.5">
              <span className="font-semibold text-slate-300 font-mono flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Android OS Security Boundaries</span>
              </span>
              <ul className="text-slate-400 space-y-1 list-disc pl-4 text-[10px]">
                <li><strong className="text-emerald-400">Supported:</strong> Launching installed apps via Android Launch Intents, opening external URLs, deep linking to YouTube/WhatsApp, and navigating to Home.</li>
                <li><strong className="text-amber-400">OS Protected:</strong> Arbitrary UI manipulation, background snooping on other apps, and lock-screen bypass are strictly restricted by Android security controls.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: SYSTEM & BRIDGE DIAGNOSTICS */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-4 mt-4">
            {/* Connection Status Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300 flex items-center space-x-2">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Native Bridge Connection</span>
                </span>
                {isAvailable ? (
                  <span className="flex items-center space-x-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>CONNECTED</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    <span>WEB FALLBACK</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                {isAvailable
                  ? 'FRIDAY is running inside the Android Native wrapper with full Intent dispatch & device control active.'
                  : 'FRIDAY is active in browser mode. Direct package launch and automated gestures require the FRIDAY Android Native wrapper.'}
              </p>
            </div>

            {/* Device Info Cards */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                Environment & Hardware
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Platform</span>
                  <span className="text-slate-200 capitalize">{deviceInfo.platform}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Wrapper Status</span>
                  <span className={deviceInfo.isNativeWrapper ? 'text-emerald-400' : 'text-slate-400'}>
                    {deviceInfo.isNativeWrapper ? 'Native Android' : 'Web Browser'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 col-span-2 truncate">
                  <span className="text-[10px] text-slate-500 block">Model / Agent</span>
                  <span className="text-slate-300 truncate block">
                    {deviceInfo.model || 'Standard Client'}
                  </span>
                </div>
              </div>
            </div>

            {/* Capabilities Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                  Capability Registry
                </span>
                <span className="text-[10px] font-mono text-cyan-400">Real-time Verified</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <span className="flex items-center space-x-2 text-slate-300">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Android Native Bridge</span>
                  </span>
                  <span className={capabilities.android ? 'text-emerald-400' : 'text-slate-500'}>
                    {capabilities.android ? 'Active' : 'Offline (Web)'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <span className="flex items-center space-x-2 text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Browser (In-App & Phone)</span>
                  </span>
                  <span className="text-emerald-400">Supported</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <span className="flex items-center space-x-2 text-slate-300">
                    <Youtube className="w-3.5 h-3.5 text-rose-400" />
                    <span>YouTube Deep Linking</span>
                  </span>
                  <span className="text-emerald-400">
                    {capabilities.youtube ? 'Native Intent' : 'Web Deep Link'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <span className="flex items-center space-x-2 text-slate-300">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Integration</span>
                  </span>
                  <span className="text-emerald-400">
                    {capabilities.whatsapp ? 'Native Intent' : 'wa.me Deep Link'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <span className="flex items-center space-x-2 text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Accessibility Gestures</span>
                  </span>
                  <span className={capabilities.accessibility ? 'text-emerald-400' : 'text-slate-500'}>
                    {capabilities.accessibility ? 'Enabled' : 'Disabled (Requires OS)'}
                  </span>
                </div>

                {!capabilities.accessibility && (
                  <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/40 text-[11px] font-sans text-amber-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300 text-xs flex items-center space-x-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>Accessibility Service Required</span>
                      </span>
                      <button
                        onClick={() => androidBridge.openSettings('accessibility')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 border border-amber-500/50 text-[10px] font-mono text-amber-100 transition-all flex items-center space-x-1 font-semibold"
                      >
                        <span>Open Android Settings</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-300 space-y-1">
                      <p className="font-medium text-amber-200">How to enable on your device:</p>
                      <ol className="list-decimal pl-4 space-y-0.5 text-slate-400">
                        <li>Tap <strong className="text-slate-200">Open Android Settings</strong> above (opens Android Settings &gt; Accessibility).</li>
                        <li>Scroll down to <strong className="text-slate-200">Downloaded apps</strong> or <strong className="text-slate-200">Installed services</strong>.</li>
                        <li>Tap <strong className="text-cyan-300">FRIDAY AI Assistant</strong>.</li>
                        <li>Toggle the switch to <strong className="text-emerald-400">ON</strong> and tap "Allow".</li>
                      </ol>
                      <p className="text-[9px] text-amber-300/80 italic mt-1">
                        Notice: FRIDAY never silently enables Accessibility. It is strictly controlled by you in Android OS settings.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <span className="flex items-center space-x-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>24/7 Background Service</span>
                  </span>
                  <span className={capabilities.backgroundExecution ? 'text-emerald-400' : 'text-slate-500'}>
                    {capabilities.backgroundExecution
                      ? deviceInfo.foregroundServiceRunning
                        ? 'Running (Foreground)'
                        : 'Ready (Foreground Service)'
                      : 'Tab Scope (Web)'}
                  </span>
                </div>

                {isAvailable && deviceInfo.ignoringBatteryOptimizations === false && (
                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-[11px] font-sans text-cyan-200/90 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-cyan-300 text-xs flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Unrestricted Battery Recommended</span>
                      </span>
                      <button
                        onClick={() => androidBridge.openSettings('battery_optimization')}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-500/50 text-[10px] font-mono text-cyan-100 transition-all flex items-center space-x-1 font-semibold shrink-0"
                      >
                        <span>Battery Settings</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      To keep FRIDAY voice & tasks running reliably when switching apps or turning the screen off, set Battery usage to <strong className="text-emerald-300">Unrestricted</strong> in Android Settings.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Background Task Queue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                  Background Task Queue
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {backgroundTasks.length} queued
                </span>
              </div>
              {backgroundTasks.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center text-xs font-mono text-slate-500">
                  No pending background tasks
                </div>
              ) : (
                <div className="space-y-1.5">
                  {backgroundTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs font-mono"
                    >
                      <span className="text-slate-300 truncate max-w-[200px]">{t.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          t.status === 'completed'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : t.status === 'running'
                            ? 'text-cyan-400 bg-cyan-500/10 animate-pulse'
                            : 'text-amber-400 bg-amber-500/10'
                        }`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Native Event Feed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                  Recent Bridge Events
                </span>
                <span className="text-[10px] font-mono text-cyan-400 flex items-center space-x-1">
                  <Activity className="w-3 h-3" />
                  <span>Event Bus</span>
                </span>
              </div>
              {recentEvents.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center text-xs font-mono text-slate-500">
                  No recent native events
                </div>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar font-mono text-[10px]">
                  {recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/50 border border-slate-800/80"
                    >
                      <span className="text-cyan-300 font-semibold">{evt.type}</span>
                      <span className="text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
