# FRIDAY AI Assistant — Permanent Backend Deployment Guide
## Complete Instructions for Running FRIDAY 24/7 on Google Cloud Run & Alternative Hosts

---

### 1. Root Cause: Why Does the Android APK Show "OFFLINE / UNREACHABLE"?

When running FRIDAY inside the AI Studio web workspace, your browser connects to the temporary development container:
`https://ais-dev-y34kxoace7g7txsixtaqn5-87869525848.asia-southeast1.run.app`

This preview endpoint **cannot** be used as a permanent production backend for an installed Android APK:

1. **Ephemeral Sleep State**: AI Studio preview containers automatically suspend (sleep) within minutes whenever the AI Studio tab is closed or idle.
2. **Google Identity Auth Wall**: External mobile requests from outside the developer's logged-in desktop browser are intercepted by Google's OAuth gateway. Instead of upgrading the WebSocket connection (`/api/live`), Google returns an HTTP `302 Found` redirect or `403 Forbidden` login page.
3. **Local Origin in Android APK**: The installed APK serves bundled assets locally from `https://appassets.androidplatform.net`. It requires a standalone, publicly reachable HTTPS server that allows unauthenticated traffic to `/api/health` and `/api/live`.

---

### 2. Verified Backend Architecture & Deployment Specifications

The existing FRIDAY backend is fully prepared for containerized production deployment:

| Component | Current Configuration | Production Requirement |
| :--- | :--- | :--- |
| **Runtime** | Node.js 22 LTS + TypeScript (`tsx`) | Alpine Node 22 (`Dockerfile` included) |
| **Port Binding** | `Number(process.env.PORT) \|\| Number(process.env.DEFAULT_APP_PORT) \|\| 3000` | Respects Cloud Run's `$PORT` (8080) or Render's `$PORT` (10000) |
| **Startup Command** | `npm start` (`tsx server.ts`) | Defined in `package.json` & `Dockerfile` |
| **Health Check** | `GET /api/health` | Returns HTTP 200 with JSON: `{ status: "ok", assistant: "FRIDAY", model: "gemini-3.8-live", hasKey: true }` |
| **WebSocket** | `ws://.../api/live` & `wss://.../api/live` | Handled via `ws` library with 15s keep-alive pings and session affinity |
| **CORS Policy** | Permissive (`Access-Control-Allow-Origin: *`, `OPTIONS 204`) | Allows mobile WebView fetch requests from `appassets.androidplatform.net` |
| **API Secret Safety** | `GEMINI_API_KEY` stored exclusively in server environment | Zero client-side leakage; never embedded in APK or sent to browser |

---

### 3. Step-by-Step Deployment From an Android Phone (Option A: Google Cloud Run)

*Google Cloud Run provides 24/7 HTTPS, automatic scaling to zero when idle (extremely low cost / generous free tier), native WebSocket streaming, and low latency.*

You do **not** need a laptop or computer. You can deploy directly from your Android phone's web browser using Google Cloud Shell!

#### Step 1: Open Google Cloud Shell on Your Phone
1. Open Google Chrome on your Android phone.
2. Navigate to: **[shell.cloud.google.com](https://shell.cloud.google.com)**
3. Sign in with your Google account. A free, full Linux terminal will open in your mobile browser.

#### Step 2: Ensure Required APIs Are Enabled
In the mobile Cloud Shell terminal, type or paste:
```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

#### Step 3: Clone or Upload the FRIDAY Repository
If your FRIDAY project is in a GitHub repository:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_FRIDAY_REPO.git
cd YOUR_FRIDAY_REPO
```
*(Or use the Cloud Shell three-dot menu `⋮` → "Upload folder" to upload your project directory).*

#### Step 4: Deploy the Container with 1 Command
Run this command in Cloud Shell:
```bash
gcloud run deploy friday-server \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY" \
  --session-affinity \
  --timeout 3600 \
  --memory 1Gi \
  --cpu 1
```

> ⚠️ **Important Security Rule**:
> Replace `YOUR_ACTUAL_GEMINI_API_KEY` with your actual key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
> **Never paste your secret key into a public chat or commit it to GitHub.**

#### Flags Explained:
- `--allow-unauthenticated`: Enables your mobile APK to connect without browser cookies.
- `--session-affinity`: Routes all WebSocket frames for a live voice call to the same container instance.
- `--timeout 3600`: Keeps real-time Gemini Live voice calls active for up to 1 hour without premature timeouts.
- `--region asia-southeast1`: Matches low-latency routing (or choose `us-central1`, `europe-west1`, etc.).

#### Step 5: Copy Your Permanent Production URL
Once the command finishes (usually ~2 minutes), Cloud Run outputs:
```text
Service [friday-server] revision [friday-server-00001-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://friday-server-xxxxxx-as.a.run.app
```
**Copy this `https://friday-server-...` URL.**

---

### 4. Zero-CLI Alternative: Deploying via Render.com (Option B)

*If you prefer a 100% visual interface without typing shell commands:*

1. Push your FRIDAY project code to your personal GitHub account.
2. On your Android phone, open Chrome and navigate to **[dashboard.render.com](https://dashboard.render.com)**.
3. Sign in and tap **New +** → **Web Service**.
4. Select **Build and deploy from a Git repository** and connect your FRIDAY repository.
5. In the configuration:
   - **Environment**: Select **Docker** (Render will automatically detect the included `Dockerfile`).
   - **Region**: Choose Singapore or closest to your location.
   - **Plan**: Free or Starter.
6. Scroll down to **Environment Variables** and tap **Add Environment Variable**:
   - Key: `GEMINI_API_KEY`
   - Value: `(Your Gemini API key)`
7. Tap **Deploy Web Service**.
8. After 2–3 minutes, Render displays your permanent service URL:
   `https://friday-server.onrender.com`

---

### 5. Local Wi-Fi Testing (Option C: Zero Cost)

If your computer and your Android phone are connected to the same home Wi-Fi:

1. On your computer terminal:
   ```bash
   npm start
   ```
2. Find your computer's local IP address:
   - On Windows: run `ipconfig` (look for IPv4 Address, e.g. `192.168.1.105`).
   - On Mac/Linux: run `ifconfig` or `ip a` (e.g. `192.168.1.105`).
3. Your local server URL is:
   `http://192.168.1.105:3000`

---

### 6. Configuring and Verifying Your Android App

Once you have your production URL (from Cloud Run, Render, or LAN):

1. **Open FRIDAY on Your Android Phone**.
2. Tap the **Settings** gear icon in the top header (labeled **FRIDAY ARCHITECTURE**).
3. Under **FRIDAY SERVER ENDPOINT**:
   - Clear any previous text.
   - Paste your real production URL:
     ```text
     https://friday-server-xxxxxx-as.a.run.app
     ```
4. Tap **Save & Verify**.
5. Tap **Test WS**.
6. Observe the live diagnostic badge:
   - **ONLINE (xx ms)** in green indicates both HTTP `/api/health` and WebSocket `/api/live` are operational!
   - You can also open the URL in your phone's browser at `https://your-service-url/api/health` to confirm the JSON output:
     ```json
     {
       "status": "ok",
       "assistant": "FRIDAY",
       "model": "gemini-3.8-live",
       "hasKey": true,
       "deploymentTarget": "Google Cloud Run"
     }
     ```
7. Tap the center FRIDAY Core or microphone button to start real-time voice communication. FRIDAY will immediately enter `LISTENING` state!
