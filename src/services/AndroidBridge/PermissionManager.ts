/**
 * PART 6 — FRIDAY Permission Manager
 * Centralized permission classification, confirmation enforcement, and audit rules.
 */

import { PermissionLevel, AndroidPermission, AndroidPermissionsSummary } from '../../types/android';

export interface ActionPermissionPolicy {
  actionType: string;
  level: PermissionLevel;
  requiredAndroidPermission?: AndroidPermission;
  description: string;
  userPromptMessage?: string;
}

export class PermissionManager {
  private static instance: PermissionManager;

  private policies: Map<string, ActionPermissionPolicy> = new Map([
    [
      'OPEN_URL',
      {
        actionType: 'OPEN_URL',
        level: 'SAFE',
        description: 'Opening a public web link in the browser.',
      },
    ],
    [
      'OPEN_YOUTUBE',
      {
        actionType: 'OPEN_YOUTUBE',
        level: 'SAFE',
        description: 'Launching YouTube or searching for video content.',
      },
    ],
    [
      'SEARCH_YOUTUBE',
      {
        actionType: 'SEARCH_YOUTUBE',
        level: 'SAFE',
        description: 'Searching YouTube video library.',
      },
    ],
    [
      'OPEN_APP',
      {
        actionType: 'OPEN_APP',
        level: 'SAFE',
        description: 'Launching an installed application on device.',
      },
    ],
    [
      'OPEN_WHATSAPP',
      {
        actionType: 'OPEN_WHATSAPP',
        level: 'SAFE',
        description: 'Opening WhatsApp application.',
      },
    ],
    [
      'PREPARE_WHATSAPP_MESSAGE',
      {
        actionType: 'PREPARE_WHATSAPP_MESSAGE',
        level: 'SAFE',
        description: 'Drafting message content and preparing deep link / intent.',
      },
    ],
    [
      'SEND_WHATSAPP_MESSAGE',
      {
        actionType: 'SEND_WHATSAPP_MESSAGE',
        level: 'REQUIRES_CONFIRMATION',
        description: 'Transmitting a message to a WhatsApp contact.',
        userPromptMessage: 'Ready to send this WhatsApp message. Do you confirm?',
      },
    ],
    [
      'CHECK_ACCESSIBILITY',
      {
        actionType: 'CHECK_ACCESSIBILITY',
        level: 'SAFE',
        description: 'Querying Android Accessibility Service status.',
      },
    ],
    [
      'ACCESSIBILITY_DISPATCH',
      {
        actionType: 'ACCESSIBILITY_DISPATCH',
        level: 'REQUIRES_ACCESSIBILITY',
        requiredAndroidPermission: 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        description: 'Executing programmatic UI gestures via Accessibility Service.',
      },
    ],
    [
      'POST_NOTIFICATION',
      {
        actionType: 'POST_NOTIFICATION',
        level: 'REQUIRES_ANDROID_PERMISSION',
        requiredAndroidPermission: 'android.permission.POST_NOTIFICATIONS',
        description: 'Displaying Android status notifications.',
      },
    ],
    [
      'START_SCREEN_CAPTURE',
      {
        actionType: 'START_SCREEN_CAPTURE',
        level: 'REQUIRES_ANDROID_PERMISSION',
        requiredAndroidPermission: 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
        description: 'Starting user-authorized Android MediaProjection screen capture.',
      },
    ],
    [
      'CAPTURE_SCREEN_SNAPSHOT',
      {
        actionType: 'CAPTURE_SCREEN_SNAPSHOT',
        level: 'SAFE',
        description: 'Inspecting visible screen content when requested by the user.',
      },
    ],
    [
      'SCREEN_CLICK_ELEMENT',
      {
        actionType: 'SCREEN_CLICK_ELEMENT',
        level: 'REQUIRES_ACCESSIBILITY',
        requiredAndroidPermission: 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        description: 'Tapping a visible UI element via Android Accessibility Service.',
      },
    ],
    [
      'SCREEN_TAP_COORDINATES',
      {
        actionType: 'SCREEN_TAP_COORDINATES',
        level: 'REQUIRES_ACCESSIBILITY',
        requiredAndroidPermission: 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        description: 'Dispatching a tap gesture at screen coordinates via Accessibility Service.',
      },
    ],
    [
      'SCREEN_SCROLL',
      {
        actionType: 'SCREEN_SCROLL',
        level: 'REQUIRES_ACCESSIBILITY',
        requiredAndroidPermission: 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        description: 'Scrolling the active screen via Accessibility Service.',
      },
    ],
    [
      'SCREEN_INPUT_TEXT',
      {
        actionType: 'SCREEN_INPUT_TEXT',
        level: 'REQUIRES_ACCESSIBILITY',
        requiredAndroidPermission: 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        description: 'Entering text into a non-password input field via Accessibility Service.',
      },
    ],
    [
      'SCREEN_GLOBAL_NAVIGATION',
      {
        actionType: 'SCREEN_GLOBAL_NAVIGATION',
        level: 'REQUIRES_ACCESSIBILITY',
        requiredAndroidPermission: 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        description: 'Performing Back, Home, or Recents navigation.',
      },
    ],
  ]);

