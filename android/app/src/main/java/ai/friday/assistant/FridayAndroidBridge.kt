package ai.friday.assistant

import android.app.Activity
import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson
import java.util.concurrent.ConcurrentHashMap

/**
 * PART 6B & PART 15 — FRIDAY Android JavascriptInterface
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
                    "serviceRunning" to enabled,
                    "canTakeScreenshot" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && enabled)
                )
            )
        }
        FridayForegroundService.actionListener = { action ->
            when (action) {
                "TOGGLE_MUTE" -> {
                    sendEventToWeb(
                        "FOREGROUND_NOTIFICATION_ACTION",
                        mapOf("action" to "TOGGLE_MUTE", "muted" to FridayForegroundService.isMuted)
                    )
                }
                "STOP_VOICE" -> {
                    sendEventToWeb(
                        "FOREGROUND_NOTIFICATION_ACTION",
                        mapOf("action" to "STOP_VOICE")
                    )
                }
                "SCREEN_CAPTURE_STARTED" -> {
                    sendEventToWeb(
                        "SCREEN_CAPTURE_STATE_CHANGED",
                        mapOf("active" to true, "granted" to true, "mode" to "MEDIA_PROJECTION")
                    )
                }
                "SCREEN_CAPTURE_STOPPED" -> {
                    sendEventToWeb(
                        "SCREEN_CAPTURE_STATE_CHANGED",
                        mapOf("active" to false, "granted" to false, "mode" to "STOPPED")
                    )
                }
                "SERVICE_STATE_CHANGED" -> {
                    sendEventToWeb(
                        "FOREGROUND_SERVICE_STATE_CHANGED",
                        mapOf(
                            "running" to FridayForegroundService.isRunning,
                            "voiceActive" to FridayForegroundService.isVoiceActive,
                            "mediaProjectionActive" to FridayForegroundService.isMediaProjectionActive,
                            "muted" to FridayForegroundService.isMuted,
                            "taskCount" to FridayForegroundService.activeTaskCount,
                            "status" to FridayForegroundService.currentStatusText
                        )
                    )
                }
            }
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
                "GET_ALL_PERMISSIONS_STATUS" -> {
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = true,
                        message = "All Android permission statuses checked.",
                        data = permissionHelper.getPermissionSummary()
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
                        when (perm) {
                            android.Manifest.permission.RECORD_AUDIO -> {
                                activity.runOnUiThread { permissionHelper.requestRecordAudioPermission {} }
                            }
                            android.Manifest.permission.CAMERA -> {
                                activity.runOnUiThread { permissionHelper.requestCameraPermission {} }
                            }
                            android.Manifest.permission.POST_NOTIFICATIONS -> {
                                activity.runOnUiThread { permissionHelper.requestNotificationPermission() }
                            }
                        }
                        sendEventToWeb("PERMISSION_REQUIRED", mapOf("permission" to perm))
                    }
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = isGranted,
                        message = if (isGranted) "Permission already granted." else "Requested permission: $perm",
                        data = mapOf("permission" to perm, "granted" to isGranted)
                    )
                }
                "START_SCREEN_CAPTURE" -> {
                    gson.fromJson(startScreenCapture(), NativeBridgeResponse::class.java).copy(requestId = request.requestId)
                }
                "STOP_SCREEN_CAPTURE" -> {
                    gson.fromJson(stopScreenCapture(), NativeBridgeResponse::class.java).copy(requestId = request.requestId)
                }
                "CAPTURE_SCREEN_SNAPSHOT" -> {
                    val includeImage = request.payload?.get("includeImage") as? Boolean ?: true
                    gson.fromJson(captureScreenSnapshot(includeImage), NativeBridgeResponse::class.java).copy(requestId = request.requestId)
                }
                "SCREEN_CLICK_ELEMENT" -> {
                    val targetText = request.payload?.get("targetText") as? String ?: ""
                    val confirmed = request.payload?.get("confirmed") as? Boolean ?: false
                    gson.fromJson(performScreenClick(targetText, confirmed), NativeBridgeResponse::class.java).copy(requestId = request.requestId)
                }
                "SCREEN_TAP_COORDINATES" -> {
                    val x = (request.payload?.get("x") as? Number)?.toFloat() ?: 0f
                    val y = (request.payload?.get("y") as? Number)?.toFloat() ?: 0f
                    gson.fromJson(performScreenTap(x, y), NativeBridgeResponse::class.java).copy(requestId = request.requestId)
                }
                "SCREEN_SCROLL" -> {
                    val direction = request.payload?.get("direction") as? String ?: "down"
                    gson.fromJson(performScreenScroll(direction), NativeBridgeResponse::class.java).copy(requestId = request.requestId)
                }
                "SCREEN_INPUT_TEXT" -> {
                    val text = request.payload?.get("text") as? String ?: ""
                    val fieldHint = request.payload?.get("fieldHint") as? String
                    val isReplace = request.payload?.get("isReplace") as? Boolean ?: false
                    val expectedPackage = request.payload?.get("expectedPackage") as? String
                    val accService = FridayAccessibilityService.getInstance()
                    if (accService == null) {
                        NativeBridgeResponse(
                            requestId = request.requestId,
                            action = request.action,
                            success = false,
                            errorCode = AndroidErrorCodes.ACCESSIBILITY_REQUIRED,
                            message = "Android Accessibility Service is required to enter text into fields."
                        )
                    } else {
                        val detailed = accService.performInputTextEx(text, fieldHint, isReplace, expectedPackage)
                        NativeBridgeResponse(
                            requestId = request.requestId,
                            action = request.action,
                            success = detailed.success,
                            errorCode = detailed.errorCode,
                            message = detailed.message,
                            data = detailed
                        )
                    }
                }
                "SCREEN_GLOBAL_NAVIGATION" -> {
                    val navAction = request.payload?.get("navAction") as? String ?: "back"
                    gson.fromJson(performGlobalNavigation(navAction), NativeBridgeResponse::class.java).copy(requestId = request.requestId)
                }
                "START_FOREGROUND_SERVICE", "UPDATE_FOREGROUND_SERVICE" -> {
                    val statusText = request.payload?.get("statusText") as? String
                        ?: "FRIDAY AI Assistant is active and listening."
                    val voiceActive = request.payload?.get("voiceActive") as? Boolean ?: true
                    val muted = request.payload?.get("muted") as? Boolean ?: false
                    val taskCount = (request.payload?.get("taskCount") as? Number)?.toInt() ?: 0
                    FridayForegroundService.startOrUpdateService(
                        context = activity,
                        statusText = statusText,
                        voiceActive = voiceActive,
                        muted = muted,
                        taskCount = taskCount
                    )
                    activity.runOnUiThread { webView.resumeTimers() }
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = true,
                        message = "Foreground service active ($statusText)",
                        data = mapOf(
                            "running" to true,
                            "voiceActive" to voiceActive,
                            "muted" to muted,
                            "taskCount" to taskCount
                        )
                    )
                }
                "STOP_FOREGROUND_SERVICE" -> {
                    FridayForegroundService.stopService(activity)
                    NativeBridgeResponse(
                        requestId = request.requestId,
                        action = request.action,
                        success = true,
                        message = "Foreground service stopped.",
                        data = mapOf("running" to false)
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
        val pm = activity.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val ignoringBatteryOpt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pm?.isIgnoringBatteryOptimizations(activity.packageName) ?: false
        } else {
            true
        }
        val info = mapOf(
            "platform" to "android",
            "isNativeWrapper" to true,
            "osVersion" to Build.VERSION.RELEASE,
            "apiLevel" to Build.VERSION.SDK_INT,
            "manufacturer" to Build.MANUFACTURER,
            "model" to Build.MODEL,
            "appVersion" to "1.0.0",
            "ignoringBatteryOptimizations" to ignoringBatteryOpt,
            "foregroundServiceRunning" to FridayForegroundService.isRunning,
            "mediaProjectionActive" to FridayForegroundService.isMediaProjectionActive
        )
        return gson.toJson(info)
    }

    private fun getCapabilitiesInternal(): DeviceCapabilities {
        val hasNotifPerm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionHelper.isPermissionGranted(android.Manifest.permission.POST_NOTIFICATIONS)
        } else {
            true
        }
        val accRunning = FridayAccessibilityService.isServiceRunning
        val mpActive = FridayForegroundService.isMediaProjectionActive
        return DeviceCapabilities(
            androidNative = true,
            browser = true,
            youtube = true,
            whatsapp = intentDispatcher.isPackageInstalled(IntentDispatcher.PACKAGE_WHATSAPP) ||
                    intentDispatcher.isPackageInstalled(IntentDispatcher.PACKAGE_WHATSAPP_BUSINESS),
            accessibility = accRunning,
            screenVision = accRunning || mpActive,
            mediaProjectionActive = mpActive,
            backgroundService = true,
            notifications = hasNotifPerm
        )
    }

    @JavascriptInterface
    fun getAllPermissionsStatus(): String {
        return gson.toJson(permissionHelper.getPermissionSummary())
    }

    @JavascriptInterface
    fun startScreenCapture(): String {
        if (FridayForegroundService.isMediaProjectionActive) {
            val res = NativeBridgeResponse(
                requestId = "sc_start_${System.currentTimeMillis()}",
                action = "START_SCREEN_CAPTURE",
                success = true,
                message = "Screen Vision (MediaProjection) is already active.",
                data = mapOf("active" to true, "mode" to "MEDIA_PROJECTION")
            )
            return gson.toJson(res)
        }
        if (activity is MainActivity) {
            activity.requestScreenCaptureConsent()
            val res = NativeBridgeResponse(
                requestId = "sc_start_${System.currentTimeMillis()}",
                action = "START_SCREEN_CAPTURE",
                success = true,
                message = "Opened Android MediaProjection consent prompt. Please tap 'Start now' on your device.",
                data = mapOf("promptOpened" to true, "active" to false)
            )
            return gson.toJson(res)
        }
        val res = NativeBridgeResponse(
            requestId = "sc_start_${System.currentTimeMillis()}",
            action = "START_SCREEN_CAPTURE",
            success = false,
            errorCode = AndroidErrorCodes.FEATURE_NOT_AVAILABLE,
            message = "Unable to launch MediaProjection consent prompt."
        )
        return gson.toJson(res)
    }

    @JavascriptInterface
    fun stopScreenCapture(): String {
        FridayForegroundService.stopMediaProjectionSession(activity)
        val res = NativeBridgeResponse(
            requestId = "sc_stop_${System.currentTimeMillis()}",
            action = "STOP_SCREEN_CAPTURE",
            success = true,
            message = "Stopped Screen Vision (MediaProjection) session.",
            data = mapOf("active" to false)
        )
        return gson.toJson(res)
    }

    @JavascriptInterface
    fun captureScreenSnapshot(includeImage: Boolean): String {
        val accService = FridayAccessibilityService.getInstance()
        val mpFrame = if (includeImage) FridayForegroundService.getLatestProjectedFrame() else null

        if (accService == null && mpFrame == null) {
            val res = NativeBridgeResponse(
                requestId = "snap_${System.currentTimeMillis()}",
                action = "CAPTURE_SCREEN_SNAPSHOT",
                success = false,
                errorCode = AndroidErrorCodes.SCREEN_CAPTURE_NOT_ACTIVE,
                message = "Screen Vision requires either Android Screen Capture (MediaProjection) or FRIDAY Accessibility Service to be enabled in the Permission Center."
            )
            return gson.toJson(res)
        }

        // If Accessibility Service is running, inspect UI hierarchy (and take screenshot if MediaProjection is not already providing frames)
        val hierarchyData = accService?.inspectCurrentScreen(includeImage && mpFrame == null)

        val finalCapture = if (hierarchyData != null) {
            if (mpFrame != null && hierarchyData.screenshotBase64 == null) {
                hierarchyData.copy(
                    captured = true,
                    captureMode = "MEDIA_PROJECTION_AND_ACCESSIBILITY",
                    screenshotBase64 = mpFrame.first,
                    width = mpFrame.second,
                    height = mpFrame.third
                )
            } else {
                hierarchyData
            }
        } else if (mpFrame != null) {
            ScreenCaptureDataDto(
                captured = true,
                captureMode = "MEDIA_PROJECTION",
                foregroundPackage = "active_screen",
                foregroundAppName = "Device Screen",
                screenSummary = "Captured live visual screen frame (${mpFrame.second}x${mpFrame.third}) via MediaProjection.",
                visibleTexts = emptyList(),
                uiElements = emptyList(),
                screenshotBase64 = mpFrame.first,
                width = mpFrame.second,
                height = mpFrame.third
            )
        } else {
            null
        }

        return if (finalCapture != null && finalCapture.captured) {
            gson.toJson(
                NativeBridgeResponse(
                    requestId = "snap_${System.currentTimeMillis()}",
                    action = "CAPTURE_SCREEN_SNAPSHOT",
                    success = true,
                    message = finalCapture.screenSummary,
                    data = finalCapture
                )
            )
        } else {
            gson.toJson(
                NativeBridgeResponse(
                    requestId = "snap_${System.currentTimeMillis()}",
                    action = "CAPTURE_SCREEN_SNAPSHOT",
                    success = false,
                    errorCode = AndroidErrorCodes.SCREEN_CAPTURE_NOT_ACTIVE,
                    message = "Could not capture screen snapshot. Ensure Screen Capture or Accessibility Service is active."
                )
            )
        }
    }

    @JavascriptInterface
    fun performScreenClick(targetText: String, confirmed: Boolean): String {
        val accService = FridayAccessibilityService.getInstance()
            ?: return gson.toJson(
                NativeBridgeResponse(
                    requestId = "click_${System.currentTimeMillis()}",
                    action = "SCREEN_CLICK_ELEMENT",
                    success = false,
                    errorCode = AndroidErrorCodes.ACCESSIBILITY_REQUIRED,
                    message = "Android Accessibility Service is not enabled. Enable FRIDAY Accessibility Service in the Permission Center to tap elements."
                )
            )

        val isSensitive = accService.isSensitiveAction(targetText)
        if (isSensitive && !confirmed) {
            return gson.toJson(
                NativeBridgeResponse(
                    requestId = "click_${System.currentTimeMillis()}",
                    action = "SCREEN_CLICK_ELEMENT",
                    success = false,
                    errorCode = AndroidErrorCodes.CONFIRMATION_REQUIRED,
                    message = "Safety Guardrail: Clicking '$targetText' is a sensitive action (sending message, financial, or data modification). Explicit user confirmation is required before executing.",
                    data = mapOf("targetText" to targetText, "requiresConfirmation" to true)
                )
            )
        }

        val detailed = accService.performAuthorizedClickEx(targetText, confirmed)
        return gson.toJson(
            NativeBridgeResponse(
                requestId = "click_${System.currentTimeMillis()}",
                action = "SCREEN_CLICK_ELEMENT",
                success = detailed.success,
                errorCode = detailed.errorCode,
                message = detailed.message,
                data = detailed
            )
        )
    }

    @JavascriptInterface
    fun performScreenTap(x: Float, y: Float): String {
        val accService = FridayAccessibilityService.getInstance()
            ?: return gson.toJson(
                NativeBridgeResponse(
                    requestId = "tap_${System.currentTimeMillis()}",
                    action = "SCREEN_TAP_COORDINATES",
                    success = false,
                    errorCode = AndroidErrorCodes.ACCESSIBILITY_REQUIRED,
                    message = "Android Accessibility Service is required to dispatch tap gestures."
                )
            )

        val dispatched = accService.performTapGesture(x, y)
        return gson.toJson(
            NativeBridgeResponse(
                requestId = "tap_${System.currentTimeMillis()}",
                action = "SCREEN_TAP_COORDINATES",
                success = dispatched,
                errorCode = if (dispatched) null else AndroidErrorCodes.ACTION_FAILED,
                message = if (dispatched) "Tapped screen at (${x.toInt()}, ${y.toInt()})." else "Failed to dispatch tap at (${x.toInt()}, ${y.toInt()})."
            )
        )
    }

    @JavascriptInterface
    fun performScreenScroll(direction: String): String {
        val accService = FridayAccessibilityService.getInstance()
            ?: return gson.toJson(
                NativeBridgeResponse(
                    requestId = "scroll_${System.currentTimeMillis()}",
                    action = "SCREEN_SCROLL",
                    success = false,
                    errorCode = AndroidErrorCodes.ACCESSIBILITY_REQUIRED,
                    message = "Android Accessibility Service is required to scroll the screen."
                )
            )

        val scrolled = accService.performScrollGesture(direction)
        return gson.toJson(
            NativeBridgeResponse(
                requestId = "scroll_${System.currentTimeMillis()}",
                action = "SCREEN_SCROLL",
                success = scrolled,
                errorCode = if (scrolled) null else AndroidErrorCodes.ACTION_FAILED,
                message = if (scrolled) "Scrolled screen $direction." else "Could not scroll screen $direction."
            )
        )
    }

    @JavascriptInterface
    fun performScreenInputText(text: String, fieldHint: String?): String = performScreenInputTextEx(text, fieldHint, false, null)

    @JavascriptInterface
    fun performScreenInputTextEx(text: String, fieldHint: String?, isReplace: Boolean, expectedPackage: String?): String {
        val accService = FridayAccessibilityService.getInstance()
            ?: return gson.toJson(
                NativeBridgeResponse(
                    requestId = "input_${System.currentTimeMillis()}",
                    action = "SCREEN_INPUT_TEXT",
                    success = false,
                    errorCode = AndroidErrorCodes.ACCESSIBILITY_REQUIRED,
                    message = "Android Accessibility Service is required to enter text into fields."
                )
            )

        val detailed = accService.performInputTextEx(text, fieldHint, isReplace, expectedPackage)
        return gson.toJson(
            NativeBridgeResponse(
                requestId = "input_${System.currentTimeMillis()}",
                action = if (isReplace) "SCREEN_REPLACE_TEXT" else "SCREEN_INPUT_TEXT",
                success = detailed.success,
                errorCode = detailed.errorCode,
                message = detailed.message,
                data = detailed
            )
        )
    }

    @JavascriptInterface
    fun performScreenReplaceText(text: String, fieldHint: String?): String {
        val accService = FridayAccessibilityService.getInstance()
            ?: return gson.toJson(
                NativeBridgeResponse(
                    requestId = "replace_${System.currentTimeMillis()}",
                    action = "SCREEN_REPLACE_TEXT",
                    success = false,
                    errorCode = AndroidErrorCodes.ACCESSIBILITY_REQUIRED,
                    message = "Android Accessibility Service is required to replace text in fields."
                )
            )

        val detailed = accService.performInputTextEx(text, fieldHint, true, null)
        return gson.toJson(
            NativeBridgeResponse(
                requestId = "replace_${System.currentTimeMillis()}",
                action = "SCREEN_REPLACE_TEXT",
                success = detailed.success,
                errorCode = detailed.errorCode,
                message = detailed.message,
                data = detailed
            )
        )
    }

    @JavascriptInterface
    fun performGlobalNavigation(navAction: String): String {
        if (navAction.lowercase() == "home" || navAction.lowercase() == "go_home") {
            return gson.toJson(intentDispatcher.goHome())
        }
        val accService = FridayAccessibilityService.getInstance()
            ?: return gson.toJson(
                NativeBridgeResponse(
                    requestId = "nav_${System.currentTimeMillis()}",
                    action = "SCREEN_GLOBAL_NAVIGATION",
                    success = false,
                    errorCode = AndroidErrorCodes.ACCESSIBILITY_REQUIRED,
                    message = "Android Accessibility Service is required for '$navAction' navigation."
                )
            )

        val ok = accService.performNavigationAction(navAction)
        return gson.toJson(
            NativeBridgeResponse(
                requestId = "nav_${System.currentTimeMillis()}",
                action = "SCREEN_GLOBAL_NAVIGATION",
                success = ok,
                errorCode = if (ok) null else AndroidErrorCodes.ACTION_FAILED,
                message = if (ok) "Executed Android '$navAction' navigation." else "Failed to execute '$navAction' navigation."
            )
        )
    }

    @JavascriptInterface
    fun requestScreenCapture(): String = startScreenCapture()

    @JavascriptInterface
    fun inspectScreen(includeScreenshot: Boolean = false): String = captureScreenSnapshot(includeScreenshot)

    @JavascriptInterface
    fun captureScreenshot(): String = captureScreenSnapshot(true)

    @JavascriptInterface
    fun performScreenAction(actionJson: String): String {
        return try {
            @Suppress("UNCHECKED_CAST")
            val map = try {
                gson.fromJson(actionJson, Map::class.java) as? Map<String, Any>
            } catch (_: Exception) {
                null
            }
            val action = (map?.get("action") ?: map?.get("actionType") ?: "CLICK_TEXT")?.toString() ?: "CLICK_TEXT"
            val target = (map?.get("targetText") ?: map?.get("target") ?: "")?.toString() ?: ""
            val text = (map?.get("inputText") ?: map?.get("text") ?: "")?.toString() ?: ""
            val x = (map?.get("x") as? Number)?.toFloat()
            val y = (map?.get("y") as? Number)?.toFloat()
            val direction = (map?.get("direction") as? String) ?: "down"
            val confirmed = (map?.get("confirmed") as? Boolean)
                ?: (map?.get("confirmedSensitive") as? Boolean)
                ?: false
            val isReplace = (map?.get("isReplace") as? Boolean)
                ?: (map?.get("replace") as? Boolean)
                ?: (action.uppercase() == "REPLACE_TEXT" || action.uppercase() == "REPLACE")
            val expectedPackage = (map?.get("expectedPackage") ?: map?.get("packageName"))?.toString()

            val accService = FridayAccessibilityService.getInstance()
            if (accService == null && !action.uppercase().startsWith("GLOBAL_") && action.uppercase() != "NAVIGATE") {
                return gson.toJson(
                    NativeBridgeResponse(
                        requestId = "sa_${System.currentTimeMillis()}",
                        action = "PERFORM_SCREEN_ACTION",
                        success = false,
                        errorCode = AndroidErrorCodes.ACCESSIBILITY_REQUIRED,
                        message = "Android Accessibility Service is required to perform screen action '$action'."
                    )
                )
            }

            when (action.uppercase()) {
                "CLICK_TEXT", "CLICK" -> performScreenClick(target, confirmed)
                "TAP_COORDINATES", "TAP" -> if (x != null && y != null) performScreenTap(x, y) else performScreenClick(target, confirmed)
                "SCROLL", "SCROLL_FORWARD", "SCROLL_BACKWARD" -> performScreenScroll(direction)
                "INPUT_TEXT", "TYPE" -> {
                    val detailed = accService?.performInputTextEx(text, target.ifEmpty { null }, isReplace, expectedPackage)
                    gson.toJson(
                        NativeBridgeResponse(
                            requestId = "sa_${System.currentTimeMillis()}",
                            action = "PERFORM_SCREEN_ACTION",
                            success = detailed?.success ?: false,
                            errorCode = detailed?.errorCode,
                            message = detailed?.message ?: "Accessibility service not running",
                            data = detailed
                        )
                    )
                }
                "REPLACE_TEXT", "REPLACE" -> {
                    val detailed = accService?.performInputTextEx(text, target.ifEmpty { null }, true, expectedPackage)
                    gson.toJson(
                        NativeBridgeResponse(
                            requestId = "sa_${System.currentTimeMillis()}",
                            action = "PERFORM_SCREEN_ACTION",
                            success = detailed?.success ?: false,
                            errorCode = detailed?.errorCode,
                            message = detailed?.message ?: "Accessibility service not running",
                            data = detailed
                        )
                    )
                }
                "CLEAR_TEXT" -> {
                    val detailed = accService?.performInputTextEx("", target.ifEmpty { null }, true, expectedPackage)
                    gson.toJson(
                        NativeBridgeResponse(
                            requestId = "sa_${System.currentTimeMillis()}",
                            action = "PERFORM_SCREEN_ACTION",
                            success = detailed?.success ?: false,
                            errorCode = detailed?.errorCode,
                            message = detailed?.message ?: "Accessibility service not running",
                            data = detailed
                        )
                    )
                }
                "NAVIGATE", "NAV", "GLOBAL_BACK", "GLOBAL_HOME", "GLOBAL_RECENTS", "GLOBAL_NOTIFICATIONS" -> {
                    val navTarget = if (action.startsWith("GLOBAL_")) action.substringAfter("GLOBAL_").lowercase() else target.ifEmpty { "back" }
                    performGlobalNavigation(navTarget)
                }
                else -> gson.toJson(
                    NativeBridgeResponse(
                        requestId = "sa_${System.currentTimeMillis()}",
                        action = "PERFORM_SCREEN_ACTION",
                        success = false,
                        errorCode = AndroidErrorCodes.UNSUPPORTED_ACTION,
                        message = "Unsupported screen action: $action"
                    )
                )
            }
        } catch (e: Exception) {
            gson.toJson(
                NativeBridgeResponse(
                    requestId = "sa_err_${System.currentTimeMillis()}",
                    action = "PERFORM_SCREEN_ACTION",
                    success = false,
                    errorCode = AndroidErrorCodes.ACTION_FAILED,
                    message = e.localizedMessage ?: "Failed to perform screen action"
                )
            )
        }
    }

    @JavascriptInterface
    fun startForegroundService(
        statusText: String,
        voiceActive: Boolean,
        muted: Boolean,
        taskCount: Int
    ): String {
        FridayForegroundService.startOrUpdateService(
            context = activity,
            statusText = statusText,
            voiceActive = voiceActive,
            muted = muted,
            taskCount = taskCount
        )
        activity.runOnUiThread { webView.resumeTimers() }
        val res = NativeBridgeResponse(
            requestId = "fg_${System.currentTimeMillis()}",
            action = "START_FOREGROUND_SERVICE",
            success = true,
            message = "FRIDAY Foreground Service active: $statusText",
            data = mapOf(
                "running" to true,
                "voiceActive" to voiceActive,
                "muted" to muted,
                "taskCount" to taskCount
            )
        )
        return gson.toJson(res)
    }

    @JavascriptInterface
    fun stopForegroundService(): String {
        FridayForegroundService.stopService(activity)
        val res = NativeBridgeResponse(
            requestId = "fg_stop_${System.currentTimeMillis()}",
            action = "STOP_FOREGROUND_SERVICE",
            success = true,
            message = "FRIDAY Foreground Service stopped.",
            data = mapOf("running" to false)
        )
        return gson.toJson(res)
    }

    @JavascriptInterface
    fun getForegroundServiceStatus(): String {
        val pm = activity.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val ignoringBatteryOpt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pm?.isIgnoringBatteryOptimizations(activity.packageName) ?: false
        } else {
            true
        }
        val status = mapOf(
            "running" to FridayForegroundService.isRunning,
            "voiceActive" to FridayForegroundService.isVoiceActive,
            "mediaProjectionActive" to FridayForegroundService.isMediaProjectionActive,
            "muted" to FridayForegroundService.isMuted,
            "taskCount" to FridayForegroundService.activeTaskCount,
            "statusText" to FridayForegroundService.currentStatusText,
            "ignoringBatteryOptimizations" to ignoringBatteryOpt
        )
        return gson.toJson(status)
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
            canTakeScreenshot = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && isRunning,
            notice = if (isRunning) "Accessibility Service is active." else "Accessibility Service is currently disabled in Android Settings."
        )
        return gson.toJson(status)
    }

    @JavascriptInterface
    fun requestNativePermission(permission: String): String {
        val granted = permissionHelper.isPermissionGranted(permission)
        if (!granted) {
            when (permission) {
                android.Manifest.permission.RECORD_AUDIO -> {
                    activity.runOnUiThread {
                        permissionHelper.requestRecordAudioPermission {}
                    }
                }
                android.Manifest.permission.CAMERA -> {
                    activity.runOnUiThread {
                        permissionHelper.requestCameraPermission {}
                    }
                }
                android.Manifest.permission.POST_NOTIFICATIONS -> {
                    activity.runOnUiThread {
                        permissionHelper.requestNotificationPermission()
                    }
                }
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
