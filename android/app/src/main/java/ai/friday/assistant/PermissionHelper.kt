package ai.friday.assistant

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.PowerManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * PART 6B & PART 15 — FRIDAY Android Permission Helper
 * Centralized permission manager for Audio, Notifications, Camera, Foreground Services, and Screen Vision.
 */
class PermissionHelper(private val activity: Activity) {

    companion object {
        const val RC_AUDIO_RECORD = 101
        const val RC_NOTIFICATIONS = 102
        const val RC_CAMERA = 103
        const val RC_MEDIA_PROJECTION = 104

        val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.INTERNET
        )
    }

    private val pendingAudioCallbacks = mutableListOf<(Boolean) -> Unit>()
    private val pendingCameraCallbacks = mutableListOf<(Boolean) -> Unit>()

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

        val shouldRequest = pendingAudioCallbacks.isEmpty()
        pendingAudioCallbacks.add(onResult)
        if (shouldRequest) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                RC_AUDIO_RECORD
            )
        }
    }

    fun onRecordAudioPermissionResult(granted: Boolean) {
        val callbacks = pendingAudioCallbacks.toList()
        pendingAudioCallbacks.clear()
        callbacks.forEach { it.invoke(granted) }
    }

    /**
     * Requests camera permission only when explicitly requested by user.
     */
    fun requestCameraPermission(onResult: (Boolean) -> Unit) {
        if (isPermissionGranted(Manifest.permission.CAMERA)) {
            onResult(true)
            return
        }

        val shouldRequest = pendingCameraCallbacks.isEmpty()
        pendingCameraCallbacks.add(onResult)
        if (shouldRequest) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.CAMERA),
                RC_CAMERA
            )
        }
    }

    fun onCameraPermissionResult(granted: Boolean) {
        val callbacks = pendingCameraCallbacks.toList()
        pendingCameraCallbacks.clear()
        callbacks.forEach { it.invoke(granted) }
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
     * Checks all core and Part 15 permissions and returns a truthful status map.
     */
    fun getPermissionSummary(): Map<String, Any> {
        val pm = activity.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val ignoringBatteryOpt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pm?.isIgnoringBatteryOptimizations(activity.packageName) ?: false
        } else {
            true
        }
        val notifGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            isPermissionGranted(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            true
        }
        val accRunning = FridayAccessibilityService.isServiceRunning
        val canTakeAccScreenshot = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && accRunning
        val isScreenActive = FridayForegroundService.isMediaProjectionActive

        return mapOf(
            "recordAudio" to isPermissionGranted(Manifest.permission.RECORD_AUDIO),
            "internet" to isPermissionGranted(Manifest.permission.INTERNET),
            "postNotifications" to notifGranted,
            "camera" to isPermissionGranted(Manifest.permission.CAMERA),
            "accessibilityService" to accRunning,
            "accessibilityScreenshotSupported" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R),
            "accessibilityScreenshotReady" to canTakeAccScreenshot,
            "mediaProjectionSupported" to true,
            "mediaProjectionActive" to isScreenActive,
            "screenCaptureActive" to isScreenActive,
            "ignoringBatteryOptimizations" to ignoringBatteryOpt,
            "foregroundServiceRunning" to FridayForegroundService.isRunning
        )
    }

    /**
     * Alias for Part 15 Permission Center check
     */
    fun getAllPermissionsStatus(): Map<String, Any> {
        return getPermissionSummary()
    }
}
