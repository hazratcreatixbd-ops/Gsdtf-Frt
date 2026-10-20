package ai.friday.assistant

import com.google.gson.annotations.SerializedName

/**
 * PART 6B — FRIDAY Android Native Bridge Models
 * Strict typed contracts for bidirectional Web <-> Native Android communication.
 */

data class NativeBridgeRequest(
    @SerializedName("requestId") val requestId: String,
    @SerializedName("action") val action: String,
    @SerializedName("payload") val payload: Map<String, Any>? = null,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

data class NativeBridgeResponse(
    @SerializedName("requestId") val requestId: String,
    @SerializedName("action") val action: String,
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("errorCode") val errorCode: String? = null,
    @SerializedName("data") val data: Any? = null,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

data class DeviceCapabilities(
    @SerializedName("androidNative") val androidNative: Boolean = true,
    @SerializedName("browser") val browser: Boolean = true,
    @SerializedName("youtube") val youtube: Boolean = true,
    @SerializedName("whatsapp") val whatsapp: Boolean = true,
    @SerializedName("accessibility") val accessibility: Boolean = false,
    @SerializedName("screenVision") val screenVision: Boolean = false,
    @SerializedName("mediaProjectionActive") val mediaProjectionActive: Boolean = false,
    @SerializedName("backgroundService") val backgroundService: Boolean = true,
    @SerializedName("notifications") val notifications: Boolean = true,
    @SerializedName("installedAppsCheck") val installedAppsCheck: Boolean = true,
    @SerializedName("directAppLaunch") val directAppLaunch: Boolean = true
)

data class AccessibilityStatus(
    @SerializedName("enabled") val enabled: Boolean,
    @SerializedName("serviceRunning") val serviceRunning: Boolean,
    @SerializedName("canPerformGestures") val canPerformGestures: Boolean,
    @SerializedName("canInspectHierarchy") val canInspectHierarchy: Boolean,
    @SerializedName("canTakeScreenshot") val canTakeScreenshot: Boolean = false,
    @SerializedName("notice") val notice: String? = null
)

data class InstalledAppDto(
    @SerializedName("appName") val appName: String,
    @SerializedName("packageName") val packageName: String,
    @SerializedName("launchable") val launchable: Boolean = true,
    @SerializedName("category") val category: String? = null,
    @SerializedName("isSystemApp") val isSystemApp: Boolean = false
)

data class ScreenUiElementDto(
    @SerializedName("index") val index: Int,
    @SerializedName("text") val text: String,
    @SerializedName("contentDescription") val contentDescription: String = "",
    @SerializedName("className") val className: String = "",
    @SerializedName("viewId") val viewId: String = "",
    @SerializedName("clickable") val clickable: Boolean = false,
    @SerializedName("editable") val editable: Boolean = false,
    @SerializedName("scrollable") val scrollable: Boolean = false,
    @SerializedName("bounds") val bounds: String = "",
    @SerializedName("centerX") val centerX: Int = 0,
    @SerializedName("centerY") val centerY: Int = 0
)

data class ScreenCaptureDataDto(
    @SerializedName("captured") val captured: Boolean,
    @SerializedName("captureMode") val captureMode: String, // "MEDIA_PROJECTION", "ACCESSIBILITY_SCREENSHOT", "UI_HIERARCHY_ONLY"
    @SerializedName("foregroundPackage") val foregroundPackage: String,
    @SerializedName("foregroundAppName") val foregroundAppName: String,
    @SerializedName("screenSummary") val screenSummary: String,
    @SerializedName("visibleTexts") val visibleTexts: List<String>,
    @SerializedName("uiElements") val uiElements: List<ScreenUiElementDto>,
    @SerializedName("screenshotBase64") val screenshotBase64: String? = null,
    @SerializedName("width") val width: Int = 0,
    @SerializedName("height") val height: Int = 0,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

object AndroidErrorCodes {
    const val APP_NOT_INSTALLED = "ANDROID_APP_NOT_INSTALLED"
    const val PERMISSION_DENIED = "PERMISSION_DENIED"
    const val ACCESSIBILITY_DISABLED = "ACCESSIBILITY_DISABLED"
    const val ACCESSIBILITY_REQUIRED = "ANDROID_ACCESSIBILITY_REQUIRED"
    const val SCREEN_CAPTURE_NOT_ACTIVE = "SCREEN_CAPTURE_NOT_ACTIVE"
    const val CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
    const val SENSITIVE_ACTION_BLOCKED = "SENSITIVE_ACTION_BLOCKED"
    const val BRIDGE_UNAVAILABLE = "BRIDGE_UNAVAILABLE"
    const val ACTION_FAILED = "ACTION_FAILED"
    const val ACTION_TIMEOUT = "ACTION_TIMEOUT"
    const val UNSUPPORTED_ACTION = "UNSUPPORTED_ACTION"
    const val USER_CANCELLED = "USER_CANCELLED"
    const val INVALID_PARAMETERS = "INVALID_PARAMETERS"
    const val FEATURE_NOT_AVAILABLE = "FEATURE_NOT_AVAILABLE"
}
