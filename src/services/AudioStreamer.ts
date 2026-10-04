/**
 * AudioStreamer
 * Captures microphone audio, performs resampling to 16kHz mono PCM16,
 * calculates volume levels for visualization, and supports instant VAD-based interruption.
 */

export interface AudioStreamerCallbacks {
  onAudioData: (base64Pcm: string) => void;
  onVolumeChange: (volume: number) => void;
  onUserInterrupt?: () => void;
  onError?: (error: Error) => void;
}

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isStreaming = false;
  private isMuted = false;
  private isAssistantSpeaking = false;
  private callbacks: AudioStreamerCallbacks;

  // VAD (Voice Activity Detection) configuration
  private vadThreshold = 0.035; // Sensitivity threshold for speech detection
  private consecutiveSpeechFrames = 0;
  private readonly SPEECH_FRAMES_TRIGGER = 2; // Frames needed to confirm user interruption

  constructor(callbacks: AudioStreamerCallbacks) {
    this.callbacks = callbacks;
  }

  public setAssistantSpeaking(speaking: boolean) {
    this.isAssistantSpeaking = speaking;
    if (!speaking) {
      this.consecutiveSpeechFrames = 0;
    }
  }

  public setVadThreshold(threshold: number) {
    // threshold from 0.01 (very sensitive) to 0.08 (less sensitive)
    this.vadThreshold = Math.max(0.01, Math.min(0.08, threshold));
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  public isCapturing(): boolean {
    return this.isStreaming;
  }

  public async start(): Promise<boolean> {
    if (this.isStreaming) return true;

    if (!this.isSupported()) {
      const err = new Error('Microphone audio capture is not supported in this browser environment.');
      console.warn('[AudioStreamer]', err.message);
      this.callbacks.onError?.(err);
      return false;
    }

    try {
      // 1. Request microphone access with echo cancellation and noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      this.mediaStream = stream;

      // 2. Initialize AudioContext (request 16kHz for Live API)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const inputSampleRate = this.audioContext.sampleRate;
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Buffer size of 2048 gives ~128ms latency at 16kHz
      const bufferSize = 2048;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isStreaming || this.isMuted) {
          this.callbacks.onVolumeChange(0);
          return;
        }

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate RMS volume level
        let sumSquares = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sumSquares += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sumSquares / inputChannelData.length);
        const normalizedVolume = Math.min(1, rms * 5); // Scale for visualizer responsiveness
        this.callbacks.onVolumeChange(normalizedVolume);

        // Voice Activity Detection for instant interruption
        if (this.isAssistantSpeaking) {
          if (rms > this.vadThreshold) {
            this.consecutiveSpeechFrames++;
            if (this.consecutiveSpeechFrames >= this.SPEECH_FRAMES_TRIGGER) {
              this.callbacks.onUserInterrupt?.();
              this.consecutiveSpeechFrames = 0;
            }
          } else {
            this.consecutiveSpeechFrames = Math.max(0, this.consecutiveSpeechFrames - 1);
          }
        }

        // Resample to 16000Hz if the AudioContext was forced to a different rate
        let pcmData16k: Float32Array;
        if (inputSampleRate !== 16000) {
          pcmData16k = this.resampleAudio(inputChannelData, inputSampleRate, 16000);
        } else {
          pcmData16k = inputChannelData;
        }

        // Convert Float32 (-1.0 to 1.0) to Int16 PCM
        const pcm16 = this.floatTo16BitPCM(pcmData16k);
        const base64 = this.arrayBufferToBase64(pcm16.buffer);

        this.callbacks.onAudioData(base64);
      };

      this.sourceNode.connect(this.processorNode);
      // Connect to destination (required for script processor in some browsers, but muted or no output)
      this.processorNode.connect(this.audioContext.destination);

      this.isStreaming = true;
      return true;
    } catch (err: any) {
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        /permission/i.test(err?.message || '') ||
        /denied/i.test(err?.message || '');

      if (isPermissionDenied) {
        console.warn(
          '[AudioStreamer] Microphone permission not granted. User can enable permission or use text commands.'
        );
      } else {
        console.warn('[AudioStreamer] Failed to capture microphone audio:', err?.message);
      }

      this.callbacks.onError?.(
        isPermissionDenied
          ? new Error('Microphone permission not granted. Please allow microphone access or type commands below.')
          : err
      );
      this.stop();
      return false;
    }
  }

  public stop(): void {
    this.isStreaming = false;

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
        this.processorNode.onaudioprocess = null;
      } catch (e) {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (e) {}
      this.audioContext = null;
    }

    this.callbacks.onVolumeChange(0);
  }

  /**
   * Resamples an audio buffer from sourceRate to targetRate using linear interpolation
   */
  private resampleAudio(source: Float32Array, sourceRate: number, targetRate: number): Float32Array {
    if (sourceRate === targetRate) return source;
    const ratio = sourceRate / targetRate;
    const newLength = Math.round(source.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const lower = Math.floor(srcIndex);
      const upper = Math.min(lower + 1, source.length - 1);
      const weight = srcIndex - lower;
      result[i] = source[lower] * (1 - weight) + source[upper] * weight;
    }
    return result;
  }

  /**
   * Converts Float32Array to 16-bit PCM (little-endian)
   */
  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  /**
   * Efficient base64 encoder for ArrayBuffer or ArrayBufferLike
   */
  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
