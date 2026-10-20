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
  Eye,
  Camera,
  Mic,
  Bell,
  Battery,
  MousePointerClick,
  ArrowUp,
  ArrowDown,
  CornerUpLeft,
  StopCircle,
} from 'lucide-react';
import { androidBridge } from '../services/AndroidBridge/AndroidBridge';
import { permissionManager } from '../services/AndroidBridge/PermissionManager';
import { backgroundExecutionQueue } from '../services/AndroidBridge/BackgroundExecutionQueue';
import { nativeEventBus } from '../services/AndroidBridge/NativeEventBus';
import {
  AndroidCapabilities,
  AndroidDeviceInfo,
  BackgroundTaskSpec,
  NativeEvent,
  InstalledAppInfo,
  AndroidPermissionsSummary,
  PermissionStatusItem,
  ScreenContextSnapshot,
  ScreenActionType,
} from '../types/android';

interface DeviceControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceControlDrawer: React.FC<DeviceControlDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'vision' | 'workspace' | 'diagnostics'>('permissions');
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
    screenVision: false,
    mediaProjectionActive: false,
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

  // Part 15 Permission Center & Screen Vision State
  const [permissionsSummary, setPermissionsSummary] = useState<AndroidPermissionsSummary | null>(
    () => permissionManager.getSavedPermissionsSummary()
  );
  const [revokedPerms, setRevokedPerms] = useState<string[]>([]);
  const [cameraFeatureEnabled, setCameraFeatureEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('friday_camera_feature_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [screenSnapshot, setScreenSnapshot] = useState<ScreenContextSnapshot | null>(null);
  const [isInspectingScreen, setIsInspectingScreen] = useState(false);
  const [screenActionTarget, setScreenActionTarget] = useState('');
  const [screenActionInput, setScreenActionInput] = useState('');

  const refreshDiagnostics = async () => {
    const avail = androidBridge.isAvailable();
    setIsAvailable(avail);

    const [info, acc, apps, rec, perms] = await Promise.all([
      androidBridge.getDeviceInfo(),
      androidBridge.requestAccessibilityStatus(),
      androidBridge.getInstalledApps(),
      androidBridge.getRecentApps(),
      androidBridge.getAllPermissionsStatus(),
    ]);

    setDeviceInfo(info);
    setCapabilities(androidBridge.getSupportedCapabilities());
    setAccessibilityStatus(acc);
    setInstalledApps(apps);
    if (rec.success && Array.isArray(rec.data)) {
      setRecentApps(rec.data);
    }

    const prevSummary = permissionManager.getSavedPermissionsSummary();
    if (prevSummary) {
      const newlyRevoked = permissionManager.detectRevokedPermissions(prevSummary, perms);
      if (newlyRevoked.length > 0) {
        setRevokedPerms(newlyRevoked);
      }
    }
    setPermissionsSummary(perms);

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
    const unsubEvents = nativeEventBus.onAny((evt) => {
      setRecentEvents(nativeEventBus.getHistory().slice(0, 10));
      if (evt.type === 'PERMISSIONS_UPDATED' || evt.type === 'SCREEN_CAPTURE_STATE') {
        refreshDiagnostics();
      }
    });
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && isOpen) {
        refreshDiagnostics();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubBg();
      unsubEvents();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isOpen]);

  const showFeedback = (msg: string) => {
    setLaunchMessage(msg);
    setTimeout(() => setLaunchMessage(null), 4000);
  };

  const handlePermissionAction = async (item: PermissionStatusItem) => {
    if (item.id === 'microphone') {
      if (isAvailable) {
        const res = await androidBridge.requestNativePermission('android.permission.RECORD_AUDIO');
        showFeedback(res.granted ? 'Microphone permission granted.' : 'Requested Android microphone permission.');
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          showFeedback('Browser microphone permission granted.');
        } catch (err: any) {
          showFeedback(err?.message || 'Microphone permission denied.');
        }
      }
    } else if (item.id === 'screen_capture') {
      const res = await androidBridge.requestScreenCapture();
      showFeedback(res.message);
    } else if (item.id === 'accessibility') {
      const res = await androidBridge.openSettings('accessibility');
      showFeedback(res.message);
    } else if (item.id === 'notifications') {
      if (isAvailable) {
        await androidBridge.requestNativePermission('android.permission.POST_NOTIFICATIONS');
        const res = await androidBridge.openSettings('notifications');
        showFeedback(res.message);
      } else if ('Notification' in window) {
        const p = await Notification.requestPermission();
        showFeedback(`Browser notification permission: ${p}`);
      }
    } else if (item.id === 'camera') {
      if (isAvailable) {
        const res = await androidBridge.requestNativePermission('android.permission.CAMERA');
        showFeedback(res.granted ? 'Camera permission granted.' : 'Requested Android camera permission.');
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((t) => t.stop());
          showFeedback('Browser camera permission granted.');
        } catch (err: any) {
          showFeedback(err?.message || 'Camera permission denied.');
        }
      }
    } else if (item.id === 'battery_optimization') {
      const res = await androidBridge.openSettings('battery');
      showFeedback(res.message);
    } else if (item.settingsTarget) {
      const res = await androidBridge.openSettings(item.settingsTarget);
      showFeedback(res.message);
    }
    setTimeout(() => refreshDiagnostics(), 600);
  };

  const handleStopScreenCapture = async () => {
    const res = await androidBridge.stopScreenCapture();
    showFeedback(res.message);
    refreshDiagnostics();
  };

  const handleInspectScreen = async (withScreenshot: boolean) => {
    setIsInspectingScreen(true);
    try {
      const res = withScreenshot
        ? await androidBridge.captureScreenshot()
        : await androidBridge.inspectScreen(false);
      showFeedback(res.message);
      if (res.data) {
        setScreenSnapshot(res.data);
      }
    } catch (e: any) {
      showFeedback(e?.message || 'Screen inspection failed');
    } finally {
      setIsInspectingScreen(false);
    }
  };

  const handlePerformScreenAction = async (action: ScreenActionType, customTarget?: string) => {
    const res = await androidBridge.performScreenAction({
      action,
      targetText: customTarget ?? (screenActionTarget.trim() || undefined),
      inputText: screenActionInput.trim() || undefined,
    });
    showFeedback(res.message);
    if (res.success) {
      setTimeout(() => handleInspectScreen(false), 500);
    }
  };

  const toggleCameraFeature = () => {
    const next = !cameraFeatureEnabled;
    setCameraFeatureEnabled(next);
    try {
      localStorage.setItem('friday_camera_feature_enabled', String(next));
    } catch {}
  };

  const handleGoHome = async () => {
    const res = await androidBridge.goHome();
    const prefix = res.executionMode === 'CONNECTED_NATIVE' ? '[Real Device] ' : '[Preview / Simulated] ';
    showFeedback(prefix + res.message);
  };

  const handleLaunchApp = async (app: InstalledAppInfo) => {
    const res = await androidBridge.launchApp(app.packageName, app.appName);
    const prefix = res.executionMode === 'CONNECTED_NATIVE' ? '[Real Device] ' : '[Preview / Simulated] ';
    showFeedback(prefix + res.message);
    const rec = await androidBridge.getRecentApps();
    if (rec.success && Array.isArray(rec.data)) {
      setRecentApps(rec.data);
    }
  };

  const filteredApps = installedApps.filter(
    (app) =>
      app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.category && app.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  const permissionItems: PermissionStatusItem[] = permissionsSummary
    ? [
        permissionsSummary.microphone,
        permissionsSummary.screenCapture,
        permissionsSummary.accessibility,
        permissionsSummary.notifications,
        ...(cameraFeatureEnabled ? [permissionsSummary.camera] : []),
        ...(permissionsSummary.batteryOptimization ? [permissionsSummary.batteryOptimization] : []),
      ]
    : [];

  const screenCaptureActive =
    permissionsSummary?.screenCapture?.status === 'GRANTED' ||
    Boolean(capabilities?.mediaProjectionActive);

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
                <span>ANDROID CONTROL</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  PART 15
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Permissions, Screen Vision & App Workspace
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

        {/* Active Screen Capture Indicator & Stop Button */}
        {screenCaptureActive && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-emerald-200">
                Screen Capture Active
              </span>
            </div>
            <button
              onClick={handleStopScreenCapture}
              className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-mono flex items-center space-x-1 transition"
            >
              <StopCircle className="w-3 h-3" />
              <span>Stop Capture</span>
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 mt-3 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'permissions'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>Perms</span>
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'vision'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Vision</span>
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'workspace'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>Apps</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-mono transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'diagnostics'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Status</span>
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
                  ? 'Real hardware permissions, Screen Vision & Accessibility active.'
                  : 'Browser sandbox. Android OS Screen Capture & Accessibility require APK.'}
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

        {/* Revoked Permission Banner */}
        {revokedPerms.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold font-mono text-[11px]">Permission Revoked Outside App</div>
              <p className="text-[10px] text-amber-300/90 mt-0.5">
                Re-enable in Android Settings to continue using: {revokedPerms.join(', ')}
              </p>
            </div>
            <button
              onClick={() => setRevokedPerms([])}
              className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 font-mono"
            >
              OK
            </button>
          </div>
        )}

        {/* TAB: PERMISSION CENTER (Part 15) */}
        {activeTab === 'permissions' && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-cyan-400 tracking-wider">
                Android Permission Center
              </span>
              <span className="text-[10px] font-mono text-slate-400">Live OS Verification</span>
            </div>

            {permissionItems.map((item) => {
              const IconComp =
                item.id === 'microphone'
                  ? Mic
                  : item.id === 'screen_capture'
                  ? Eye
                  : item.id === 'accessibility'
                  ? Layers
                  : item.id === 'notifications'
                  ? Bell
                  : item.id === 'camera'
                  ? Camera
                  : Battery;

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-100">{item.name}</div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                        item.status === 'GRANTED'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : item.status === 'NOT_SUPPORTED'
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {item.status === 'GRANTED'
                        ? 'Granted'
                        : item.status === 'NOT_SUPPORTED'
                        ? 'Not supported'
                        : 'Not granted'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500">
                      {item.status === 'GRANTED'
                        ? 'Verified active'
                        : item.status === 'NOT_SUPPORTED'
                        ? 'Requires Android APK'
                        : 'Action required'}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {item.id === 'screen_capture' && item.status === 'GRANTED' && (
                        <button
                          onClick={handleStopScreenCapture}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/30 text-rose-200 text-[10px] font-mono transition"
                        >
                          Stop Capture
                        </button>
                      )}
                      {item.status !== 'NOT_SUPPORTED' && (
                        <button
                          onClick={() => handlePermissionAction(item)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono flex items-center space-x-1 transition"
                        >
                          <span>
                            {item.status === 'GRANTED'
                              ? 'Settings'
                              : item.canRequestInApp
                              ? 'Enable'
                              : 'Open Settings'}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Optional Camera Feature Toggle */}
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
              <div className="pr-2">
                <span className="text-xs font-medium text-slate-200 flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Optional Camera Feature</span>
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Enable only if you want camera permission in the setup list.
                </p>
              </div>
              <button
                onClick={toggleCameraFeature}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border shrink-0 transition ${
                  cameraFeatureEnabled
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {cameraFeatureEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        )}

        {/* TAB: SCREEN VISION & INTERACTION (Part 15) */}
        {activeTab === 'vision' && (
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300 font-mono flex items-center space-x-1.5">
                  <Eye className="w-4 h-4" />
                  <span>Screen Vision Inspector</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {screenCaptureActive ? 'MediaProjection Ready' : 'UI Hierarchy / Screenshot'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ask “FRIDAY, what is on my screen?” or tap below to inspect the current Android screen.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleInspectScreen(false)}
                  disabled={isInspectingScreen}
                  className="py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center justify-center space-x-1.5 transition"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isInspectingScreen ? 'Reading...' : 'Read Screen'}</span>
                </button>
                <button
                  onClick={() => handleInspectScreen(true)}
                  disabled={isInspectingScreen}
                  className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-center space-x-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isInspectingScreen ? 'Capturing...' : 'Screenshot'}</span>
                </button>
              </div>
              {!screenCaptureActive && isAvailable && (
                <button
                  onClick={() => androidBridge.requestScreenCapture().then(() => refreshDiagnostics())}
                  className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-mono transition"
                >
                  Request Android Screen Capture Consent
                </button>
              )}
            </div>

            {screenSnapshot && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase block">
                      {screenSnapshot.captureMethod}
                    </span>
                    <span className="text-xs font-semibold text-slate-100">
                      {screenSnapshot.appName || screenSnapshot.packageName || 'Active Window'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {screenSnapshot.elements?.length || 0} elements
                  </span>
                </div>

                {screenSnapshot.screenshotBase64 && (
                  <img
                    src={`data:image/jpeg;base64,${screenSnapshot.screenshotBase64}`}
                    alt="Android Screen Capture"
                    className="w-full max-h-52 object-contain rounded-xl border border-slate-800 bg-black"
                  />
                )}

                {screenSnapshot.summaryText && (
                  <div className="p-2 rounded-xl bg-black/50 border border-slate-800 text-[11px] text-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap font-mono">
                    {screenSnapshot.summaryText}
                  </div>
                )}

                {screenSnapshot.elements && screenSnapshot.elements.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {screenSnapshot.elements
                      .filter((el) => el.text || el.contentDescription)
                      .slice(0, 20)
                      .map((el) => {
                        const label = el.text || el.contentDescription || el.viewIdResourceName;
                        return (
                          <div
                            key={el.id}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px]"
                          >
                            <span className="text-slate-200 truncate pr-2">{label}</span>
                            {el.clickable && label && (
                              <button
                                onClick={() => handlePerformScreenAction('CLICK_TEXT', label)}
                                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-mono shrink-0"
                              >
                                Tap
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Authorized Screen Interaction Controls */}
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <span className="text-xs font-semibold text-cyan-300 font-mono flex items-center space-x-1.5">
                <MousePointerClick className="w-4 h-4" />
                <span>Authorized Screen Interaction</span>
              </span>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={screenActionTarget}
                  onChange={(e) => setScreenActionTarget(e.target.value)}
                  placeholder="Button text or element label..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={() => handlePerformScreenAction('CLICK_TEXT')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono transition"
                >
                  Tap
                </button>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={screenActionInput}
                  onChange={(e) => setScreenActionInput(e.target.value)}
                  placeholder="Text to type into field..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={() => handlePerformScreenAction('INPUT_TEXT')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-mono transition"
                >
                  Type
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  onClick={() => handlePerformScreenAction('SCROLL_FORWARD')}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center justify-center space-x-1"
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Down</span>
                </button>
                <button
                  onClick={() => handlePerformScreenAction('SCROLL_BACKWARD')}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center justify-center space-x-1"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Up</span>
                </button>
                <button
                  onClick={() => handlePerformScreenAction('GLOBAL_BACK')}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center justify-center space-x-1"
                >
                  <CornerUpLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => handlePerformScreenAction('GLOBAL_HOME')}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center justify-center space-x-1"
                >
                  <Home className="w-3 h-3" />
                  <span>Home</span>
                </button>
              </div>
            </div>
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
