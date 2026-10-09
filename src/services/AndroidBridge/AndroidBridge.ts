/**
 * PART 6 — FRIDAY Android Bridge Orchestrator
 * Central manager for device integration, adapter resolution, action preview guards,
 * timeout protection, and multi-step plan execution.
 */

import { IAndroidBridge } from './AndroidBridgeInterface';
import { NativeAndroidAdapter } from './NativeAndroidAdapter';
import { WebMockAdapter } from './WebMockAdapter';
import { permissionManager } from './PermissionManager';
import { nativeEventBus } from './NativeEventBus';
import { backgroundExecutionQueue } from './BackgroundExecutionQueue';
import {
  AndroidActionResult,
  AndroidCapabilities,
  AndroidDeviceInfo,
  AccessibilityStatusResult,
  AndroidPermission,
  AndroidPermissionResult,
  AndroidActionRequest,
  ActionPreviewItem,
  InstalledAppInfo,
  NativeExecutionMode,
  NativeCapabilityStatus,
} from '../../types/android';

export class AndroidBridge implements IAndroidBridge {
  private static instance: AndroidBridge;
  public readonly id = 'android_bridge_manager';

  private activeAdapter: IAndroidBridge;
  private nativeAdapter: NativeAndroidAdapter;
  private webMockAdapter: WebMockAdapter;

  private actionPreviews: Map<string, ActionPreviewItem> = new Map();
  private previewListeners: Set<(previews: ActionPreviewItem[]) => void> = new Set();
  private pendingResolvers: Map<
    string,
    { resolve: (value: AndroidActionResult) => void; action: AndroidActionRequest }
  > = new Map();

  constructor() {
    this.nativeAdapter = new NativeAndroidAdapter();
    this.webMockAdapter = new WebMockAdapter();

    // Default to native adapter if available, otherwise web fallback
    if (this.nativeAdapter.isAvailable()) {
      this.activeAdapter = this.nativeAdapter;
    } else {
      this.activeAdapter = this.webMockAdapter;
    }

    backgroundExecutionQueue.setBridge(this);
  }

  public static getInstance(): AndroidBridge {
    if (!AndroidBridge.instance) {
      AndroidBridge.instance = new AndroidBridge();
    }
    return AndroidBridge.instance;
  }

  public setAdapter(adapter: IAndroidBridge): void {
    this.activeAdapter = adapter;
    backgroundExecutionQueue.setBridge(this);
    nativeEventBus.emit('DEVICE_READY', {
      adapterId: adapter.id,
      isAvailable: adapter.isAvailable(),
    });
  }

  public getActiveAdapter(): IAndroidBridge {
    // Re-check native availability in case window.FridayAndroidBridge was injected late
    if (this.activeAdapter === this.webMockAdapter && this.nativeAdapter.isAvailable()) {
      this.activeAdapter = this.nativeAdapter;
    }
    return this.activeAdapter;
  }

  public isAvailable(): boolean {
    return this.getActiveAdapter().isAvailable();
  }

  public async getDeviceInfo(): Promise<AndroidDeviceInfo> {
    return this.getActiveAdapter().getDeviceInfo();
  }

  public getSupportedCapabilities(): AndroidCapabilities {
    return this.getActiveAdapter().getSupportedCapabilities();
  }

  public getCapabilities(): AndroidCapabilities {
    return this.getSupportedCapabilities();
  }

