package ai.friday.assistant

import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader

/**
 * PART 6B — FRIDAY Android Native Main Activity
 * Hosts the WebView, injects the native bridge, and configures hardware audio permissions.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bridge: FridayAndroidBridge
    private lateinit var permissionHelper: PermissionHelper

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        permissionHelper = PermissionHelper(this)
        permissionHelper.requestNotificationPermission()

        // Serve bundled local FRIDAY web assets over a secure virtual origin (https://appassets.androidplatform.net)
        // so ES modules, Tailwind CSS, localStorage, and Web Audio API work locally without any external Google redirect.
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                @Suppress("DEPRECATION")
                allowFileAccessFromFileURLs = true
                @Suppress("DEPRECATION")
                allowUniversalAccessFromFileURLs = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    val req = request ?: return
                    runOnUiThread {
                        val resources = req.resources ?: return@runOnUiThread
                        val wantsAudio = resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                        if (wantsAudio) {
                            permissionHelper.requestRecordAudioPermission { granted ->
                                runOnUiThread {
                                    if (granted) {
                                        req.grant(resources)
                                    } else {
                                        req.deny()
                                    }
                                }
                            }
                        } else {
                            req.grant(resources)
                        }
                    }
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    val uri = request?.url ?: return null
                    return assetLoader.shouldInterceptRequest(uri)
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    // Signal to web that native device wrapper is fully attached and ready
                    bridge.sendEventToWeb(
                        "DEVICE_READY",
                        mapOf("adapter" to "native_android_bridge", "isNative" to true)
                    )
                }
            }
        }

        // Initialize and bind native bridge
        bridge = FridayAndroidBridge(this, webView)
        webView.addJavascriptInterface(bridge, "FridayAndroidBridge")

        setContentView(webView)

        // Load FRIDAY Web App locally first from bundled APK assets (never redirect startup to an unauthorized Google page):
        // Uses https://appassets.androidplatform.net/assets/dist/index.html mapped directly to file:///android_asset/dist/index.html
        val customUrl = intent.getStringExtra("app_url")
        val appUrl = if (!customUrl.isNullOrBlank()) {
            customUrl
        } else {
            "https://appassets.androidplatform.net/assets/dist/index.html"
        }
        webView.loadUrl(appUrl)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
        if (::bridge.isInitialized) {
            bridge.sendEventToWeb(
                "APP_LIFECYCLE_CHANGED",
                mapOf(
                    "state" to "FOREGROUND",
                    "foregroundServiceRunning" to FridayForegroundService.isRunning,
                    "voiceActive" to FridayForegroundService.isVoiceActive,
                    "taskCount" to FridayForegroundService.activeTaskCount
                )
            )
        }
    }

    override fun onPause() {
        super.onPause()
        // Keep WebView JS timers and WebSocket/AudioContext alive when background service is active
        if (FridayForegroundService.isRunning || FridayForegroundService.isVoiceActive || FridayForegroundService.activeTaskCount > 0) {
            webView.resumeTimers()
        }
        if (::bridge.isInitialized) {
            bridge.sendEventToWeb(
                "APP_LIFECYCLE_CHANGED",
                mapOf(
                    "state" to "PAUSED",
                    "foregroundServiceRunning" to FridayForegroundService.isRunning,
                    "voiceActive" to FridayForegroundService.isVoiceActive,
                    "taskCount" to FridayForegroundService.activeTaskCount
                )
            )
        }
    }

    override fun onStop() {
        super.onStop()
        // Prevent Chromium WebView from freezing JS timers while FRIDAY foreground service is running
        if (FridayForegroundService.isRunning || FridayForegroundService.isVoiceActive || FridayForegroundService.activeTaskCount > 0) {
            webView.resumeTimers()
        }
        if (::bridge.isInitialized) {
            bridge.sendEventToWeb(
                "APP_LIFECYCLE_CHANGED",
                mapOf(
                    "state" to "BACKGROUND",
                    "foregroundServiceRunning" to FridayForegroundService.isRunning,
                    "voiceActive" to FridayForegroundService.isVoiceActive,
                    "taskCount" to FridayForegroundService.activeTaskCount
                )
            )
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PermissionHelper.RC_AUDIO_RECORD) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            permissionHelper.onRecordAudioPermissionResult(granted)
            bridge.sendEventToWeb(
                "PERMISSION_REQUIRED",
                mapOf("permission" to "android.permission.RECORD_AUDIO", "granted" to granted)
            )
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            // Move task to back rather than destroying MainActivity if a voice session or task is running
            if (FridayForegroundService.isRunning || FridayForegroundService.isVoiceActive || FridayForegroundService.activeTaskCount > 0) {
                moveTaskToBack(true)
            } else {
                super.onBackPressed()
            }
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
