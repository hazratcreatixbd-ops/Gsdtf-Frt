package ai.friday.assistant

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * PART 6B — FRIDAY Android Permission Helper
 * Centralized permission manager for Audio, Notifications, Foreground Services, and Overlay.
 */
class PermissionHelper(private val activity: Activity) {

    companion object {
        const val RC_AUDIO_RECORD = 101
        const val RC_NOTIFICATIONS = 102

        val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.INTERNET
        )
    }

    private var pendingAudioCallback: ((Boolean) -> Unit)? = null

    /**
     * Checks whether a specific permission is granted.
     */
    fun isPermissionGranted(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(
            activity,
            permission
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Requests microphone permission if not yet granted.
     */
    fun requestRecordAudioPermission(onResult: (Boolean) -> Unit) {
        if (isPermissionGranted(Manifest.permission.RECORD_AUDIO)) {
            onResult(true)
            return
        }

        pendingAudioCallback = onResult
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.RECORD_AUDIO),
            RC_AUDIO_RECORD
        )
    }

    fun onRecordAudioPermissionResult(granted: Boolean) {
        val cb = pendingAudioCallback
        pendingAudioCallback = null
        cb?.invoke(granted)
    }

    /**
     * Requests notification permission on Android 13+ (API 33+).
     */
    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!isPermissionGranted(Manifest.permission.POST_NOTIFICATIONS)) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    RC_NOTIFICATIONS
                )
            }
        }
    }

    /**
     * Checks all core permissions and returns a status map.
     */
    fun getPermissionSummary(): Map<String, Boolean> {
        val summary = mutableMapOf(
            "recordAudio" to isPermissionGranted(Manifest.permission.RECORD_AUDIO),
            "internet" to isPermissionGranted(Manifest.permission.INTERNET)
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            summary["postNotifications"] = isPermissionGranted(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            summary["postNotifications"] = true
        }
        return summary
    }
}
