/**
 * PART 6 — Automated Test Suite for FRIDAY Android Control Bridge & Regression Protection
 * Validates all 16 specified requirements from Part 6 prompt.
 */

import { AndroidBridge } from '../src/services/AndroidBridge/AndroidBridge';
import { WebMockAdapter } from '../src/services/AndroidBridge/WebMockAdapter';
import { NativeAndroidAdapter } from '../src/services/AndroidBridge/NativeAndroidAdapter';
import { permissionManager } from '../src/services/AndroidBridge/PermissionManager';
import { nativeEventBus } from '../src/services/AndroidBridge/NativeEventBus';
import { toolManager } from '../src/services/ToolManager';
import { IAndroidBridge } from '../src/services/AndroidBridge/AndroidBridgeInterface';
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
} from '../src/types/android';

async function runTestSuite() {
  console.log('====================================================');
  console.log('PART 6 — FRIDAY ANDROID BRIDGE & DEVICE AUTOMATED TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
      failed++;
    }
  }

  // Disable speaker verification during isolated Android bridge protocol testing
  const { speakerVerificationManager } = await import('../src/services/SpeakerVerificationManager');
  speakerVerificationManager.setEnabled(false);

  const bridge = new AndroidBridge();

  // Test 1: AndroidBridge unavailable in web mode
  {
    const webAdapter = new WebMockAdapter();
    bridge.setAdapter(webAdapter);
    assert(bridge.isAvailable() === false, 'Test 1: AndroidBridge unavailable in web fallback');
  }

  // Test 2: AndroidBridge available when native bridge attached
  {
    class MockNativeAdapter implements IAndroidBridge {
      id = 'mock_native';
      isAvailable() { return true; }
      getExecutionMode(): NativeExecutionMode { return 'CONNECTED_NATIVE'; }
      async getCapabilityStatus(actionType?: string, targetPackage?: string): Promise<NativeCapabilityStatus> {
        if (targetPackage === 'com.fake.nonexistent' || targetPackage === 'com.uninstalled.fantasy_app') {
          return 'APP_NOT_INSTALLED';
        }
        return 'ANDROID_NATIVE';
      }
      async getDeviceInfo(): Promise<AndroidDeviceInfo> {
        return { platform: 'android', isNativeWrapper: true, manufacturer: 'Samsung', model: 'Galaxy S24', apiLevel: 34 };
      }
      getSupportedCapabilities(): AndroidCapabilities {
        return {
          android: true,
          browser: true,
          youtube: true,
          whatsapp: true,
          accessibility: true,
          notifications: true,
          backgroundExecution: true,
          installedAppsCheck: true,
          directAppLaunch: true,
        };
      }
      async openExternalUrl(url: string): Promise<AndroidActionResult> {
        return { success: true, action: 'OPEN_URL', message: `Native Intent opened ${url}` };
      }
      async openApp(packageName: string): Promise<AndroidActionResult> {
        if (packageName === 'com.fake.nonexistent') {
          return { success: false, action: 'OPEN_APP', errorCode: 'ANDROID_APP_NOT_INSTALLED', message: 'App not installed' };
        }
        return { success: true, action: 'OPEN_APP', message: `Native Intent launched ${packageName}` };
      }
      async openYouTube(videoId?: string, query?: string): Promise<AndroidActionResult> {
        return { success: true, action: 'OPEN_YOUTUBE', message: `YouTube native opened: ${query || videoId || 'home'}` };
      }
      async openWhatsApp(phone?: string, text?: string): Promise<AndroidActionResult> {
        return { success: true, action: 'OPEN_WHATSAPP', message: 'WhatsApp native intent launched' };
      }
      async prepareWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult> {
        return { success: true, action: 'PREPARE_WHATSAPP_MESSAGE', message: 'Prepared', data: { phone, text } };
      }
      async sendWhatsAppMessage(phone: string, text: string): Promise<AndroidActionResult> {
        return { success: true, action: 'SEND_WHATSAPP_MESSAGE', message: `Message sent to ${phone}` };
      }
      async requestAccessibilityStatus(): Promise<AccessibilityStatusResult> {
        return { enabled: true, serviceRunning: true, canPerformGestures: true, canInspectHierarchy: true };
      }
      async requestNativePermission(permission: AndroidPermission): Promise<AndroidPermissionResult> {
        return { permission, granted: true };
      }
      async executeSupportedAction(action: AndroidActionRequest): Promise<AndroidActionResult> {
        return { success: true, action: action.actionType, message: 'Executed' };
      }
      async isAppInstalled(packageName: string): Promise<boolean> {
        return packageName !== 'com.fake.nonexistent' && packageName !== 'com.uninstalled.fantasy_app';
      }
      async launchApp(packageName: string, appName?: string): Promise<AndroidActionResult> {
        if (packageName === 'com.fake.nonexistent' || packageName === 'com.uninstalled.fantasy_app') {
          return { success: false, action: 'LAUNCH_APP', errorCode: 'ANDROID_APP_NOT_INSTALLED', message: 'App not installed' };
        }
        return { success: true, action: 'LAUNCH_APP', message: `Launched ${appName || packageName}` };
      }
      async getInstalledApps(): Promise<InstalledAppInfo[]> {
        return [
          { appName: 'Google Chrome', packageName: 'com.android.chrome', launchable: true },
          { appName: 'YouTube', packageName: 'com.google.android.youtube', launchable: true },
          { appName: 'WhatsApp', packageName: 'com.whatsapp', launchable: true },
          { appName: 'Android Settings', packageName: 'com.android.settings', launchable: true },
          { appName: 'Calculator', packageName: 'com.google.android.calculator', launchable: true },
          { appName: 'Camera', packageName: 'com.android.camera2', launchable: true },
          { appName: 'Google Maps', packageName: 'com.google.android.apps.maps', launchable: true },
          { appName: 'Gmail', packageName: 'com.google.android.gm', launchable: true },
          { appName: 'Spotify', packageName: 'com.spotify.music', launchable: true },
          { appName: 'Messages', packageName: 'com.google.android.apps.messaging', launchable: true },
        ];
      }
      async goHome(): Promise<AndroidActionResult> {
        return { success: true, action: 'GO_HOME', message: 'Navigated to home screen' };
      }
      async getRecentApps(): Promise<AndroidActionResult<InstalledAppInfo[]>> {
        return {
          success: true,
          action: 'GET_RECENT_APPS',
          message: 'Retrieved recent apps',
          data: [{ appName: 'Calculator', packageName: 'com.google.android.calculator', launchable: true }],
        };
      }
      async findAppByName(query: string): Promise<InstalledAppInfo | undefined> {
        const apps = await this.getInstalledApps();
        const q = query.toLowerCase();
        return apps.find((a) => a.appName.toLowerCase().includes(q) || a.packageName.includes(q));
      }
      async openSettings(target: string): Promise<AndroidActionResult> {
        return { success: true, action: 'OPEN_SETTINGS', message: `Opened ${target} settings` };
      }
    }

    const mockNative = new MockNativeAdapter();
    bridge.setAdapter(mockNative);
    assert(bridge.isAvailable() === true, 'Test 2: AndroidBridge available when native bridge attached');
  }

  // Test 3: Capability detection
  {
    const caps = bridge.getSupportedCapabilities();
    assert(
      caps.android === true && caps.youtube === true && caps.whatsapp === true && caps.accessibility === true,
      'Test 3: Capability detection returns accurate native capabilities'
    );
  }

  // Test 4: Open URL via bridge
  {
    const res = await bridge.openExternalUrl('https://google.com');
    assert(res.success && res.action === 'OPEN_URL', 'Test 4: Open URL executed successfully via Android Intent');
  }

  // Test 5: Open YouTube via bridge
  {
    const res = await bridge.openYouTube(undefined, 'Minecraft building');
    assert(res.success && res.action === 'OPEN_YOUTUBE', 'Test 5: Open YouTube with query handled via bridge');
  }

  // Test 6: Open WhatsApp via bridge
  {
    const res = await bridge.openWhatsApp('+8801700000000', 'Hello from FRIDAY');
    assert(res.success && res.action === 'OPEN_WHATSAPP', 'Test 6: Open WhatsApp handled via bridge');
  }

  // Test 7: App-not-installed error handling
  {
    const res = await bridge.openApp('com.fake.nonexistent', 'Nonexistent App');
    assert(
      res.success === false && res.errorCode === 'ANDROID_APP_NOT_INSTALLED',
      'Test 7: App-not-installed returns structured errorCode ANDROID_APP_NOT_INSTALLED'
    );
  }

  // Test 8: Permission denied error handling
  {
    class PermissionDeniedAdapter extends WebMockAdapter {
      async requestNativePermission(perm: AndroidPermission) {
        return { permission: perm, granted: false, shouldShowRationale: true };
      }
    }
    const permBridge = new AndroidBridge();
    permBridge.setAdapter(new PermissionDeniedAdapter());
    const res = await permBridge.requestNativePermission('android.permission.RECORD_AUDIO');
    assert(res.granted === false, 'Test 8: Permission denied returns granted: false without faking');
  }

  // Test 9: Accessibility disabled detection
  {
    const web = new WebMockAdapter();
    const acc = await web.requestAccessibilityStatus();
    assert(
      acc.enabled === false && acc.canPerformGestures === false,
      'Test 9: Accessibility disabled detected honestly in non-accessibility environment'
    );
  }

  // Test 10: Confirmation required (never send WhatsApp silently)
  {
    const prepRes = await bridge.prepareWhatsAppMessage('+8801700000000', 'Confidential Order Ready');
    const previews = bridge.getPendingPreviews();
    assert(
      prepRes.success && previews.length > 0 && previews[0].status === 'pending_confirmation',
      'Test 10: Confirmation required creates Action Preview before risky send'
    );
  }

  // Test 11: Cancellation
  {
    const previews = bridge.getPendingPreviews();
    const targetId = previews[0]?.id;
    if (targetId) {
      const cancelRes = bridge.cancelAction(targetId);
      assert(cancelRes.success && cancelRes.action === 'CANCEL_ACTION', 'Test 11: Cancellation correctly updates action state');
    } else {
      assert(false, 'Test 11: Cancellation could not find pending preview');
    }
  }

  // Test 12: Timeout handling
  {
    class SlowAdapter extends WebMockAdapter {
      async openExternalUrl(): Promise<AndroidActionResult> {
        await new Promise((r) => setTimeout(r, 500));
        return { success: true, action: 'OPEN_URL', message: 'Too late' };
      }
    }
    const timeoutBridge = new AndroidBridge();
    timeoutBridge.setAdapter(new SlowAdapter());
    // @ts-ignore private test execution with 100ms timeout
    const timeoutRes = await (timeoutBridge as any).executeWithTimeout(
      () => (timeoutBridge as any).activeAdapter.openExternalUrl('https://timeout.com'),
      'OPEN_URL',
      100
    );
    assert(
      timeoutRes.success === false && timeoutRes.errorCode === 'ACTION_TIMEOUT',
      'Test 12: Timeout handling aborts slow operations with ACTION_TIMEOUT'
    );
  }

  // Test 13: Duplicate event prevention
  {
    nativeEventBus.clear();
    let count = 0;
    const unsub = nativeEventBus.on('DEVICE_READY', () => {
      count++;
    });

    // Send two events with the same ID
    const eventId = 'test_evt_123';
    nativeEventBus.emit('DEVICE_READY', { test: true }, eventId);
    nativeEventBus.emit('DEVICE_READY', { test: true }, eventId);

    unsub();
    assert(count === 1, 'Test 13: Native event bus dedupes repeated event IDs');
  }

  // Test 14: Voice -> Android tool execution via ToolManager
  {
    const toolRes = await toolManager.executeTool(
      'android_get_capabilities',
      {},
      'call_cap_1'
    );
    assert(toolRes.success === true && toolRes.capabilities !== undefined, 'Test 14: Voice tool execution routes through ToolManager');
  }

  // Test 15: Android failure -> voice error response
  {
    const failRes = await toolManager.executeTool(
      'android_open_app',
      { packageName: 'com.missing.fake' },
      'call_fail_1'
    );
    assert(
      failRes.success === false,
      'Test 15: Android bridge failure produces honest failure response to FRIDAY brain'
    );
  }

  // Test 16: Parts 1–5 Regression Tests
  {
    // Check Health endpoint & Gemini Live configuration
    const fetch = globalThis.fetch;
    const health = await fetch('http://localhost:3000/api/health').then((r) => r.json());
    const hasLive = health.status === 'ok' && health.model === 'gemini-3.8-live' && health.hasKey === true;

    // Check Memory sync in ToolManager
    const memRes = await toolManager.executeTool('saveMemory', { key: 'reg_test', content: 'regression pass' }, 'mem_1');
    const hasMem = memRes.success === true;

    // Check Task in ToolManager
    const taskRes = await toolManager.executeTool('createTask', { title: 'regression task' }, 'task_1');
    const hasTask = taskRes.success === true;

    // Check In-App Browser in ToolManager
    const browserRes = await toolManager.executeTool('openInAppBrowser', { url: 'https://en.wikipedia.org' }, 'br_1');
    const hasBrowser = browserRes.success === true && browserRes.browserType === 'in_app';

    // Check Workflow in ToolManager
    const wfRes = await toolManager.executeTool('startAdvancedWorkflow', { title: 'Reg Workflow', goal: 'Test', steps: ['Step 1'] }, 'wf_1');
    const hasWorkflow = wfRes.success === true;

    assert(
      hasLive && hasMem && hasTask && hasBrowser && hasWorkflow,
      'Test 16: Parts 1–5 Regression tests verified (Voice API, Memory, Tasks, In-App Browser, Workflows intact)'
    );
  }

  // Test 17: android_open_settings execution via ToolManager & AndroidBridge
  {
    const settingsRes = await toolManager.executeTool(
      'android_open_settings',
      { target: 'accessibility' },
      'call_sett_1'
    );
    // In web fallback, returns honest BRIDGE_UNAVAILABLE without faking
    assert(
      settingsRes.action === 'OPEN_SETTINGS' &&
      settingsRes.success === false &&
      settingsRes.errorCode === 'BRIDGE_UNAVAILABLE',
      'Test 17: android_open_settings reports honest bridge status in web fallback'
    );
  }

  // Test 18: Native postMessage bidirectional protocol contract validation
  {
    const mockNativeInterface = {
      isAvailable: () => true,
      postMessage: (jsonStr: string) => {
        const req = JSON.parse(jsonStr);
        return JSON.stringify({
          requestId: req.requestId,
          action: req.action,
          success: true,
          message: `Native processed action: ${req.action}`,
          data: { echoed: req.payload },
          timestamp: Date.now(),
        });
      },
      openSettings: (target: string) => {
        return JSON.stringify({
          success: true,
          action: 'OPEN_SETTINGS',
          message: `Opened ${target} settings`,
        });
      },
    };

    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.FridayAndroidBridge = mockNativeInterface;

    const nativeAdapter = new NativeAndroidAdapter();
    const settingsRes = await nativeAdapter.openSettings('accessibility');
    const actionRes = await nativeAdapter.executeSupportedAction({
      actionType: 'OPEN_SETTINGS',
      target: 'accessibility',
    });

    delete (globalThis as any).window.FridayAndroidBridge;

    assert(
      settingsRes.success === true && actionRes.success === true,
      'Test 18: Native postMessage & openSettings bidirectional protocol verified'
    );
  }

  // Test 19: Installed App Discovery
  {
    const apps = await bridge.getInstalledApps();
    assert(
      Array.isArray(apps) &&
      apps.length >= 10 &&
      apps.some((a) => a.appName === 'Google Chrome' && a.packageName === 'com.android.chrome') &&
      apps.some((a) => a.appName === 'Calculator' && a.launchable === true),
      'Test 19: Installed app discovery queries launchable apps with package names and metadata'
    );
  }

  // Test 20: Voice App Name Matching
  {
    const chrome = await bridge.findAppByName('Chrome');
    const calc = await bridge.findAppByName('calculator');
    const wa = await bridge.findAppByName('WhatsApp');
    const nonExistent = await bridge.findAppByName('NonExistentApp12345');

    assert(
      chrome?.packageName === 'com.android.chrome' &&
      calc?.packageName === 'com.google.android.calculator' &&
      wa?.packageName === 'com.whatsapp' &&
      nonExistent === undefined,
      'Test 20: Voice app name matching resolves natural names and aliases to installed packages'
    );
  }

  // Test 21: Universal App Launcher - Valid App
  {
    const launchRes = await bridge.launchApp('com.google.android.calculator', 'Calculator');
    assert(
      launchRes.success === true &&
      launchRes.action === 'LAUNCH_APP',
      'Test 21: launchApp launches installed applications via Android launch intent'
    );
  }

  // Test 22: Universal App Launcher - App Not Installed Structured Error
  {
    const failRes = await bridge.launchApp('com.uninstalled.fantasy_app', 'Fantasy App');
    assert(
      failRes.success === false &&
      failRes.errorCode === 'ANDROID_APP_NOT_INSTALLED' &&
      failRes.message.includes('not installed'),
      'Test 22: launchApp returns structured ANDROID_APP_NOT_INSTALLED error when app is missing'
    );
  }

  // Test 23: Safe Android Home Screen Navigation
  {
    const homeRes = await bridge.goHome();
    assert(
      homeRes.success === true &&
      homeRes.action === 'GO_HOME',
      'Test 23: goHome navigates to Android home screen via safe CATEGORY_HOME Intent'
    );
  }

  // Test 24: Recent Apps Tracking & Session Query
  {
    const recents = await bridge.getRecentApps();
    assert(
      recents.success === true &&
      recents.action === 'GET_RECENT_APPS' &&
      Array.isArray(recents.data) &&
      recents.data.some((a) => a.packageName === 'com.google.android.calculator'),
      'Test 24: getRecentApps tracks and returns session recent apps'
    );
  }

  // Test 25: ToolManager Voice Tool Routing for Part 6C / Workspace
  {
    const listTool = await toolManager.executeTool('android_list_installed_apps', {}, 't_list_1');
    const launchTool = await toolManager.executeTool('android_launch_app', { appName: 'Calculator' }, 't_launch_1');
    const homeTool = await toolManager.executeTool('android_go_home', {}, 't_home_1');
    const recentsTool = await toolManager.executeTool('android_get_recent_apps', {}, 't_rec_1');

    assert(
      listTool.success === true &&
      listTool.apps.length > 0 &&
      launchTool.success === true &&
      homeTool.success === true &&
      recentsTool.success === true,
      'Test 25: Gemini Live voice tools (launch_app, go_home, list_installed_apps, get_recent_apps) route cleanly'
    );
  }

  // Test 26: Part 15 — Permission Center & Web Fallback Honesty
  {
    const permsSummary = await bridge.getAllPermissionsStatus();
    const inspectWebRes = await toolManager.executeTool('android_inspect_screen', { includeScreenshot: true }, 't_insp_web');
    assert(
      Boolean(
        permsSummary.microphone &&
        permsSummary.screenCapture.status === 'NOT_SUPPORTED' &&
        permsSummary.accessibility.status === 'NOT_SUPPORTED' &&
        inspectWebRes.success === false &&
        inspectWebRes.errorCode === 'BRIDGE_UNAVAILABLE'
      ),
      'Test 26: Part 15 Permission Center & Screen Vision honestly report NOT_SUPPORTED / BRIDGE_UNAVAILABLE in browser mode'
    );
  }

  // Test 27: Part 15 — Native Screen Vision, UI Hierarchy, Screenshot & Sensitive Action Guard
  {
    let mockScreenCaptureActive = false;
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.FridayAndroidBridge = {
      isAvailable: () => true,
      getAllPermissionsStatus: () =>
        JSON.stringify({
          microphone: { id: 'microphone', name: 'Microphone', description: '', status: 'GRANTED', canRequestInApp: true },
          screenCapture: {
            id: 'screen_capture',
            name: 'Screen Capture',
            description: '',
            status: mockScreenCaptureActive ? 'GRANTED' : 'NOT_GRANTED',
            canRequestInApp: true,
          },
          accessibility: { id: 'accessibility', name: 'Accessibility', description: '', status: 'GRANTED', canRequestInApp: false },
          notifications: { id: 'notifications', name: 'Notifications', description: '', status: 'GRANTED', canRequestInApp: true },
          camera: { id: 'camera', name: 'Camera', description: '', status: 'NOT_GRANTED', canRequestInApp: true },
          checkedAt: Date.now(),
        }),
      requestScreenCapture: () => {
        mockScreenCaptureActive = true;
        return JSON.stringify({
          success: true,
          action: 'REQUEST_SCREEN_CAPTURE',
          message: 'MediaProjection screen capture active.',
        });
      },
      stopScreenCapture: () => {
        mockScreenCaptureActive = false;
        return JSON.stringify({
          success: true,
          action: 'STOP_SCREEN_CAPTURE',
          message: 'Screen capture stopped.',
        });
      },
      inspectScreen: (includeScreenshot: boolean) =>
        JSON.stringify({
          success: true,
          action: 'INSPECT_SCREEN',
          message: 'Inspected screen on Settings.',
          data: {
            packageName: 'com.android.settings',
            appName: 'Settings',
            summaryText: 'Settings | Wi-Fi | Bluetooth | Accessibility',
            elements: [
              {
                id: 'node_1',
                className: 'TextView',
                text: 'Accessibility',
                contentDescription: 'Accessibility settings',
                viewIdResourceName: 'com.android.settings:id/title',
                clickable: true,
                editable: false,
                scrollable: false,
                focused: false,
                bounds: { left: 0, top: 200, right: 1080, bottom: 320, centerX: 540, centerY: 260 },
              },
            ],
            screenshotBase64: includeScreenshot ? 'bW9ja19qcGVnX2Jhc2U2NA==' : undefined,
            screenWidth: 1080,
            screenHeight: 2400,
            captureMethod: includeScreenshot ? 'HYBRID' : 'ACCESSIBILITY_HIERARCHY',
            timestamp: Date.now(),
          },
        }),
      performScreenAction: (reqJson: string) => {
        const req = JSON.parse(reqJson);
        if (req.targetText && /delete|pay|send/i.test(req.targetText) && !req.confirmedSensitive) {
          return JSON.stringify({
            success: false,
            action: 'SCREEN_ACTION',
            errorCode: 'CONFIRMATION_REQUIRED',
            message: `Sensitive action ("${req.targetText}") requires explicit user confirmation.`,
          });
        }
        return JSON.stringify({
          success: true,
          action: 'SCREEN_ACTION',
          message: `Executed ${req.action} on "${req.targetText || req.direction || 'screen'}"`,
        });
      },
    };

    bridge.setAdapter(new NativeAndroidAdapter());

    const reqCapRes = await toolManager.executeTool('android_request_screen_capture', {}, 't_req_cap');
    const inspectRes = await toolManager.executeTool('android_inspect_screen', { includeScreenshot: true }, 't_insp_nat');
    const safeClickRes = await toolManager.executeTool(
      'android_screen_action',
      { action: 'CLICK_TEXT', targetText: 'Accessibility' },
      't_click_safe'
    );
    const sensitiveClickRes = await toolManager.executeTool(
      'android_screen_action',
      { action: 'CLICK_TEXT', targetText: 'Delete Account' },
      't_click_sens'
    );
    const stopCapRes = await toolManager.executeTool('android_stop_screen_capture', {}, 't_stop_cap');

    delete (globalThis as any).window.FridayAndroidBridge;
    bridge.setAdapter(new WebMockAdapter());

    assert(
      reqCapRes.success === true &&
      inspectRes.success === true &&
      inspectRes.data?.appName === 'Settings' &&
      Boolean(inspectRes.data?.screenshotBase64) &&
      safeClickRes.success === true &&
      sensitiveClickRes.success === false &&
      sensitiveClickRes.errorCode === 'CONFIRMATION_REQUIRED' &&
      Boolean(sensitiveClickRes.data?.previewId) &&
      stopCapRes.success === true &&
      mockScreenCaptureActive === false,
      'Test 27: Part 15 Native Screen Vision, UI Hierarchy, Screenshot & Sensitive Action Confirmation Guard verified'
    );
  }

  speakerVerificationManager.setEnabled(true);

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
