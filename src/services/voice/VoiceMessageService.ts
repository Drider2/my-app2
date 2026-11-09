// ========================================================
// VoiceMessageService: Native Audio Recording for Chat
// Powered by capacitor-voice-recorder
// Captures AAC/MP4/WebM base64 audio payloads for Hermes
// ========================================================

import { Capacitor } from '@capacitor/core';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { AudioSessionManager } from './AudioSessionManager';
import { VoiceMessagePayload } from './types';

class VoiceMessageServiceClass {
  private isRecording = false;
  private recordingStartTime = 0;
  private durationInterval: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  public onMaxDurationReached?: () => void;

  constructor() {
    AudioSessionManager.registerCleanup('recording', () => this.cancelRecording());
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Formats milliseconds or seconds into MM:SS format (e.g. 0:08, 1:23)
   */
  public formatDuration(msOrSec: number, isSeconds = false): string {
    const totalSecs = Math.floor(isSeconds ? msOrSec : msOrSec / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  public async hasPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await VoiceRecorder.hasAudioRecordingPermission();
        return res.value;
      } catch {
        return false;
      }
    }
    return true;
  }

  public async requestPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await VoiceRecorder.requestAudioRecordingPermission();
        return res.value;
      } catch {
        return false;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  public async startRecording(onTick?: (elapsedMs: number) => void): Promise<boolean> {
    if (this.isRecording) {
      await this.cancelRecording();
    }

    const hasPerm = await this.requestPermission();
    if (!hasPerm) {
      return false;
    }

    await AudioSessionManager.transitionTo('recording');

    try {
      if (Capacitor.isNativePlatform()) {
        const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
        if (!canRecord.value) {
          await AudioSessionManager.transitionTo('idle');
          return false;
        }
        const res = await VoiceRecorder.startRecording();
        if (!res.value) {
          await AudioSessionManager.transitionTo('idle');
          return false;
        }
      } else {
        // Web MediaRecorder fallback
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.audioChunks = [];
          this.mediaRecorder = new MediaRecorder(stream);
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };
          this.mediaRecorder.start(200);
        }
      }

      this.isRecording = true;
      this.recordingStartTime = Date.now();

      if (onTick) {
        this.durationInterval = setInterval(() => {
          if (this.isRecording) {
            const elapsed = Date.now() - this.recordingStartTime;
            onTick(elapsed);
            if (elapsed >= 180000) {
              this.onMaxDurationReached?.();
            }
          }
        }, 100);
      }

      return true;
    } catch (e) {
      console.error('Failed to start audio recording:', e);
      this.isRecording = false;
      await AudioSessionManager.transitionTo('idle');
      return false;
    }
  }

  public async stopRecording(): Promise<VoiceMessagePayload | null> {
    if (!this.isRecording) return null;
    this.isRecording = false;

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    const durationMs = Math.max(500, Date.now() - this.recordingStartTime);

    try {
      if (Capacitor.isNativePlatform()) {
        const result = await VoiceRecorder.stopRecording();
        await AudioSessionManager.transitionTo('idle');

        if (result?.value?.recordDataBase64) {
          return {
            base64Audio: result.value.recordDataBase64,
            mimeType: result.value.mimeType || 'audio/aac',
            durationMs: result.value.msDuration || durationMs,
          };
        }
      } else {
        // Web MediaRecorder finish
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          const stoppedPromise = new Promise<Blob>((resolve) => {
            if (!this.mediaRecorder) return resolve(new Blob());
            this.mediaRecorder.onstop = () => {
              const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
              resolve(blob);
            };
            this.mediaRecorder.stop();
          });

          const audioBlob = await stoppedPromise;
          if (this.mediaRecorder.stream) {
            this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
          }

          const base64 = await this.blobToBase64(audioBlob);
          await AudioSessionManager.transitionTo('idle');

          return {
            base64Audio: base64,
            mimeType: 'audio/webm',
            durationMs,
          };
        }
      }
    } catch (e) {
      console.error('Failed to stop recording:', e);
    }

    await AudioSessionManager.transitionTo('idle');
    return null;
  }

  public async cancelRecording(): Promise<void> {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await VoiceRecorder.stopRecording();
      } else if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
      }
    } catch {}

    this.audioChunks = [];
    this.mediaRecorder = null;
    await AudioSessionManager.transitionTo('idle');
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }
}

export const VoiceMessageService = new VoiceMessageServiceClass();
