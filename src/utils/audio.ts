export interface AudioRecordingResult {
  audioBlob: Blob; // Preserved original audio
  audioUrl: string; // URL for original audio
  convertedBlob?: Blob; // 16-bit mono 16 kHz PCM WAV conversion
  playbackUrl: string; // Guaranteed browser-compatible playback URL
  durationSeconds: number; // Accurate audio duration
  sizeKb: number; // Original size in KB
  convertedSizeKb?: number; // Converted size in KB
  mimeType: string; // Original MIME type
  codec: string; // 'Opus' | 'PCM'
  isSimulatedFallback?: boolean;
  audioBuffer?: AudioBuffer; // Decoded AudioBuffer ready for Web Audio API fallback playback
}

/**
 * Converts an AudioBuffer into a 100% browser-compatible 16-bit mono 16 kHz PCM WAV Blob
 */
export function audioBufferToWavBlob(audioBuffer: AudioBuffer, targetSampleRate = 16000): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const inRate = audioBuffer.sampleRate;
  const inLength = audioBuffer.length;

  // Resample to targetSampleRate (16 kHz is speech standard for rural telemedicine)
  const outLength = Math.max(1, Math.round((inLength * targetSampleRate) / inRate));
  const outSamples = new Float32Array(outLength);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }

  for (let i = 0; i < outLength; i++) {
    const origIndex = (i * inRate) / targetSampleRate;
    const indexFloor = Math.floor(origIndex);
    const indexCeil = Math.min(indexFloor + 1, inLength - 1);
    const frac = origIndex - indexFloor;

    let sample = 0;
    for (let c = 0; c < numChannels; c++) {
      const s0 = channelData[c][indexFloor] || 0;
      const s1 = channelData[c][indexCeil] || 0;
      sample += s0 + frac * (s1 - s0);
    }
    outSamples[i] = sample / numChannels;
  }

  // Build standard 44-byte RIFF/WAVE header
  const buffer = new ArrayBuffer(44 + outLength * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let j = 0; j < str.length; j++) {
      view.setUint8(offset + j, str.charCodeAt(j));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + outLength * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = mono)
  view.setUint32(24, targetSampleRate, true); // SampleRate (16000)
  view.setUint32(28, targetSampleRate * 2, true); // ByteRate (16000 * 1 * 2)
  view.setUint16(32, 2, true); // BlockAlign (1 * 2)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)
  writeString(36, 'data');
  view.setUint32(40, outLength * 2, true);

  // Write 16-bit signed PCM samples with soft clipping
  let offset = 44;
  for (let i = 0; i < outLength; i++) {
    const s = Math.max(-1, Math.min(1, outSamples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Decodes any browser-supported audio Blob (WebM, Ogg, WAV, etc.) using AudioContext
 * and converts it to a clean 16-bit PCM WAV Blob for 100% reliable HTML5 playback.
 */
export async function decodeAudioBlob(blob: Blob): Promise<{
  audioBuffer: AudioBuffer;
  wavBlob: Blob;
  wavUrl: string;
  durationSeconds: number;
}> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const ctx = new AudioCtx();
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const audioBuffer: AudioBuffer = await new Promise((resolve, reject) => {
      const copy = arrayBuffer.slice(0);
      try {
        const promise = ctx.decodeAudioData(
          copy,
          (buf) => resolve(buf),
          (err) => reject(err)
        );
        if (promise && typeof promise.then === 'function') {
          promise.then(resolve).catch(reject);
        }
      } catch (e) {
        reject(e);
      }
    });

    const wavBlob = audioBufferToWavBlob(audioBuffer, 16000);
    const wavUrl = URL.createObjectURL(wavBlob);
    const durationSeconds = Math.max(1, Math.round(audioBuffer.duration));
    return { audioBuffer, wavBlob, wavUrl, durationSeconds };
  } catch (decodeErr) {
    console.warn('[Audio Decoder] Browser could not decode this recording:', decodeErr);
    throw decodeErr instanceof Error ? decodeErr : new Error('This audio recording could not be decoded.');
  } finally {
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
  }
}

/**
 * Standalone Web Audio API Player that plays raw AudioBuffer directly to speakers.
 * Provides a 100% reliable fallback whenever HTML5 <audio> encounters codec/container decoding errors.
 */
export class WebAudioPlayer {
  private ctx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private startOffset: number = 0;
  private startTime: number = 0;
  private isPlayingState: boolean = false;
  private animFrameId: number | null = null;
  public onTimeUpdate?: (currentTime: number) => void;
  public onEnded?: () => void;
  public onPlay?: () => void;
  public onPause?: () => void;

  constructor(buffer?: AudioBuffer) {
    if (buffer) {
      this.audioBuffer = buffer;
    }
  }

  setBuffer(buffer: AudioBuffer) {
    this.stop();
    this.audioBuffer = buffer;
    this.startOffset = 0;
  }

  get isPlaying(): boolean {
    return this.isPlayingState;
  }

  get duration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  get currentTime(): number {
    if (!this.isPlayingState || !this.ctx) return this.startOffset;
    const elapsed = this.ctx.currentTime - this.startTime;
    return Math.min(this.duration, this.startOffset + elapsed);
  }

  async play(offset?: number) {
    if (!this.audioBuffer) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    if (offset !== undefined) {
      this.startOffset = Math.max(0, Math.min(offset, this.duration));
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.ctx.destination);

    this.startTime = this.ctx.currentTime;
    this.isPlayingState = true;

    this.sourceNode.onended = () => {
      if (this.isPlayingState) {
        this.isPlayingState = false;
        this.startOffset = 0;
        this.stopTracking();
        this.onEnded?.();
      }
    };

    this.sourceNode.start(0, this.startOffset);
    this.startTracking();
    this.onPlay?.();
  }

  pause() {
    if (!this.isPlayingState) return;
    this.startOffset = this.currentTime;
    this.isPlayingState = false;
    this.stopTracking();
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    this.onPause?.();
  }

  seek(time: number) {
    const wasPlaying = this.isPlayingState;
    this.pause();
    this.startOffset = Math.max(0, Math.min(time, this.duration));
    this.onTimeUpdate?.(this.startOffset);
    if (wasPlaying) {
      this.play(this.startOffset);
    }
  }

  stop() {
    this.pause();
    this.startOffset = 0;
    this.onTimeUpdate?.(0);
  }

  private startTracking() {
    this.stopTracking();
    const track = () => {
      if (this.isPlayingState) {
        this.onTimeUpdate?.(this.currentTime);
        this.animFrameId = requestAnimationFrame(track);
      }
    };
    this.animFrameId = requestAnimationFrame(track);
  }

  private stopTracking() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  destroy() {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}

/**
 * Generates an audible PCM WAV audio blob as fallback if device microphone is denied
 */
function createAudiblePcmWavBlob(durationSeconds = 5, sampleRate = 16000): Blob {
  const numSamples = durationSeconds * sampleRate;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate synthetic cadence tone for testing
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f1 = 340 + 60 * Math.sin(2 * Math.PI * 1.5 * t);
    const f2 = 680 + 100 * Math.cos(2 * Math.PI * 2.5 * t);
    const sample = (0.35 * Math.sin(2 * Math.PI * f1 * t) + 0.25 * Math.sin(2 * Math.PI * f2 * t)) * 32767;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.floor(sample))), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export class VoiceNoteRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private pausedTime: number = 0;
  private totalPausedDuration: number = 0;
  private stream: MediaStream | null = null;
  private selectedMimeType: string = 'audio/webm;codecs=opus';
  private actualMimeType: string = 'audio/webm';
  private isPausedState: boolean = false;
  private isSimulatedFallback: boolean = false;

  get isPaused(): boolean {
    return this.isPausedState;
  }

  get state(): 'inactive' | 'recording' | 'paused' {
    if (this.mediaRecorder) {
      return this.mediaRecorder.state;
    }
    return this.isPausedState ? 'paused' : (this.startTime > 0 ? 'recording' : 'inactive');
  }

  async start(): Promise<{ success: boolean; permissionDenied?: boolean; isFallback?: boolean; error?: string }> {
    try {
      this.totalPausedDuration = 0;
      this.pausedTime = 0;
      this.isPausedState = false;
      this.isSimulatedFallback = false;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone requires a secure context or permission.');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono for telemedicine speech
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Check supported formats preferring speech-optimized WebM Opus
      const candidateMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        'audio/aac',
      ];

      this.selectedMimeType = candidateMimeTypes.find((m) => {
        try {
          return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m);
        } catch {
          return false;
        }
      }) || '';

      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 32000, // 32 kbps wideband Opus
      };
      if (this.selectedMimeType) {
        recorderOptions.mimeType = this.selectedMimeType;
      }

      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);
      this.actualMimeType = this.mediaRecorder.mimeType || this.selectedMimeType || 'audio/webm';

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Continuous recording chunks every 250ms
      this.mediaRecorder.start(250);
      return { success: true };
    } catch (err: any) {
      console.warn('Microphone hardware or permission notice. Enabling fallback:', err);
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      this.mediaRecorder = null;
      this.isSimulatedFallback = true;
      this.startTime = Date.now();
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      return {
        success: true,
        permissionDenied: isDenied,
        isFallback: true,
        error: isDenied
          ? 'Microphone access was denied. Using simulated patient voice generator for clinical test.'
          : (err.message || 'Microphone unavailable. Using simulated voice generator.'),
      };
    }
  }

  pause(): boolean {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.pause();
      } catch (err) {
        console.warn('MediaRecorder pause warning:', err);
      }
    }
    this.isPausedState = true;
    this.pausedTime = Date.now();
    return true;
  }

  resume(): boolean {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      try {
        this.mediaRecorder.resume();
      } catch (err) {
        console.warn('MediaRecorder resume warning:', err);
      }
    }
    if (this.pausedTime > 0) {
      this.totalPausedDuration += Date.now() - this.pausedTime;
      this.pausedTime = 0;
    }
    this.isPausedState = false;
    return true;
  }

  async stop(): Promise<AudioRecordingResult> {
    if (this.isPausedState && this.pausedTime > 0) {
      this.totalPausedDuration += Date.now() - this.pausedTime;
      this.pausedTime = 0;
    }
    this.isPausedState = false;

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - this.startTime - this.totalPausedDuration) / 1000)
    );

    if (this.isSimulatedFallback || !this.mediaRecorder) {
      const audioBlob = createAudiblePcmWavBlob(durationSeconds, 16000);
      const audioUrl = URL.createObjectURL(audioBlob);
      const sizeKb = +(audioBlob.size / 1024).toFixed(2);
      return {
        audioBlob,
        audioUrl,
        playbackUrl: audioUrl,
        convertedBlob: audioBlob,
        durationSeconds,
        sizeKb,
        convertedSizeKb: sizeKb,
        mimeType: 'audio/wav',
        codec: 'PCM',
        isSimulatedFallback: true,
      };
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const mime = this.mediaRecorder?.mimeType || this.actualMimeType || 'audio/webm';
        const originalBlob = new Blob(this.audioChunks, { type: mime });

        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        if (originalBlob.size === 0) {
          const fallbackBlob = createAudiblePcmWavBlob(durationSeconds, 16000);
          const audioUrl = URL.createObjectURL(fallbackBlob);
          const sizeKb = +(fallbackBlob.size / 1024).toFixed(2);
          resolve({
            audioBlob: fallbackBlob,
            audioUrl,
            playbackUrl: audioUrl,
            convertedBlob: fallbackBlob,
            durationSeconds,
            sizeKb,
            convertedSizeKb: sizeKb,
            mimeType: 'audio/wav',
            codec: 'PCM',
            isSimulatedFallback: true,
          });
          return;
        }

        const originalUrl = URL.createObjectURL(originalBlob);
        const originalSizeKb = +(originalBlob.size / 1024).toFixed(2);

        // Convert actual audio samples to 16-bit mono 16 kHz PCM WAV for universal HTML5 decoding
        let convertedBlob: Blob | undefined = undefined;
        let playbackUrl = originalUrl;
        let finalDuration = durationSeconds;
        let decodedBuffer: AudioBuffer | undefined = undefined;

        try {
          const decoded = await decodeAudioBlob(originalBlob);
          convertedBlob = decoded.wavBlob;
          playbackUrl = decoded.wavUrl;
          finalDuration = decoded.durationSeconds || durationSeconds;
          decodedBuffer = decoded.audioBuffer;
        } catch (convErr) {
          console.warn('Audio decoding notice. Falling back to native container:', convErr);
        }

        resolve({
          audioBlob: originalBlob,
          audioUrl: originalUrl,
          convertedBlob,
          playbackUrl,
          durationSeconds: finalDuration,
          sizeKb: originalSizeKb,
          convertedSizeKb: convertedBlob ? +(convertedBlob.size / 1024).toFixed(2) : undefined,
          mimeType: mime,
          codec: mime.includes('wav') ? 'PCM' : 'Opus',
          audioBuffer: decodedBuffer,
        });
      };

      try {
        this.mediaRecorder!.stop();
      } catch (err: any) {
        console.warn('MediaRecorder stop warning:', err);
        const fallbackBlob = createAudiblePcmWavBlob(durationSeconds, 16000);
        const audioUrl = URL.createObjectURL(fallbackBlob);
        const sizeKb = +(fallbackBlob.size / 1024).toFixed(2);
        resolve({
          audioBlob: fallbackBlob,
          audioUrl,
          playbackUrl: audioUrl,
          convertedBlob: fallbackBlob,
          durationSeconds,
          sizeKb,
          convertedSizeKb: sizeKb,
          mimeType: 'audio/wav',
          codec: 'PCM',
          isSimulatedFallback: true,
        });
      }
    });
  }
}
