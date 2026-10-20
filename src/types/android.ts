/**
 * PART 6 — FRIDAY Android Control Bridge & Device Integration Types
 * Complete typed contracts for Android native bridge, capabilities, permissions,
 * intents, events, action previews, and error codes.
 */

export type AndroidErrorCode =
  | 'BRIDGE_UNAVAILABLE'
  | 'ANDROID_APP_NOT_INSTALLED'
  | 'ACCESSIBILITY_DISABLED'
  | 'ANDROID_ACCESSIBILITY_REQUIRED'
  | 'SCREEN_CAPTURE_NOT_ACTIVE'
  | 'SENSITIVE_ACTION_BLOCKED'
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
  | 'android.permission.CAMERA'
  | 'android.permission.READ_CONTACTS'
  | 'android.permission.FOREGROUND_SERVICE'
  | 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION'
  | 'android.permission.SYSTEM_ALERT_WINDOW'
  | 'android.permission.BIND_ACCESSIBILITY_SERVICE';

export type PermissionGrantStatus = 'GRANTED' | 'NOT_GRANTED' | 'NOT_SUPPORTED';

export interface PermissionStatusItem {
  id: string;
  name: string;
  description: string;
  status: PermissionGrantStatus;
  canRequestInApp: boolean;
  settingsTarget?: string;
}

export interface AndroidPermissionsSummary {
  microphone: PermissionStatusItem;
  screenCapture: PermissionStatusItem;
  accessibility: PermissionStatusItem;
  notifications: PermissionStatusItem;
  camera: PermissionStatusItem;
  batteryOptimization?: PermissionStatusItem;
  checkedAt: number;
  // Optional legacy boolean flags for compatibility
  recordAudio?: boolean;
  internet?: boolean;
  postNotifications?: boolean;
   accessibilityService?: boolean;
  mediaProjectionActive?: boolean;
  ignoringBatteryOptimizations?: boolean;
  foregroundServiceRunning?: boolean;
}

export interface ScreenNodeInfo {
  id: string;
  className: string;
  text: string;
  contentDescription: string;
  viewIdResourceName: string;
  clickable: boolean;
  editable: boolean;
  scrollable: boolean;
  focused: boolean;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
  };
}

export interface ScreenContextSnapshot {
  packageName: string;
  appName: string;
  summaryText: string;
  elements: ScreenNodeInfo[];
  screenshotBase64?: string | null;
  screenWidth: number;
  screenHeight: number;
  captureMethod: 'ACCESSIBILITY_HIERARCHY' | 'MEDIA_PROJECTION' | 'HYBRID' | 'NONE';
  timestamp: number;
}

export type ScreenCaptureSnapshot = ScreenContextSnapshot;

export type ScreenActionType =
  | 'CLICK_TEXT'
  | 'CLICK_ID'
  | 'TAP_COORDINATES'
  | 'SWIPE'
  | 'SCROLL_FORWARD'
  | 'SCROLL_BACKWARD'
  | 'INPUT_TEXT'
  | 'GLOBAL_BACK'
  | 'GLOBAL_HOME'
  | 'GLOBAL_RECENTS'
  | 'GLOBAL_NOTIFICATIONS';

export interface ScreenActionRequest {
  action: ScreenActionType;
  targetText?: string;
  viewId?: string;
  inputText?: string;
  x?: number;
  y?: number;
  endX?: number;
  endY?: number;
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  confirmedSensitive?: boolean;
}

export interface AndroidDeviceInfo {
  platform: 'android' | 'web' | 'android_webview';
  isNativeWrapper: boolean;
  osVersion?: string;
  apiLevel?: number;
  sdkInt?: number;
  manufacturer?: string;
  model?: string;
  appVersion?: string;
  batteryLevel?: number;
  isCharging?: boolean;
  ignoringBatteryOptimizations?: boolean;
  foregroundServiceRunning?: boolean;
  mediaProjectionActive?: boolean;
}

export interface ForegroundServiceStatus {
  running: boolean;
  voiceActive: boolean;
  mediaProjectionActive?: boolean;
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
  screenVision?: boolean;
  mediaProjectionActive?: boolean;
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
  canTakeScreenshot?: boolean;
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
    | 'GET_ALL_PERMISSIONS_STATUS'
    | 'CHECK_ACCESSIBILITY'
    | 'CHECK_APP_INSTALLED'
    | 'OPEN_SETTINGS'
    | 'GO_HOME'
    | 'GET_INSTALLED_APPS'
    | 'GET_RECENT_APPS'
    | 'START_FOREGROUND_SERVICE'
    | 'UPDATE_FOREGROUND_SERVICE'
    | 'STOP_FOREGROUND_SERVICE'
    | 'REQUEST_SCREEN_CAPTURE'
    | 'START_SCREEN_CAPTURE'
    | 'STOP_SCREEN_CAPTURE'
    | 'INSPECT_SCREEN'
    | 'CAPTURE_SCREENSHOT'
    | 'CAPTURE_SCREEN_SNAPSHOT'
    | 'SCREEN_ACTION'
    | 'SCREEN_CLICK_ELEMENT'
    | 'SCREEN_TAP_COORDINATES'
    | 'SCREEN_SCROLL'
    | 'SCREEN_INPUT_TEXT'
    | 'SCREEN_GLOBAL_NAVIGATION';
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
  includeImage?: boolean;
  includeScreenshot?: boolean;
  screenAction?: ScreenActionType;
  targetText?: string;
  confirmed?: boolean;
  confirmedSensitive?: boolean;
  x?: number;
  y?: number;
  endX?: number;
  endY?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  text?: string;
  fieldHint?: string;
  navAction?: 'back' | 'home' | 'recents' | 'notifications';
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
  | 'PERMISSIONS_UPDATED'
  | 'ACCESSIBILITY_CHANGED'
  | 'ACCESSIBILITY_STATUS_CHANGED'
  | 'SCREEN_CAPTURE_STATE'
  | 'SCREEN_CAPTURE_STATE_CHANGED'
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
