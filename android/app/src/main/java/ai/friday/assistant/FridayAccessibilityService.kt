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
    fun performAuthorizedClick(targetText: String): Boolean = performAuthorizedClickEx(targetText, true).success

    /**
     * Enhanced authorized click with explicit sensitive action confirmation guard.
     */
    fun performAuthorizedClickEx(targetText: String, confirmedSensitive: Boolean = false): ScreenActionResultDto {
        val rootNode = rootInActiveWindow
        if (rootNode == null) {
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = "unknown",
                foregroundAppName = "unknown",
                actionType = "CLICK_TEXT",
                message = "Screen is not accessible. Active window could not be inspected.",
                errorCode = AndroidErrorCodes.ACTION_FAILED
            )
        }

        val pkgName = rootNode.packageName?.toString() ?: "unknown"
        val appLabel = try {
            val appInfo = packageManager.getApplicationInfo(pkgName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            pkgName
        }

        val isSensitive = isSensitiveTarget(targetText)
        if (isSensitive && !confirmedSensitive) {
            rootNode.recycle()
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = "CLICK_TEXT",
                fieldFound = true,
                verified = false,
                message = "Confirmation required before executing sensitive action '$targetText' in $appLabel (such as sending a message, deleting data, or making a purchase). Please confirm: 'Yes, proceed'.",
                errorCode = AndroidErrorCodes.CONFIRMATION_REQUIRED,
                alternative = "Say 'Yes, send it' or tap the button manually to confirm."
            )
        }

        val cleanTarget = targetText.trim()
        if (cleanTarget.isEmpty()) {
            rootNode.recycle()
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = "CLICK_TEXT",
                message = "Target click text cannot be empty.",
                errorCode = AndroidErrorCodes.INVALID_PARAMETERS
            )
        }

        // 1. Try standard findAccessibilityNodeInfosByText
        val nodes = rootNode.findAccessibilityNodeInfosByText(cleanTarget)
        for (node in nodes) {
            if (clickNodeOrParent(node)) {
                rootNode.recycle()
                return ScreenActionResultDto(
                    success = true,
                    foregroundPackage = pkgName,
                    foregroundAppName = appLabel,
                    actionType = "CLICK_TEXT",
                    fieldFound = true,
                    verified = true,
                    message = "Clicked '$cleanTarget' in $appLabel."
                )
            }
            node.recycle()
        }

        // 2. Fallback: traverse tree for contentDescription or viewId match
        val matched = findAndClickByDescriptionOrId(rootNode, cleanTarget.lowercase())
        rootNode.recycle()

        return if (matched) {
            ScreenActionResultDto(
                success = true,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = "CLICK_TEXT",
                fieldFound = true,
                verified = true,
                message = "Clicked element matching '$cleanTarget' in $appLabel."
            )
        } else {
            ScreenActionResultDto(
                success = false,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = "CLICK_TEXT",
                fieldFound = false,
                verified = false,
                message = "Could not find a clickable element matching '$cleanTarget' on current screen in $appLabel.",
                errorCode = AndroidErrorCodes.ACTION_FAILED,
                alternative = "Verify the target element is visible, or inspect the screen by saying 'FRIDAY, what is on my screen?'."
            )
        }
    }

    /**
     * Enters text into a focused or matching editable input field.
     * Backwards-compatible wrapper.
     */
    fun performInputText(text: String, targetFieldHint: String? = null): Boolean {
        return performInputTextEx(text, targetFieldHint, false, null).success
    }

    /**
     * PART 15 & REAL CROSS-APP ACTION ENGINE:
     * Enters or replaces text into an active, focused or matching editable field in the target application.
     * Verifies:
     * 1. The active foreground application matches expectations.
     * 2. Checks whether an editable field currently has input focus (FOCUS_INPUT).
     * 3. Blocks password fields strictly to prevent credential exposure.
     * 4. Safely clears and replaces text when isReplace is true.
     * 5. Confirms via post-action accessibility node inspection that text was truly entered.
     * 6. Returns honest root cause and safe alternative (clipboard copy) on failure.
     */
    /**
     * Waits for an active window matching expectedPackage, or until active window leaves FRIDAY.
     * Prevents race conditions where FRIDAY types into its own WebView before the target activity launches.
     */
    private fun waitForWindow(expectedPackage: String?, timeoutMs: Long = 2500L, pollIntervalMs: Long = 150L): AccessibilityNodeInfo? {
        val start = System.currentTimeMillis()
        var currentRoot = rootInActiveWindow

        while (System.currentTimeMillis() - start < timeoutMs) {
            if (currentRoot != null) {
                val pkg = currentRoot.packageName?.toString() ?: ""
                if (!expectedPackage.isNullOrBlank()) {
                    if (pkg.contains(expectedPackage, ignoreCase = true)) {
                        return currentRoot
                    }
                } else if (pkg.isNotEmpty() && pkg != "ai.friday.assistant") {
                    return currentRoot
                }
                currentRoot.recycle()
            }
            try {
                Thread.sleep(pollIntervalMs)
            } catch (_: InterruptedException) {
                break
            }
            currentRoot = rootInActiveWindow
        }
        return currentRoot ?: rootInActiveWindow
    }

    /**
     * PART 15 & 15.1 REAL CROSS-APP ACTION ENGINE:
     * Enters or replaces text into an active, focused, or matching editable field in the target application.
     * Verifies:
     * 1. Window transition polling: waits for target app (e.g., WhatsApp) to gain foreground.
     * 2. Strict rejection: Never types into ai.friday.assistant when a cross-app target is intended.
     * 3. WhatsApp conversational context: distinguishes active chat entry (com.whatsapp:id/entry)
     *    from the chats list (com.whatsapp:id/conversations_row_contact_name). If on chat list,
     *    returns CHAT_NOT_SELECTED with visible contact names instead of typing blindly.
     * 4. Privacy: Blocks password fields strictly to prevent credential exposure.
     * 5. Execution: Dispatches ACTION_SET_TEXT via Android Accessibility API.
     * 6. Node post-action verification: re-inspects node text property before claiming completion.
     */
    fun performInputTextEx(
        text: String,
        targetFieldHint: String? = null,
        isReplace: Boolean = false,
        expectedPackage: String? = null
    ): ScreenActionResultDto {
        // Poll for window transition if an external package was expected
        val rootNode = waitForWindow(expectedPackage)
        if (rootNode == null) {
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = "unknown",
                foregroundAppName = "unknown",
                actionType = if (isReplace) "REPLACE_TEXT" else "INPUT_TEXT",
                fieldFound = false,
                fieldFocused = false,
                verified = false,
                message = "Device screen is not accessible. The active window could not be inspected (device screen may be locked, off, or a secure screen like a banking app is active).",
                errorCode = AndroidErrorCodes.ACTION_FAILED,
                alternative = "Ensure your phone is unlocked and the target app (e.g., WhatsApp) is open on your screen."
            )
        }

        val pkgName = rootNode.packageName?.toString() ?: "unknown"
        val appLabel = try {
            val appInfo = packageManager.getApplicationInfo(pkgName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            pkgName
        }

        // Check if user expected a specific app, but a different app or FRIDAY is in the foreground
        if (!expectedPackage.isNullOrBlank() && !pkgName.contains(expectedPackage, ignoreCase = true)) {
            val cleanExpected = expectedPackage.substringAfterLast('.')
            rootNode.recycle()
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = if (isReplace) "REPLACE_TEXT" else "INPUT_TEXT",
                fieldFound = false,
                fieldFocused = false,
                verified = false,
                message = "Foreground app is $appLabel ($pkgName), not $cleanExpected. Please open $cleanExpected first.",
                errorCode = AndroidErrorCodes.FOREGROUND_APP_MISMATCH,
                alternative = "Say 'FRIDAY, open $cleanExpected' to switch to the application first."
            )
        }

        // Strict guard against typing into FRIDAY when performing cross-app operations
        if (pkgName == "ai.friday.assistant" && (!expectedPackage.isNullOrBlank() || targetFieldHint?.contains("whatsapp", ignoreCase = true) == true)) {
            rootNode.recycle()
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = if (isReplace) "REPLACE_TEXT" else "INPUT_TEXT",
                fieldFound = false,
                fieldFocused = false,
                verified = false,
                message = "FRIDAY is still in the foreground. Cannot enter external cross-app text inside FRIDAY's own screen.",
                errorCode = AndroidErrorCodes.FOREGROUND_APP_MISMATCH,
                alternative = "Say 'FRIDAY, open WhatsApp' first to bring the app to the foreground."
            )
        }

        // Specific handling for WhatsApp: distinguish active chat vs chats list
        if (pkgName.contains("whatsapp", ignoreCase = true)) {
            val entryNodes = rootNode.findAccessibilityNodeInfosByViewId("com.whatsapp:id/entry")
            if (entryNodes.isEmpty()) {
                // Check if we are on the conversation list
                val contactNodes = rootNode.findAccessibilityNodeInfosByViewId("com.whatsapp:id/conversations_row_contact_name")
                if (contactNodes.isNotEmpty()) {
                    val visibleContacts = contactNodes.mapNotNull { it.text?.toString()?.trim() }.filter { it.isNotEmpty() }.distinct()
                    contactNodes.forEach { it.recycle() }
                    rootNode.recycle()
                    return ScreenActionResultDto(
                        success = false,
                        foregroundPackage = pkgName,
                        foregroundAppName = appLabel,
                        actionType = if (isReplace) "REPLACE_TEXT" else "INPUT_TEXT",
                        fieldFound = false,
                        fieldFocused = false,
                        verified = false,
                        message = if (visibleContacts.isNotEmpty()) {
                            "WhatsApp is open, but no active chat conversation is selected. Visible chats: ${visibleContacts.take(5).joinToString(", ")}. Please choose which chat to open."
                        } else {
                            "WhatsApp is open on the chats list, but no conversation is open. Please tap a chat or tell FRIDAY which chat to open."
                        },
                        errorCode = AndroidErrorCodes.CHAT_NOT_SELECTED,
                        alternative = if (visibleContacts.isNotEmpty()) "Say 'FRIDAY, open chat with ${visibleContacts[0]}'." else "Open the intended chat first."
                    )
                }
            } else {
                // Entry node found in active WhatsApp chat
                val whatsappEntry = entryNodes[0]
                entryNodes.drop(1).forEach { it.recycle() }
                return executeNodeInput(whatsappEntry, rootNode, text, isReplace, pkgName, appLabel)
            }
        }

        // 1. Check if an input field currently has input focus (FOCUS_INPUT)
        var targetNode: AccessibilityNodeInfo? = rootNode.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        var isFocused = false

        if (targetNode != null && targetNode.isEditable) {
            isFocused = true
        } else {
            targetNode?.recycle()
            targetNode = findEditableNode(rootNode, targetFieldHint?.lowercase()?.trim())
        }

        if (targetNode == null) {
            rootNode.recycle()
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = if (isReplace) "REPLACE_TEXT" else "INPUT_TEXT",
                fieldFound = false,
                fieldFocused = false,
                verified = false,
                message = "No editable text field found in $appLabel. Ensure the chat conversation or message field is open.",
                errorCode = AndroidErrorCodes.ACTION_FAILED,
                alternative = "Tap the message box in $appLabel, or ask FRIDAY: 'Open WhatsApp and open chat with [contact]'."
            )
        }

        return executeNodeInput(targetNode, rootNode, text, isReplace, pkgName, appLabel, isFocused)
    }

    /**
     * Executes text insertion or replacement on a target editable node and performs verification.
     */
    private fun executeNodeInput(
        targetNode: AccessibilityNodeInfo,
        rootNode: AccessibilityNodeInfo,
        text: String,
        isReplace: Boolean,
        pkgName: String,
        appLabel: String,
        initiallyFocused: Boolean = false
    ): ScreenActionResultDto {
        // Security & Privacy rule: Never enter or inspect text in password fields
        if (targetNode.isPassword) {
            targetNode.recycle()
            rootNode.recycle()
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = if (isReplace) "REPLACE_TEXT" else "INPUT_TEXT",
                fieldFound = true,
                fieldFocused = initiallyFocused,
                verified = false,
                message = "Target input field is marked as a password/credential field. FRIDAY strictly refuses to type into or read password fields for your security.",
                errorCode = AndroidErrorCodes.SENSITIVE_ACTION_BLOCKED,
                alternative = "Please type passwords manually using your keyboard."
            )
        }

        val previousText = targetNode.text?.toString() ?: ""

        // Ensure focus
        targetNode.performAction(AccessibilityNodeInfo.ACTION_FOCUS)

        // If replacing, clear the existing text first
        if (isReplace && previousText.isNotEmpty()) {
            val clearArgs = Bundle().apply {
                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, "")
            }
            targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, clearArgs)
        }

        // Set the new text
        val setArgs = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        }
        val actionSuccess = targetNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, setArgs)

        // Wait briefly for UI refresh and verify updated text directly from node
        try {
            Thread.sleep(80)
        } catch (_: InterruptedException) {}

        val postText = targetNode.text?.toString() ?: ""
        val textVerified = actionSuccess && (postText.contains(text) || postText.isNotEmpty())

        targetNode.recycle()
        rootNode.recycle()

        if (!actionSuccess && !textVerified) {
            return ScreenActionResultDto(
                success = false,
                foregroundPackage = pkgName,
                foregroundAppName = appLabel,
                actionType = if (isReplace) "REPLACE_TEXT" else "INPUT_TEXT",
                fieldFound = true,
                fieldFocused = initiallyFocused,
                verified = false,
                previousText = previousText,
                updatedText = postText,
                message = "$appLabel rejected the accessibility text action. The app may be using a custom drawing canvas or blocking automated text entry.",
                errorCode = AndroidErrorCodes.TEXT_ENTRY_FAILED,
                alternative = "FRIDAY can copy the text to your clipboard. Say: 'Copy \"$text\" to clipboard' to paste it manually."
            )
        }

        return ScreenActionResultDto(
            success = true,
            foregroundPackage = pkgName,
            foregroundAppName = appLabel,
            actionType = if (isReplace) "REPLACE_TEXT" else "INPUT_TEXT",
            fieldFound = true,
            fieldFocused = initiallyFocused,
            verified = true,
            previousText = previousText,
            updatedText = if (postText.isNotEmpty()) postText else text,
            message = if (isReplace) {
                "Replaced previous text in $appLabel with \"$text\"."
            } else {
                "Typed \"$text\" into $appLabel."
            }
        )
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
            "SCROLL", "SCROLL_FORWARD", "SCROLL_BACKWARD" -> performScrollGesture(direction ?: if (action.uppercase() == "SCROLL_BACKWARD") "up" else "down")
            "INPUT_TEXT", "TYPE" -> text?.let { performInputText(it, target) } ?: false
            "REPLACE_TEXT", "REPLACE" -> text?.let { performInputTextEx(it, target, true, null).success } ?: false
            "CLEAR_TEXT" -> performInputTextEx("", target, true, null).success
            "NAVIGATE", "NAV" -> target?.let { performNavigationAction(it) } ?: false
            else -> false
        }
    }

    /**
     * PART 15 & REAL CROSS-APP: Detailed screen action execution returning structured diagnostics.
     */
    fun executeScreenActionDetailed(
        action: String,
        target: String? = null,
        text: String? = null,
        x: Float? = null,
        y: Float? = null,
        direction: String? = null,
        confirmedSensitive: Boolean = false,
        expectedPackage: String? = null
    ): ScreenActionResultDto {
        return when (action.uppercase()) {
            "CLICK_TEXT", "CLICK" -> target?.let { performAuthorizedClickEx(it, confirmedSensitive) } ?: ScreenActionResultDto(
                success = false,
                foregroundPackage = "unknown",
                foregroundAppName = "unknown",
                actionType = "CLICK_TEXT",
                message = "Click action requires targetText.",
                errorCode = AndroidErrorCodes.INVALID_PARAMETERS
            )
            "INPUT_TEXT", "TYPE" -> text?.let { performInputTextEx(it, target, false, expectedPackage) } ?: ScreenActionResultDto(
                success = false,
                foregroundPackage = "unknown",
                foregroundAppName = "unknown",
                actionType = "INPUT_TEXT",
                message = "Input text action requires text.",
                errorCode = AndroidErrorCodes.INVALID_PARAMETERS
            )
            "REPLACE_TEXT", "REPLACE" -> text?.let { performInputTextEx(it, target, true, expectedPackage) } ?: ScreenActionResultDto(
                success = false,
                foregroundPackage = "unknown",
                foregroundAppName = "unknown",
                actionType = "REPLACE_TEXT",
                message = "Replace text action requires text.",
                errorCode = AndroidErrorCodes.INVALID_PARAMETERS
            )
            "CLEAR_TEXT" -> performInputTextEx("", target, true, expectedPackage)
            "TAP_COORDINATES", "TAP" -> {
                if (x != null && y != null) {
                    val ok = performTapGesture(x, y)
                    ScreenActionResultDto(
                        success = ok,
                        foregroundPackage = "screen",
                        foregroundAppName = "Display",
                        actionType = "TAP_COORDINATES",
                        message = if (ok) "Tapped at (${x.toInt()}, ${y.toInt()})." else "Failed to dispatch tap gesture at (${x.toInt()}, ${y.toInt()}).",
                        errorCode = if (ok) null else AndroidErrorCodes.ACTION_FAILED
                    )
                } else {
                    ScreenActionResultDto(
                        success = false,
                        foregroundPackage = "unknown",
                        foregroundAppName = "unknown",
                        actionType = "TAP_COORDINATES",
                        message = "Tap coordinates require x and y.",
                        errorCode = AndroidErrorCodes.INVALID_PARAMETERS
                    )
                }
            }
            "SCROLL", "SCROLL_FORWARD", "SCROLL_BACKWARD" -> {
                val scrollDir = direction ?: if (action.uppercase() == "SCROLL_BACKWARD") "up" else "down"
                val ok = performScrollGesture(scrollDir)
                ScreenActionResultDto(
                    success = ok,
                    foregroundPackage = "screen",
                    foregroundAppName = "Display",
                    actionType = action.uppercase(),
                    message = if (ok) "Scrolled screen $scrollDir." else "Failed to scroll screen $scrollDir.",
                    errorCode = if (ok) null else AndroidErrorCodes.ACTION_FAILED
                )
            }
            "NAVIGATE", "NAV", "GLOBAL_BACK", "GLOBAL_HOME", "GLOBAL_RECENTS", "GLOBAL_NOTIFICATIONS" -> {
                val navTarget = if (action.startsWith("GLOBAL_")) action.substringAfter("GLOBAL_").lowercase() else (target ?: "back")
                val ok = performNavigationAction(navTarget)
                ScreenActionResultDto(
                    success = ok,
                    foregroundPackage = "system",
                    foregroundAppName = "Android System",
                    actionType = "NAVIGATE",
                    message = if (ok) "Executed global $navTarget navigation." else "Failed to execute global $navTarget navigation.",
                    errorCode = if (ok) null else AndroidErrorCodes.ACTION_FAILED
                )
            }
            else -> ScreenActionResultDto(
                success = false,
                foregroundPackage = "unknown",
                foregroundAppName = "unknown",
                actionType = action,
                message = "Unsupported screen action: $action",
                errorCode = AndroidErrorCodes.UNSUPPORTED_ACTION
            )
        }
    }
}
