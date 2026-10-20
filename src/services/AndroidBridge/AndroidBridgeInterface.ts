/**
 * PART 6 — FRIDAY Android Bridge Interface
 * Pure contract abstraction defining all operations for Android native communication.
 */

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

export interface IAndroidBridge {
  readonly id: string;
  isAvailable(): boolean;
  getExecutionMode(): NativeExecutionMode;
  getCapabilityStatus(actionType?: string, targetPackage?: string): Promise<NativeCapabilityStatus>;
  getDeviceInfo(): Promise<AndroidDeviceInfo>;
  getSupportedCapabilities(): AndroidCapabilities;
  openExternalUrl(url: string): Promise<AndroidActionResult>;
  openApp(packageName: string, appName?: string): Promise<AndroidActionResult>;
  launchApp(packageName: string, appName?: string): Promise<AndroidActionResult>;
  getInstalledApps(): Promise<InstalledAppInfo[]>;
  goHome(): Promise<AndroidActionResult>;
  getRecentApps(): Promise<AndroidActionResult<InstalledAppInfo[]>>;
  findAppByName(query: string): Promise<InstalledAppInfo | undefined>;
  openYouTube(videoId?: string, query?: string): Promise<AndroidActionResult>;
  openWhatsApp(phone?: string, text?: string): Promise<AndroidActionResult>;
  prepareWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult>;
  sendWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult>;
  requestAccessibilityStatus(): Promise<AccessibilityStatusResult>;
  requestNativePermission(permission: AndroidPermission): Promise<AndroidPermissionResult>;
  getAllPermissionsStatus?(): Promise<AndroidPermissionsSummary>;
  requestScreenCapture?(): Promise<AndroidActionResult>;
  stopScreenCapture?(): Promise<AndroidActionResult>;
  inspectScreen?(includeScreenshot?: boolean): Promise<AndroidActionResult<ScreenContextSnapshot>>;
  captureScreenshot?(): Promise<AndroidActionResult<ScreenContextSnapshot>>;
  performScreenAction?(request: ScreenActionRequest): Promise<AndroidActionResult>;
  executeSupportedAction(action: AndroidActionRequest): Promise<AndroidActionResult>;
  isAppInstalled(packageName: string): Promise<boolean>;
  openSettings(target: string): Promise<AndroidActionResult>;
  startForegroundService?(options: {
    statusText?: string;
    voiceActive?: boolean;
    muted?: boolean;
    taskCount?: number;
  }): Promise<AndroidActionResult>;
  stopForegroundService?(): Promise<AndroidActionResult>;
  getForegroundServiceStatus?(): Promise<{
    running: boolean;
    voiceActive: boolean;
    mediaProjectionActive?: boolean;
    muted: boolean;
    taskCount: number;
    statusText: string;
    ignoringBatteryOptimizations?: boolean;
  }>;
}
