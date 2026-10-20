/**
 * PART 6 — FRIDAY Native Android Adapter
 * Directly interfaces with the native Android layer via WebView JavascriptInterface (window.FridayAndroidBridge).
 * Complies with official Android Intents and Native Security.
 */

import { IAndroidBridge } from './AndroidBridgeInterface';
import {
  AndroidActionResult,
  AndroidCapabilities,
  AndroidDeviceInfo,
  AccessibilityStatusResult,
  AndroidPermission,
  AndroidPermissionResult,
  AndroidPermissionsSummary,
  AndroidActionRequest,
  InstalledAppInfo,
  NativeExecutionMode,
  NativeCapabilityStatus,
  ScreenContextSnapshot,
  ScreenActionRequest,
} from '../../types/android';
import { nativeEventBus } from './NativeEventBus';
import { permissionManager } from './PermissionManager';
import { DEFAULT_MOCK_INSTALLED_APPS } from './WebMockAdapter';

// Declaration of the native Android JavascriptInterface
declare global {
  interface Window {
    FridayAndroidBridge?: {
      isAvailable?: () => boolean;
      getDeviceInfo?: () => string;
      getCapabilities?: () => string;
      getAllPermissionsStatus?: () => string;
      openExternalUrl?: (url: string) => string;
      openApp?: (packageName: string) => string;
      launchApp?: (packageName: string) => string;
      getInstalledApps?: () => string;
      goHome?: () => string;
      getRecentApps?: () => string;
      openYouTube?: (videoId: string, query: string) => string;
      openWhatsApp?: (phone: string, text: string) => string;
      prepareWhatsAppMessage?: (phone: string, text: string) => string;
      sendWhatsAppMessage?: (phone: string, text: string) => string;
      requestAccessibilityStatus?: () => string;
      requestNativePermission?: (permission: string) => string;
      isAppInstalled?: (packageName: string) => boolean;
      executeAction?: (jsonAction: string) => string;
      postMessage?: (jsonRequest: string) => string;
      openSettings?: (target: string) => string;
      requestScreenCapture?: () => string;
      startScreenCapture?: () => string;
      stopScreenCapture?: () => string;
      inspectScreen?: (includeScreenshot: boolean) => string;
      captureScreenshot?: () => string;
      performScreenAction?: (jsonRequest: string) => string;
      startForegroundService?: (
        statusText: string,
        voiceActive: boolean,
        muted: boolean,
        taskCount: number
      ) => string;
      stopForegroundService?: () => string;
      getForegroundServiceStatus?: () => string;
    };
    fridayReceiveNativeEvent?: (type: string, jsonPayload: string, eventId?: string) => void;
  }
}

export class NativeAndroidAdapter implements IAndroidBridge {
  public readonly id = 'native_android_bridge';

  constructor() {
    this.setupNativeEventListener();
  }

  private setupNativeEventListener(): void {
    if (typeof window !== 'undefined') {
      window.fridayReceiveNativeEvent = (type: string, jsonPayload: string, eventId?: string) => {
        try {
          const parsed = jsonPayload ? JSON.parse(jsonPayload) : {};
          if (type === 'DEVICE_READY' || type === 'APP_LIFECYCLE_CHANGED') {
            if (parsed.permissions) {
              permissionManager.syncFromSummary(parsed.permissions);
            }
          } else if (type === 'PERMISSION_REQUIRED' && parsed.permission) {
            permissionManager.setAndroidPermissionGranted(parsed.permission, !!parsed.granted);
          } else if (type === 'ACCESSIBILITY_STATUS_CHANGED') {
            permissionManager.setAndroidPermissionGranted(
              'android.permission.BIND_ACCESSIBILITY_SERVICE',
              !!parsed.enabled
            );
          } else if (type === 'SCREEN_CAPTURE_STATE_CHANGED') {
            permissionManager.setAndroidPermissionGranted(
              'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
              !!parsed.active
            );
          }
          nativeEventBus.emit(type as any, parsed, eventId);
        } catch (e) {
          console.error('[NativeAndroidAdapter] Failed to parse native event:', e);
          nativeEventBus.emit(type as any, { raw: jsonPayload }, eventId);
        }
      };
    }
  }

