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
    @SerializedName("notice") val notice: String? = null
)

data class InstalledAppDto(
    @SerializedName("appName") val appName: String,
    @SerializedName("packageName") val packageName: String,
    @SerializedName("launchable") val launchable: Boolean = true,
    @SerializedName("category") val category: String? = null,
    @SerializedName("isSystemApp") val isSystemApp: Boolean = false
)

object AndroidErrorCodes {
    const val APP_NOT_INSTALLED = "ANDROID_APP_NOT_INSTALLED"
    const val PERMISSION_DENIED = "PERMISSION_DENIED"
    const val ACCESSIBILITY_DISABLED = "ACCESSIBILITY_DISABLED"
    const val ACCESSIBILITY_REQUIRED = "ANDROID_ACCESSIBILITY_REQUIRED"
    const val BRIDGE_UNAVAILABLE = "BRIDGE_UNAVAILABLE"
    const val ACTION_FAILED = "ACTION_FAILED"
    const val ACTION_TIMEOUT = "ACTION_TIMEOUT"
    const val UNSUPPORTED_ACTION = "UNSUPPORTED_ACTION"
    const val USER_CANCELLED = "USER_CANCELLED"
    const val INVALID_PARAMETERS = "INVALID_PARAMETERS"
    const val FEATURE_NOT_AVAILABLE = "FEATURE_NOT_AVAILABLE"
}