  public getExecutionMode(): NativeExecutionMode {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.getExecutionMode === 'function') {
      return adapter.getExecutionMode();
    }
    return this.isAvailable() ? 'CONNECTED_NATIVE' : 'PREVIEW_SIMULATED';
  }

  public async getCapabilityStatus(actionType?: string, targetPackage?: string): Promise<NativeCapabilityStatus> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.getCapabilityStatus === 'function') {
      return adapter.getCapabilityStatus(actionType, targetPackage);
    }
    return this.isAvailable() ? 'ANDROID_NATIVE' : 'WEB_PREVIEW';
  }

  // Action Preview Subscription for UI
  public subscribePreviews(listener: (previews: ActionPreviewItem[]) => void): () => void {
    this.previewListeners.add(listener);
    listener(Array.from(this.actionPreviews.values()));
    return () => this.previewListeners.delete(listener);
  }

  private notifyPreviews(): void {
    const arr = Array.from(this.actionPreviews.values());
    this.previewListeners.forEach((l) => l(arr));
  }

  public getPendingPreviews(): ActionPreviewItem[] {
    return Array.from(this.actionPreviews.values()).filter(
      (p) => p.status === 'pending_confirmation'
    );
  }

  public async isAppInstalled(packageName: string): Promise<boolean> {
    return this.getActiveAdapter().isAppInstalled(packageName);
  }

  public async requestAccessibilityStatus(): Promise<AccessibilityStatusResult> {
    return this.getActiveAdapter().requestAccessibilityStatus();
  }

  public async requestNativePermission(
    permission: AndroidPermission
  ): Promise<AndroidPermissionResult> {
    return this.getActiveAdapter().requestNativePermission(permission);
  }

  // Safe timeout-wrapped execution
  private async executeWithTimeout<T extends AndroidActionResult>(
    fn: () => Promise<T>,
    actionName: string,
    timeoutMs = 8000
  ): Promise<T> {
    let timer: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject({
          success: false,
          action: actionName,
          errorCode: 'ACTION_TIMEOUT',
          message: `Operation "${actionName}" timed out after ${timeoutMs}ms.`,
        });
      }, timeoutMs);
    });

    try {
      nativeEventBus.emit('ACTION_STARTED', { action: actionName, timestamp: Date.now() });
      const result = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timer);

      if (result.success) {
        nativeEventBus.emit('ACTION_COMPLETED', { action: actionName, result });
      } else {
        nativeEventBus.emit('ACTION_FAILED', {
          action: actionName,
          errorCode: result.errorCode,
          message: result.message,
        });
      }

      return result;
    } catch (err: any) {
      clearTimeout(timer);
      const failResult: any = {
        success: false,
        action: actionName,
        errorCode: err?.errorCode || 'ACTION_TIMEOUT',
        message: err?.message || `Execution failed for ${actionName}`,
      };
      nativeEventBus.emit('ACTION_FAILED', failResult);
      return failResult;
    }
  }

  public async openExternalUrl(url: string): Promise<AndroidActionResult> {
    return this.executeWithTimeout(
      () => this.getActiveAdapter().openExternalUrl(url),
      'OPEN_URL'
    );
  }

  public async openApp(packageName: string, appName?: string): Promise<AndroidActionResult> {
    return this.executeWithTimeout(
      () => this.getActiveAdapter().openApp(packageName, appName),
      'OPEN_APP'
    );
  }

  public async launchApp(packageName: string, appName?: string): Promise<AndroidActionResult> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.launchApp === 'function') {
      return this.executeWithTimeout(
        () => adapter.launchApp(packageName, appName),
        'LAUNCH_APP'
      );
    }
    return this.openApp(packageName, appName);
  }

  public async getInstalledApps(): Promise<InstalledAppInfo[]> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.getInstalledApps === 'function') {
      return adapter.getInstalledApps();
    }
    return this.webMockAdapter.getInstalledApps();
  }

  public async goHome(): Promise<AndroidActionResult> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.goHome === 'function') {
      return this.executeWithTimeout(
        () => adapter.goHome(),
        'GO_HOME'
      );
    }
    return this.webMockAdapter.goHome();
  }

  public async getRecentApps(): Promise<AndroidActionResult<InstalledAppInfo[]>> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.getRecentApps === 'function') {
      return adapter.getRecentApps();
    }
    return this.webMockAdapter.getRecentApps();
  }

  public async findAppByName(query: string): Promise<InstalledAppInfo | undefined> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.findAppByName === 'function') {
      return adapter.findAppByName(query);
    }
    return this.webMockAdapter.findAppByName(query);
  }

  public async openYouTube(videoId?: string, query?: string): Promise<AndroidActionResult> {
    return this.executeWithTimeout(
      () => this.getActiveAdapter().openYouTube(videoId, query),
      'OPEN_YOUTUBE'
    );
  }

  public async openWhatsApp(phone?: string, text?: string): Promise<AndroidActionResult> {
    return this.executeWithTimeout(
      () => this.getActiveAdapter().openWhatsApp(phone, text),
      'OPEN_WHATSAPP'
    );
  }

  public async prepareWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult> {
    const result = await this.executeWithTimeout(
      () => this.getActiveAdapter().prepareWhatsAppMessage(phone, text),
      'PREPARE_WHATSAPP_MESSAGE'
    );

    // Register an Action Preview so the UI and Voice can confirm before actual sending
    const previewId = `prev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const preview: ActionPreviewItem = {
      id: previewId,
      actionType: 'SEND_WHATSAPP_MESSAGE',
      title: 'WhatsApp Message Confirmation',
      appName: 'WhatsApp',
      packageName: 'com.whatsapp',
      recipient: phone,
      messagePreview: text,
      permissionLevel: 'REQUIRES_CONFIRMATION',
      riskNotice: 'Sending a direct message will contact the recipient.',
      status: 'pending_confirmation',
      createdAt: Date.now(),
      payload: { phone, text },
    };

    this.actionPreviews.set(previewId, preview);
    this.notifyPreviews();

    return {
      ...result,
      data: {
        ...(result.data as any),
        previewId,
        confirmationPrompt: `I have prepared the WhatsApp message for ${phone}. Do you want me to send it?`,
      },
    };
  }

  public async sendWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult> {
    // Check permission policy: REQUIRES_CONFIRMATION
    const policy = permissionManager.getPolicy('SEND_WHATSAPP_MESSAGE');
    if (policy.level === 'REQUIRES_CONFIRMATION') {
      // Must not silently send. Check if an active preview has already been confirmed.
      const existing = Array.from(this.actionPreviews.values()).find(
        (p) =>
          p.actionType === 'SEND_WHATSAPP_MESSAGE' &&
          p.payload.phone === phone &&
          p.status === 'confirmed'
      );

      if (!existing) {
        // If not yet confirmed, prepare draft and require confirmation first
        return this.prepareWhatsAppMessage(phone, text);
      }
    }

    return this.executeWithTimeout(
      () => this.getActiveAdapter().sendWhatsAppMessage(phone, text),
      'SEND_WHATSAPP_MESSAGE'
    );
  }

  // Action Preview Confirmation API (can be called from UI button or voice "send / confirm")
  public async confirmAction(previewId: string): Promise<AndroidActionResult> {
    const preview = this.actionPreviews.get(previewId);
    if (!preview) {
      return {
        success: false,
        action: 'CONFIRM_ACTION',
        errorCode: 'INVALID_PARAMETERS',
        message: `Action preview "${previewId}" not found.`,
      };
    }

    preview.status = 'confirmed';
    this.notifyPreviews();

    let result: AndroidActionResult;
    if (preview.actionType === 'SEND_WHATSAPP_MESSAGE') {
      result = await this.getActiveAdapter().sendWhatsAppMessage(
        preview.payload.phone,
        preview.payload.text
      );
    } else {
      result = await this.executeSupportedAction({
        actionType: preview.actionType as any,
        ...preview.payload,
      });
    }

    preview.status = result.success ? 'executed' : 'failed';
    this.notifyPreviews();
    return result;
  }

  public cancelAction(previewId: string): AndroidActionResult {
    const preview = this.actionPreviews.get(previewId);
    if (!preview) {
      return {
        success: false,
        action: 'CANCEL_ACTION',
        errorCode: 'INVALID_PARAMETERS',
        message: `Action preview "${previewId}" not found.`,
      };
    }

    preview.status = 'cancelled';
    this.notifyPreviews();
    nativeEventBus.emit('USER_CANCELLED', { previewId });

    return {
      success: true,
      action: 'CANCEL_ACTION',
      message: `Action cancelled by user: ${preview.title}`,
    };
  }

  public async openSettings(target: string): Promise<AndroidActionResult> {
    return this.executeWithTimeout(
      () => this.getActiveAdapter().openSettings(target),
      'OPEN_SETTINGS'
    );
  }

  public async startForegroundService(options: {
    statusText?: string;
    voiceActive?: boolean;
    muted?: boolean;
    taskCount?: number;
  }): Promise<AndroidActionResult> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.startForegroundService === 'function') {
      return adapter.startForegroundService(options);
    }
    return {
      success: false,
      action: 'START_FOREGROUND_SERVICE',
      errorCode: 'BRIDGE_UNAVAILABLE',
      message: 'Android Foreground Service requires the FRIDAY Android APK.',
    };
  }

  public async stopForegroundService(): Promise<AndroidActionResult> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.stopForegroundService === 'function') {
      return adapter.stopForegroundService();
    }
    return {
      success: false,
      action: 'STOP_FOREGROUND_SERVICE',
      errorCode: 'BRIDGE_UNAVAILABLE',
      message: 'Android Foreground Service is not active in browser mode.',
    };
  }

  public async getForegroundServiceStatus(): Promise<{
    running: boolean;
    voiceActive: boolean;
    muted: boolean;
    taskCount: number;
    statusText: string;
    ignoringBatteryOptimizations?: boolean;
  }> {
    const adapter = this.getActiveAdapter();
    if (typeof adapter.getForegroundServiceStatus === 'function') {
      return adapter.getForegroundServiceStatus();
    }
    return {
      running: false,
      voiceActive: false,
      muted: false,
      taskCount: 0,
      statusText: 'Tab Scope (Web)',
      ignoringBatteryOptimizations: false,
    };
  }

  public async executeSupportedAction(action: AndroidActionRequest): Promise<AndroidActionResult> {
    return this.executeWithTimeout(
      () => this.getActiveAdapter().executeSupportedAction(action),
      action.actionType,
      action.timeoutMs || 8000
    );
  }

  // Safe Multi-Step Device Action Plan
  // e.g. 1. Check capability -> 2. Open YouTube -> 3. Search query -> 4. Report status
  public async executeMultiStepAction(
    planName: string,
    steps: Array<{ name: string; run: () => Promise<AndroidActionResult> }>
  ): Promise<{ success: boolean; completedSteps: number; totalSteps: number; message: string }> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const res = await step.run();
      if (!res.success) {
        return {
          success: false,
          completedSteps: i,
          totalSteps: steps.length,
          message: `Plan "${planName}" halted at step ${i + 1} (${step.name}): ${res.message}`,
        };
      }
    }

    return {
      success: true,
      completedSteps: steps.length,
      totalSteps: steps.length,
      message: `Plan "${planName}" executed successfully across all ${steps.length} steps.`,
    };
  }

  public postMessage(data: Record<string, any>): void {
    if (typeof window !== 'undefined' && window.FridayAndroidBridge?.postMessage) {
      try {
        window.FridayAndroidBridge.postMessage(JSON.stringify(data));
      } catch (e) {
        console.warn('Error in androidBridge.postMessage:', e);
      }
    }
  }
}

export const androidBridge = AndroidBridge.getInstance();