  private static readonly STORAGE_KEY = 'friday_android_permissions_cache_v1';

  private grantedPermissions: Set<AndroidPermission> = new Set([
    'android.permission.INTERNET',
  ]);

  constructor() {
    this.loadPersistedPermissions();
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private loadPersistedPermissions(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(PermissionManager.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => this.grantedPermissions.add(p));
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private savePersistedPermissions(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          PermissionManager.STORAGE_KEY,
          JSON.stringify(Array.from(this.grantedPermissions))
        );
      }
    } catch {
      // ignore storage errors
    }
  }

  public syncFromSummary(summary: {
    recordAudio?: boolean;
    postNotifications?: boolean;
    camera?: boolean;
    accessibilityService?: boolean;
    mediaProjectionActive?: boolean;
  }): void {
    if (typeof summary.recordAudio === 'boolean') {
      this.setAndroidPermissionGranted('android.permission.RECORD_AUDIO', summary.recordAudio);
    }
    if (typeof summary.postNotifications === 'boolean') {
      this.setAndroidPermissionGranted('android.permission.POST_NOTIFICATIONS', summary.postNotifications);
    }
    if (typeof summary.camera === 'boolean') {
      this.setAndroidPermissionGranted('android.permission.CAMERA', summary.camera);
    }
    if (typeof summary.accessibilityService === 'boolean') {
      this.setAndroidPermissionGranted(
        'android.permission.BIND_ACCESSIBILITY_SERVICE',
        summary.accessibilityService
      );
    }
    if (typeof summary.mediaProjectionActive === 'boolean') {
      this.setAndroidPermissionGranted(
        'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
        summary.mediaProjectionActive
      );
    }
  }

  public getPolicy(actionType: string): ActionPermissionPolicy {
    return (
      this.policies.get(actionType) || {
        actionType,
        level: 'REQUIRES_CONFIRMATION',
        description: `Unclassified action: ${actionType}`,
      }
    );
  }

  public getPermissionLevel(actionType: string): PermissionLevel {
    return this.getPolicy(actionType).level;
  }

  public requiresConfirmation(actionType: string): boolean {
    const level = this.getPermissionLevel(actionType);
    return level === 'REQUIRES_CONFIRMATION';
  }

  public isAndroidPermissionGranted(permission: AndroidPermission): boolean {
    return this.grantedPermissions.has(permission);
  }

  public setAndroidPermissionGranted(permission: AndroidPermission, granted: boolean): void {
    if (granted) {
      this.grantedPermissions.add(permission);
    } else {
      this.grantedPermissions.delete(permission);
    }
    this.savePersistedPermissions();
  }

  public getAllPolicies(): ActionPermissionPolicy[] {
    return Array.from(this.policies.values());
  }

  public savePermissionsSummary(summary: AndroidPermissionsSummary): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('friday_android_permissions_summary_v1', JSON.stringify(summary));
      }
      if (summary.microphone?.status) {
        this.setAndroidPermissionGranted('android.permission.RECORD_AUDIO', summary.microphone.status === 'GRANTED');
      }
      if (summary.notifications?.status) {
        this.setAndroidPermissionGranted('android.permission.POST_NOTIFICATIONS', summary.notifications.status === 'GRANTED');
      }
      if (summary.camera?.status) {
        this.setAndroidPermissionGranted('android.permission.CAMERA', summary.camera.status === 'GRANTED');
      }
      if (summary.accessibility?.status) {
        this.setAndroidPermissionGranted('android.permission.BIND_ACCESSIBILITY_SERVICE', summary.accessibility.status === 'GRANTED');
      }
      if (summary.screenCapture?.status) {
        this.setAndroidPermissionGranted('android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION', summary.screenCapture.status === 'GRANTED');
      }
    } catch {
      // ignore storage errors
    }
  }

  public getSavedPermissionsSummary(): AndroidPermissionsSummary | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('friday_android_permissions_summary_v1');
        if (raw) {
          return JSON.parse(raw) as AndroidPermissionsSummary;
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  }

  public detectRevokedPermissions(
    previous: AndroidPermissionsSummary,
    current: AndroidPermissionsSummary
  ): string[] {
    const revoked: string[] = [];
    const pairs: Array<[string, string | undefined, string | undefined]> = [
      ['Microphone', previous.microphone?.status, current.microphone?.status],
      ['Screen Capture', previous.screenCapture?.status, current.screenCapture?.status],
      ['Accessibility Service', previous.accessibility?.status, current.accessibility?.status],
      ['Notifications', previous.notifications?.status, current.notifications?.status],
      ['Camera', previous.camera?.status, current.camera?.status],
    ];
    for (const [label, prevStatus, currStatus] of pairs) {
      if (prevStatus === 'GRANTED' && currStatus === 'NOT_GRANTED') {
        revoked.push(label);
      }
    }
    return revoked;
  }
}

export const permissionManager = PermissionManager.getInstance();