  public isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!window.FridayAndroidBridge &&
      typeof window.FridayAndroidBridge.isAvailable === 'function' &&
      window.FridayAndroidBridge.isAvailable()
    );
  }

  public async getDeviceInfo(): Promise<AndroidDeviceInfo> {
    if (!this.isAvailable()) {
      return {
        platform: 'android_webview',
        isNativeWrapper: false,
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.getDeviceInfo?.();
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[NativeAndroidAdapter] getDeviceInfo error:', e);
    }

    return {
      platform: 'android_webview',
      isNativeWrapper: true,
      manufacturer: 'Android Device',
      model: 'Native Host',
    };
  }

  public getSupportedCapabilities(): AndroidCapabilities {
    if (!this.isAvailable()) {
      return {
        android: false,
        browser: false,
        youtube: false,
        whatsapp: false,
        accessibility: false,
        screenVision: false,
        mediaProjectionActive: false,
        notifications: false,
        backgroundExecution: false,
        installedAppsCheck: false,
        directAppLaunch: false,
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.getCapabilities?.();
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          android: parsed.android ?? parsed.androidNative ?? true,
          browser: parsed.browser ?? true,
          youtube: parsed.youtube ?? true,
          whatsapp: parsed.whatsapp ?? true,
          accessibility: parsed.accessibility ?? false,
          screenVision: parsed.screenVision ?? parsed.accessibility ?? false,
          mediaProjectionActive: parsed.mediaProjectionActive ?? false,
          notifications: parsed.notifications ?? true,
          backgroundExecution: parsed.backgroundExecution ?? parsed.backgroundService ?? true,
          installedAppsCheck: parsed.installedAppsCheck ?? true,
          directAppLaunch: parsed.directAppLaunch ?? true,
        };
      }
    } catch (e) {
      console.warn('[NativeAndroidAdapter] getCapabilities parse error:', e);
    }

    return {
      android: true,
      browser: true,
      youtube: true,
      whatsapp: true,
      accessibility: true,
      screenVision: true,
      mediaProjectionActive: false,
      notifications: true,
      backgroundExecution: true,
      installedAppsCheck: true,
      directAppLaunch: true,
    };
  }

  public getExecutionMode(): NativeExecutionMode {
    return this.isAvailable() ? 'CONNECTED_NATIVE' : 'PREVIEW_SIMULATED';
  }

  public async getCapabilityStatus(actionType?: string, targetPackage?: string): Promise<NativeCapabilityStatus> {
    if (!this.isAvailable()) {
      return 'WEB_PREVIEW';
    }
    if (actionType === 'SEND_WHATSAPP_MESSAGE' || actionType === 'AUTOMATED_GESTURE') {
      const acc = await this.requestAccessibilityStatus();
      if (!acc.enabled) {
        return 'ANDROID_ACCESSIBILITY_REQUIRED';
      }
    }
    if (targetPackage) {
      const installed = await this.isAppInstalled(targetPackage);
      if (!installed) {
        return 'APP_NOT_INSTALLED';
      }
    }
    return 'ANDROID_NATIVE';
  }

  private formatNativeResult<T = any>(res: AndroidActionResult<T>): AndroidActionResult<T> {
    const isConn = this.isAvailable();
    return {
      ...res,
      executionMode: isConn ? 'CONNECTED_NATIVE' : 'PREVIEW_SIMULATED',
      capabilityStatus: !isConn
        ? 'WEB_PREVIEW'
        : res.errorCode === 'ANDROID_APP_NOT_INSTALLED'
        ? 'APP_NOT_INSTALLED'
        : res.errorCode === 'PERMISSION_DENIED'
        ? 'PERMISSION_REQUIRED'
        : res.errorCode === 'ACCESSIBILITY_DISABLED'
        ? 'ANDROID_ACCESSIBILITY_REQUIRED'
        : 'ANDROID_NATIVE',
    };
  }

  public async openExternalUrl(url: string): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'OPEN_URL',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.openExternalUrl?.(url);
      return raw
        ? JSON.parse(raw)
        : {
            success: true,
            action: 'OPEN_URL',
            message: `Native Android Intent opened URL: ${url}`,
          };
    } catch (e: any) {
      return {
        success: false,
        action: 'OPEN_URL',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Error executing native Intent for URL',
      };
    }
  }

  public async openApp(packageName: string, appName?: string): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'OPEN_APP',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not connected.',
      };
    }

    try {
      const isInstalled = await this.isAppInstalled(packageName);
      if (!isInstalled) {
        return {
          success: false,
          action: 'OPEN_APP',
          errorCode: 'ANDROID_APP_NOT_INSTALLED',
          message: `Application "${appName || packageName}" (${packageName}) is not installed on this Android device.`,
        };
      }

      const raw = window.FridayAndroidBridge!.openApp?.(packageName);
      return raw
        ? JSON.parse(raw)
        : {
            success: true,
            action: 'OPEN_APP',
            message: `Launched ${appName || packageName} via Android Intent.`,
          };
    } catch (e: any) {
      return {
        success: false,
        action: 'OPEN_APP',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || `Failed to open ${packageName}`,
      };
    }
  }

  public async launchApp(packageName: string, appName?: string): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'LAUNCH_APP',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not connected.',
        data: { packageName, appName },
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.launchApp === 'function') {
        const raw = window.FridayAndroidBridge.launchApp(packageName);
        return raw ? JSON.parse(raw) : { success: true, action: 'LAUNCH_APP', message: `Launched ${appName || packageName}` };
      }
      return this.openApp(packageName, appName);
    } catch (e: any) {
      return {
        success: false,
        action: 'LAUNCH_APP',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || `Failed to launch ${packageName}`,
        data: { packageName, appName },
      };
    }
  }

  public async getInstalledApps(): Promise<InstalledAppInfo[]> {
    if (!this.isAvailable()) {
      return [...DEFAULT_MOCK_INSTALLED_APPS];
    }

    try {
      if (typeof window.FridayAndroidBridge?.getInstalledApps === 'function') {
        const raw = window.FridayAndroidBridge.getInstalledApps();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      console.warn('[NativeAndroidAdapter] getInstalledApps error:', e);
    }
    return [...DEFAULT_MOCK_INSTALLED_APPS];
  }

  public async goHome(): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: true,
        action: 'GO_HOME',
        message: 'Navigated to Android home screen (simulated).',
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.goHome === 'function') {
        const raw = window.FridayAndroidBridge.goHome();
        return raw ? JSON.parse(raw) : { success: true, action: 'GO_HOME', message: 'Navigated to Android home screen.' };
      }
      return this.executeSupportedAction({ actionType: 'GO_HOME' });
    } catch (e: any) {
      return {
        success: false,
        action: 'GO_HOME',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to navigate to Android home screen',
      };
    }
  }

  public async getRecentApps(): Promise<AndroidActionResult<InstalledAppInfo[]>> {
    if (!this.isAvailable()) {
      return {
        success: true,
        action: 'GET_RECENT_APPS',
        message: 'Recent apps query requires native Android wrapper with Usage Access permission.',
        data: [],
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.getRecentApps === 'function') {
        const raw = window.FridayAndroidBridge.getRecentApps();
        return raw ? JSON.parse(raw) : { success: true, action: 'GET_RECENT_APPS', message: 'Recent apps retrieved', data: [] };
      }
      return {
        success: false,
        action: 'GET_RECENT_APPS',
        errorCode: 'FEATURE_NOT_AVAILABLE',
        message: 'Accessing system-wide background tasks requires Android Usage Access permission (PACKAGE_USAGE_STATS).',
        data: [],
      };
    } catch (e: any) {
      return {
        success: false,
        action: 'GET_RECENT_APPS',
        errorCode: 'FEATURE_NOT_AVAILABLE',
        message: e?.message || 'Recent apps inspection not permitted by Android OS.',
        data: [],
      };
    }
  }

  public async findAppByName(query: string): Promise<InstalledAppInfo | undefined> {
    const apps = await this.getInstalledApps();
    const q = query.toLowerCase().trim();
    if (!q) return undefined;

    const direct = apps.find(
      (a) =>
        a.appName.toLowerCase() === q ||
        a.packageName.toLowerCase() === q ||
        a.appName.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
    );
    if (direct) return direct;

    const aliases: Record<string, string> = {
      browser: 'com.android.chrome',
      chrome: 'com.android.chrome',
      yt: 'com.google.android.youtube',
      youtube: 'com.google.android.youtube',
      whatsapp: 'com.whatsapp',
      calc: 'com.google.android.calculator',
      calculator: 'com.google.android.calculator',
      settings: 'com.android.settings',
      camera: 'com.android.camera2',
      maps: 'com.google.android.apps.maps',
      gmail: 'com.google.android.gm',
      mail: 'com.google.android.gm',
      spotify: 'com.spotify.music',
      messages: 'com.google.android.apps.messaging',
      sms: 'com.google.android.apps.messaging',
      store: 'com.android.vending',
    };

    const target = aliases[q];
    if (target) {
      return apps.find((a) => a.packageName === target);
    }

    return undefined;
  }

  public async openYouTube(videoId?: string, query?: string): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'OPEN_YOUTUBE',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.openYouTube?.(videoId || '', query || '');
      return raw
        ? JSON.parse(raw)
        : {
            success: true,
            action: 'OPEN_YOUTUBE',
            message: `YouTube opened via native Intent${query ? ` with query "${query}"` : ''}.`,
          };
    } catch (e: any) {
      return {
        success: false,
        action: 'OPEN_YOUTUBE',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to trigger YouTube native Intent',
      };
    }
  }

  public async openWhatsApp(phone?: string, text?: string): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'OPEN_WHATSAPP',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.openWhatsApp?.(phone || '', text || '');
      return raw
        ? JSON.parse(raw)
        : {
            success: true,
            action: 'OPEN_WHATSAPP',
            message: `WhatsApp launched via native Intent.`,
          };
    } catch (e: any) {
      return {
        success: false,
        action: 'OPEN_WHATSAPP',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to open WhatsApp on Android',
      };
    }
  }

  public async prepareWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'PREPARE_WHATSAPP_MESSAGE',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.prepareWhatsAppMessage?.(phone, text);
      return raw
        ? JSON.parse(raw)
        : {
            success: true,
            action: 'PREPARE_WHATSAPP_MESSAGE',
            message: `Draft prepared for ${phone}. Awaiting user confirmation before sending.`,
            data: { phone, text },
          };
    } catch (e: any) {
      return {
        success: false,
        action: 'PREPARE_WHATSAPP_MESSAGE',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to prepare WhatsApp message',
      };
    }
  }

  public async sendWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'SEND_WHATSAPP_MESSAGE',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      // Must check accessibility status if auto-dispatch is needed
      const raw = window.FridayAndroidBridge!.sendWhatsAppMessage?.(phone, text);
      return raw
        ? JSON.parse(raw)
        : {
            success: true,
            action: 'SEND_WHATSAPP_MESSAGE',
            message: `Dispatched WhatsApp message to ${phone}.`,
          };
    } catch (e: any) {
      return {
        success: false,
        action: 'SEND_WHATSAPP_MESSAGE',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to send WhatsApp message via native service',
      };
    }
  }

  public async requestAccessibilityStatus(): Promise<AccessibilityStatusResult> {
    if (!this.isAvailable()) {
      return {
        enabled: false,
        serviceRunning: false,
        canPerformGestures: false,
        canInspectHierarchy: false,
        notice: 'Native Android bridge not connected.',
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.requestAccessibilityStatus?.();
      return raw
        ? JSON.parse(raw)
        : {
            enabled: false,
            serviceRunning: false,
            canPerformGestures: false,
            canInspectHierarchy: false,
            notice: 'Accessibility service status unavailable.',
          };
    } catch (e) {
      return {
        enabled: false,
        serviceRunning: false,
        canPerformGestures: false,
        canInspectHierarchy: false,
        notice: 'Accessibility check failed.',
      };
    }
  }

  public async requestNativePermission(
    permission: AndroidPermission
  ): Promise<AndroidPermissionResult> {
    if (!this.isAvailable()) {
      return {
        permission,
        granted: false,
        shouldShowRationale: false,
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.requestNativePermission?.(permission);
      return raw
        ? JSON.parse(raw)
        : {
            permission,
            granted: false,
          };
    } catch (e) {
      return {
        permission,
        granted: false,
      };
    }
  }

  public async isAppInstalled(packageName: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      if (typeof window.FridayAndroidBridge?.isAppInstalled === 'function') {
        return window.FridayAndroidBridge.isAppInstalled(packageName);
      }
      return true; // Default fallback if native doesn't implement check
    } catch {
      return false;
    }
  }

  public async openSettings(target: string): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'OPEN_SETTINGS',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.openSettings === 'function') {
        const raw = window.FridayAndroidBridge.openSettings(target);
        return raw ? JSON.parse(raw) : { success: true, action: 'OPEN_SETTINGS', message: `Opened ${target} settings.` };
      }
      return this.executeSupportedAction({ actionType: 'OPEN_SETTINGS', target });
    } catch (e: any) {
      return {
        success: false,
        action: 'OPEN_SETTINGS',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || `Failed to open ${target} settings`,
      };
    }
  }

  public async startForegroundService(options: {
    statusText?: string;
    voiceActive?: boolean;
    muted?: boolean;
    taskCount?: number;
  }): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'START_FOREGROUND_SERVICE',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android foreground service requires Android APK.',
      };
    }

    const statusText = options.statusText || 'FRIDAY AI Assistant is active and listening.';
    const voiceActive = options.voiceActive ?? true;
    const muted = options.muted ?? false;
    const taskCount = options.taskCount ?? 0;

    try {
      if (typeof window.FridayAndroidBridge?.startForegroundService === 'function') {
        const raw = window.FridayAndroidBridge.startForegroundService(
          statusText,
          voiceActive,
          muted,
          taskCount
        );
        return raw
          ? JSON.parse(raw)
          : {
              success: true,
              action: 'START_FOREGROUND_SERVICE',
              message: `Foreground service active: ${statusText}`,
            };
      }
      return this.executeSupportedAction({
        actionType: 'START_FOREGROUND_SERVICE',
        statusText,
        voiceActive,
        muted,
        taskCount,
      });
    } catch (e: any) {
      return {
        success: false,
        action: 'START_FOREGROUND_SERVICE',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to start Android foreground service',
      };
    }
  }

  public async stopForegroundService(): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'STOP_FOREGROUND_SERVICE',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.stopForegroundService === 'function') {
        const raw = window.FridayAndroidBridge.stopForegroundService();
        return raw
          ? JSON.parse(raw)
          : {
              success: true,
              action: 'STOP_FOREGROUND_SERVICE',
              message: 'Foreground service stopped.',
            };
      }
      return this.executeSupportedAction({ actionType: 'STOP_FOREGROUND_SERVICE' });
    } catch (e: any) {
      return {
        success: false,
        action: 'STOP_FOREGROUND_SERVICE',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to stop Android foreground service',
      };
    }
  }

  public async getForegroundServiceStatus(): Promise<{
    running: boolean;
    voiceActive: boolean;
    muted: boolean;
    taskCount: number;
    statusText: string;
    ignoringBatteryOptimizations?: boolean;
  }> {
    if (!this.isAvailable()) {
      return {
        running: false,
        voiceActive: false,
        muted: false,
        taskCount: 0,
        statusText: 'Tab Scope (Web)',
        ignoringBatteryOptimizations: false,
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.getForegroundServiceStatus === 'function') {
        const raw = window.FridayAndroidBridge.getForegroundServiceStatus();
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('[NativeAndroidAdapter] getForegroundServiceStatus error:', e);
    }

    return {
      running: false,
      voiceActive: false,
      muted: false,
      taskCount: 0,
      statusText: 'Standby',
    };
  }

  public async getAllPermissionsStatus(): Promise<AndroidPermissionsSummary> {
    if (!this.isAvailable()) {
      return {
        microphone: {
          id: 'microphone',
          name: 'Microphone Access',
          description: 'Required for hands-free voice conversation with FRIDAY.',
          status: 'NOT_GRANTED',
          canRequestInApp: true,
        },
        screenCapture: {
          id: 'screen_capture',
          name: 'Screen Capture (MediaProjection)',
          description: 'Allows FRIDAY to inspect visual content on your screen when you explicitly start screen sharing.',
          status: 'NOT_SUPPORTED',
          canRequestInApp: false,
        },
        accessibility: {
          id: 'accessibility',
          name: 'Accessibility Service',
          description: 'Enables FRIDAY to read screen UI hierarchy and perform authorized taps, scrolls, and text input across apps.',
          status: 'NOT_SUPPORTED',
          canRequestInApp: false,
          settingsTarget: 'accessibility',
        },
        notifications: {
          id: 'notifications',
          name: 'Active Session Notifications',
          description: 'Required on Android 13+ to display persistent status and Stop buttons for background voice and screen capture.',
          status: 'NOT_GRANTED',
          canRequestInApp: true,
          settingsTarget: 'notifications',
        },
        camera: {
          id: 'camera',
          name: 'Camera Access (Optional)',
          description: 'Optional permission for visual camera inspection when explicitly enabled.',
          status: 'NOT_GRANTED',
          canRequestInApp: true,
        },
        batteryOptimization: {
          id: 'battery_optimization',
          name: 'Unrestricted Background Operation',
          description: 'Prevents Android from suspending FRIDAY during background voice or multi-step tasks.',
          status: 'NOT_SUPPORTED',
          canRequestInApp: false,
          settingsTarget: 'battery',
        },
        checkedAt: Date.now(),
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.getAllPermissionsStatus === 'function') {
        const raw = window.FridayAndroidBridge.getAllPermissionsStatus();
        if (raw) {
          const parsed = JSON.parse(raw) as AndroidPermissionsSummary;
          permissionManager.savePermissionsSummary(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[NativeAndroidAdapter] getAllPermissionsStatus error:', e);
    }

    const acc = await this.requestAccessibilityStatus();
    const fg = await this.getForegroundServiceStatus();
    const fallback: AndroidPermissionsSummary = {
      microphone: {
        id: 'microphone',
        name: 'Microphone Access',
        description: 'Required for hands-free voice conversation with FRIDAY.',
        status: 'NOT_GRANTED',
        canRequestInApp: true,
      },
      screenCapture: {
        id: 'screen_capture',
        name: 'Screen Capture (MediaProjection)',
        description: 'Allows FRIDAY to inspect visual content on your screen when you explicitly start screen sharing.',
        status: 'NOT_GRANTED',
        canRequestInApp: true,
      },
      accessibility: {
        id: 'accessibility',
        name: 'Accessibility Service',
        description: 'Enables FRIDAY to read screen UI hierarchy and perform authorized taps, scrolls, and text input across apps.',
        status: acc.enabled ? 'GRANTED' : 'NOT_GRANTED',
        canRequestInApp: false,
        settingsTarget: 'accessibility',
      },
      notifications: {
        id: 'notifications',
        name: 'Active Session Notifications',
        description: 'Required on Android 13+ to display persistent status and Stop buttons for background voice and screen capture.',
        status: 'NOT_GRANTED',
        canRequestInApp: true,
        settingsTarget: 'notifications',
      },
      camera: {
        id: 'camera',
        name: 'Camera Access (Optional)',
        description: 'Optional permission for visual camera inspection when explicitly enabled.',
        status: 'NOT_GRANTED',
        canRequestInApp: true,
      },
      batteryOptimization: {
        id: 'battery_optimization',
        name: 'Unrestricted Background Operation',
        description: 'Prevents Android from suspending FRIDAY during background voice or multi-step tasks.',
        status: fg.ignoringBatteryOptimizations ? 'GRANTED' : 'NOT_GRANTED',
        canRequestInApp: true,
        settingsTarget: 'battery',
      },
      checkedAt: Date.now(),
    };
    return fallback;
  }

  public async requestScreenCapture(): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'REQUEST_SCREEN_CAPTURE',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Android Screen Capture (MediaProjection) requires the native FRIDAY Android APK.',
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.requestScreenCapture === 'function') {
        const raw = window.FridayAndroidBridge.requestScreenCapture();
        return raw
          ? JSON.parse(raw)
          : {
              success: true,
              action: 'REQUEST_SCREEN_CAPTURE',
              message: 'Requested Android system MediaProjection screen capture consent.',
            };
      }
      return this.executeSupportedAction({ actionType: 'REQUEST_SCREEN_CAPTURE' });
    } catch (e: any) {
      return {
        success: false,
        action: 'REQUEST_SCREEN_CAPTURE',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to request Android screen capture permission',
      };
    }
  }

  public async stopScreenCapture(): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'STOP_SCREEN_CAPTURE',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.stopScreenCapture === 'function') {
        const raw = window.FridayAndroidBridge.stopScreenCapture();
        return raw
          ? JSON.parse(raw)
          : {
              success: true,
              action: 'STOP_SCREEN_CAPTURE',
              message: 'Screen capture session stopped.',
            };
      }
      return this.executeSupportedAction({ actionType: 'STOP_SCREEN_CAPTURE' });
    } catch (e: any) {
      return {
        success: false,
        action: 'STOP_SCREEN_CAPTURE',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to stop Android screen capture',
      };
    }
  }

  public async inspectScreen(includeScreenshot = false): Promise<AndroidActionResult<ScreenContextSnapshot>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'INSPECT_SCREEN',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Live Android screen inspection requires the native FRIDAY Android app with Accessibility Service or Screen Capture enabled.',
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.inspectScreen === 'function') {
        const raw = window.FridayAndroidBridge.inspectScreen(includeScreenshot);
        if (raw) {
          return JSON.parse(raw);
        }
      }
      return (await this.executeSupportedAction({
        actionType: 'INSPECT_SCREEN',
        includeScreenshot,
      })) as AndroidActionResult<ScreenContextSnapshot>;
    } catch (e: any) {
      return {
        success: false,
        action: 'INSPECT_SCREEN',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to inspect Android screen',
      };
    }
  }

  public async captureScreenshot(): Promise<AndroidActionResult<ScreenContextSnapshot>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'CAPTURE_SCREENSHOT',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Capturing an Android screenshot requires the native FRIDAY Android app with Screen Capture or Accessibility Service enabled.',
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.captureScreenshot === 'function') {
        const raw = window.FridayAndroidBridge.captureScreenshot();
        if (raw) {
          return JSON.parse(raw);
        }
      }
      return (await this.executeSupportedAction({
        actionType: 'CAPTURE_SCREENSHOT',
        includeScreenshot: true,
      })) as AndroidActionResult<ScreenContextSnapshot>;
    } catch (e: any) {
      return {
        success: false,
        action: 'CAPTURE_SCREENSHOT',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || 'Failed to capture Android screenshot',
      };
    }
  }

  public async performScreenAction(request: ScreenActionRequest): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: 'SCREEN_ACTION',
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: `Performing Android screen action (${request.action}) requires the native FRIDAY Android app with Accessibility Service enabled.`,
      };
    }

    try {
      if (typeof window.FridayAndroidBridge?.performScreenAction === 'function') {
        const raw = window.FridayAndroidBridge.performScreenAction(JSON.stringify(request));
        if (raw) {
          return JSON.parse(raw);
        }
      }
      return this.executeSupportedAction({
        actionType: 'SCREEN_ACTION',
        screenAction: request.action,
        target: request.targetText || request.viewId,
        text: request.inputText,
        x: request.x,
        y: request.y,
        endX: request.endX,
        endY: request.endY,
        direction: request.direction,
        confirmedSensitive: request.confirmedSensitive,
      });
    } catch (e: any) {
      return {
        success: false,
        action: 'SCREEN_ACTION',
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || `Failed to execute screen action ${request.action}`,
      };
    }
  }

  public async executeSupportedAction(action: AndroidActionRequest): Promise<AndroidActionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: action.actionType,
        errorCode: 'BRIDGE_UNAVAILABLE',
        message: 'Native Android bridge is not available.',
      };
    }

    try {
      const payloadReq = {
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: action.actionType,
        payload: action,
        timestamp: Date.now(),
      };
      const raw = window.FridayAndroidBridge!.executeAction?.(JSON.stringify(payloadReq));
      return raw
        ? JSON.parse(raw)
        : {
            success: true,
            action: action.actionType,
            message: `Executed action ${action.actionType}`,
          };
    } catch (e: any) {
      return {
        success: false,
        action: action.actionType,
        errorCode: 'NATIVE_EXCEPTION',
        message: e?.message || `Execution error on ${action.actionType}`,
      };
    }
  }
}
