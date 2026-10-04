package ai.friday.assistant

import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

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

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    // Automatically grant audio recording permission to FRIDAY web client
                    val resources = request?.resources ?: return
                    for (resource in resources) {
                        if (resource == PermissionRequest.RESOURCE_AUDIO_CAPTURE) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                            return
                        }
                    }
                    request.grant(resources)
                }
            }

            webViewClient = object : WebViewClient() {
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

        // Request initial microphone permission if needed
        permissionHelper.requestRecordAudioPermission {}

        // Load FRIDAY Web App:
        // Supports intent override, bundled offline web assets (file:///android_asset/dist/index.html), or hosted server:
        val customUrl = intent.getStringExtra("app_url")
        val hasBundledAssets = try {
            assets.list("dist")?.contains("index.html") == true
        } catch (e: Exception) {
            false
        }
        val appUrl = when {
            !customUrl.isNullOrBlank() -> customUrl
            hasBundledAssets -> "file:///android_asset/dist/index.html"
            else -> "https://ais-dev-y34kxoace7g7txsixtaqn5-87869525848.asia-southeast1.run.app"
        }
        webView.loadUrl(appUrl)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PermissionHelper.RC_AUDIO_RECORD) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
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
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
