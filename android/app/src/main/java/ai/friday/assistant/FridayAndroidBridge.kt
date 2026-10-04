package ai.friday.assistant

import android.app.Activity
import android.os.Build
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson
import java.util.concurrent.ConcurrentHashMap

/**
 * PART 6B — FRIDAY Android JavascriptInterface
 * Secure, bidirectional Web <-> Native bridge exposed as window.FridayAndroidBridge in WebView.
 */
class FridayAndroidBridge(
    private val activity: Activity,
    private val webView: WebView
) {
    private val gson = Gson()
    private val intentDispatcher = IntentDispatcher(activity)
    private val permissionHelper = PermissionHelper(activity)
    private val processedRequestIds = ConcurrentHashMap.newKeySet<String>()

    init {
        FridayAccessibilityService.statusListener = { enabled ->
            sendEventToWeb(
                "ACCESSIBILITY_STATUS_CHANGED",
                mapOf(
                    "enabled" to enabled,
                    "serviceRunning" to enabled
                )
            )
        }
    }

    /**
     * Sends an asynchronous event back to the web application.
     */
    fun sendEventToWeb(eventType: String, payload: Map<String, Any>, eventId: String? = null) {
        activity.runOnUiThread {
            val jsonPayload = gson.toJson(payload)
            val id = eventId ?: "evt_${System.currentTimeMillis()}"
            val script = "if (window.fridayReceiveNativeEvent) { window.fridayReceiveNativeEvent('$eventType', '$jsonPayload', '$id'); }"
            webView.evaluateJavascript(script, null)
        }
    }

    // ==========================================
    // Unified Bidirectional Protocol
    // ==========================================

    @JavascriptInterface
    fun postMessage(jsonRequest: String): String {
        return try {
            val request = gson.fromJson(jsonRequest, NativeBridgeRequest::class.java)

            // Prevent duplicate commands
            if (processedRequestIds.contains(request.requestId)) {
                return gson.toJson(
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = false,
                        errorCode = AndroidErrorCodes.ACTION_FAILED,
                        message = "Ignored duplicate request: ${request.requestId}"
                    )
                )
            }
            processedRequestIds.add(request.requestId)
            if (processedRequestIds.size > 200) {
                processedRequestIds.clear()
            }

            // Signal action started
            sendEventToWeb(
                "ACTION_STARTED",
                mapOf("requestId" to request.requestId, "action" to request.action)
            )

            val response: NativeBridgeResponse = when (request.action.uppercase()) {
                "GET_DEVICE_CAPABILITIES" -> {
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = true,
                        message = "Device capabilities queried.",
                        data = getCapabilitiesInternal()
                    )
                }
                "OPEN_URL" -> {
                    val url = request.payload?.get("url") as? String ?: ""
                    intentDispatcher.openBrowser(url).copy(requestId = request.requestId)
                }
                "OPEN_APP" -> {
                    val pkg = request.payload?.get("packageName") as? String ?: ""
                    val res = intentDispatcher.openApp(pkg).copy(requestId = request.requestId)
                    if (!res.success && res.errorCode == AndroidErrorCodes.APP_NOT_INSTALLED) {
                        sendEventToWeb("APP_NOT_FOUND", mapOf("packageName" to pkg))
                    }
                    res
                }
                "LAUNCH_APP" -> {
                    val target = (request.payload?.get("packageName") ?: request.payload?.get("appName")) as? String ?: ""
                    val res = intentDispatcher.launchApp(target).copy(requestId = request.requestId)
                    if (!res.success && res.errorCode == AndroidErrorCodes.APP_NOT_INSTALLED) {
                        sendEventToWeb("APP_NOT_FOUND", mapOf("packageName" to target))
                    }
                    res
                }
                "GO_HOME" -> {
                    intentDispatcher.goHome().copy(requestId = request.requestId)
                }
                "GET_INSTALLED_APPS" -> {
                    val apps = intentDispatcher.getInstalledApps()
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = true,
                        message = "Discovered ${apps.size} installed apps.",
                        data = apps
                    )
                }
                "GET_RECENT_APPS" -> {
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = false,
                        errorCode = AndroidErrorCodes.FEATURE_NOT_AVAILABLE,
                        message = "Accessing system-wide background tasks requires Android Usage Access permission (PACKAGE_USAGE_STATS).",
                        data = emptyList<InstalledAppDto>()
                    )
                }
                "OPEN_YOUTUBE" -> {
                    val videoId = request.payload?.get("videoId") as? String
                    val query = request.payload?.get("query") as? String
                    intentDispatcher.openYouTube(videoId, query).copy(requestId = request.requestId)
                }
                "SEARCH_YOUTUBE" -> {
                    val query = request.payload?.get("query") as? String ?: ""
                    intentDispatcher.openYouTube(null, query).copy(requestId = request.requestId)
                }
                "OPEN_WHATSAPP" -> {
                    val phone = request.payload?.get("phone") as? String
                    val text = request.payload?.get("text") as? String
                    intentDispatcher.openWhatsApp(phone, text).copy(requestId = request.requestId)
                }
                "OPEN_SETTINGS" -> {
                    val target = request.payload?.get("target") as? String ?: "settings"
                    intentDispatcher.openSettings(target).copy(requestId = request.requestId)
                }
                "REQUEST_PERMISSION" -> {
                    val perm = request.payload?.get("permission") as? String ?: ""
                    val isGranted = permissionHelper.isPermissionGranted(perm)
                    if (!isGranted) {
                        sendEventToWeb("PERMISSION_REQUIRED", mapOf("permission" to perm))
                    }
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = isGranted,
                        message = if (isGranted) "Permission already granted." else "Permission required: $perm",
                        data = mapOf("permission" to perm, "granted" to isGranted)
                    )
                }
                else -> {
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = false,
                        errorCode = AndroidErrorCodes.UNSUPPORTED_ACTION,
                        message = "Unsupported action: ${request.action}"
                    )
                }
            }

            // Signal action completed or failed
            if (response.success) {
                sendEventToWeb("ACTION_COMPLETED", mapOf("requestId" to request.requestId, "action" to request.action))
            } else {
                sendEventToWeb(
                    "ACTION_FAILED",
                    mapOf(
                        "requestId" to request.requestId,
                        "action" to request.action,
                        "errorCode" to (response.errorCode ?: "UNKNOWN"),
                        "message" to response.message
                    )
                )
            }

            gson.toJson(response)
        } catch (e: Exception) {
            val errResponse = NativeBridgeResponse(
                requestId = "",
                action = "POST_MESSAGE",
                success = false,
                errorCode = AndroidErrorCodes.ACTION_FAILED,
                message = e.localizedMessage ?: "Native exception processing request"
            )
            gson.toJson(errResponse)
        }
    }

    // ==========================================
    // Direct JavaScriptInterface Methods
    // ==========================================

    @JavascriptInterface
    fun isAvailable(): Boolean = true

    @JavascriptInterface
    fun getDeviceInfo(): String {
        val info = mapOf(
            "platform" to "android",
            "isNativeWrapper" to true,
            "osVersion" to Build.VERSION.RELEASE,
            "apiLevel" to Build.VERSION.SDK_INT,
            "manufacturer" to Build.MANUFACTURER,
            "model" to Build.MODEL,
            "appVersion" to "1.0.0"
        )
        return gson.toJson(info)
    }

    private fun getCapabilitiesInternal(): DeviceCapabilities {
        return DeviceCapabilities(
            androidNative = true,
            browser = true,
            youtube = true,
            whatsapp = intentDispatcher.isPackageInstalled(IntentDispatcher.PACKAGE_WHATSAPP) ||
                    intentDispatcher.isPackageInstalled(IntentDispatcher.PACKAGE_WHATSAPP_BUSINESS),
            accessibility = FridayAccessibilityService.isServiceRunning,
            backgroundService = FridayForegroundService.isRunning,
            notifications = permissionHelper.isPermissionGranted(android.Manifest.permission.POST_NOTIFICATIONS)
        )
    }

    @JavascriptInterface
    fun getCapabilities(): String {
        return gson.toJson(getCapabilitiesInternal())
    }

    @JavascriptInterface
    fun openExternalUrl(url: String): String {
        return gson.toJson(intentDispatcher.openBrowser(url))
    }

    @JavascriptInterface
    fun openApp(packageName: String): String {
        return gson.toJson(intentDispatcher.openApp(packageName))
    }

    @JavascriptInterface
    fun launchApp(packageName: String): String {
        return gson.toJson(intentDispatcher.launchApp(packageName))
    }

    @JavascriptInterface
    fun goHome(): String {
        return gson.toJson(intentDispatcher.goHome())
    }

    @JavascriptInterface
    fun getInstalledApps(): String {
        return gson.toJson(intentDispatcher.getInstalledApps())
    }

    @JavascriptInterface
    fun getRecentApps(): String {
        val res = NativeBridgeResponse(
            requestId = "",
            action = "GET_RECENT_APPS",
            success = false,
            errorCode = AndroidErrorCodes.FEATURE_NOT_AVAILABLE,
            message = "Accessing system-wide background tasks requires Android Usage Access permission (PACKAGE_USAGE_STATS).",
            data = emptyList<InstalledAppDto>()
        )
        return gson.toJson(res)
    }

    @JavascriptInterface
    fun openSettings(target: String): String {
        return gson.toJson(intentDispatcher.openSettings(target))
    }

    @JavascriptInterface
    fun openYouTube(videoId: String?, query: String?): String {
        return gson.toJson(intentDispatcher.openYouTube(videoId, query))
    }

    @JavascriptInterface
    fun openWhatsApp(phone: String?, text: String?): String {
        return gson.toJson(intentDispatcher.openWhatsApp(phone, text))
    }

    @JavascriptInterface
    fun prepareWhatsAppMessage(phone: String, text: String): String {
        val response = NativeBridgeResponse(
            requestId = "prep_${System.currentTimeMillis()}",
            action = "PREPARE_WHATSAPP_MESSAGE",
            success = true,
            message = "Draft prepared for $phone. Awaiting user confirmation before sending.",
            data = mapOf("phone" to phone, "text" to text)
        )
        return gson.toJson(response)
    }

    @JavascriptInterface
    fun sendWhatsAppMessage(phone: String, text: String): String {
        // Enforces explicit confirmation: if accessibility is enabled, performs automated click
        return if (FridayAccessibilityService.isServiceRunning) {
            val opened = intentDispatcher.openWhatsApp(phone, text)
            if (opened.success) {
                // Service clicks the send button once the screen opens
                FridayAccessibilityService.getInstance()?.performAuthorizedClick("Send")
            }
            gson.toJson(opened)
        } else {
            // Opens the conversation with pre-filled text so user can review and tap send
            gson.toJson(intentDispatcher.openWhatsApp(phone, text))
        }
    }

    @JavascriptInterface
    fun requestAccessibilityStatus(): String {
        val isRunning = FridayAccessibilityService.isServiceRunning
        val status = AccessibilityStatus(
            enabled = isRunning,
            serviceRunning = isRunning,
            canPerformGestures = isRunning,
            canInspectHierarchy = isRunning,
            notice = if (isRunning) "Accessibility Service is active." else "Accessibility Service is currently disabled in Android Settings."
        )
        return gson.toJson(status)
    }

    @JavascriptInterface
    fun requestNativePermission(permission: String): String {
        val granted = permissionHelper.isPermissionGranted(permission)
        if (!granted && permission == android.Manifest.permission.RECORD_AUDIO) {
            activity.runOnUiThread {
                permissionHelper.requestRecordAudioPermission {}
            }
        }
        val result = mapOf("permission" to permission, "granted" to granted)
        return gson.toJson(result)
    }

    @JavascriptInterface
    fun isAppInstalled(packageName: String): Boolean {
        return intentDispatcher.isPackageInstalled(packageName)
    }

    @JavascriptInterface
    fun executeAction(jsonAction: String): String {
        return postMessage(jsonAction)
    }
}
