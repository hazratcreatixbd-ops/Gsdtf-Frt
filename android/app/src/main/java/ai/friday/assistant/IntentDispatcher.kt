package ai.friday.assistant

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import java.net.URLEncoder

/**
 * PART 6B — FRIDAY Android Intent Dispatcher
 * Official Android Intent handling for Browser, YouTube, WhatsApp, Settings, and Installed Apps.
 * Performs rigorous package verification before launching and reports honest status.
 */
class IntentDispatcher(private val context: Context) {

    companion object {
        const val PACKAGE_YOUTUBE = "com.google.android.youtube"
        const val PACKAGE_WHATSAPP = "com.whatsapp"
        const val PACKAGE_WHATSAPP_BUSINESS = "com.whatsapp.w4b"
    }

    /**
     * Checks if a specific package is installed on the device.
     */
    fun isPackageInstalled(packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    /**
     * Safe Android Home Screen Navigation
     * Launches the real Android Home intent (ACTION_MAIN + CATEGORY_HOME)
     * so user actually leaves FRIDAY and reaches device Home screen.
     */
    fun goHome(): NativeBridgeResponse {
        return try {
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            NativeBridgeResponse(
                requestId = "",
                action = "GO_HOME",
                success = true,
                message = "Navigated to Android home screen via CATEGORY_HOME Intent."
            )
        } catch (e: Exception) {
            NativeBridgeResponse(
                requestId = "",
                action = "GO_HOME",
                success = false,
                errorCode = AndroidErrorCodes.ACTION_FAILED,
                message = "Failed to navigate to home screen: ${e.localizedMessage ?: "Unknown error"}"
            )
        }
    }

    /**
     * Queries launchable applications installed on the real Android device.
     */
    fun getInstalledApps(): List<InstalledAppDto> {
        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
        val list = mutableListOf<InstalledAppDto>()

        for (info in resolveInfos) {
            val appInfo = info.activityInfo.applicationInfo
            val appName = pm.getApplicationLabel(appInfo).toString()
            val packageName = info.activityInfo.packageName
            val isSystem = (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0

            list.add(
                InstalledAppDto(
                    appName = appName,
                    packageName = packageName,
                    launchable = true,
                    isSystemApp = isSystem
                )
            )
        }
        return list.sortedBy { it.appName.lowercase() }
    }

    /**
     * Universal App Launcher
     * Resolves an installed application by package name or user-friendly app name,
     * launches it using Android-supported intents, and returns structured result.
     * If the app is not installed, returns ANDROID_APP_NOT_INSTALLED without faking success.
     */
    fun launchApp(queryOrPackage: String): NativeBridgeResponse {
        val clean = queryOrPackage.trim()
        if (clean.isBlank()) {
            return NativeBridgeResponse(
                requestId = "",
                action = "LAUNCH_APP",
                success = false,
                errorCode = AndroidErrorCodes.INVALID_PARAMETERS,
                message = "No application name or package specified."
            )
        }

        val pm = context.packageManager

        // 1. Direct package match
        var launchIntent = pm.getLaunchIntentForPackage(clean)
        var targetPkg = clean
        var targetLabel = clean

        // 2. If not found as direct package, search installed apps by label or common alias
        if (launchIntent == null) {
            val installed = getInstalledApps()
            val matched = installed.find { app ->
                app.packageName.equals(clean, ignoreCase = true) ||
                app.appName.equals(clean, ignoreCase = true) ||
                app.appName.lowercase().contains(clean.lowercase()) ||
                app.packageName.lowercase().contains(clean.lowercase())
            }

            if (matched != null) {
                targetPkg = matched.packageName
                targetLabel = matched.appName
                launchIntent = pm.getLaunchIntentForPackage(targetPkg)
            } else {
                // Common aliases
                val aliasMap = mapOf(
                    "chrome" to "com.android.chrome",
                    "browser" to "com.android.chrome",
                    "youtube" to PACKAGE_YOUTUBE,
                    "yt" to PACKAGE_YOUTUBE,
                    "whatsapp" to PACKAGE_WHATSAPP,
                    "calculator" to "com.google.android.calculator",
                    "settings" to "com.android.settings",
                    "maps" to "com.google.android.apps.maps",
                    "gmail" to "com.google.android.gm",
                    "spotify" to "com.spotify.music"
                )
                val aliasPkg = aliasMap[clean.lowercase()]
                if (aliasPkg != null) {
                    targetPkg = aliasPkg
                    targetLabel = clean.replaceFirstChar { it.uppercase() }
                    launchIntent = pm.getLaunchIntentForPackage(aliasPkg)
                }
            }
        }

        return if (launchIntent != null) {
            try {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                NativeBridgeResponse(
                    requestId = "",
                    action = "LAUNCH_APP",
                    success = true,
                    message = "Successfully launched application: $targetLabel ($targetPkg)",
                    data = mapOf("packageName" to targetPkg, "appName" to targetLabel)
                )
            } catch (e: Exception) {
                NativeBridgeResponse(
                    requestId = "",
                    action = "LAUNCH_APP",
                    success = false,
                    errorCode = AndroidErrorCodes.ACTION_FAILED,
                    message = "Failed to launch $targetLabel: ${e.localizedMessage ?: "Unknown error"}",
                    data = mapOf("packageName" to targetPkg)
                )
            }
        } else {
            NativeBridgeResponse(
                requestId = "",
                action = "LAUNCH_APP",
                success = false,
                errorCode = AndroidErrorCodes.APP_NOT_INSTALLED,
                message = "Application '$clean' is not installed on this Android device.",
                data = mapOf("packageName" to targetPkg, "query" to clean)
            )
        }
    }

    /**
     * Launches an installed application by package name.
     */
    fun openApp(packageName: String): NativeBridgeResponse {
        return launchApp(packageName)
    }

    /**
     * Opens a web URL in the device's default or chosen browser.
     */
    fun openBrowser(rawUrl: String): NativeBridgeResponse {
        var cleanUrl = rawUrl.trim()
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
            cleanUrl = "https://$cleanUrl"
        }

        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(cleanUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            NativeBridgeResponse(
                requestId = "",
                action = "OPEN_URL",
                success = true,
                message = "Opened URL in device browser: $cleanUrl",
                data = mapOf("url" to cleanUrl)
            )
        } catch (e: Exception) {
            NativeBridgeResponse(
                requestId = "",
                action = "OPEN_URL",
                success = false,
                errorCode = AndroidErrorCodes.ACTION_FAILED,
                message = "Failed to open URL: ${e.localizedMessage ?: "Unknown error"}",
                data = mapOf("url" to cleanUrl)
            )
        }
    }

    /**
     * Opens YouTube home, a specific video ID, or initiates search.
     * Note: Android/YouTube controls auto-playback; we never falsely claim autoplay guarantee.
     */
    fun openYouTube(videoId: String? = null, query: String? = null): NativeBridgeResponse {
        val hasYouTubeApp = isPackageInstalled(PACKAGE_YOUTUBE)

        return try {
            val intent: Intent = when {
                !videoId.isNullOrBlank() -> {
                    if (hasYouTubeApp) {
                        Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:$videoId")).apply {
                            setPackage(PACKAGE_YOUTUBE)
                        }
                    } else {
                        Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/watch?v=$videoId"))
                    }
                }
                !query.isNullOrBlank() -> {
                    if (hasYouTubeApp) {
                        Intent(Intent.ACTION_SEARCH).apply {
                            setPackage(PACKAGE_YOUTUBE)
                            putExtra("query", query)
                        }
                    } else {
                        val encoded = URLEncoder.encode(query, "UTF-8")
                        Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=$encoded"))
                    }
                }
                else -> {
                    if (hasYouTubeApp) {
                        context.packageManager.getLaunchIntentForPackage(PACKAGE_YOUTUBE)
                            ?: Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com"))
                    } else {
                        Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com"))
                    }
                }
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)

            val targetNotice = if (hasYouTubeApp) {
                "Opened YouTube native app"
            } else {
                "YouTube app not installed; opened YouTube in device browser"
            }

            NativeBridgeResponse(
                requestId = "",
                action = "OPEN_YOUTUBE",
                success = true,
                message = "$targetNotice (Note: playback controls and auto-play depend on YouTube and user preferences).",
                data = mapOf(
                    "hasNativeApp" to hasYouTubeApp,
                    "query" to (query ?: ""),
                    "videoId" to (videoId ?: "")
                )
            )
        } catch (e: Exception) {
            NativeBridgeResponse(
                requestId = "",
                action = "OPEN_YOUTUBE",
                success = false,
                errorCode = AndroidErrorCodes.ACTION_FAILED,
                message = "Failed to launch YouTube: ${e.localizedMessage ?: "Unknown error"}"
            )
        }
    }

