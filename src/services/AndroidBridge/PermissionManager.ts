/**
 * PART 6 — FRIDAY Permission Manager
 * Centralized permission classification, confirmation enforcement, and audit rules.
 */

import { PermissionLevel, AndroidPermission } from '../../types/android';

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
  ]);

  private grantedPermissions: Set<AndroidPermission> = new Set([
    'android.permission.INTERNET',
  ]);

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
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
  }

  public getAllPolicies(): ActionPermissionPolicy[] {
    return Array.from(this.policies.values());
  }
}

export const permissionManager = PermissionManager.getInstance();
