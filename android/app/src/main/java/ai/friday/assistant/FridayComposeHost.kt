package ai.friday.assistant

import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Jetpack Compose Host for FRIDAY WebView & Native Bridge
 * Allows seamless embedding inside Compose hierarchies while preserving WebView state.
 */
@Composable
fun FridayWebViewHost(
    webView: WebView,
    modifier: Modifier = Modifier
) {
    AndroidView(
        factory = { webView },
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF030712))
    )
}