    /**
     * Safe WhatsApp Integration:
     * Opens WhatsApp, conversation with contact, or deep link with draft.
     * Never silently transmits messages without user authorization.
     */
    fun openWhatsApp(phone: String? = null, text: String? = null): NativeBridgeResponse {
        val isInstalled = isPackageInstalled(PACKAGE_WHATSAPP) || isPackageInstalled(PACKAGE_WHATSAPP_BUSINESS)

        if (!isInstalled) {
            // Can fallback to WhatsApp Web / wa.me link in external browser
            if (!phone.isNullOrBlank()) {
                val cleanPhone = phone.replace(Regex("[^0-9]"), "")
                val encodedText = if (!text.isNullOrBlank()) URLEncoder.encode(text, "UTF-8") else ""
                val webUrl = "https://wa.me/$cleanPhone?text=$encodedText"
                return openBrowser(webUrl)
            }
            return NativeBridgeResponse(
                requestId = "",
                action = "OPEN_WHATSAPP",
                success = false,
                errorCode = AndroidErrorCodes.APP_NOT_INSTALLED,
                message = "WhatsApp is not installed on this Android device."
            )
        }

        return try {
            val intent = if (!phone.isNullOrBlank()) {
                val cleanPhone = phone.replace(Regex("[^0-9]"), "")
                val encodedText = if (!text.isNullOrBlank()) URLEncoder.encode(text, "UTF-8") else ""
                val uri = Uri.parse("https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedText")
                Intent(Intent.ACTION_VIEW, uri).apply {
                    setPackage(if (isPackageInstalled(PACKAGE_WHATSAPP)) PACKAGE_WHATSAPP else PACKAGE_WHATSAPP_BUSINESS)
                }
            } else {
                context.packageManager.getLaunchIntentForPackage(
                    if (isPackageInstalled(PACKAGE_WHATSAPP)) PACKAGE_WHATSAPP else PACKAGE_WHATSAPP_BUSINESS
                ) ?: Intent(Intent.ACTION_VIEW, Uri.parse("whatsapp://"))
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)

            NativeBridgeResponse(
                requestId = "",
                action = "OPEN_WHATSAPP",
                success = true,
                message = "Launched WhatsApp conversation${if (!phone.isNullOrBlank()) " for $phone" else ""}. Awaiting user confirmation to send.",
                data = mapOf("phone" to (phone ?: ""), "hasDraft" to (!text.isNullOrBlank()))
            )
        } catch (e: Exception) {
            NativeBridgeResponse(
                requestId = "",
                action = "OPEN_WHATSAPP",
                success = false,
                errorCode = AndroidErrorCodes.ACTION_FAILED,
                message = "Could not open WhatsApp: ${e.localizedMessage ?: "Unknown error"}"
            )
        }
    }

