package ai.friday.assistant

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import java.io.ByteArrayOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * PART 6B & PART 15 — FRIDAY Accessibility Service
 * Specialized native accessibility architecture for user-authorized screen vision and device interaction.
 *
 * SECURITY & PRIVACY CONSTRAINTS:
 * - Requires explicit manual user activation in Android Settings.
 * - Exposes real-time enabled/disabled status to FRIDAY brain and UI.
 * - Only inspects hierarchy or captures screen when an authorized user request is actively running.
 * - NEVER secretly gathers credentials, passwords, or unrelated screen contents.
 * - Never bypasses Android security, PINs, biometrics, or payment gates.
 */
class FridayAccessibilityService : AccessibilityService() {

    companion object {
        private var instance: FridayAccessibilityService? = null
        var isServiceRunning: Boolean = false
            private set

        var statusListener: ((Boolean) -> Unit)? = null

        fun getInstance(): FridayAccessibilityService? = instance

        // Keywords that indicate sensitive / destructive actions requiring explicit confirmation
        private val SENSITIVE_KEYWORDS = listOf(
            "pay", "purchase", "buy now", "checkout", "confirm payment", "send money", "transfer",
            "delete", "uninstall", "remove account", "factory reset", "erase",
            "post", "publish", "submit", "send", "share now", "confirm order", "grant permission"
        )
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        isServiceRunning = true
        statusListener?.invoke(true)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // FRIDAY only inspects hierarchy when an authorized action is actively running.
        // Unrelated screen events are discarded immediately to preserve user privacy.
    }

    override fun onInterrupt() {
        // Called when system interrupts the service
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        isServiceRunning = false
        statusListener?.invoke(false)
    }

    /**
     * Checks if a target label or action text matches a sensitive operation
     * (payments, deletions, account changes, publishing, or sending messages).
     */
    fun isSensitiveTarget(targetText: String): Boolean {
        val lower = targetText.lowercase().trim()
        return SENSITIVE_KEYWORDS.any { lower.contains(it) }
    }

