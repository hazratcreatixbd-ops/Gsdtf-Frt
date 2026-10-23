/**
 * PART 15B — Authorized Speaker Verification Manager
 * Privacy-preserving, client-side acoustic biometric voiceprint extraction and verification.
 *
 * SECURITY & PRIVACY PRINCIPLES:
 * 1. Raw audio recordings are NEVER stored on disk or transmitted to remote identity databases.
 * 2. Only mathematical acoustic feature vectors (energy, pitch auto-correlation, spectral filterbank bands)
 *    are computed client-side and saved in encrypted/isolated local storage.
 * 3. Protected actions (cross-app text typing, messaging, financial operations, task deletions) FAIL CLOSED
 *    when the speaker is unauthorized, uncertain, silence, or TV/background noise.
 * 4. User maintains 100% control: easy enrollment, re-enrollment, disablement, and complete biometric reset.
 * 5. Honest confidence reporting: does not claim "perfect identity recognition".
 */

export type SpeakerVerificationState =
  | 'DISABLED'
  | 'UNENROLLED'
  | 'ENROLLING'
  | 'ACTIVE_VERIFIED'
  | 'UNAUTHORIZED_SPEAKER'
  | 'UNCERTAIN_SPEAKER'
  | 'SILENCE_OR_NOISE';

export interface AcousticFeatureVector {
  rms: number;
  pitchHz: number;
  pitchPeriodicity: number;
  zcr: number;
  spectralBands: number[]; // 16 normalized Mel-like frequency energy bands
  normalizedVector: number[]; // 20-dimensional unit vector
}

export interface SpeakerVoiceprintTemplate {
  version: number;
  enrolledAt: number;
  speakerLabel: string;
  sampleCount: number;
  centroidVector: number[]; // Average 20-dim feature vector
  meanPitchHz: number;
  pitchStdDev: number;
  meanZcr: number;
}

export interface VerificationResult {
  state: SpeakerVerificationState;
  authorized: boolean;
  confidence: number; // 0.0 - 1.0
  similarity: number; // -1.0 - 1.0 cosine similarity
  reason: string;
  isSilence: boolean;
  isBackgroundNoise: boolean;
  activeSpeakerLabel: string;
}

export type SpeakerStateListener = (state: SpeakerVerificationState, lastResult: VerificationResult | null) => void;

const STORAGE_KEY_TEMPLATE = 'friday_speaker_voiceprint_template_v1';
const STORAGE_KEY_ENABLED = 'friday_speaker_verification_enabled';

// Protected actions requiring authorized speaker verification before execution
const PROTECTED_TOOLS = new Set([
  'android_screen_action',
  'screen_action',
  'performScreenAction',
  'android_open_whatsapp',
  'sendWhatsAppMessage',
  'prepareWhatsAppMessage',
  'composeEmail',
  'shareContent',
  'deleteTask',
  'deleteMemory',
  'publishSocialPost',
  'publishToFacebook',
  'updateBusinessProfile',
  'deleteBusinessGoal',
]);

// In-memory fallback for environments without window/localStorage (e.g. Node tests / background workers)
const memoryStore = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStore.get(key) || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {}
  memoryStore.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(key);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch {}
  memoryStore.delete(key);
}

export class SpeakerVerificationManager {
  private static instance: SpeakerVerificationManager;

  private enabled: boolean = true;
  private template: SpeakerVoiceprintTemplate | null = null;
  private currentState: SpeakerVerificationState = 'UNENROLLED';
  private lastResult: VerificationResult | null = null;
  private listeners: Set<SpeakerStateListener> = new Set();

  // Enrollment session state
  private enrollmentStep: number = 0; // 0: not enrolling, 1, 2, 3
  private enrollmentSamples: AcousticFeatureVector[] = [];
  private accumulatedFrames: Float32Array[] = [];

  // Session verification lifecycle
  private sessionVerified: boolean = false;
  private lastVerificationTime: number = 0;
  private lastAudioTime: number = 0;
  private readonly SESSION_EXPIRY_MS = 30000; // Require re-verification after 30s of silence

  private constructor() {
    this.loadPersistedState();
  }

  public static getInstance(): SpeakerVerificationManager {
    if (!SpeakerVerificationManager.instance) {
      SpeakerVerificationManager.instance = new SpeakerVerificationManager();
    }
    return SpeakerVerificationManager.instance;
  }

