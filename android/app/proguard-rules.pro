# FRIDAY AI — Android ProGuard / R8 Rules
# Keep @JavascriptInterface methods exposed on FridayAndroidBridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes Signature

# Keep bridge data models serialized/deserialized with Gson
-keep class ai.friday.assistant.NativeBridgeRequest { *; }
-keep class ai.friday.assistant.NativeBridgeResponse { *; }
-keep class ai.friday.assistant.DeviceCapabilities { *; }
-keep class ai.friday.assistant.AccessibilityStatus { *; }
-keep class ai.friday.assistant.InstalledAppDto { *; }
-keep class ai.friday.assistant.AndroidErrorCodes { *; }
-keep class ai.friday.assistant.FridayAndroidBridge { *; }