    /**
     * Inspects the current active window's UI hierarchy on-demand when requested by the user.
     * Filters out password fields to protect privacy.
     */
    fun inspectCurrentScreen(includeScreenshot: Boolean = false): ScreenCaptureDataDto {
        val rootNode = rootInActiveWindow
        val pkgName = rootNode?.packageName?.toString() ?: "unknown"
        val appLabel = try {
            val appInfo = packageManager.getApplicationInfo(pkgName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            pkgName
        }

        val visibleTexts = mutableListOf<String>()
        val uiElements = mutableListOf<ScreenUiElementDto>()

        if (rootNode != null) {
            traverseHierarchy(rootNode, visibleTexts, uiElements)
            rootNode.recycle()
        }

        var screenshotB64: String? = null
        var captureMode = "UI_HIERARCHY_ONLY"
        var width = 0
        var height = 0

        if (includeScreenshot && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val shot = takeScreenshotSync(2500L)
            if (shot != null) {
                screenshotB64 = shot.first
                width = shot.second
                height = shot.third
                captureMode = "ACCESSIBILITY_SCREENSHOT"
            }
        }

        val summary = buildString {
            append("Foreground App: $appLabel ($pkgName). ")
            append("Detected ${uiElements.size} interactive/visible UI elements. ")
            if (visibleTexts.isNotEmpty()) {
                append("Key visible text: ${visibleTexts.take(15).joinToString(" | ")}")
            } else {
                append("No readable text nodes exposed in current window.")
            }
        }

        return ScreenCaptureDataDto(
            captured = rootNode != null || screenshotB64 != null,
            captureMode = captureMode,
            foregroundPackage = pkgName,
            foregroundAppName = appLabel,
            screenSummary = summary,
            visibleTexts = visibleTexts.distinct().take(60),
            uiElements = uiElements.take(60),
            screenshotBase64 = screenshotB64,
            width = width,
            height = height
        )
    }

    private fun traverseHierarchy(
        node: AccessibilityNodeInfo?,
        visibleTexts: MutableList<String>,
        uiElements: MutableList<ScreenUiElementDto>
    ) {
        if (node == null || !node.isVisibleToUser) return

        // Privacy guardrail: never read or record password field values
        if (node.isPassword) return

        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val viewId = node.viewIdResourceName ?: ""
        val className = node.className?.toString()?.substringAfterLast('.') ?: ""

        if (text.isNotEmpty()) {
            visibleTexts.add(text)
        } else if (desc.isNotEmpty()) {
            visibleTexts.add(desc)
        }

        val isInteractive = node.isClickable || node.isEditable || node.isScrollable
        if (isInteractive || text.isNotEmpty() || desc.isNotEmpty()) {
            val rect = Rect()
            node.getBoundsInScreen(rect)
            if (rect.width() > 0 && rect.height() > 0 && uiElements.size < 60) {
                uiElements.add(
                    ScreenUiElementDto(
                        index = uiElements.size + 1,
                        text = text,
                        contentDescription = desc,
                        className = className,
                        viewId = viewId,
                        clickable = node.isClickable,
                        editable = node.isEditable,
                        scrollable = node.isScrollable,
                        bounds = "[${rect.left},${rect.top}][${rect.right},${rect.bottom}]",
                        centerX = rect.centerX(),
                        centerY = rect.centerY()
                    )
                )
            }
        }

        val childCount = node.childCount
        for (i in 0 until childCount) {
            val child = node.getChild(i)
            if (child != null) {
                traverseHierarchy(child, visibleTexts, uiElements)
                child.recycle()
            }
        }
    }

    /**
     * Captures a single screenshot on Android 11+ (API 30+) via AccessibilityService.takeScreenshot
     * when explicitly requested by the user.
     */
    @RequiresApi(Build.VERSION_CODES.R)
    private fun takeScreenshotSync(timeoutMs: Long = 2500L): Triple<String, Int, Int>? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return null
        val latch = CountDownLatch(1)
        var resultTriple: Triple<String, Int, Int>? = null

        try {
            takeScreenshot(
                Display.DEFAULT_DISPLAY,
                ContextCompat.getMainExecutor(this),
                object : TakeScreenshotCallback {
                    override fun onSuccess(screenshotResult: ScreenshotResult) {
                        try {
                            val hwBuffer = screenshotResult.hardwareBuffer
                            val colorSpace = screenshotResult.colorSpace
                            val bitmap = Bitmap.wrapHardwareBuffer(hwBuffer, colorSpace)
                            if (bitmap != null) {
                                val softBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, false)
                                val scaled = scaleBitmapIfNeeded(softBitmap, 720)
                                val bos = ByteArrayOutputStream()
                                scaled.compress(Bitmap.CompressFormat.JPEG, 72, bos)
                                val b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)
                                resultTriple = Triple(b64, scaled.width, scaled.height)
                                if (scaled != softBitmap) scaled.recycle()
                                softBitmap.recycle()
                                bitmap.recycle()
                            }
                            hwBuffer.close()
                        } catch (_: Exception) {
                        } finally {
                            latch.countDown()
                        }
                    }

                    override fun onFailure(errorCode: Int) {
                        latch.countDown()
                    }
                }
            )
            latch.await(timeoutMs, TimeUnit.MILLISECONDS)
        } catch (_: Exception) {
        }
        return resultTriple
    }

    private fun scaleBitmapIfNeeded(bitmap: Bitmap, maxDimension: Int): Bitmap {
        val w = bitmap.width
        val h = bitmap.height
        if (w <= maxDimension && h <= maxDimension) return bitmap
        val ratio = w.toFloat() / h.toFloat()
        val newW: Int
        val newH: Int
        if (w > h) {
            newW = maxDimension
            newH = (maxDimension / ratio).toInt().coerceAtLeast(1)
        } else {
            newH = maxDimension
            newW = (maxDimension * ratio).toInt().coerceAtLeast(1)
        }
        return Bitmap.createScaledBitmap(bitmap, newW, newH, true)
    }

    /**
     * Dispatches a tap gesture on a specific screen coordinate (Android 7.0+).
     * Used only after explicit voice/UI authorization.
     */
    fun performTapGesture(x: Float, y: Float, onComplete: ((Boolean) -> Unit)? = null): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            onComplete?.invoke(false)
            return false
        }

        val path = Path().apply {
            moveTo(x, y)
        }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 100))
            .build()

        return dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                onComplete?.invoke(true)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                onComplete?.invoke(false)
            }
        }, null)
    }

    /**
     * Performs a smooth swipe/scroll gesture on the screen (Android 7.0+).
     */
    fun performScrollGesture(direction: String): Boolean {
        val rootNode = rootInActiveWindow
        if (rootNode != null) {
            val action = when (direction.lowercase()) {
                "up", "backward", "right" -> AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
                else -> AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
            }
            val scrolledNode = findAndScrollNode(rootNode, action)
            rootNode.recycle()
            if (scrolledNode) return true
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false
        val metrics = resources.displayMetrics
        val cx = metrics.widthPixels / 2f
        val cy = metrics.heightPixels / 2f
        val deltaY = metrics.heightPixels * 0.3f
        val deltaX = metrics.widthPixels * 0.3f

        val path = Path()
        when (direction.lowercase()) {
            "up" -> {
                path.moveTo(cx, cy - deltaY / 2)
                path.lineTo(cx, cy + deltaY / 2)
            }
            "left" -> {
                path.moveTo(cx + deltaX / 2, cy)
                path.lineTo(cx - deltaX / 2, cy)
            }
            "right" -> {
                path.moveTo(cx - deltaX / 2, cy)
                path.lineTo(cx + deltaX / 2, cy)
            }
            else -> { // "down" (scroll down content = swipe up)
                path.moveTo(cx, cy + deltaY / 2)
                path.lineTo(cx, cy - deltaY / 2)
            }
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 260))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    private fun findAndScrollNode(node: AccessibilityNodeInfo?, action: Int): Boolean {
        if (node == null) return false
        if (node.isScrollable) {
            if (node.performAction(action)) return true
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val ok = findAndScrollNode(child, action)
                child.recycle()
                if (ok) return true
            }
        }
        return false
    }

    /**
     * Finds and clicks a UI element by text, content description, or view ID.
     */
    fun performAuthorizedClick(targetText: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val cleanTarget = targetText.trim()
        if (cleanTarget.isEmpty()) {
            rootNode.recycle()
            return false
        }

        // 1. Try standard findAccessibilityNodeInfosByText
        val nodes = rootNode.findAccessibilityNodeInfosByText(cleanTarget)
        for (node in nodes) {
            if (clickNodeOrParent(node)) {
                rootNode.recycle()
                return true
            }
            node.recycle()
        }

        // 2. Fallback: traverse tree for contentDescription or viewId match
        val matched = findAndClickByDescriptionOrId(rootNode, cleanTarget.lowercase())
        rootNode.recycle()
        return matched
    }

    private fun clickNodeOrParent(node: AccessibilityNodeInfo): Boolean {
        if (node.isClickable) {
            return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }
        var parent = node.parent
        while (parent != null) {
            if (parent.isClickable) {
                val success = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                parent.recycle()
                return success
            }
            val prev = parent
            parent = parent.parent
            prev.recycle()
        }
        return false
    }

    private fun findAndClickByDescriptionOrId(node: AccessibilityNodeInfo?, query: String): Boolean {
        if (node == null || !node.isVisibleToUser) return false
        val text = node.text?.toString()?.lowercase() ?: ""
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        if (text.contains(query) || desc.contains(query) || viewId.endsWith(query)) {
            if (clickNodeOrParent(node)) return true
            val rect = Rect()
            node.getBoundsInScreen(rect)
            if (rect.width() > 0 && rect.height() > 0) {
                return performTapGesture(rect.centerX().toFloat(), rect.centerY().toFloat())
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val ok = findAndClickByDescriptionOrId(child, query)
                child.recycle()
                if (ok) return true
            }
        }
        return false
    }

    /**
     * Enters text into a focused or matching editable input field.
     * Never writes into password fields.
     */
    fun performInputText(text: String, targetFieldHint: String? = null): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val targetNode = findEditableNode(rootNode, targetFieldHint?.lowercase()?.trim())
        if (targetNode != null) {
            if (targetNode.isPassword) {
                targetNode.recycle()
                rootNode.recycle()
                return false
            }
            targetNode.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
            val args = Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
            }
            val success = targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            targetNode.recycle()
            rootNode.recycle()
            return success
        }
        rootNode.recycle()
        return false
    }

    private fun findEditableNode(node: AccessibilityNodeInfo?, hint: String?): AccessibilityNodeInfo? {
        if (node == null || !node.isVisibleToUser || node.isPassword) return null
        if (node.isEditable) {
            if (hint.isNullOrEmpty()) return AccessibilityNodeInfo.obtain(node)
            val nodeText = node.text?.toString()?.lowercase() ?: ""
            val nodeDesc = node.contentDescription?.toString()?.lowercase() ?: ""
            val nodeId = node.viewIdResourceName?.lowercase() ?: ""
            if (nodeText.contains(hint) || nodeDesc.contains(hint) || nodeId.contains(hint)) {
                return AccessibilityNodeInfo.obtain(node)
            }
        }
        var fallbackEditable: AccessibilityNodeInfo? = null
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val found = findEditableNode(child, hint)
                child.recycle()
                if (found != null) {
                    if (!hint.isNullOrEmpty()) {
                        fallbackEditable?.recycle()
                        return found
                    } else if (fallbackEditable == null) {
                        fallbackEditable = found
                    } else {
                        found.recycle()
                    }
                }
            }
        }
        return fallbackEditable
    }

    /**
     * PART 15 — Inspect screen hierarchy on-demand
     */
     fun inspectScreenHierarchy(): ScreenCaptureDataDto = inspectCurrentScreen(false)

    /**
     * PART 15 — Capture screenshot base64 on-demand
     */
    fun captureScreenshotBase64(): String? = inspectCurrentScreen(true).screenshotBase64

    /**
     * PART 15 — Sensitive action confirmation check
     */
    fun isSensitiveAction(targetText: String): Boolean = isSensitiveTarget(targetText)

    /**
     * Performs safe global navigation actions: BACK, HOME, RECENTS, NOTIFICATIONS.
     */
    fun performNavigationAction(actionName: String): Boolean {
        val globalAction = when (actionName.lowercase().trim()) {
            "back", "navigate_back" -> GLOBAL_ACTION_BACK
            "home", "go_home" -> GLOBAL_ACTION_HOME
            "recents", "recent_apps" -> GLOBAL_ACTION_RECENTS
            "notifications" -> GLOBAL_ACTION_NOTIFICATIONS
            else -> return false
        }
        return performGlobalAction(globalAction)
    }

    /**
     * PART 15 — Perform authorized screen action
     */
    fun performScreenAction(
        action: String,
        target: String? = null,
        text: String? = null,
        x: Float? = null,
        y: Float? = null,
        direction: String? = null
    ): Boolean {
        return when (action.uppercase()) {
            "CLICK_TEXT", "CLICK" -> target?.let { performAuthorizedClick(it) } ?: false
            "TAP_COORDINATES", "TAP" -> if (x != null && y != null) performTapGesture(x, y) else false
            "SCROLL" -> performScrollGesture(direction ?: "down")
            "INPUT_TEXT", "TYPE" -> text?.let { performInputText(it, target) } ?: false
            "NAVIGATE", "NAV" -> target?.let { performNavigationAction(it) } ?: false
            else -> false
        }
    }
}
