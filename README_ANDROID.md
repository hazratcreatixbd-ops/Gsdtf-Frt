# FRIDAY AI — Android Native Wrapper (Part 6B)

This directory contains the production-ready Android native application wrapper for **FRIDAY AI Assistant**.

---

## Architecture Overview

```
                      FRIDAY REACT WEB APP (Vite / Tailwind / AudioStreamer)
                                                ↓
                               AndroidBridge (TS Orchestrator)
                                                ↓
                                   NativeAndroidAdapter
                                                ↓
                          window.FridayAndroidBridge (JavascriptInterface)
                                                ↓
                                  FridayAndroidBridge.kt
                                                ↓
                    ┌───────────────────────────┴───────────────────────────┐
                    ↓                                                       ↓
           IntentDispatcher.kt                                  FridayAccessibilityService.kt
                    ↓                                                       ↓
      Android Intents & Deep Links                              Authorized Gesture Dispatches
  (Browser, YouTube, WhatsApp, Settings)                       (Action Preview-confirmed sends)
```

---

## Project Structure

```
android/
├── build.gradle.kts                   # Root Gradle build configuration
├── settings.gradle.kts                # Project modules (:app)
├── gradle.properties                  # JVM memory & AndroidX settings
└── app/
    ├── build.gradle.kts               # App module build configuration (SDK 34)
    └── src/main/
        ├── AndroidManifest.xml        # Permissions, queries, activities & services
        ├── java/ai/friday/assistant/
        │   ├── MainActivity.kt                # Hosts WebView, injects bridge, handles WebChromeClient permissions
        │   ├── FridayAndroidBridge.kt         # Secure @JavascriptInterface bridge (postMessage, deduplication)
        │   ├── IntentDispatcher.kt            # Official Android Intents (Browser, YouTube, WhatsApp, Settings)
        │   ├── FridayAccessibilityService.kt  # User-activated Accessibility Service for authorized automation
        │   ├── FridayForegroundService.kt     # Ongoing foreground service for 24/7 background execution
        │   ├── PermissionHelper.kt            # Centralized permissions manager (Microphone, Notifications)
        │   └── BridgeModels.kt                # Typed request/response data contracts
        └── res/
            ├── values/strings.xml, colors.xml, styles.xml
            └── xml/accessibility_service_config.xml
```

---

## How to Build the APK / AAB

### Prerequisites
1. **Android Studio Hedgehog (2023.1.1) or newer** (or command-line Android SDK with Java 17).
2. Android device or emulator running **Android 7.0 (API 24) or higher** (Target SDK: 34 / Android 14).

### Step 1: Open in Android Studio
1. Launch **Android Studio**.
2. Select **Open an existing project** and choose the `android/` directory of this repository.
3. Allow Gradle to sync dependencies.

### Step 2: Configure Web URL or Bundle Local Assets
In `MainActivity.kt`:
- **Default (Hosted Cloud / Dev Server)**:
  `webView.loadUrl("https://ais-dev-y34kxoace7g7txsixtaqn5-87869525848.asia-southeast1.run.app")`
- **Offline / Standalone Bundled Web Assets**:
  1. In the root project run: `npm run build`
  2. Copy the contents of the `dist/` directory into `android/app/src/main/assets/dist/`
  3. In `MainActivity.kt`, load: `webView.loadUrl("file:///android_asset/dist/index.html")`

### Step 3: Run / Build
- **Debug Build**: Click **Run 'app'** (or run `./gradlew assembleDebug` in terminal).
  Output APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release Build**: Run `./gradlew assembleRelease` (or use **Build > Generate Signed Bundle / APK**).

---

## Device Permissions & Accessibility Setup

1. **Microphone Permission**:
   - The native `MainActivity` automatically prompts for `RECORD_AUDIO` on startup.
   - `WebChromeClient.onPermissionRequest` forwards audio capture directly to the web client so Gemini Live can record 16kHz audio with zero friction.
2. **WhatsApp & YouTube Intents**:
   - Uses `<queries>` in `AndroidManifest.xml` to detect if `com.whatsapp` and `com.google.android.youtube` are installed.
   - Never sends messages silently: always routes through FRIDAY's **Action Preview** confirmation.
3. **Accessibility Service (Optional for Automated Send)**:
   - Go to **Android Settings > Accessibility > Downloaded Apps > FRIDAY AI**.
   - Tap **Enable**.
   - Once enabled, FRIDAY automatically detects this and updates `capabilities.accessibility = true`.
