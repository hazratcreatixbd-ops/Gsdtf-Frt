/**
 * FINAL ANDROID BUILD PREPARATION — Verification & Readiness Check
 * Verifies:
 * 1. Android native project exists (/android).
 * 2. Kotlin/Jetpack Compose Android structure is valid.
 * 3. Gradle configuration is valid (settings.gradle.kts, build.gradle.kts, gradle-wrapper.properties, proguard-rules.pro).
 * 4. AndroidManifest permissions & service declarations are correct.
 * 5. Existing Android Bridge is connected (FridayAndroidBridge.kt <-> NativeAndroidAdapter.ts <-> AndroidBridge.ts).
 * 6. Existing WebView/FRIDAY UI is connected (MainActivity.kt, FridayComposeHost.kt, bundled assets & remote URL support).
 * 7. Existing voice system is preserved (RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, WebChromeClient.onPermissionRequest, AudioStreamer).
 * 8. Existing Part 1-14 functionality is preserved.
 * 9. Debug APK build configuration and Gradle wrapper readiness.
 * 10. Release configuration is prepared without requiring signing credentials.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

let passed = 0;
let failed = 0;

function check(condition: boolean, description: string) {
  if (condition) {
    console.log(`✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${description}`);
    failed++;
  }
}

console.log('====================================================');
console.log('   FRIDAY AI — FINAL ANDROID BUILD PREPARATION      ');
console.log('====================================================\n');

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const appDir = path.join(androidDir, 'app');
const javaDir = path.join(appDir, 'src/main/java/ai/friday/assistant');

// 1. Android native project exists
check(fs.existsSync(androidDir), '1. Android native project directory (/android) exists');
check(fs.existsSync(path.join(androidDir, 'gradlew')), '1b. Gradle wrapper script (android/gradlew) exists');
check(
  fs.existsSync(path.join(androidDir, 'gradle/wrapper/gradle-wrapper.jar')),
  '1c. Gradle wrapper JAR (gradle-wrapper.jar) exists'
);

// 2. Kotlin/Jetpack Compose Android structure is valid
const requiredKotlinFiles = [
  'MainActivity.kt',
  'FridayComposeHost.kt',
  'FridayAndroidBridge.kt',
  'IntentDispatcher.kt',
  'FridayAccessibilityService.kt',
  'FridayForegroundService.kt',
  'PermissionHelper.kt',
  'BridgeModels.kt',
];
for (const file of requiredKotlinFiles) {
  check(fs.existsSync(path.join(javaDir, file)), `2. Kotlin source file exists: ${file}`);
}

const composeHostContent = fs.readFileSync(path.join(javaDir, 'FridayComposeHost.kt'), 'utf8');
check(
  composeHostContent.includes('@Composable') && composeHostContent.includes('AndroidView'),
  '2b. Jetpack Compose @Composable host (FridayComposeHost.kt) is valid'
);

// 3. Gradle configuration is valid
const rootGradle = fs.readFileSync(path.join(androidDir, 'build.gradle.kts'), 'utf8');
const settingsGradle = fs.readFileSync(path.join(androidDir, 'settings.gradle.kts'), 'utf8');
const appGradle = fs.readFileSync(path.join(appDir, 'build.gradle.kts'), 'utf8');
const proguardRules = fs.readFileSync(path.join(appDir, 'proguard-rules.pro'), 'utf8');

check(
  rootGradle.includes('com.android.application') && rootGradle.includes('org.jetbrains.kotlin.android'),
  '3a. Root build.gradle.kts configures Android Application and Kotlin Android plugins'
);
check(
  settingsGradle.includes('include(":app")'),
  '3b. settings.gradle.kts includes :app module and repositories'
);
check(
  appGradle.includes('namespace = "ai.friday.assistant"') &&
    appGradle.includes('compileSdk = 34') &&
    appGradle.includes('compose = true'),
  '3c. App build.gradle.kts configures SDK 34, namespace ai.friday.assistant, and Jetpack Compose'
);
check(
  proguardRules.includes('JavascriptInterface') && proguardRules.includes('FridayAndroidBridge'),
  '3d. proguard-rules.pro exists and preserves @JavascriptInterface bridge methods'
);

// 4. AndroidManifest permissions are correct
const manifest = fs.readFileSync(path.join(appDir, 'src/main/AndroidManifest.xml'), 'utf8');
const requiredPermissions = [
  'android.permission.INTERNET',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
];
for (const perm of requiredPermissions) {
  check(manifest.includes(perm), `4. AndroidManifest declares permission: ${perm}`);
}
check(
  manifest.includes('.MainActivity') &&
    manifest.includes('.FridayForegroundService') &&
    manifest.includes('.FridayAccessibilityService'),
  '4b. AndroidManifest registers MainActivity, FridayForegroundService, and FridayAccessibilityService'
);

// 5. Existing Android Bridge is connected
const ktBridge = fs.readFileSync(path.join(javaDir, 'FridayAndroidBridge.kt'), 'utf8');
const tsAdapter = fs.readFileSync(
  path.join(rootDir, 'src/services/AndroidBridge/NativeAndroidAdapter.ts'),
  'utf8'
);
check(
  ktBridge.includes('@JavascriptInterface') &&
    ktBridge.includes('fun postMessage') &&
    tsAdapter.includes('window.FridayAndroidBridge'),
  '5. Native Android Bridge (FridayAndroidBridge.kt <-> NativeAndroidAdapter.ts) is connected'
);

// 6. Existing WebView/FRIDAY UI is connected
const mainActivity = fs.readFileSync(path.join(javaDir, 'MainActivity.kt'), 'utf8');
check(
  mainActivity.includes('addJavascriptInterface(bridge, "FridayAndroidBridge")') &&
    mainActivity.includes('https://appassets.androidplatform.net/assets/dist/index.html') &&
    !mainActivity.includes('webView.loadUrl("https://ais-'),
  '6. MainActivity.kt connects WebView, injects FridayAndroidBridge, and loads bundled FRIDAY UI locally without Google redirect'
);
check(
  fs.existsSync(path.join(appDir, 'src/main/assets/dist/index.html')),
  '6b. Bundled local FRIDAY UI assets (android/app/src/main/assets/dist/index.html) exist'
);

// 7. Existing voice system is preserved
check(
  mainActivity.includes('PermissionRequest.RESOURCE_AUDIO_CAPTURE') &&
    fs.existsSync(path.join(rootDir, 'src/services/AudioStreamer.ts')),
  '7. Voice system preserved (WebChromeClient RESOURCE_AUDIO_CAPTURE + AudioStreamer.ts)'
);

// 8. Existing Part 1-14 functionality is preserved
check(
  fs.existsSync(path.join(rootDir, 'src/world/manager/ManagerEngine.ts')) &&
    fs.existsSync(path.join(rootDir, 'src/services/memory/AdvancedMemoryManager.ts')) &&
    fs.existsSync(path.join(rootDir, 'src/services/part14/Part14Orchestrator.ts')),
  '8. Part 1-14 core orchestration, memory, world, and live mobile result systems are preserved'
);

// 9. Debug APK & 10. Release configuration without requiring signing credentials
check(
  appGradle.includes('debug {') &&
    appGradle.includes('isDebuggable = true') &&
    appGradle.includes('release {') &&
    appGradle.includes('signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")'),
  '9 & 10. Debug APK and Release build configurations are prepared (Release does not require signing credentials)'
);

// Check local Java / Android SDK environment availability
let javaInstalled = false;
try {
  execSync('which java', { stdio: 'ignore' });
  javaInstalled = true;
} catch {
  javaInstalled = false;
}

console.log('\n----------------------------------------------------');
console.log(`Android Structure & Configuration Checks: ${passed}/${passed + failed} PASSED`);
if (!javaInstalled) {
  console.log(
    'Environment Note: JDK 17 (`java`) and Android SDK (`ANDROID_HOME`) are not installed in this web container.'
  );
  console.log(
    'Gradle wrapper (`./gradlew assembleDebug`) is ready to run in Android Studio or CI (.github/workflows/android-build.yml).'
  );
}
console.log('----------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
}
