package ai.friday.assistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * PART 6B — FRIDAY Foreground Service
 * Background execution foundation with persistent Android status notification,
 * CPU/Wi-Fi wake locks, Android 14+ foregroundServiceType compliance, and interactive
 * notification actions (Open FRIDAY, Mute/Unmute Mic, Stop Session).
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

        const val EXTRA_STATUS = "extra_status"
        const val EXTRA_VOICE_ACTIVE = "extra_voice_active"
        const val EXTRA_MUTED = "extra_muted"
        const val EXTRA_TASK_COUNT = "extra_task_count"

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

        var actionListener: ((String) -> Unit)? = null

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
                // Fallback if OS restricts foreground start from background context
                try {
                    context.startService(intent)
                } catch (_: Exception) {}
            }
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

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireLocks()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
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
            ACTION_STOP_VOICE -> {
                isVoiceActive = false
                actionListener?.invoke("STOP_VOICE")
                if (activeTaskCount <= 0) {
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
                startForeground(NOTIFICATION_ID, notification, serviceType)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val hasMicPerm = ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED
                val serviceType = if (hasMicPerm && isVoiceActive) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                } else {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                }
                startForeground(NOTIFICATION_ID, notification, serviceType)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            isRunning = true
        } catch (e: Exception) {
            // Fallback startForeground if microphone service type is rejected while in background
            try {
                startForeground(NOTIFICATION_ID, notification)
                isRunning = true
            } catch (_: Exception) {}
        }

        actionListener?.invoke("SERVICE_STATE_CHANGED")
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
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
                wakeLock?.acquire(4 * 60 * 60 * 1000L) // Up to 4 hours continuous safety cap
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
                "FRIDAY AI Background Voice & Tasks",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps FRIDAY active for voice conversations, background tasks, and device workflows when switching apps."
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

        val title = when {
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

        if (isVoiceActive) {
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
