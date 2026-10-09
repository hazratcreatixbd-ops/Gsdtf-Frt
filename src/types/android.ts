/**
 * PART 6 — FRIDAY Android Control Bridge & Device Integration Types
 * Complete typed contracts for Android native bridge, capabilities, permissions,
 * intents, events, action previews, and error codes.
 */

export type AndroidErrorCode =
  | 'BRIDGE_UNAVAILABLE'
  | 'ANDROID_APP_NOT_INSTALLED'
  | 'ACCESSIBILITY_DISABLED'
  | 'PERMISSION_DENIED'
  | 'ACTION_TIMEOUT'
  | 'UNSUPPORTED_ACTION'
  | 'CONFIRMATION_REQUIRED'
  | 'USER_CANCELLED'
  | 'INVALID_PARAMETERS'
  | 'NETWORK_ERROR'
  | 'NATIVE_EXCEPTION'
  | 'FEATURE_NOT_AVAILABLE';

export interface InstalledAppInfo {
  appName: string;
  packageName: string;
  launchable: boolean;
  category?: string;
  iconUrl?: string;
  isSystemApp?: boolean;
}

export type PermissionLevel =
  | 'SAFE'
  | 'REQUIRES_CONFIRMATION'
  | 'REQUIRES_ANDROID_PERMISSION'
  | 'REQUIRES_ACCESSIBILITY'
  | 'UNSUPPORTED';

export type AndroidPermission =
  | 'android.permission.INTERNET'
  | 'android.permission.RECORD_AUDIO'
  | 'android.permission.POST_NOTIFICATIONS'
  | 'android.permission.READ_CONTACTS'
  | 'android.permission.FOREGROUND_SERVICE'
  | 'android.permission.SYSTEM_ALERT_WINDOW'
  | 'android.permission.BIND_ACCESSIBILITY_SERVICE';

export interface AndroidDeviceInfo {
  platform: 'android' | 'web' | 'android_webview';
  isNativeWrapper: boolean;
  osVersion?: string;
  apiLevel?: number;
  manufacturer?: string;
  model?: string;
  appVersion?: string;
  batteryLevel?: number;
  isCharging?: boolean;
  ignoringBatteryOptimizations?: boolean;
  foregroundServiceRunning?: boolean;
}

export interface ForegroundServiceStatus {
  running: boolean;
  voiceActive: boolean;
  muted: boolean;
  taskCount: number;
  statusText: string;
  ignoringBatteryOptimizations?: boolean;
}

export interface AndroidCapabilities {
  android: boolean;
  browser: boolean;
  youtube: boolean;
  whatsapp: boolean;
  accessibility: boolean;
  notifications: boolean;
  backgroundExecution: boolean;
  installedAppsCheck: boolean;
  directAppLaunch: boolean;
}

export type NativeExecutionMode = 'CONNECTED_NATIVE' | 'PREVIEW_SIMULATED';

export type NativeCapabilityStatus =
  | 'WEB_PREVIEW'
  | 'ANDROID_NATIVE'
  | 'ANDROID_ACCESSIBILITY_REQUIRED'
  | 'APP_NOT_INSTALLED'
  | 'PERMISSION_REQUIRED';

export interface AndroidActionResult<T = unknown> {
  success: boolean;
  action: string;
  message: string;
  errorCode?: AndroidErrorCode;
  data?: T;
  executionMode?: NativeExecutionMode;
  capabilityStatus?: NativeCapabilityStatus;
  timestamp?: number;
}

export interface AccessibilityStatusResult {
  enabled: boolean;
  serviceRunning: boolean;
  canPerformGestures: boolean;
  canInspectHierarchy: boolean;
  notice?: string;
}

export interface AndroidPermissionResult {
  permission: AndroidPermission;
  granted: boolean;
  shouldShowRationale?: boolean;
}

export interface AndroidActionRequest {
  actionType:
    | 'OPEN_APP'
    | 'LAUNCH_APP'
    | 'OPEN_URL'
    | 'OPEN_YOUTUBE'
    | 'SEARCH_YOUTUBE'
    | 'OPEN_YOUTUBE_VIDEO'
    | 'OPEN_WHATSAPP'
    | 'PREPARE_WHATSAPP_MESSAGE'
    | 'SEND_WHATSAPP_MESSAGE'
    | 'REQUEST_PERMISSION'
    | 'CHECK_ACCESSIBILITY'
    | 'CHECK_APP_INSTALLED'
    | 'OPEN_SETTINGS'
    | 'GO_HOME'
    | 'GET_INSTALLED_APPS'
    | 'GET_RECENT_APPS'
    | 'START_FOREGROUND_SERVICE'
    | 'UPDATE_FOREGROUND_SERVICE'
    | 'STOP_FOREGROUND_SERVICE';
  packageName?: string;
  url?: string;
  query?: string;
  videoId?: string;
  recipient?: string;
  message?: string;
  target?: string;
  permission?: AndroidPermission;
  timeoutMs?: number;
  statusText?: string;
  voiceActive?: boolean;
  muted?: boolean;
  taskCount?: number;
}

export interface ActionPreviewItem {
  id: string;
  actionType: string;
  title: string;
  appName: string;
  packageName?: string;
  recipient?: string;
  messagePreview?: string;
  permissionLevel: PermissionLevel;
  riskNotice: string;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'executed' | 'failed';
  createdAt: number;
  payload: Record<string, any>;
}

export type NativeEventType =
  | 'DEVICE_READY'
  | 'APP_OPENED'
  | 'APP_NOT_FOUND'
  | 'PERMISSION_REQUIRED'
  | 'ACCESSIBILITY_CHANGED'
  | 'ACCESSIBILITY_STATUS_CHANGED'
  | 'ACTION_STARTED'
  | 'ACTION_COMPLETED'
  | 'ACTION_FAILED'
  | 'USER_CANCELLED'
  | 'APP_LIFECYCLE_CHANGED'
  | 'FOREGROUND_NOTIFICATION_ACTION'
  | 'FOREGROUND_SERVICE_STATE_CHANGED';

export interface NativeEvent<T = any> {
  id: string;
  type: NativeEventType;
  timestamp: number;
  payload: T;
}

export interface BackgroundTaskSpec {
  id: string;
  title: string;
  action: AndroidActionRequest;
  scheduledTime?: number;
  intervalMs?: number;
  maxRetries?: number;
  retryCount?: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  requiresForegroundService?: boolean;
  createdAt: number;
}
