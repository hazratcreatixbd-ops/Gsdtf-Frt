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

  public async connect(): Promise<void> {
    if (this.state !== 'disconnected') {
      return;
    }

    this.isIntentionalClose = false;
    this.setState('connecting');

    try {
      // 1. Initialize AudioPlayer
      this.player = new AudioPlayer({
        onPlaybackStart: () => {
          this.setState('speaking');
        },
        onPlaybackEnd: () => {
          if (this.state === 'speaking') {
            this.setState('listening');
          }
        },
        onVolumeChange: (vol) => {
          this.callbacks.onFridayVolumeChange?.(vol);
        },
      });
      await this.player.init();

      // 2. Initialize AudioStreamer
      this.streamer = new AudioStreamer({
        onAudioData: (base64Pcm) => {
          this.sendAudioData(base64Pcm);
        },
        onVolumeChange: (vol) => {
          this.callbacks.onUserVolumeChange?.(vol);
        },
        onUserInterrupt: () => {
          this.handleLocalUserInterrupt();
        },
        onError: (err) => {
          console.warn('[LiveSession] AudioStreamer notice:', err.message);
          this.callbacks.onError?.(err.message);
        },
      });

      // 3. Connect WebSocket to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('WebSocket connected to FRIDAY server.');
        // Start keep-alive ping
        this.pingInterval = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);

        // Start microphone capture gracefully
        try {
          const started = await this.streamer?.start();
          if (!started) {
            console.warn('[LiveSession] Microphone not yet active. You can allow microphone access or type commands.');
          }
        } catch (micErr: any) {
          console.warn('[LiveSession] Microphone capture skipped:', micErr?.message);
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'session_ready') {
            console.log('FRIDAY Session Ready:', msg.message);
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
            // Turn completed
          } else if (msg.type === 'transcription') {
            this.callbacks.onTranscription?.({
              id: Math.random().toString(36).substring(2, 9),
              role: msg.role,
              text: msg.text,
              timestamp: Date.now(),
            });
          } else if (msg.type === 'tool_execution') {
            this.setState('thinking');
            toolManager.executeTool(msg.tool, msg.args, msg.id).catch((e) => {
              console.error('Tool execution error:', e);
            });
          } else if (msg.type === 'error') {
            console.error('FRIDAY Server error:', msg.message);
            this.callbacks.onError?.(msg.message);
          } else if (msg.type === 'session_closed') {
            if (!this.isIntentionalClose) {
              this.disconnect();
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      this.ws.onerror = (e) => {
        console.error('WebSocket connection error:', e);
        this.callbacks.onError?.('Network connection to FRIDAY server failed.');
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed.');
        if (!this.isIntentionalClose && this.state !== 'disconnected') {
          this.disconnect();
        }
      };
    } catch (err: any) {
      console.error('Failed to connect LiveSession:', err);
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.setState('disconnected');
    this.callbacks.onUserVolumeChange?.(0);
    this.callbacks.onFridayVolumeChange?.(0);
  }
}
