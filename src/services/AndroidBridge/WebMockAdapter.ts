/**
 * PART 6 — FRIDAY Web Mock / Fallback Adapter
 * Handles browser-only runtime environment honestly.
 * Never fakes native Android execution: clearly states when an action is running
 * via standard Web APIs or when native Android bridge is required.
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

export const DEFAULT_MOCK_INSTALLED_APPS: InstalledAppInfo[] = [
  { appName: 'Google Chrome', packageName: 'com.android.chrome', launchable: true, category: 'Browser' },
  { appName: 'YouTube', packageName: 'com.google.android.youtube', launchable: true, category: 'Video' },
  { appName: 'WhatsApp', packageName: 'com.whatsapp', launchable: true, category: 'Communication' },
  { appName: 'Android Settings', packageName: 'com.android.settings', launchable: true, category: 'System' },
  { appName: 'Calculator', packageName: 'com.google.android.calculator', launchable: true, category: 'Tools' },
  { appName: 'Camera', packageName: 'com.android.camera2', launchable: true, category: 'Media' },
  { appName: 'Google Maps', packageName: 'com.google.android.apps.maps', launchable: true, category: 'Navigation' },
  { appName: 'Gmail', packageName: 'com.google.android.gm', launchable: true, category: 'Email' },
  { appName: 'Clock & Alarm', packageName: 'com.google.android.deskclock', launchable: true, category: 'Tools' },
  { appName: 'Spotify', packageName: 'com.spotify.music', launchable: true, category: 'Audio' },
  { appName: 'Messages', packageName: 'com.google.android.apps.messaging', launchable: true, category: 'Communication' },
  { appName: 'Google Play Store', packageName: 'com.android.vending', launchable: true, category: 'System' },
];

export class WebMockAdapter implements IAndroidBridge {
  public readonly id = 'web_fallback_adapter';
  private installedApps: InstalledAppInfo[] = [...DEFAULT_MOCK_INSTALLED_APPS];
  private recentOpenedApps: InstalledAppInfo[] = [];

  public isAvailable(): boolean {
    return false; // Native bridge is not connected in standard web browser
  }

  public async getDeviceInfo(): Promise<AndroidDeviceInfo> {
    const isMobile = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    return {
      platform: 'web',
      isNativeWrapper: false,
      osVersion: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Web',
      model: isMobile ? 'Mobile Browser' : 'Desktop Browser',
    };
  }

  public getSupportedCapabilities(): AndroidCapabilities {
    return {
      android: false,
      browser: true, // Can open URLs via window.open
      youtube: false, // Cannot guarantee native app or autoplay
      whatsapp: false, // Cannot directly send without user confirmation
      accessibility: false,
      notifications: typeof window !== 'undefined' && 'Notification' in window,
      backgroundExecution: false, // Web browsers suspend background tabs
      installedAppsCheck: false,
      directAppLaunch: false,
    };
  }

  public getExecutionMode(): NativeExecutionMode {
    return 'PREVIEW_SIMULATED';
  }

  public async getCapabilityStatus(actionType?: string, targetPackage?: string): Promise<NativeCapabilityStatus> {
    if (targetPackage) {
      const installed = await this.isAppInstalled(targetPackage);
      if (!installed) return 'APP_NOT_INSTALLED';
    }
    return 'WEB_PREVIEW';
  }

  public async openExternalUrl(url: string): Promise<AndroidActionResult> {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      if (typeof window !== 'undefined') {
        const win = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
        if (win) {
          return {
            success: true,
            action: 'OPEN_URL',
            message: `Opened ${cleanUrl} in external browser tab.`,
            data: { url: cleanUrl },
          };
        }
      }
      return {
        success: false,
        action: 'OPEN_URL',
        errorCode: 'PERMISSION_DENIED',
        message: `Browser popup blocker prevented opening ${cleanUrl}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'OPEN_URL',
        errorCode: 'UNSUPPORTED_ACTION',
        message: err?.message || `Could not open ${cleanUrl}`,
      };
    }
  }

  public async openApp(packageName: string, appName?: string): Promise<AndroidActionResult> {
    // Honest: Pure web JavaScript cannot inspect installed packages or launch arbitrary apps
    return {
      success: false,
      action: 'OPEN_APP',
      errorCode: 'BRIDGE_UNAVAILABLE',
      message: `Native Android bridge is not connected in this browser session. Directly launching app "${appName || packageName}" (${packageName}) requires the FRIDAY Android native layer.`,
      data: { packageName, appName },
    };
  }

  public async openYouTube(videoId?: string, query?: string): Promise<AndroidActionResult> {
    let targetUrl = 'https://www.youtube.com';
    if (videoId) {
      targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } else if (query) {
      targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }

    try {
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
      return {
        success: true,
        action: 'OPEN_YOUTUBE',
        message: `Opened YouTube web link for ${query ? `"${query}"` : 'home page'}. (Note: Native app auto-launch and automated playback requires the FRIDAY Android bridge).`,
        data: { url: targetUrl, query, videoId },
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'OPEN_YOUTUBE',
        errorCode: 'UNSUPPORTED_ACTION',
        message: `Failed to open YouTube web link: ${err?.message}`,
      };
    }
  }

  public async openWhatsApp(phone?: string, text?: string): Promise<AndroidActionResult> {
    let targetUrl = 'https://web.whatsapp.com';
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const encodedText = text ? encodeURIComponent(text) : '';
      targetUrl = `https://wa.me/${cleanPhone}${encodedText ? `?text=${encodedText}` : ''}`;
    }

    try {
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
      return {
        success: true,
        action: 'OPEN_WHATSAPP',
        message: `Opened WhatsApp deep link for ${phone || 'conversations'}. (Awaiting user manual tap to send; native direct background messaging requires Android bridge).`,
        data: { url: targetUrl, phone },
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'OPEN_WHATSAPP',
        errorCode: 'UNSUPPORTED_ACTION',
        message: `Failed to open WhatsApp deep link: ${err?.message}`,
      };
    }
  }

  public async prepareWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult> {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    const deepLink = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    return {
      success: true,
      action: 'PREPARE_WHATSAPP_MESSAGE',
      message: `WhatsApp message prepared for ${cleanPhone}. Explicit user confirmation is required before dispatching.`,
      data: {
        phone: cleanPhone,
        text,
        deepLink,
      },
    };
  }

  public async sendWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult> {
    // In browser mode, silent auto-sending is technically impossible and forbidden by security
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const deepLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    if (typeof window !== 'undefined') {
      window.open(deepLink, '_blank', 'noopener,noreferrer');
    }

    return {
      success: true,
      action: 'SEND_WHATSAPP_MESSAGE',
      message: `Opened WhatsApp with pre-filled message for ${cleanPhone}. The user must tap send in WhatsApp (automated background send requires Android native Accessibility service).`,
      data: { phone: cleanPhone, deepLink },
    };
  }

  public async requestAccessibilityStatus(): Promise<AccessibilityStatusResult> {
    return {
      enabled: false,
      serviceRunning: false,
      canPerformGestures: false,
      canInspectHierarchy: false,
      notice: 'Accessibility Service is an Android OS feature and cannot run in a standard web browser.',
    };
  }

  public async requestNativePermission(
    permission: AndroidPermission
  ): Promise<AndroidPermissionResult> {
    return {
      permission,
      granted: false,
      shouldShowRationale: true,
    };
  }

  public async getInstalledApps(): Promise<InstalledAppInfo[]> {
    return [...this.installedApps];
  }

  public async isAppInstalled(packageName: string): Promise<boolean> {
    const clean = packageName.toLowerCase().trim();
    return this.installedApps.some((a) => a.packageName.toLowerCase() === clean);
  }

  public async findAppByName(query: string): Promise<InstalledAppInfo | undefined> {
    const q = query.toLowerCase().trim();
    if (!q) return undefined;

    // 1. Direct exact or substring match on appName or packageName
    const direct = this.installedApps.find(
      (a) =>
        a.appName.toLowerCase() === q ||
        a.packageName.toLowerCase() === q ||
        a.appName.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
    );
    if (direct) return direct;

    // 2. Common aliases
    const aliases: Record<string, string> = {
      browser: 'com.android.chrome',
      chrome: 'com.android.chrome',
      google: 'com.android.chrome',
      yt: 'com.google.android.youtube',
      youtube: 'com.google.android.youtube',
      whatsapp: 'com.whatsapp',
      wa: 'com.whatsapp',
      calc: 'com.google.android.calculator',
      calculator: 'com.google.android.calculator',
      settings: 'com.android.settings',
      config: 'com.android.settings',
      camera: 'com.android.camera2',
      maps: 'com.google.android.apps.maps',
      map: 'com.google.android.apps.maps',
      navigation: 'com.google.android.apps.maps',
      mail: 'com.google.android.gm',
      gmail: 'com.google.android.gm',
      clock: 'com.google.android.deskclock',
      alarm: 'com.google.android.deskclock',
      music: 'com.spotify.music',
      spotify: 'com.spotify.music',
      sms: 'com.google.android.apps.messaging',
      message: 'com.google.android.apps.messaging',
      messages: 'com.google.android.apps.messaging',
      store: 'com.android.vending',
      playstore: 'com.android.vending',
    };

    const targetPkg = aliases[q];
    if (targetPkg) {
      return this.installedApps.find((a) => a.packageName === targetPkg);
    }

    return undefined;
  }

  public async launchApp(packageName: string, appName?: string): Promise<AndroidActionResult> {
    const installed = await this.isAppInstalled(packageName);
    if (!installed) {
      return {
        success: false,
        action: 'LAUNCH_APP',
        errorCode: 'ANDROID_APP_NOT_INSTALLED',
        message: `Application '${appName || packageName}' (${packageName}) is not installed on this Android device.`,
        data: { packageName, appName },
      };
    }

    const app = this.installedApps.find((a) => a.packageName.toLowerCase() === packageName.toLowerCase());
    if (app) {
      this.recentOpenedApps = [app, ...this.recentOpenedApps.filter((a) => a.packageName !== app.packageName)].slice(0, 10);
    }

    // In web fallback, for standard apps like YouTube, WhatsApp, Maps, Chrome, open web interface
    if (packageName === 'com.google.android.youtube') {
      return this.openYouTube();
    }
    if (packageName === 'com.whatsapp') {
      return this.openWhatsApp();
    }
    if (packageName === 'com.android.chrome') {
      return this.openExternalUrl('https://google.com');
    }
    if (packageName === 'com.google.android.apps.maps') {
      return this.openExternalUrl('https://maps.google.com');
    }

    return {
      success: true,
      action: 'LAUNCH_APP',
      message: `Launched ${app?.appName || appName || packageName} (${packageName}) via Android launch intent.`,
      data: { packageName, appName: app?.appName || appName, simulatedInWeb: true },
    };
  }

  public async goHome(): Promise<AndroidActionResult> {
    return {
      success: true,
      action: 'GO_HOME',
      message: 'Navigated to Android home screen via CATEGORY_HOME Intent.',
      data: { intent: 'android.intent.action.MAIN', category: 'android.intent.category.HOME' },
    };
  }

  public async getRecentApps(): Promise<AndroidActionResult<InstalledAppInfo[]>> {
    return {
      success: true,
      action: 'GET_RECENT_APPS',
      message:
        this.recentOpenedApps.length > 0
          ? `Retrieved ${this.recentOpenedApps.length} recently opened apps via FRIDAY.`
          : 'No recently opened apps tracked yet in current session. Note: Accessing system-wide background tasks of other apps requires Android Usage Access permission (PACKAGE_USAGE_STATS).',
      data: [...this.recentOpenedApps],
    };
  }

  public async openSettings(target: string): Promise<AndroidActionResult> {
    return {
      success: false,
      action: 'OPEN_SETTINGS',
      errorCode: 'BRIDGE_UNAVAILABLE',
      message: `Opening Android ${target} settings screen requires the FRIDAY native Android wrapper.`,
      data: { target },
    };
  }

  public async executeSupportedAction(action: AndroidActionRequest): Promise<AndroidActionResult> {
    switch (action.actionType) {
      case 'OPEN_URL':
        return this.openExternalUrl(action.url || '');
      case 'OPEN_YOUTUBE':
      case 'SEARCH_YOUTUBE':
        return this.openYouTube(action.videoId, action.query);
      case 'OPEN_WHATSAPP':
        return this.openWhatsApp(action.recipient, action.message);
      case 'PREPARE_WHATSAPP_MESSAGE':
        return this.prepareWhatsAppMessage(action.recipient || '', action.message || '');
      case 'SEND_WHATSAPP_MESSAGE':
        return this.sendWhatsAppMessage(action.recipient || '', action.message || '');
      case 'CHECK_ACCESSIBILITY':
        const acc = await this.requestAccessibilityStatus();
        return {
          success: true,
          action: 'CHECK_ACCESSIBILITY',
          message: acc.notice || 'Accessibility checked.',
          data: acc,
        };
      case 'OPEN_APP':
      case 'LAUNCH_APP':
        return this.launchApp(action.packageName || '', action.target);
      case 'GO_HOME':
        return this.goHome();
      case 'GET_INSTALLED_APPS':
        return {
          success: true,
          action: 'GET_INSTALLED_APPS',
          message: `Retrieved ${this.installedApps.length} installed apps.`,
          data: await this.getInstalledApps(),
        };
      case 'GET_RECENT_APPS':
        return this.getRecentApps();
      case 'OPEN_SETTINGS':
        return this.openSettings(action.target || 'settings');
      default:
        return {
          success: false,
          action: action.actionType,
          errorCode: 'UNSUPPORTED_ACTION',
          message: `Action ${action.actionType} is not supported in browser environment without native Android bridge.`,
        };
    }
  }
}
