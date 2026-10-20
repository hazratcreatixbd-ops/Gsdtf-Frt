# FRIDAY AI Assistant — Standalone Backend Deployment Guide

## 1. Why Does the Android APK Show "OFFLINE / UNREACHABLE"?

When you use FRIDAY inside the AI Studio web workspace, your browser connects to the local development container:
`https://ais-dev-y34kxoace7g7txsixtaqn5-87869525848.asia-southeast1.run.app`

However, **this development container is not an independently deployed production server**:
1. **Sleep / Idle State**: AI Studio preview containers automatically suspend when the development session is closed or idle.
2. **Google Authentication Proxy**: External mobile network traffic from your phone does not have the Google AI Studio session cookies, resulting in authentication redirects (HTTP 302/403) instead of direct WebSocket upgrades.
3. **Local Origin in APK**: The installed Android APK loads bundled assets from `https://appassets.androidplatform.net/assets/dist/index.html`. It needs a permanent, publicly reachable HTTPS backend URL to connect to the Gemini Live WebSocket (`/api/live`).

---

## 2. Option A: Deploy to Google Cloud Run (Recommended)

Google Cloud Run provides 24/7 HTTPS, WebSocket support, low latency, and a generous free tier.

### Prerequisites
- Google Cloud SDK (`gcloud`) installed.
- A Google Cloud Project with Cloud Run API enabled.
- Your Gemini API key.

### One-Command Deployment
Run this in the project root:

```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Deploy FRIDAY Full-Stack Container
gcloud run deploy friday-server \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="YOUR_GEMINI_API_KEY" \
  --session-affinity \
  --timeout 3600
```

### Why these flags?
- `--allow-unauthenticated`: Allows your Android APK to reach `/api/health` and `/api/live` without browser cookies.
- `--session-affinity`: Ensures continuous WebSocket streaming for Gemini Live audio.
- `--timeout 3600`: Prevents connection dropping during long voice conversations.

Once deployment completes, Cloud Run will print your permanent URL:
`https://friday-server-xxxxxx-as.a.run.app`

Paste this URL into **FRIDAY Architecture → Server Endpoint** inside your Android app and tap **Save & Verify**.

---

## 3. Option B: Deploy to Render / Railway / Fly.io (Zero-CLI)

If you prefer a 1-click web interface:

### Render
1. Push your code to GitHub.
2. In Render Dashboard, click **New + Web Service** → Connect your repository.
3. Select **Docker** environment (Render will automatically detect the included `Dockerfile`).
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Gemini API key.
5. Deploy. Render will generate a URL like:
   `https://friday-server.onrender.com`
6. Enter this URL in FRIDAY settings.

### Railway
1. Click **New Project** → **Deploy from GitHub repo**.
2. Under Variables, add `GEMINI_API_KEY`.
3. Under Networking, click **Generate Domain**.
4. Enter the domain in FRIDAY settings.

---

## 4. Option C: Local LAN Testing (Zero Cost)

If your phone and computer are on the same Wi-Fi network:

1. On your computer, find your local IP address:
   - macOS / Linux: `ifconfig` or `ip a` (e.g. `192.168.1.150`)
   - Windows: `ipconfig`
2. Start the FRIDAY server:
   ```bash
   npm start
   ```
3. Open FRIDAY on your Android phone.
4. Go to **FRIDAY Architecture** (gear icon in the top header).
5. Enter:
   `http://192.168.1.150:3000`
6. Tap **Save & Verify**.
7. Your phone will immediately connect directly to your computer's Gemini Live server.

---

## 5. Security & Verification Rules

- **Zero Client Secrets**: Your `GEMINI_API_KEY` stays strictly on your backend server. It is NEVER embedded in the Android APK, Java/Kotlin files, or client-side JavaScript.
- **Truthful Status**: Never consider a server "CONNECTED" until the live HTTP `/api/health` check returns `status: "ok"` and the WebSocket handshake to `/api/live` emits `session_ready`.
