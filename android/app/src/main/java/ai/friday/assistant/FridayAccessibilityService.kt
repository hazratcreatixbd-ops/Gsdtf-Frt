package ai.friday.assistant

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * PART 6B — FRIDAY Accessibility Service
 * Specialized native accessibility architecture for authorized device assistance.
 *
 * SECURITY & PRIVACY CONSTRAINTS:
 * - Requires explicit manual user activation in Android Settings.
 * - Exposes real-time enabled/disabled status to FRIDAY brain and UI.
 * - Only executes authorized FRIDAY actions (e.g. pre-confirmed WhatsApp send button click).
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
     * Dispatches a tap gesture on a specific screen coordinate (Android 7.0+).
     * Used only after explicit voice/UI confirmation.
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
     * Finds and clicks a button by view ID or text (e.g. WhatsApp send button)
     * ONLY invoked when the user explicitly confirmed "Send Now" in FRIDAY's Action Preview.
     */
    fun performAuthorizedClick(targetText: String): Boolean {
        val rootNode = rootInActiveWindow ?: return false
        val nodes = rootNode.findAccessibilityNodeInfosByText(targetText)

        for (node in nodes) {
            if (node.isClickable) {
                val success = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                node.recycle()
                return success
            }
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) {
                    val success = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    parent.recycle()
                    node.recycle()
                    return success
                }
                val prev = parent
                parent = parent.parent
                prev.recycle()
            }
            node.recycle()
        }
        return false
    }
}
