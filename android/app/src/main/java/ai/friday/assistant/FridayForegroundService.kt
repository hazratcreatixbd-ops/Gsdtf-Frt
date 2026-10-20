package ai.friday.assistant

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Base64
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.io.ByteArrayOutputStream

/**
 * PART 6B & PART 15 — FRIDAY Foreground Service
 * Background execution foundation with persistent Android status notification,
 * CPU/Wi-Fi wake locks, Android 14+ foregroundServiceType compliance (including MediaProjection),
 * and interactive notification actions (Open FRIDAY, Mute/Unmute Mic, Stop Screen Share, Stop Session).
 */
class FridayForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "friday_assistant_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "ai.friday.assistant.START_SERVICE"
        const val ACTION_UPDATE = "ai.friday.assistant.UPDATE_SERVICE"
        const val ACTION_STOP = "ai.friday.assistant.STOP_SERVICE"
        const val ACTION_TOGGLE_MUTE = "ai.friday.assistant.TOGGLE_MUTE"
        const val ACTION_STOP_VOICE = "ai.friday.assistant.STOP_VOICE"
        const val ACTION_START_MEDIA_PROJECTION = "ai.friday.assistant.START_MEDIA_PROJECTION"
        const val ACTION_STOP_MEDIA_PROJECTION = "ai.friday.assistant.STOP_MEDIA_PROJECTION"
        const val ACTION_STOP_SCREEN_CAPTURE = "ai.friday.assistant.STOP_SCREEN_CAPTURE"

        const val EXTRA_STATUS = "extra_status"
        const val EXTRA_VOICE_ACTIVE = "extra_voice_active"
        const val EXTRA_MUTED = "extra_muted"
        const val EXTRA_TASK_COUNT = "extra_task_count"
        const val EXTRA_RESULT_CODE = "extra_result_code"
        const val EXTRA_RESULT_DATA = "extra_result_data"

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var currentStatusText: String = "Standby"
            private set

        @Volatile
        var isVoiceActive: Boolean = false
            private set

        @Volatile
        var isMuted: Boolean = false
            private set

        @Volatile
        var activeTaskCount: Int = 0
            private set

        @Volatile
        var isMediaProjectionActive: Boolean = false
            private set

        @Volatile
        private var latestScreenFrameB64: String? = null

        @Volatile
        private var latestScreenWidth: Int = 0

        @Volatile
        private var latestScreenHeight: Int = 0

        var actionListener: ((String) -> Unit)? = null

        fun getLatestProjectedFrame(): Triple<String, Int, Int>? {
            val frame = latestScreenFrameB64 ?: return null
            if (!isMediaProjectionActive) return null
            return Triple(frame, latestScreenWidth, latestScreenHeight)
        }

        fun captureFrameBase64(): String? {
            return getLatestProjectedFrame()?.first
        }

        fun startOrUpdateService(
            context: Context,
            statusText: String = "FRIDAY AI Assistant is active and listening.",
            voiceActive: Boolean = true,
            muted: Boolean = false,
            taskCount: Int = 0
        ) {
            val intent = Intent(context, FridayForegroundService::class.java).apply {
                action = if (isRunning) ACTION_UPDATE else ACTION_START
                putExtra(EXTRA_STATUS, statusText)
                putExtra(EXTRA_VOICE_ACTIVE, voiceActive)
                putExtra(EXTRA_MUTED, muted)
                putExtra(EXTRA_TASK_COUNT, taskCount)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                try {
                    context.startService(intent)
                } catch (_: Exception) {}
            }
        }

        fun startMediaProjectionSession(context: Context, resultCode: Int, resultData: Intent) {
            val intent = Intent(context, FridayForegroundService::class.java).apply {
                action = ACTION_START_MEDIA_PROJECTION
                putExtra(EXTRA_RESULT_CODE, resultCode)
                putExtra(EXTRA_RESULT_DATA, resultData)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (_: Exception) {}
        }

        fun stopMediaProjectionSession(context: Context) {
            val intent = Intent(context, FridayForegroundService::class.java).apply {
                action = ACTION_STOP_MEDIA_PROJECTION
            }
            try {
                context.startService(intent)
            } catch (_: Exception) {}
        }

        fun startService(context: Context) {
            startOrUpdateService(
                context = context,
                statusText = "FRIDAY AI Assistant is active and listening.",
                voiceActive = true,
                muted = false,
                taskCount = activeTaskCount
            )
        }

        fun stopService(context: Context) {
            try {
                val intent = Intent(context, FridayForegroundService::class.java).apply {
                    action = ACTION_STOP
                }
                context.stopService(intent)
            } catch (_: Exception) {}
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastFrameCaptureTime = 0L

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireLocks()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        var pendingProjectionCode: Int? = null
        var pendingProjectionData: Intent? = null

        when (intent?.action) {
            ACTION_STOP -> {
                stopProjectionInternal()
                isRunning = false
                isVoiceActive = false
                activeTaskCount = 0
                currentStatusText = "Standby"
                releaseLocks()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_TOGGLE_MUTE -> {
                isMuted = !isMuted
                actionListener?.invoke("TOGGLE_MUTE")
            }
            ACTION_STOP_MEDIA_PROJECTION, ACTION_STOP_SCREEN_CAPTURE -> {
                stopProjectionInternal()
                actionListener?.invoke("SCREEN_CAPTURE_STOPPED")
                if (!isVoiceActive && activeTaskCount <= 0) {
                    isRunning = false
                    currentStatusText = "Standby"
                    releaseLocks()
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                    return START_NOT_STICKY
                }
            }
            ACTION_START_MEDIA_PROJECTION -> {
                val code = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
                @Suppress("DEPRECATION")
                val data = intent.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)
                if (code == Activity.RESULT_OK && data != null) {
                    pendingProjectionCode = code
                    pendingProjectionData = data
                    isMediaProjectionActive = true
                    if (currentStatusText == "Standby") {
                        currentStatusText = "Screen Vision active • Tap to return to FRIDAY"
                    }
                }
            }
            ACTION_STOP_VOICE -> {
                isVoiceActive = false
                actionListener?.invoke("STOP_VOICE")
                if (activeTaskCount <= 0 && !isMediaProjectionActive) {
                    isRunning = false
                    currentStatusText = "Standby"
                    releaseLocks()
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                    return START_NOT_STICKY
                }
            }
            else -> {
                intent?.getStringExtra(EXTRA_STATUS)?.let { currentStatusText = it }
                if (intent?.hasExtra(EXTRA_VOICE_ACTIVE) == true) {
                    isVoiceActive = intent.getBooleanExtra(EXTRA_VOICE_ACTIVE, isVoiceActive)
                }
                if (intent?.hasExtra(EXTRA_MUTED) == true) {
                    isMuted = intent.getBooleanExtra(EXTRA_MUTED, isMuted)
                }
                if (intent?.hasExtra(EXTRA_TASK_COUNT) == true) {
                    activeTaskCount = intent.getIntExtra(EXTRA_TASK_COUNT, activeTaskCount)
                }
            }
        }

        acquireLocks()
        val notification = buildNotification(currentStatusText)

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val hasMicPerm = ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED

                var serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK or
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                if (hasMicPerm && isVoiceActive) {
                    serviceType = serviceType or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                }
                if (isMediaProjectionActive) {
                    serviceType = serviceType or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                }
                startForeground(NOTIFICATION_ID, notification, serviceType)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val hasMicPerm = ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED
                var serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                if (hasMicPerm && isVoiceActive) {
                    serviceType = serviceType or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                }
                if (isMediaProjectionActive) {
                    serviceType = serviceType or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                }
                startForeground(NOTIFICATION_ID, notification, serviceType)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            isRunning = true
        } catch (e: Exception) {
            try {
                startForeground(NOTIFICATION_ID, notification)
                isRunning = true
            } catch (_: Exception) {}
        }

        // Initialize MediaProjection after startForeground with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
        if (pendingProjectionCode != null && pendingProjectionData != null) {
            setupMediaProjection(pendingProjectionCode, pendingProjectionData)
        }

        actionListener?.invoke("SERVICE_STATE_CHANGED")
        return START_STICKY
    }

    private fun setupMediaProjection(resultCode: Int, resultData: Intent) {
        stopProjectionInternal()
        try {
            val mpManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager ?: return
            mediaProjection = mpManager.getMediaProjection(resultCode, resultData)
            mediaProjection?.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() {
                    stopProjectionInternal()
                    actionListener?.invoke("SCREEN_CAPTURE_STOPPED")
                }
            }, mainHandler)

            val metrics = resources.displayMetrics
            // Scale to max width 540px to keep memory and payload lightweight
            val scale = if (metrics.widthPixels > 540) 540f / metrics.widthPixels else 1f
            val width = ((metrics.widthPixels * scale).toInt() / 2 * 2).coerceAtLeast(320)
            val height = ((metrics.heightPixels * scale).toInt() / 2 * 2).coerceAtLeast(480)
            val density = metrics.densityDpi

            imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
            imageReader?.setOnImageAvailableListener({ reader ->
                val now = System.currentTimeMillis()
                // Throttle frame encoding to at most 1 frame per 800ms
                if (now - lastFrameCaptureTime < 800L) {
                    try {
                        reader.acquireLatestImage()?.close()
                    } catch (_: Exception) {}
                    return@setOnImageAvailableListener
                }
                lastFrameCaptureTime = now
                var image: android.media.Image? = null
                try {
                    image = reader.acquireLatestImage()
                    if (image != null) {
                        val planes = image.planes
                        val buffer = planes[0].buffer
                        val pixelStride = planes[0].pixelStride
                        val rowStride = planes[0].rowStride
                        val rowPadding = rowStride - pixelStride * width

                        val bitmap = Bitmap.createBitmap(
                            width + rowPadding / pixelStride,
                            height,
                            Bitmap.Config.ARGB_8888
                        )
                        bitmap.copyPixelsFromBuffer(buffer)
                        val cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height)
                        val bos = ByteArrayOutputStream()
                        cropped.compress(Bitmap.CompressFormat.JPEG, 70, bos)
                        latestScreenFrameB64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)
                        latestScreenWidth = width
                        latestScreenHeight = height
                        if (cropped != bitmap) cropped.recycle()
                        bitmap.recycle()
                    }
                } catch (_: Exception) {
                } finally {
                    try {
                        image?.close()
                    } catch (_: Exception) {}
                }
            }, mainHandler)

            virtualDisplay = mediaProjection?.createVirtualDisplay(
                "FRIDAY_ScreenVision",
                width,
                height,
                density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader?.surface,
                null,
                mainHandler
            )
            isMediaProjectionActive = true
            actionListener?.invoke("SCREEN_CAPTURE_STARTED")
        } catch (e: Exception) {
            stopProjectionInternal()
        }
    }

    private fun stopProjectionInternal() {
        isMediaProjectionActive = false
        latestScreenFrameB64 = null
        try {
            virtualDisplay?.release()
        } catch (_: Exception) {}
        virtualDisplay = null
        try {
            imageReader?.close()
        } catch (_: Exception) {}
        imageReader = null
        try {
            mediaProjection?.stop()
        } catch (_: Exception) {}
        mediaProjection = null
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopProjectionInternal()
        releaseLocks()
        isRunning = false
        isVoiceActive = false
        actionListener?.invoke("SERVICE_STATE_CHANGED")
        super.onDestroy()
    }

    private fun acquireLocks() {
        try {
            if (wakeLock == null) {
                val pm = applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                wakeLock = pm?.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "FRIDAY::BackgroundVoiceAndTaskWakeLock"
                )?.apply {
                    setReferenceCounted(false)
                }
            }
            if (wakeLock?.isHeld == false) {
                wakeLock?.acquire(4 * 60 * 60 * 1000L)
            }
        } catch (_: Exception) {}

        try {
            if (wifiLock == null) {
                val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                val lockType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    WifiManager.WIFI_MODE_FULL_LOW_LATENCY
                } else {
                    @Suppress("DEPRECATION")
                    WifiManager.WIFI_MODE_FULL_HIGH_PERF
                }
                wifiLock = wm?.createWifiLock(lockType, "FRIDAY::RealtimeVoiceWifiLock")?.apply {
                    setReferenceCounted(false)
                }
            }
            if (wifiLock?.isHeld == false) {
                wifiLock?.acquire()
            }
        } catch (_: Exception) {}
    }

    private fun releaseLocks() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {}
        try {
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
        } catch (_: Exception) {}
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "FRIDAY AI Background Voice & Screen Vision",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps FRIDAY active for voice conversations, screen vision, and background tasks."
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(contentText: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingOpenFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val openPendingIntent = PendingIntent.getActivity(this, 0, openIntent, pendingOpenFlags)

        val muteIntent = Intent(this, FridayForegroundService::class.java).apply {
            action = ACTION_TOGGLE_MUTE
        }
        val mutePendingIntent = PendingIntent.getService(this, 1, muteIntent, pendingOpenFlags)

        val stopIntent = Intent(this, FridayForegroundService::class.java).apply {
            action = ACTION_STOP_VOICE
        }
        val stopPendingIntent = PendingIntent.getService(this, 2, stopIntent, pendingOpenFlags)

        val stopProjectionIntent = Intent(this, FridayForegroundService::class.java).apply {
            action = ACTION_STOP_MEDIA_PROJECTION
        }
        val stopProjectionPendingIntent = PendingIntent.getService(this, 3, stopProjectionIntent, pendingOpenFlags)

        val title = when {
            isMediaProjectionActive && isVoiceActive -> "FRIDAY AI • Voice & Screen Vision Active"
            isMediaProjectionActive -> "FRIDAY AI • Screen Vision Active"
            isVoiceActive && isMuted -> "FRIDAY AI • Microphone Muted"
            isVoiceActive && activeTaskCount > 0 -> "FRIDAY AI • Voice & $activeTaskCount Task(s) Active"
            isVoiceActive -> "FRIDAY AI • Live Voice Active"
            activeTaskCount > 0 -> "FRIDAY AI • Executing $activeTaskCount Task(s)"
            else -> "FRIDAY AI • Background Service Active"
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(
                android.R.drawable.ic_menu_view,
                "Open FRIDAY",
                openPendingIntent
            )

        if (isMediaProjectionActive) {
            builder.addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop Screen Share",
                stopProjectionPendingIntent
            )
        } else if (isVoiceActive) {
            builder.addAction(
                android.R.drawable.ic_lock_silent_mode,
                if (isMuted) "Unmute Mic" else "Mute Mic",
                mutePendingIntent
            )
        }

        builder.addAction(
            android.R.drawable.ic_menu_close_clear_cancel,
            "Stop Session",
            stopPendingIntent
        )

        return builder.build()
    }
}
