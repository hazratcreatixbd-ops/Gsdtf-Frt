/**
 * LiveSession
 * Coordinates WebSocket connection with Gemini Live API backend,
 * connects AudioStreamer (16kHz microphone stream) and AudioPlayer (24kHz response playback),
 * and handles instantaneous multi-turn voice interaction and natural interruptions.
 */

import { AudioStreamer } from './AudioStreamer';
import { AudioPlayer } from './AudioPlayer';
import { toolManager } from './ToolManager';
import { FridayState, TranscriptionItem, MemoryItem, TaskItem } from '../types/friday';

export interface LiveSessionCallbacks {
  onStateChange: (state: FridayState) => void;
  onTranscription?: (item: TranscriptionItem) => void;
  onUserVolumeChange?: (volume: number) => void;
  onFridayVolumeChange?: (volume: number) => void;
  onStorageSync?: (data: { memories: MemoryItem[]; tasks: TaskItem[] }) => void;
  onError?: (errorMessage: string) => void;
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
  private isSessionReady = false;

  public static getServerBaseUrl(): string {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem('friday_server_url')?.trim();
      if (saved) {
        return saved.replace(/\/+$/, '');
      }
    } catch {}
    const envUrl = (import.meta as any).env?.VITE_FRIDAY_SERVER_URL?.trim();
    if (envUrl) {
      return envUrl.replace(/\/+$/, '');
    }
    return '';
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

  public getState(): FridayState {
    return this.state;
  }

  private setState(newState: FridayState) {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange(newState);

    if (this.streamer) {
      this.streamer.setAssistantSpeaking(newState === 'speaking');
    }
  }

  private clearConnectTimeout() {
    if (this.connectTimeout) {
      window.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
  }

  public async connect(): Promise<void> {
    if (this.state !== 'disconnected') {
      return;
    }

    this.isIntentionalClose = false;
    this.isSessionReady = false;

    // 1. Validate Server Endpoint FIRST before transitions or hardware initialization
    const customBase = LiveSession.getServerBaseUrl();
    if (!customBase && LiveSession.isBundledLocalOrigin()) {
      // Running inside standalone Android APK without a configured remote/local backend server URL:
      // Never attempt a fake wss://appassets.androidplatform.net/api/live socket or claim CONNECTED.
      this.callbacks.onError?.(
        'OFFLINE / SERVER UNAVAILABLE: Running from local Android bundle. Local tools, World, Memory, and Device Control are active. Configure FRIDAY Server URL in Settings for live cloud voice.'
      );
      this.disconnect();
      return;
    }

    this.setState('connecting');

    try {
      // 2. Initialize AudioPlayer inside the active user tap gesture so mobile AudioContext is unlocked
      this.player = new AudioPlayer({
        onPlaybackStart: () => {
          if (!this.isIntentionalClose) {
            this.setState('speaking');
          }
        },
        onPlaybackEnd: () => {
          if (!this.isIntentionalClose && this.state === 'speaking') {
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
            console.warn('[LiveSession] AudioStreamer notice:', err.message);
            this.callbacks.onError?.(err.message);
          }
        },
      });

      // Start microphone capture while still within the mobile user tap activation context
      try {
        await this.streamer.start();
      } catch (micErr: any) {
        console.warn('[LiveSession] Initial microphone capture notice:', micErr?.message);
      }

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

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      // Guard against infinite 'connecting' state if server or network hangs
      this.clearConnectTimeout();
      this.connectTimeout = window.setTimeout(() => {
        if (this.ws === socket && this.state === 'connecting' && !this.isIntentionalClose) {
          this.callbacks.onError?.(
            'OFFLINE / SERVER UNAVAILABLE: Connection to FRIDAY voice server timed out. Tap to retry.'
          );
          this.disconnect();
        }
      }, 12000);

      socket.onopen = async () => {
        if (this.ws !== socket || this.isIntentionalClose) return;
        console.log('WebSocket connected to FRIDAY server.');
        // Start keep-alive ping
        if (this.pingInterval) {
          window.clearInterval(this.pingInterval);
        }
        this.pingInterval = window.setInterval(() => {
          if (this.ws === socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);

        // Ensure microphone streamer is capturing if it wasn't started yet
        if (this.streamer && !this.streamer.isCapturing()) {
          try {
            await this.streamer.start();
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
            console.log('FRIDAY Session Ready:', msg.message);
            this.clearConnectTimeout();
            this.isSessionReady = true;
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
            if (this.state === 'listening' || this.state === 'thinking') {
              this.setState('speaking');
            }
            await this.player?.playChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            // Model interrupted by user speech
            console.log('Interruption event received from Live API.');
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
            console.error('FRIDAY Server error:', msg.message);
            this.clearConnectTimeout();
            this.callbacks.onError?.(msg.message);
            if (!this.isSessionReady) {
              this.disconnect();
            }
          } else if (msg.type === 'session_closed') {
            if (!this.isIntentionalClose) {
              this.disconnect();
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      socket.onerror = (e) => {
        if (this.ws !== socket || this.isIntentionalClose) return;
        console.error('WebSocket connection error:', e);
        this.clearConnectTimeout();
        this.callbacks.onError?.(
          'OFFLINE / SERVER UNAVAILABLE: Network connection to FRIDAY server failed.'
        );
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        console.log('WebSocket closed.');
        this.clearConnectTimeout();
        if (!this.isIntentionalClose && this.state !== 'disconnected') {
          if (!this.isSessionReady) {
            this.callbacks.onError?.(
              'OFFLINE / SERVER UNAVAILABLE: Could not establish Gemini Live voice session.'
            );
          }
          this.disconnect();
        }
      };
    } catch (err: any) {
      console.error('Failed to connect LiveSession:', err);
      this.clearConnectTimeout();
      this.callbacks.onError?.(err?.message || 'Could not start FRIDAY voice session.');
      this.disconnect();
    }
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
  }

  public isMuted(): boolean {
    return this.streamer?.getIsMuted() ?? false;
  }

  public isMicrophoneCapturing(): boolean {
    return this.streamer?.isCapturing() ?? false;
  }

  public async retryMicrophone(): Promise<boolean> {
    if (!this.streamer) return false;
    const ok = await this.streamer.start();
    if (ok) {
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
    this.clearConnectTimeout();

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
