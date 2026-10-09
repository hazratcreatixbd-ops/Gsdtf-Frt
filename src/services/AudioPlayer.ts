/**
 * AudioPlayer
 * Plays back raw 24kHz PCM16 audio chunks from Gemini Live via Web Audio API.
 * Features gapless playback scheduling, real-time frequency analysis for visualization,
 * and immediate zero-latency interruption cutoff.
 */

export interface AudioPlayerCallbacks {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private callbacks: AudioPlayerCallbacks;
  private isPlaying = false;
  private checkEndTimer: number | null = null;
  private volumeAnalysisTimer: number | null = null;

  constructor(callbacks: AudioPlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public async init(): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Output at 24kHz for Gemini Live PCM audio (with fallback to device default sample rate)
      try {
        this.audioContext = new AudioCtx({ sampleRate: 24000 });
      } catch {
        this.audioContext = new AudioCtx();
      }

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Connect: Sources -> Analyser -> Gain -> Destination
      this.analyserNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.startVolumeAnalysis();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public async playChunk(base64Pcm: string): Promise<void> {
    await this.init();
    if (!this.audioContext || !this.analyserNode) return;

    try {
      // Decode base64 to 16-bit PCM samples
      const binaryString = window.atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const sampleCount = pcm16.length;
      if (sampleCount === 0) return;

      // Convert 16-bit PCM to Float32 (-1.0 to 1.0)
      const float32 = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      // Create AudioBuffer at 24000Hz
      const audioBuffer = this.audioContext.createBuffer(1, sampleCount, 24000);
      audioBuffer.copyToChannel(float32, 0);

      // Create BufferSourceNode
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyserNode);

      // Gapless scheduling
      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        // Small 25ms lead-in buffer to prevent crackle
        this.nextStartTime = currentTime + 0.025;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.callbacks.onPlaybackStart?.();
      }

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index !== -1) {
          this.activeSources.splice(index, 1);
        }
      };

      this.schedulePlaybackEndCheck();
    } catch (err) {
      console.error('Error decoding/playing audio chunk in AudioPlayer:', err);
    }
  }

  /**
   * Monitor when queued audio completes playing
   */
  private schedulePlaybackEndCheck() {
    if (this.checkEndTimer) {
      window.clearTimeout(this.checkEndTimer);
    }

    if (!this.audioContext) return;
    const remainingTimeMs = Math.max(0, (this.nextStartTime - this.audioContext.currentTime) * 1000);

    this.checkEndTimer = window.setTimeout(() => {
      if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.05) {
        if (this.isPlaying && this.activeSources.length === 0) {
          this.isPlaying = false;
          this.callbacks.onPlaybackEnd?.();
          this.callbacks.onVolumeChange?.(0);
        }
      }
    }, remainingTimeMs + 50);
  }

  /**
   * Stops all active sources immediately and clears playback queue (Instant Interruption)
   */
  public stopAll(): void {
    if (this.checkEndTimer) {
      window.clearTimeout(this.checkEndTimer);
      this.checkEndTimer = null;
    }

    for (const source of this.activeSources) {
      try {
        source.stop(0);
        source.disconnect();
      } catch (e) {}
    }
    this.activeSources = [];
    this.nextStartTime = 0;

    if (this.isPlaying) {
      this.isPlaying = false;
      this.callbacks.onPlaybackEnd?.();
    }

    this.callbacks.onVolumeChange?.(0);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Volume level & FFT frequency analysis for FRIDAY speech visualizer.
   * Uses setInterval (60ms) instead of requestAnimationFrame so playback timers
   * never stall when the app enters Android background mode.
   */
  private startVolumeAnalysis() {
    if (this.volumeAnalysisTimer) return;

    const dataArray = new Uint8Array(64);
    this.volumeAnalysisTimer = window.setInterval(() => {
      if (this.isPlaying && this.analyserNode) {
        this.analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(1, average / 128);
        this.callbacks.onVolumeChange?.(normalized);
      } else {
        this.callbacks.onVolumeChange?.(0);
      }
    }, 60);
  }

  public async resumeIfNeeded(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {}
    }
  }

  public close(): void {
    this.stopAll();

    if (this.volumeAnalysisTimer) {
      window.clearInterval(this.volumeAnalysisTimer);
      this.volumeAnalysisTimer = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (e) {}
      this.audioContext = null;
    }
  }
}
