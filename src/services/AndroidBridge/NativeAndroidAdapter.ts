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
  AndroidActionRequest,
  InstalledAppInfo,
  NativeExecutionMode,
  NativeCapabilityStatus,
} from '../../types/android';
import { nativeEventBus } from './NativeEventBus';
import { DEFAULT_MOCK_INSTALLED_APPS } from './WebMockAdapter';

// Declaration of the native Android JavascriptInterface
declare global {
  interface Window {
    FridayAndroidBridge?: {
      isAvailable?: () => boolean;
      getDeviceInfo?: () => string;
      getCapabilities?: () => string;
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
        notifications: false,
        backgroundExecution: false,
        installedAppsCheck: false,
        directAppLaunch: false,
      };
    }

    try {
      const raw = window.FridayAndroidBridge!.getCapabilities?.();
      if (raw) {
        return JSON.parse(raw);
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
      notifications: true,
      backgroundExecution: false,
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
      const raw = window.FridayAndroidBridge!.executeAction?.(JSON.stringify(action));
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
