/**
 * LiveSession
 * Coordinates WebSocket connection with Gemini Live API backend,
 * connects AudioStreamer (16kHz microphone stream) and AudioPlayer (24kHz response playback),
 * and handles instantaneous multi-turn voice interaction and natural interruptions.
 */

import { AudioStreamer } from './AudioStreamer';
import { AudioPlayer } from './AudioPlayer';
import { toolManager } from './ToolManager';
import { androidBridge } from './AndroidBridge/AndroidBridge';
import { workerTaskQueue } from '../world/manager/WorkerTaskQueue';
import { backgroundExecutionQueue } from './AndroidBridge/BackgroundExecutionQueue';
import { FridayState, TranscriptionItem, MemoryItem, TaskItem } from '../types/friday';

export interface LiveSessionCallbacks {
  onStateChange: (state: FridayState) => void;
  onTranscription?: (item: TranscriptionItem) => void;
  onUserVolumeChange?: (volume: number) => void;
  onFridayVolumeChange?: (volume: number) => void;
  onStorageSync?: (data: { memories: MemoryItem[]; tasks: TaskItem[] }) => void;
  onError?: (errorMessage: string) => void;
}

export interface VoiceDiagnosticTrace {
  micButtonTappedAt?: number;
  permissionState: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  mediaStreamActive: boolean;
  audioContextState: string;
  liveSessionState: FridayState;
  serverBaseUrl: string;
  wsUrl: string;
  wsReadyState: string;
  geminiLiveReady: boolean;
  pcmFramesSent: number;
  responseAudioChunksReceived: number;
  responsePlaybackActive: boolean;
  failedStage: string | null;
  failureReason: string | null;
}

export interface EndpointHealthReport {
  reachable: boolean;
  wsHandshakeOk: boolean;
  hasGeminiKey: boolean;
  isPreviewEndpoint: boolean;
  httpBaseUrl: string;
  wsUrl: string;
  latencyMs: number;
  model?: string;
  errorReason?: string;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private streamer: AudioStreamer | null = null;
  private player: AudioPlayer | null = null;
  private state: FridayState = 'disconnected';
  private callbacks: LiveSessionCallbacks;
  private isIntentionalClose = false;
  private pingInterval: number | null = null;
  private connectTimeout: number | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 4;
  private isSessionReady = false;
  private hadSuccessfulConnection = false;
  private pcmFramesSent = 0;
  private responseAudioChunksReceived = 0;
  private failedStage: string | null = null;
  private failureReason: string | null = null;
  private permissionStatus: 'idle' | 'requesting' | 'granted' | 'denied' | 'error' = 'idle';

  private static readonly DEFAULT_CLOUD_SERVER_URL =
    'https://ais-dev-y34kxoace7g7txsixtaqn5-87869525848.asia-southeast1.run.app';