    /**
     * Opens Android System Settings (e.g. Accessibility, Battery Optimization, Notifications, or App details).
     */
    fun openSettings(target: String): NativeBridgeResponse {
        return try {
            val intent = when (target.lowercase()) {
                "accessibility" -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                "battery", "battery_optimization", "ignore_battery_optimizations" -> {
                    Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                }
                "request_ignore_battery" -> {
                    Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.fromParts("package", context.packageName, null)
                    }
                }
                "notifications", "notification" -> {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                            putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                        }
                    } else {
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.fromParts("package", context.packageName, null)
                        }
                    }
                }
                "app_details" -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                }
                else -> Intent(Settings.ACTION_SETTINGS)
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            NativeBridgeResponse(
                requestId = "",
                action = "OPEN_SETTINGS",
                success = true,
                message = "Opened Android $target settings screen."
            )
        } catch (e: Exception) {
            // Fallback to application details settings if specific intent fails
            try {
                val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallback)
                NativeBridgeResponse(
                    requestId = "",
                    action = "OPEN_SETTINGS",
                    success = true,
                    message = "Opened Android App Details settings screen."
                )
            } catch (ex: Exception) {
                NativeBridgeResponse(
                    requestId = "",
                    action = "OPEN_SETTINGS",
                    success = false,
                    errorCode = AndroidErrorCodes.ACTION_FAILED,
                    message = "Could not open settings: ${e.localizedMessage ?: "Unknown error"}"
                )
            }
        }
    }
}