  private loadPersistedState(): void {
    try {
      const enabledVal = safeGetItem(STORAGE_KEY_ENABLED);
      this.enabled = enabledVal !== null ? enabledVal === 'true' : true;

      const rawTemplate = safeGetItem(STORAGE_KEY_TEMPLATE);
      if (rawTemplate) {
        this.template = JSON.parse(rawTemplate) as SpeakerVoiceprintTemplate;
        this.currentState = this.enabled ? 'UNCERTAIN_SPEAKER' : 'DISABLED';
      } else {
        this.currentState = this.enabled ? 'UNENROLLED' : 'DISABLED';
      }
    } catch (e) {
      console.warn('[SpeakerVerificationManager] Could not load persisted voiceprint:', e);
      this.currentState = 'UNENROLLED';
    }
  }

  public subscribe(listener: SpeakerStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState, this.lastResult);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState, this.lastResult);
      } catch (e) {
        console.error('[SpeakerVerificationManager] Error in listener:', e);
      }
    });
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isEnrolled(): boolean {
    return this.template !== null && this.template.centroidVector.length > 0;
  }

  public getCurrentState(): SpeakerVerificationState {
    return this.currentState;
  }

  public getState(): SpeakerVerificationState {
    return this.getCurrentState();
  }

  public isAuthorized(): boolean {
    if (!this.enabled) return true;
    if (!this.isEnrolled()) return true;
    return this.sessionVerified || this.currentState === 'ACTIVE_VERIFIED';
  }

  public getLastResult(): VerificationResult | null {
    return this.lastResult;
  }

  public getTemplate(): SpeakerVoiceprintTemplate | null {
    return this.template;
  }

  public getEnrolledTemplate(): SpeakerVoiceprintTemplate | null {
    return this.template;
  }

  /**
   * User-Controlled: Enable or Disable speaker verification
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    safeSetItem(STORAGE_KEY_ENABLED, String(enabled));

    if (!enabled) {
      this.currentState = 'DISABLED';
      this.sessionVerified = false;
    } else {
      this.currentState = this.isEnrolled() ? 'UNCERTAIN_SPEAKER' : 'UNENROLLED';
    }
    this.notify();
  }

  /**
   * User-Controlled: Completely reset / purge voiceprint template
   */
  public resetVoiceprint(): void {
    safeRemoveItem(STORAGE_KEY_TEMPLATE);
    this.template = null;
    this.sessionVerified = false;
    this.enrollmentStep = 0;
    this.enrollmentSamples = [];
    this.accumulatedFrames = [];
    this.currentState = this.enabled ? 'UNENROLLED' : 'DISABLED';
    this.lastResult = null;
    this.notify();
  }

  /**
   * Session Lifecycle: Reset session verification on reconnect, audio loss, or interrupt
   */
  public resetSessionVerification(reason = 'Session reset'): void {
    this.sessionVerified = false;
    this.accumulatedFrames = [];
    if (this.enabled && this.isEnrolled()) {
      this.currentState = 'UNCERTAIN_SPEAKER';
    }
    console.log(`[SpeakerVerificationManager] Session verification reset (${reason}).`);
    this.notify();
  }

  /**
   * Starts user-guided 3-step enrollment flow
   */
  public startEnrollment(): void {
    this.enrollmentStep = 1;
    this.enrollmentSamples = [];
    this.accumulatedFrames = [];
    this.currentState = 'ENROLLING';
    this.notify();
  }

  public getEnrollmentStep(): number {
    return this.enrollmentStep;
  }

  public cancelEnrollment(): void {
    this.enrollmentStep = 0;
    this.enrollmentSamples = [];
    this.accumulatedFrames = [];
    this.currentState = this.isEnrolled() ? 'ACTIVE_VERIFIED' : 'UNENROLLED';
    this.notify();
  }

  /**
   * Completes one step of enrollment with current accumulated audio
   */
  public completeEnrollmentStep(): { success: boolean; message: string; step: number } {
    if (this.enrollmentStep === 0) {
      return { success: false, message: 'Enrollment is not active.', step: 0 };
    }

    // Merge accumulated frames into a single audio buffer
    const merged = this.getMergedAccumulatedAudio();
    if (!merged || merged.length < 3200) {
      return {
        success: false,
        message: 'Audio sample too short. Please speak the phrase clearly for 1-2 seconds.',
        step: this.enrollmentStep,
      };
    }

    const vector = this.extractAcousticFeatures(merged);
    if (vector.rms < 0.02) {
      return {
        success: false,
        message: 'Audio too quiet or silent. Please speak closer to the microphone.',
        step: this.enrollmentStep,
      };
    }

    if (vector.pitchPeriodicity < 0.25 || vector.pitchHz < 65 || vector.pitchHz > 350) {
      return {
        success: false,
        message: 'Could not detect clear vocal pitch. Avoid background noise or whispered speech.',
        step: this.enrollmentStep,
      };
    }

    this.enrollmentSamples.push(vector);
    this.accumulatedFrames = [];

    if (this.enrollmentStep < 3) {
      this.enrollmentStep += 1;
      this.notify();
      return {
        success: true,
        message: `Sample ${this.enrollmentStep - 1} captured successfully. Ready for step ${this.enrollmentStep}.`,
        step: this.enrollmentStep,
      };
    } else {
      // Step 3 completed -> generate template
      this.finalizeEnrollment();
      return {
        success: true,
        message: 'Voiceprint enrolled successfully! Speaker verification is now active.',
        step: 3,
      };
    }
  }

  private finalizeEnrollment(): void {
    if (this.enrollmentSamples.length === 0) return;

    const dim = this.enrollmentSamples[0].normalizedVector.length;
    const centroid = new Array(dim).fill(0);
    let totalPitch = 0;
    let totalZcr = 0;

    for (const sample of this.enrollmentSamples) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += sample.normalizedVector[i];
      }
      totalPitch += sample.pitchHz;
      totalZcr += sample.zcr;
    }

    const count = this.enrollmentSamples.length;
    const meanPitch = totalPitch / count;
    const meanZcr = totalZcr / count;

    // Normalize centroid
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      centroid[i] /= count;
      norm += centroid[i] * centroid[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) {
      centroid[i] /= norm;
    }

    // Pitch standard deviation
    let variance = 0;
    for (const sample of this.enrollmentSamples) {
      variance += Math.pow(sample.pitchHz - meanPitch, 2);
    }
    const pitchStdDev = Math.sqrt(variance / count);

    this.template = {
      version: 1,
      enrolledAt: Date.now(),
      speakerLabel: 'Authorized Owner',
      sampleCount: count,
      centroidVector: centroid,
      meanPitchHz: Math.round(meanPitch),
      pitchStdDev: Math.round(pitchStdDev),
      meanZcr,
    };

    safeSetItem(STORAGE_KEY_TEMPLATE, JSON.stringify(this.template));

    this.enrollmentStep = 0;
    this.enrollmentSamples = [];
    this.accumulatedFrames = [];
    this.sessionVerified = true;
    this.currentState = 'ACTIVE_VERIFIED';
    this.lastVerificationTime = Date.now();
    this.notify();
  }

  /**
   * Processes a live 16kHz PCM audio frame from the microphone streamer
   */
  public processAudioFrame(pcmData16k: Float32Array): VerificationResult {
    return this.verifyAudioFrame(pcmData16k);
  }

  public verifyAudioFrame(pcmData16k: Float32Array): VerificationResult {
    const now = Date.now();
    this.lastAudioTime = now;

    // Buffer audio during enrollment
    if (this.currentState === 'ENROLLING') {
      this.accumulatedFrames.push(new Float32Array(pcmData16k));
      if (this.accumulatedFrames.length > 50) {
        this.accumulatedFrames.shift();
      }
      return {
        state: 'ENROLLING',
        authorized: false,
        confidence: 0,
        similarity: 0,
        reason: 'Currently recording enrollment sample.',
        isSilence: false,
        isBackgroundNoise: false,
        activeSpeakerLabel: 'Enrolling',
      };
    }

    if (!this.enabled) {
      return {
        state: 'DISABLED',
        authorized: true,
        confidence: 1.0,
        similarity: 1.0,
        reason: 'Speaker verification is disabled by user.',
        isSilence: false,
        isBackgroundNoise: false,
        activeSpeakerLabel: 'Verification Disabled',
      };
    }

    if (!this.isEnrolled()) {
      return {
        state: 'UNENROLLED',
        authorized: false,
        confidence: 0,
        similarity: 0,
        reason: 'No voiceprint enrolled. Open Settings to enroll authorized speaker.',
        isSilence: false,
        isBackgroundNoise: false,
        activeSpeakerLabel: 'Unenrolled',
      };
    }

    // Extract features
    const features = this.extractAcousticFeatures(pcmData16k);

    // 1. Detect silence
    if (features.rms < 0.015) {
      const res: VerificationResult = {
        state: 'SILENCE_OR_NOISE',
        authorized: false,
        confidence: 0,
        similarity: 0,
        reason: 'Silence detected. Ignored as command.',
        isSilence: true,
        isBackgroundNoise: false,
        activeSpeakerLabel: 'Silence',
      };
      this.lastResult = res;
      return res;
    }

    // 2. Detect pure noise / TV music background (high ZCR or lack of vocal periodicity)
    const isNoise = features.pitchPeriodicity < 0.18 || features.zcr > 0.28;
    if (isNoise) {
      const res: VerificationResult = {
        state: 'SILENCE_OR_NOISE',
        authorized: false,
        confidence: 0.1,
        similarity: 0.1,
        reason: 'Background non-speech noise or TV music detected.',
        isSilence: false,
        isBackgroundNoise: true,
        activeSpeakerLabel: 'Noise/Background',
      };
      this.lastResult = res;
      this.currentState = 'SILENCE_OR_NOISE';
      this.notify();
      return res;
    }

    // 3. Compute cosine similarity with enrolled centroid
    const similarity = this.computeCosineSimilarity(features.normalizedVector, this.template!.centroidVector);

    // 4. Compute pitch congruence multiplier
    let pitchMultiplier = 1.0;
    if (this.template!.meanPitchHz > 0 && features.pitchHz > 0) {
      const diff = Math.abs(features.pitchHz - this.template!.meanPitchHz);
      const tolerance = Math.max(30, this.template!.pitchStdDev * 2.0);
      if (diff > tolerance) {
        // Drop confidence sharply for intruder with mismatched fundamental pitch
        pitchMultiplier = Math.max(0.1, 1.0 - (diff - tolerance) / 50);
      }
    }

    // Combined confidence score
    const confidence = Math.max(0, Math.min(1.0, similarity * pitchMultiplier));

    let state: SpeakerVerificationState;
    let authorized = false;
    let reason = '';

    if (confidence >= 0.74) {
      state = 'ACTIVE_VERIFIED';
      authorized = true;
      this.sessionVerified = true;
      this.lastVerificationTime = now;
      reason = `Authorized speaker verified with ${(confidence * 100).toFixed(0)}% confidence.`;
    } else if (confidence >= 0.58) {
      state = 'UNCERTAIN_SPEAKER';
      authorized = false;
      reason = `Uncertain voice match (${(confidence * 100).toFixed(0)}% confidence). Protected actions blocked.`;
    } else {
      state = 'UNAUTHORIZED_SPEAKER';
      authorized = false;
      this.sessionVerified = false;
      reason = `Unauthorized speaker detected (${(confidence * 100).toFixed(0)}% match). Rejecting background conversation / another speaker.`;
    }

    const result: VerificationResult = {
      state,
      authorized,
      confidence,
      similarity,
      reason,
      isSilence: false,
      isBackgroundNoise: false,
      activeSpeakerLabel: authorized ? this.template!.speakerLabel : 'Unknown Speaker',
    };

    this.currentState = state;
    this.lastResult = result;
    this.notify();
    return result;
  }

  /**
   * Protected Command Execution Guard:
   * Verifies if a command is authorized to execute.
   * If speaker verification is enabled, fails closed for unauthorized or uncertain speakers.
   */
  public validateCommandExecution(
    toolName: string,
    args?: Record<string, any>
  ): { allowed: boolean; errorCode?: string; reason?: string } {
    const isProtected = PROTECTED_TOOLS.has(toolName);

    if (!isProtected) {
      return { allowed: true };
    }

    if (!this.enabled) {
      return { allowed: true };
    }

    if (!this.isEnrolled()) {
      return {
        allowed: false,
        errorCode: 'UNENROLLED_SPEAKER',
        reason: `Speaker verification is not yet configured. To execute protected cross-app actions like "${toolName}", please enroll your voice in FRIDAY Settings.`,
      };
    }

    // Check if session verification is still fresh (within 30s)
    const now = Date.now();
    const isFresh = this.sessionVerified && now - this.lastVerificationTime < this.SESSION_EXPIRY_MS;

    if (this.currentState === 'UNAUTHORIZED_SPEAKER') {
      return {
        allowed: false,
        errorCode: 'UNAUTHORIZED_SPEAKER',
        reason: `Protected action "${toolName}" was BLOCKED: Voice signature does not match the enrolled authorized owner. Commands triggered by television audio or other speakers are rejected.`,
      };
    }

    if (this.currentState === 'UNCERTAIN_SPEAKER' || !isFresh) {
      return {
        allowed: false,
        errorCode: 'UNCERTAIN_SPEAKER',
        reason: `Protected action "${toolName}" was paused: Speaker confidence is uncertain or session expired. Please speak directly to FRIDAY to re-verify your voice before proceeding.`,
      };
    }

    if (this.currentState === 'SILENCE_OR_NOISE') {
      return {
        allowed: false,
        errorCode: 'SILENCE_IGNORED',
        reason: 'Cannot execute protected command on silence or background noise.',
      };
    }

    if (this.currentState === 'ACTIVE_VERIFIED' && isFresh) {
      return { allowed: true };
    }

    return {
      allowed: false,
      errorCode: 'UNAUTHORIZED_SPEAKER',
      reason: `Protected action "${toolName}" requires active authorized speaker verification.`,
    };
  }

  // --- Acoustic Feature Extraction Utilities ---

  private getMergedAccumulatedAudio(): Float32Array | null {
    if (this.accumulatedFrames.length === 0) return null;
    let totalLen = 0;
    for (const f of this.accumulatedFrames) totalLen += f.length;
    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const f of this.accumulatedFrames) {
      merged.set(f, offset);
      offset += f.length;
    }
    return merged;
  }

  /**
   * Extracts RMS, ZCR, Pitch (via autocorrelation), and 16 spectral band energies
   */
  public extractAcousticFeatures(samples: Float32Array): AcousticFeatureVector {
    const N = samples.length;
    if (N === 0) {
      return {
        rms: 0,
        pitchHz: 0,
        pitchPeriodicity: 0,
        zcr: 0,
        spectralBands: new Array(16).fill(0),
        normalizedVector: new Array(20).fill(0),
      };
    }

    // 1. RMS Energy
    let sumSq = 0;
    for (let i = 0; i < N; i++) {
      sumSq += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSq / N);

    // 2. Zero Crossing Rate (ZCR)
    let zeroCrossings = 0;
    for (let i = 1; i < N; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / N;

    // 3. Autocorrelation Pitch ($F_0$)
    // Search lags from 45 samples (355Hz) to 230 samples (70Hz) at 16kHz
    const minLag = 45;
    const maxLag = Math.min(240, Math.floor(N / 2));
    let bestLag = 0;
    let maxCorr = 0;
    const r0 = sumSq || 1;

    for (let lag = minLag; lag < maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < N - lag; i++) {
        corr += samples[i] * samples[i + lag];
      }
      const normCorr = corr / r0;
      if (normCorr > maxCorr) {
        maxCorr = normCorr;
        bestLag = lag;
      }
    }

    const pitchHz = bestLag > 0 ? Math.round(16000 / bestLag) : 0;
    const pitchPeriodicity = maxCorr;

    // 4. 16-band Spectral Energy Distribution (Log-spaced frequency components covering 90Hz to 4800Hz)
    const FREQ_BINS = [95, 135, 190, 260, 360, 500, 700, 950, 1300, 1750, 2300, 3000, 3800, 4700, 5600, 6600];
    const spectralBands = new Array(16).fill(0);
    const step = Math.max(1, Math.floor(N / 512));
    const sampleRate = 16000;

    for (let b = 0; b < 16; b++) {
      const omega = (2 * Math.PI * FREQ_BINS[b]) / sampleRate;
      let re = 0;
      let im = 0;
      let count = 0;
      for (let i = 0; i < N; i += step) {
        const angle = omega * i;
        re += samples[i] * Math.cos(angle);
        im += samples[i] * Math.sin(angle);
        count++;
      }
      spectralBands[b] = Math.sqrt(re * re + im * im) / (count || 1);
    }

    // 5. Construct 20-dimensional feature vector:
    // [0]: RMS normalized
    // [1]: ZCR normalized
    // [2]: Pitch normalized (60-350Hz -> 0..1)
    // [3]: Pitch periodicity
    // [4..19]: 16 spectral bands
    const rawVector = new Array(20);
    rawVector[0] = Math.min(1.0, rms * 10);
    rawVector[1] = Math.min(1.0, zcr * 4);
    rawVector[2] = pitchHz > 0 ? Math.min(1.0, (pitchHz - 60) / 290) : 0;
    rawVector[3] = Math.min(1.0, pitchPeriodicity);
    for (let i = 0; i < 16; i++) {
      rawVector[4 + i] = Math.min(1.0, spectralBands[i] * 10);
    }

    // Normalize to unit length
    let norm = 0;
    for (let i = 0; i < 20; i++) {
      norm += rawVector[i] * rawVector[i];
    }
    norm = Math.sqrt(norm) || 1;
    const normalizedVector = new Array(20);
    for (let i = 0; i < 20; i++) {
      normalizedVector[i] = rawVector[i] / norm;
    }

    return {
      rms,
      pitchHz,
      pitchPeriodicity,
      zcr,
      spectralBands,
      normalizedVector,
    };
  }

  private computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }
}

export const speakerVerificationManager = SpeakerVerificationManager.getInstance();