  public static normalizeServerUrl(raw: string): string {
    let cleaned = raw.trim();
    if (!cleaned) return '';
    cleaned = cleaned
      .replace(/^wss:\/\//i, 'https://')
      .replace(/^ws:\/\//i, 'http://')
      .replace(/\/api\/live\/?$/i, '')
      .replace(/\/api\/health\/?$/i, '')
      .replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(cleaned)) {
      const isLocalIp = /^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(cleaned);
      cleaned = `${isLocalIp ? 'http' : 'https'}://${cleaned}`;
    }
    return cleaned;
  }

  public static getServerBaseUrl(): string {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem('friday_server_url')?.trim();
      if (saved) {
        return LiveSession.normalizeServerUrl(saved);
      }
    } catch {}
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      return '';
    }
    const envUrl = (import.meta as any).env?.VITE_FRIDAY_SERVER_URL?.trim();
    if (envUrl) {
      return LiveSession.normalizeServerUrl(envUrl);
    }
    if (LiveSession.isBundledLocalOrigin()) {
      return LiveSession.DEFAULT_CLOUD_SERVER_URL;
    }
    return '';
  }

  public static getResolvedHttpBaseUrl(overrideUrl?: string): string {
    if (overrideUrl !== undefined && overrideUrl.trim()) {
      return LiveSession.normalizeServerUrl(overrideUrl);
    }
    const base = LiveSession.getServerBaseUrl();
    if (base) return base;
    if (typeof window !== 'undefined' && !LiveSession.isBundledLocalOrigin()) {
      return window.location.origin.replace(/\/+$/, '');
    }
    return LiveSession.DEFAULT_CLOUD_SERVER_URL;
  }

  public static getResolvedWsUrl(overrideUrl?: string): string {
    const httpBase = LiveSession.getResolvedHttpBaseUrl(overrideUrl);
    const wsBase = httpBase
      .replace(/^https:/i, 'wss:')
      .replace(/^http:/i, 'ws:');
    return `${wsBase}/api/live`;
  }

  public static isPreviewEndpointUrl(url: string): boolean {
    return /ais-dev-|ais-pre-/i.test(url);
  }

  public static async checkServerHealth(overrideUrl?: string, verifyWs = false): Promise<EndpointHealthReport> {
    const httpBaseUrl = LiveSession.getResolvedHttpBaseUrl(overrideUrl);
    const wsUrl = LiveSession.getResolvedWsUrl(overrideUrl);
    const isPreviewEndpoint = LiveSession.isPreviewEndpointUrl(httpBaseUrl);
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${httpBaseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      window.clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        return {
          reachable: false,
          wsHandshakeOk: false,
          hasGeminiKey: false,
          isPreviewEndpoint,
          httpBaseUrl,
          wsUrl,
          latencyMs,
          errorReason: `HTTP ${res.status} from ${httpBaseUrl}/api/health.${
            isPreviewEndpoint
              ? ' AI Studio preview container may be asleep or stopped.'
              : ''
          }`,
        };
      }

      if (!contentType.includes('application/json')) {
        return {
          reachable: false,
          wsHandshakeOk: false,
          hasGeminiKey: false,
          isPreviewEndpoint,
          httpBaseUrl,
          wsUrl,
          latencyMs,
          errorReason: `Endpoint returned non-JSON response (${contentType || 'HTML auth redirect'}). Ensure backend proxies /api/health and /api/live directly.`,
        };
      }

      const data = await res.json();
      if (data?.status !== 'ok') {
        return {
          reachable: false,
          wsHandshakeOk: false,
          hasGeminiKey: false,
          isPreviewEndpoint,
          httpBaseUrl,
          wsUrl,
          latencyMs,
          errorReason: `Unexpected health response from ${httpBaseUrl}/api/health.`,
        };
      }

      const hasGeminiKey = Boolean(data.hasKey);
      if (!hasGeminiKey) {
        return {
          reachable: true,
          wsHandshakeOk: false,
          hasGeminiKey: false,
          isPreviewEndpoint,
          httpBaseUrl,
          wsUrl,
          latencyMs,
          model: data.model,
          errorReason: 'Backend is reachable, but GEMINI_API_KEY is not configured on the server.',
        };
      }

      if (!verifyWs) {
        return {
          reachable: true,
          wsHandshakeOk: true,
          hasGeminiKey: true,
          isPreviewEndpoint,
          httpBaseUrl,
          wsUrl,
          latencyMs,
          model: data.model,
        };
      }

      // Optional full WebSocket handshake verification
      const wsResult = await new Promise<{ ok: boolean; reason?: string }>((resolve) => {
        let settled = false;
        const finish = (ok: boolean, reason?: string) => {
          if (settled) return;
          settled = true;
          resolve({ ok, reason });
        };
        try {
          const testWs = new WebSocket(wsUrl);
          const timer = window.setTimeout(() => {
            try {
              testWs.close();
            } catch {}
            finish(false, `WebSocket handshake to ${wsUrl} timed out after 6s.`);
          }, 6000);

          testWs.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data);
              if (msg.type === 'session_ready') {
                window.clearTimeout(timer);
                try {
                  testWs.close();
                } catch {}
                finish(true);
              } else if (msg.type === 'error') {
                window.clearTimeout(timer);
                try {
                  testWs.close();
                } catch {}
                finish(false, msg.message || 'Gemini Live handshake failed.');
              }
            } catch {}
          };

          testWs.onerror = () => {
            window.clearTimeout(timer);
            finish(false, `WebSocket connection to ${wsUrl} failed.`);
          };

          testWs.onclose = (ev) => {
            window.clearTimeout(timer);
            if (!settled) {
              finish(false, `WebSocket closed before session_ready (code ${ev.code}).`);
            }
          };
        } catch (err: any) {
          finish(false, err?.message || 'Failed to open WebSocket.');
        }
      });

      return {
        reachable: true,
        wsHandshakeOk: wsResult.ok,
        hasGeminiKey: true,
        isPreviewEndpoint,
        httpBaseUrl,
        wsUrl,
        latencyMs: Date.now() - startTime,
        model: data.model,
        errorReason: wsResult.reason,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err?.name === 'AbortError';
      return {
        reachable: false,
        wsHandshakeOk: false,
        hasGeminiKey: false,
        isPreviewEndpoint,
        httpBaseUrl,
        wsUrl,
        latencyMs,
        errorReason: isTimeout
          ? `Server health check timed out (${httpBaseUrl}/api/health).${
              isPreviewEndpoint
                ? ' The AI Studio preview server may be asleep or offline.'
                : ''
            }`
          : `Cannot reach FRIDAY server (${httpBaseUrl}).${
              isPreviewEndpoint
                ? ' The AI Studio preview server may be stopped, or your device is offline.'
                : ' Verify the server is running and reachable.'
            }`,
      };
    }
  }

  public static isBundledLocalOrigin(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.location.hostname === 'appassets.androidplatform.net' ||
      window.location.protocol === 'file:'
    );
  }

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  public getDiagnostics(): VoiceDiagnosticTrace {
    const wsStateMap: Record<number, string> = {
      0: 'CONNECTING',
      1: 'OPEN',
      2: 'CLOSING',
      3: 'CLOSED',
    };
    return {
      permissionState: this.permissionStatus,
      mediaStreamActive: this.streamer?.isCapturing() ?? false,
      audioContextState: this.streamer?.getAudioContextState() ?? 'uninitialized',
      liveSessionState: this.state,
      serverBaseUrl: LiveSession.getServerBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : ''),
      wsUrl: this.ws?.url ?? '',
      wsReadyState: this.ws ? wsStateMap[this.ws.readyState] || String(this.ws.readyState) : 'NONE',
      geminiLiveReady: this.isSessionReady,
      pcmFramesSent: this.pcmFramesSent,
      responseAudioChunksReceived: this.responseAudioChunksReceived,
      responsePlaybackActive: this.player?.getIsPlaying() ?? false,
      failedStage: this.failedStage,
      failureReason: this.failureReason,
    };
  }

  private logStage(stage: string, detail: string, isError = false) {
    const prefix = `[FRIDAY Voice Diagnostic][${stage}]`;
    if (isError) {
      this.failedStage = stage;
      this.failureReason = detail;
      console.error(`${prefix} FAIL: ${detail}`, this.getDiagnostics());
    } else {
      console.log(`${prefix} OK: ${detail}`);
    }
    if (typeof window !== 'undefined') {
      (window as any).__FRIDAY_VOICE_DIAGNOSTICS__ = this.getDiagnostics();
    }
  }

  public getState(): FridayState {
    return this.state;
  }

  private getActiveTaskCount(): number {
    const activeGraphs = workerTaskQueue.getAllGraphs().filter((g) => g.status === 'RUNNING').length;
    const bgCount = backgroundExecutionQueue.getActiveTaskCount();
    return activeGraphs + bgCount;
  }

  public syncForegroundNotification(customStatus?: string): void {
    if (!androidBridge.isAvailable()) return;
    const voiceActive = this.state !== 'disconnected';
    const taskCount = this.getActiveTaskCount();

    if (!voiceActive && taskCount === 0) {
      androidBridge.stopForegroundService().catch(() => {});
      return;
    }

    const muted = this.isMuted();
    let statusText = customStatus || 'FRIDAY AI Assistant is active.';
    if (!customStatus) {
      switch (this.state) {
        case 'connecting':
          statusText = 'Connecting to FRIDAY Live Voice...';
          break;
        case 'listening':
          statusText = muted
            ? 'Microphone muted • Tap notification to unmute or open FRIDAY'
            : 'Listening in background • Speak naturally to FRIDAY';
          break;
        case 'thinking':
          statusText = 'Processing your request & executing tools...';
          break;
        case 'speaking':
          statusText = 'FRIDAY is speaking • Speak anytime to interrupt';
          break;
        case 'disconnected':
          statusText = `Executing ${taskCount} background task(s)...`;
          break;
      }
    }

    androidBridge
      .startForegroundService({
        statusText,
        voiceActive,
        muted,
        taskCount,
      })
      .catch(() => {});
  }

  private setState(newState: FridayState) {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange(newState);

    if (this.streamer) {
      this.streamer.setAssistantSpeaking(newState === 'speaking');
    }

    this.syncForegroundNotification();
  }

  private clearConnectTimeout() {
    if (this.connectTimeout) {
      window.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  public async connect(): Promise<void> {
    if (this.state !== 'disconnected') {
      return;
    }

    this.isIntentionalClose = false;
    this.isSessionReady = false;
    this.pcmFramesSent = 0;
    this.responseAudioChunksReceived = 0;
    this.failedStage = null;
    this.failureReason = null;
    this.permissionStatus = 'requesting';

    this.logStage('1_MIC_BUTTON', 'User tapped microphone / start control');

    // 1. Validate Server Endpoint FIRST before transitions or hardware initialization
    const customBase = LiveSession.getServerBaseUrl();
    if (!customBase && LiveSession.isBundledLocalOrigin()) {
      this.logStage(
        '5_SERVER_URL_CONFIG',
        'No FRIDAY cloud server URL configured for local Android bundle',
        true
      );
      this.callbacks.onError?.(
        'OFFLINE / SERVER UNAVAILABLE: FRIDAY voice requires a live FRIDAY Cloud Server URL. Configure the Server Endpoint in Settings.'
      );
      this.disconnect();
      return;
    }

    this.logStage(
      '4_LIVESESSION_INIT',
      `Initializing LiveSession (serverBase="${customBase || window.location.origin}")`
    );
    this.setState('connecting');

    try {
      // 2. Initialize AudioPlayer inside the active user tap gesture so mobile AudioContext is unlocked
      this.player = new AudioPlayer({
        onPlaybackStart: () => {
          if (!this.isIntentionalClose) {
            this.logStage('9_RESPONSE_PLAYBACK', '24kHz response audio playback started (SPEAKING)');
            this.setState('speaking');
          }
        },
        onPlaybackEnd: () => {
          if (!this.isIntentionalClose && this.state === 'speaking') {
            this.logStage('9_RESPONSE_PLAYBACK', 'Response audio playback finished -> returning to LISTENING');
            this.setState('listening');
          }
        },
        onVolumeChange: (vol) => {
          if (!this.isIntentionalClose) {
            this.callbacks.onFridayVolumeChange?.(vol);
          }
        },
      });
      await this.player.init();
      this.logStage('3_AUDIOCONTEXT_OUTPUT', '24kHz output AudioPlayer initialized');

      // 3. Initialize AudioStreamer & request microphone permission immediately inside user tap gesture
      this.streamer = new AudioStreamer({
        onAudioData: (base64Pcm) => {
          this.sendAudioData(base64Pcm);
        },
        onVolumeChange: (vol) => {
          if (!this.isIntentionalClose) {
            this.callbacks.onUserVolumeChange?.(vol);
          }
        },
        onUserInterrupt: () => {
          this.handleLocalUserInterrupt();
        },
        onError: (err) => {
          if (!this.isIntentionalClose) {
            this.permissionStatus = /permission|denied/i.test(err.message) ? 'denied' : 'error';
            this.logStage('2_MIC_PERMISSION_STREAM', err.message, true);
            this.callbacks.onError?.(err.message);
          }
        },
      });

      // Start microphone capture immediately inside the mobile user tap activation context,
      // without blocking WebSocket setup while the Android permission dialog is displayed.
      this.streamer
        .start()
        .then((micStarted) => {
          if (this.isIntentionalClose) return;
          if (micStarted) {
            this.permissionStatus = 'granted';
            this.logStage(
              '2_MIC_MEDIASTREAM',
              `Microphone MediaStream active (AudioContext=${this.streamer?.getAudioContextState()})`
            );
          } else {
            this.permissionStatus = 'denied';
            this.logStage(
              '2_MIC_MEDIASTREAM',
              'Microphone MediaStream did not start (permission denied or hardware unavailable)',
              true
            );
          }
        })
        .catch((micErr: any) => {
          if (this.isIntentionalClose) return;
          this.permissionStatus = 'error';
          this.logStage('2_MIC_MEDIASTREAM', micErr?.message || 'Microphone capture error', true);
        });

      if (this.isIntentionalClose) {
        return;
      }

      // 4. Connect WebSocket to server
      let wsUrl = '';
      if (customBase) {
        const wsBase = customBase
          .replace(/^https:/i, 'wss:')
          .replace(/^http:/i, 'ws:');
        wsUrl = `${wsBase}/api/live`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/api/live`;
      }

      this.logStage('6_WEBSOCKET_CONNECT', `Connecting WebSocket to ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      // Guard against infinite 'connecting' state if server or network hangs
      this.clearConnectTimeout();
      this.connectTimeout = window.setTimeout(() => {
        if (this.ws === socket && this.state === 'connecting' && !this.isIntentionalClose) {
          this.logStage(
            '6_WEBSOCKET_TIMEOUT',
            `Timed out waiting for session_ready from ${wsUrl}`,
            true
          );
          this.callbacks.onError?.(
            `OFFLINE / SERVER UNAVAILABLE: Connection to FRIDAY voice server (${wsUrl}) timed out. Tap to retry.`
          );
          this.disconnect();
        }
      }, 12000);

      socket.onopen = async () => {
        if (this.ws !== socket || this.isIntentionalClose) return;
        this.logStage('6_WEBSOCKET_OPEN', `WebSocket connected to ${wsUrl}; awaiting Gemini Live handshake`);
        // Start keep-alive ping & background AudioContext health check
        if (this.pingInterval) {
          window.clearInterval(this.pingInterval);
        }
        this.pingInterval = window.setInterval(() => {
          if (this.ws === socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
          // Ensure AudioPlayer and AudioStreamer contexts remain active in background
          this.player?.resumeIfNeeded().catch(() => {});
          if (this.streamer && !this.isMuted()) {
            this.streamer.resumeIfNeeded().catch(() => {});
          }
        }, 10000);

        // Ensure microphone streamer is capturing if it wasn't started yet
        if (this.streamer && !this.streamer.isCapturing()) {
          try {
            const retryOk = await this.streamer.start();
            if (retryOk) {
              this.permissionStatus = 'granted';
              this.logStage('2_MIC_MEDIASTREAM', 'Microphone MediaStream started on WebSocket open');
            }
          } catch (micErr: any) {
            console.warn('[LiveSession] Microphone capture retry notice:', micErr?.message);
          }
        }
      };

      socket.onmessage = async (event) => {
        if (this.ws !== socket || this.isIntentionalClose) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'session_ready') {
            this.clearConnectTimeout();
            this.clearReconnectTimeout();
            this.isSessionReady = true;
            this.hadSuccessfulConnection = true;
            this.reconnectAttempts = 0;
            this.callbacks.onError?.('');
            this.logStage('7_GEMINI_LIVE_READY', `${msg.message} -> Entering LISTENING state`);
            this.setState('listening');
            if (msg.memories && msg.tasks) {
              this.callbacks.onStorageSync?.({
                memories: msg.memories,
                tasks: msg.tasks,
              });
            }
          } else if (msg.type === 'storage_sync') {
            if (msg.memories && msg.tasks) {
              this.callbacks.onStorageSync?.({
                memories: msg.memories,
                tasks: msg.tasks,
              });
            }
          } else if (msg.type === 'audio' && msg.audio) {
            // Received 24kHz PCM audio chunk from FRIDAY
            this.responseAudioChunksReceived++;
            if (this.responseAudioChunksReceived === 1) {
              this.logStage('8_SERVER_RESPONSE_AUDIO', 'First 24kHz PCM audio chunk received from Gemini Live');
            }
            if (this.state === 'listening' || this.state === 'thinking') {
              this.setState('speaking');
            }
            await this.player?.playChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            // Model interrupted by user speech
            this.logStage('9_INTERRUPTION', 'Model interrupted by user voice -> LISTENING');
            this.player?.stopAll();
            this.setState('listening');
          } else if (msg.type === 'turn_complete') {
            if (this.state === 'thinking' && !this.player?.getIsPlaying()) {
              this.setState('listening');
            }
          } else if (msg.type === 'transcription') {
            this.callbacks.onTranscription?.({
              id: Math.random().toString(36).substring(2, 9),
              role: msg.role,
              text: msg.text,
              timestamp: Date.now(),
            });
          } else if (msg.type === 'tool_execution') {
            this.setState('thinking');
            toolManager
              .executeTool(msg.tool, msg.args, msg.id)
              .catch((e) => {
                console.error('Tool execution error:', e);
              })
              .finally(() => {
                if (
                  !this.isIntentionalClose &&
                  this.ws === socket &&
                  this.state === 'thinking' &&
                  !this.player?.getIsPlaying()
                ) {
                  this.setState('listening');
                }
              });
          } else if (msg.type === 'error') {
            this.clearConnectTimeout();
            this.logStage('7_GEMINI_LIVE_ERROR', msg.message || 'Server error', true);
            this.callbacks.onError?.(msg.message);
            if (!this.isSessionReady) {
              this.disconnect();
            }
          } else if (msg.type === 'session_closed') {
            if (!this.isIntentionalClose) {
              this.logStage('7_GEMINI_LIVE_CLOSED', 'Gemini Live session closed by server');
              if (this.hadSuccessfulConnection && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                this.scheduleSocketReconnect(wsUrl);
              } else {
                this.disconnect();
              }
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      socket.onerror = () => {
        if (this.ws !== socket || this.isIntentionalClose) return;
        this.clearConnectTimeout();
        this.logStage('6_WEBSOCKET_ERROR', `WebSocket connection failed to ${wsUrl}`, true);
        if (!this.hadSuccessfulConnection) {
          this.callbacks.onError?.(
            `OFFLINE / SERVER UNAVAILABLE: Network connection to FRIDAY server (${wsUrl}) failed.`
          );
        }
      };

      socket.onclose = (ev) => {
        if (this.ws !== socket) return;
        this.clearConnectTimeout();
        if (!this.isIntentionalClose && this.state !== 'disconnected') {
          this.logStage(
            '6_WEBSOCKET_CLOSED',
            `WebSocket closed unexpectedly (code=${ev.code}, ready=${this.isSessionReady})`,
            !this.isSessionReady
          );
          if (this.hadSuccessfulConnection && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.scheduleSocketReconnect(wsUrl);
            return;
          }
          if (!this.isSessionReady) {
            // Run an immediate health diagnostic to provide the exact root cause rather than a generic message
            LiveSession.checkServerHealth().then((health) => {
              if (!health.reachable) {
                this.callbacks.onError?.(
                  `OFFLINE / SERVER UNAVAILABLE: ${health.errorReason || `Could not reach ${health.httpBaseUrl}`}`
                );
              } else if (!health.hasGeminiKey) {
                this.callbacks.onError?.(
                  `OFFLINE / SERVER UNAVAILABLE: Backend (${health.httpBaseUrl}) is reachable, but GEMINI_API_KEY is not configured.`
                );
              } else {
                this.callbacks.onError?.(
                  `OFFLINE / SERVER UNAVAILABLE: Could not establish Gemini Live session (${wsUrl}, close code ${ev.code}).`
                );
              }
            });
          }
          this.disconnect();
        }
      };
    } catch (err: any) {
      this.clearConnectTimeout();
      this.logStage('4_LIVESESSION_EXCEPTION', err?.message || 'Unknown connect error', true);
      this.callbacks.onError?.(err?.message || 'Could not start FRIDAY voice session.');
      this.disconnect();
    }
  }

  /**
   * Re-establishes the WebSocket connection if dropped during app switching or transient network handoff,
   * while preserving the existing AudioStreamer & AudioPlayer instances (zero duplicate sessions).
   */
  private scheduleSocketReconnect(wsUrl: string): void {
    if (this.isIntentionalClose || this.reconnectTimeout) return;
    this.reconnectAttempts++;
    this.isSessionReady = false;
    this.setState('connecting');
    this.syncForegroundNotification(`Reconnecting voice session (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);

    const delayMs = Math.min(1500 * this.reconnectAttempts, 5000);
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.isIntentionalClose) return;
      this.reconnectWebSocketOnly(wsUrl);
    }, delayMs);
  }

  private reconnectWebSocketOnly(wsUrl: string): void {
    if (this.isIntentionalClose) return;
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.logStage('6_WEBSOCKET_RECONNECT', `Reconnecting WebSocket to ${wsUrl} (attempt ${this.reconnectAttempts})`);
    const socket = new WebSocket(wsUrl);
    this.ws = socket;

    this.clearConnectTimeout();
    this.connectTimeout = window.setTimeout(() => {
      if (this.ws === socket && !this.isSessionReady && !this.isIntentionalClose) {
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.scheduleSocketReconnect(wsUrl);
        } else {
          this.callbacks.onError?.(
            `OFFLINE / SERVER UNAVAILABLE: Lost connection to FRIDAY voice server (${wsUrl}). Tap to retry.`
          );
          this.disconnect();
        }
      }
    }, 10000);

    socket.onopen = async () => {
      if (this.ws !== socket || this.isIntentionalClose) return;
      if (this.pingInterval) {
        window.clearInterval(this.pingInterval);
      }
      this.pingInterval = window.setInterval(() => {
        if (this.ws === socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
        this.player?.resumeIfNeeded().catch(() => {});
        if (this.streamer && !this.isMuted()) {
          this.streamer.resumeIfNeeded().catch(() => {});
        }
      }, 10000);

      await this.player?.resumeIfNeeded();
      if (this.streamer && !this.isMuted()) {
        await this.streamer.resumeIfNeeded();
      }
    };

    socket.onmessage = async (event) => {
      if (this.ws !== socket || this.isIntentionalClose) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'session_ready') {
          this.clearConnectTimeout();
          this.isSessionReady = true;
          this.reconnectAttempts = 0;
          this.callbacks.onError?.('');
          this.logStage('7_GEMINI_LIVE_READY', 'Reconnected Gemini Live session -> LISTENING');
          this.setState('listening');
          if (msg.memories && msg.tasks) {
            this.callbacks.onStorageSync?.({
              memories: msg.memories,
              tasks: msg.tasks,
            });
          }
        } else if (msg.type === 'storage_sync') {
          if (msg.memories && msg.tasks) {
            this.callbacks.onStorageSync?.({
              memories: msg.memories,
              tasks: msg.tasks,
            });
          }
        } else if (msg.type === 'audio' && msg.audio) {
          this.responseAudioChunksReceived++;
          if (this.state === 'listening' || this.state === 'thinking') {
            this.setState('speaking');
          }
          await this.player?.playChunk(msg.audio);
        } else if (msg.type === 'interrupted') {
          this.player?.stopAll();
          this.setState('listening');
        } else if (msg.type === 'turn_complete') {
          if (this.state === 'thinking' && !this.player?.getIsPlaying()) {
            this.setState('listening');
          }
        } else if (msg.type === 'transcription') {
          this.callbacks.onTranscription?.({
            id: Math.random().toString(36).substring(2, 9),
            role: msg.role,
            text: msg.text,
            timestamp: Date.now(),
          });
        } else if (msg.type === 'tool_execution') {
          this.setState('thinking');
          toolManager
            .executeTool(msg.tool, msg.args, msg.id)
            .catch((e) => console.error('Tool execution error:', e))
            .finally(() => {
              if (!this.isIntentionalClose && this.ws === socket && this.state === 'thinking' && !this.player?.getIsPlaying()) {
                this.setState('listening');
              }
            });
        } else if (msg.type === 'error') {
          this.clearConnectTimeout();
          this.logStage('7_GEMINI_LIVE_ERROR', msg.message || 'Server error on reconnect', true);
          this.callbacks.onError?.(msg.message);
        } else if (msg.type === 'session_closed') {
          if (!this.isIntentionalClose && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.scheduleSocketReconnect(wsUrl);
          }
        }
      } catch (err) {
        console.error('Error handling message on reconnected socket:', err);
      }
    };

    socket.onerror = () => {
      if (this.ws !== socket || this.isIntentionalClose) return;
      this.clearConnectTimeout();
    };

    socket.onclose = () => {
      if (this.ws !== socket || this.isIntentionalClose) return;
      this.clearConnectTimeout();
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.scheduleSocketReconnect(wsUrl);
      } else {
        this.callbacks.onError?.(
          `OFFLINE / SERVER UNAVAILABLE: Connection to FRIDAY voice server (${wsUrl}) was lost. Tap to retry.`
        );
        this.disconnect();
      }
    };
  }

  /**
   * Instant interruption: Cuts off active audio playback locally and signals the backend
   */
  public handleLocalUserInterrupt(): void {
    if (this.state === 'speaking' || (this.player && this.player.getIsPlaying())) {
      console.log('⚡ Instant Local Interruption triggered!');
      this.player?.stopAll();
      this.setState('listening');

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'interrupt' }));
      }
    }
  }

  private sendAudioData(base64Pcm: string): void {
    if (this.isSessionReady && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.pcmFramesSent++;
      if (this.pcmFramesSent === 1) {
        this.logStage('8_PCM_MIC_TRANSMISSION', 'First 16kHz PCM microphone frame transmitted to server');
      }
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          data: base64Pcm,
        })
      );
    }
  }

  public syncStorage(memories: MemoryItem[], tasks: TaskItem[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'client_storage_sync',
          memories,
          tasks,
        })
      );
    }
  }

  public setMuted(muted: boolean): void {
    this.streamer?.setMuted(muted);
    this.syncForegroundNotification();
  }

  public isMuted(): boolean {
    return this.streamer?.getIsMuted() ?? false;
  }

  public isMicrophoneCapturing(): boolean {
    return this.streamer?.isCapturing() ?? false;
  }

  public async ensureActiveOnLifecycleChange(): Promise<void> {
    if (this.isIntentionalClose || this.state === 'disconnected') return;
    await this.player?.resumeIfNeeded();
    if (this.streamer && !this.isMuted()) {
      await this.streamer.resumeIfNeeded();
    }
    if (this.ws && (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING)) {
      const customBase = LiveSession.getServerBaseUrl();
      const wsUrl = customBase
        ? `${customBase.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:')}/api/live`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/live`;
      this.reconnectAttempts = 0;
      this.scheduleSocketReconnect(wsUrl);
    }
    this.syncForegroundNotification();
  }

  public async retryMicrophone(): Promise<boolean> {
    if (!this.streamer) return false;
    const ok = await this.streamer.start();
    if (ok) {
      this.permissionStatus = 'granted';
      this.failedStage = null;
      this.failureReason = null;
      this.logStage(
        '2_MIC_MEDIASTREAM',
        `Microphone MediaStream recovered (AudioContext=${this.streamer.getAudioContextState()})`
      );
      this.callbacks.onError?.('');
    }
    return ok;
  }

  public sendTextInput(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && text.trim()) {
      this.ws.send(
        JSON.stringify({
          type: 'text',
          text: text.trim(),
        })
      );
    }
  }

  public disconnect(): void {
    this.isIntentionalClose = true;
    this.isSessionReady = false;
    this.hadSuccessfulConnection = false;
    this.clearConnectTimeout();
    this.clearReconnectTimeout();

    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.streamer) {
      this.streamer.stop();
      this.streamer = null;
    }

    if (this.player) {
      this.player.close();
      this.player = null;
    }

    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      try {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      } catch (e) {}
    }

    this.setState('disconnected');
    this.callbacks.onUserVolumeChange?.(0);
    this.callbacks.onFridayVolumeChange?.(0);
  }
}
