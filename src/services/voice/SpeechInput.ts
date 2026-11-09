// ========================================================
// SpeechInput: Native Speech Recognition & Silence Detection
// Powered by @capacitor-community/speech-recognition
// Resolves regional BCP-47 tags, handles partial results,
// auto-stops on silence, and provides native dialog fallback.
// ========================================================

import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { AudioSessionManager } from './AudioSessionManager';
import { SpeechInputCallbacks, VoiceEngineStatus } from './types';

export class SpeechInputClass {
  private isListening = false;
  private currentTranscript = '';
  private partialListenerHandle: any = null;
  private listeningStateHandle: any = null;
  private activeCallbacks: SpeechInputCallbacks | null = null;
  private silenceTimer: any = null;
  private maxDurationTimer: any = null;
  private silenceThresholdMs = 1300; // 1.3s of silence after speech to auto-stop
  private maxListeningDurationMs = 15000; // 15s max safety timeout

  constructor() {
    AudioSessionManager.registerCleanup('listening', () => this.cancelListening());
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  /**
   * Diagnostic verification of device speech capabilities
   */
  public async getEngineStatus(): Promise<VoiceEngineStatus> {
    const isNative = Capacitor.isNativePlatform();
    let recognizerAvailable = false;
    let supportedLangs: string[] = [];
    let permGranted = false;
    let permanentlyDenied = false;

    if (isNative) {
      try {
        const { available } = await SpeechRecognition.available();
        recognizerAvailable = available;
      } catch {
        recognizerAvailable = false;
      }

      try {
        const langs = await SpeechRecognition.getSupportedLanguages();
        if (langs && langs.languages) {
          supportedLangs = langs.languages;
        }
      } catch {
        supportedLangs = [];
      }

      try {
        const check = await SpeechRecognition.checkPermissions();
        permGranted = check.speechRecognition === 'granted';
        permanentlyDenied = check.speechRecognition === 'denied';
      } catch {
        permGranted = false;
      }
    } else {
      const win = window as any;
      recognizerAvailable = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
      permGranted = true;
    }

    return {
      speechRecognizerAvailable: recognizerAvailable,
      ttsAvailable: true,
      voiceRecorderAvailable: true,
      supportedLanguages: supportedLangs,
      permissionGranted: permGranted,
      permanentlyDenied,
    };
  }

  /**
   * Request microphone permissions with denied detection
   */
  public async requestPermissions(): Promise<{ granted: boolean; permanentlyDenied: boolean }> {
    if (Capacitor.isNativePlatform()) {
      try {
        const check = await SpeechRecognition.checkPermissions();
        if (check.speechRecognition === 'granted') {
          return { granted: true, permanentlyDenied: false };
        }
        const req = await SpeechRecognition.requestPermissions();
        const granted = req.speechRecognition === 'granted';
        return { granted, permanentlyDenied: !granted };
      } catch (e) {
        console.error('Speech recognition permission error:', e);
        return { granted: false, permanentlyDenied: true };
      }
    }
    return { granted: true, permanentlyDenied: false };
  }

  /**
   * Resolves app language to exact BCP-47 tag supported by Android
   */
  public resolveLanguageTag(appLang?: string, overrideTag?: string): string {
    if (overrideTag && overrideTag !== 'auto') {
      return overrideTag;
    }
    if (appLang === 'ar') return 'ar-SA';
    if (appLang === 'fr') return 'fr-FR';
    return 'en-US';
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.silenceTimer = setTimeout(() => {
      // User was speaking and paused for silenceThresholdMs -> auto finish
      if (this.isListening && this.currentTranscript.trim()) {
        this.stopListening();
      }
    }, this.silenceThresholdMs);
  }

  private clearAllTimers(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  private async cleanupNativeListeners(): Promise<void> {
    this.clearAllTimers();
    if (this.partialListenerHandle) {
      try {
        await this.partialListenerHandle.remove();
      } catch {}
      this.partialListenerHandle = null;
    }
    if (this.listeningStateHandle) {
      try {
        await this.listeningStateHandle.remove();
      } catch {}
      this.listeningStateHandle = null;
    }
  }

  /**
   * Start listening for voice with silence auto-stop and regional BCP-47 resolution
   */
  public async startListening(
    callbacks: SpeechInputCallbacks,
    options?: {
      language?: string;
      silenceSeconds?: number;
      preferPopup?: boolean;
    }
  ): Promise<void> {
    if (this.isListening) {
      await this.stopListening();
    }

    await AudioSessionManager.transitionTo('listening');

    this.activeCallbacks = callbacks;
    this.currentTranscript = '';
    if (options?.silenceSeconds && options.silenceSeconds > 0.5) {
      this.silenceThresholdMs = Math.round(options.silenceSeconds * 1000);
    }

    const resolvedLang = this.resolveLanguageTag(options?.language);
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const { granted, permanentlyDenied } = await this.requestPermissions();
      if (!granted) {
        await AudioSessionManager.transitionTo('idle');
        callbacks.onError(
          'Microphone permission denied. Please allow microphone access in settings.',
          permanentlyDenied ? 'PERMISSION_PERMANENTLY_DENIED' : 'PERMISSION_DENIED'
        );
        callbacks.onEnd?.();
        return;
      }

      await this.cleanupNativeListeners();

      // Listen for partial results
      this.partialListenerHandle = await SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
        if (data && data.matches && data.matches.length > 0) {
          const text = data.matches[0];
          if (text && text.trim()) {
            this.currentTranscript = text.trim();
            callbacks.onPartial?.(this.currentTranscript);
            this.resetSilenceTimer();
          }
        }
      });

      // Listen for Android listeningState
      this.listeningStateHandle = await SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
        if (data && data.status === 'stopped') {
          if (this.isListening) {
            this.finishSession();
          }
        }
      });

      this.isListening = true;
      callbacks.onStart?.();

      // Max listening duration timeout
      this.maxDurationTimer = setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
        }
      }, this.maxListeningDurationMs);

      // Path A: In-app background recognition
      try {
        await SpeechRecognition.start({
          language: resolvedLang,
          maxResults: 3,
          prompt: 'Hermes is listening...',
          partialResults: true,
          popup: options?.preferPopup || false,
        });
      } catch (inAppErr: any) {
        console.warn('In-app speech recognition failed, attempting system voice popup fallback:', inAppErr);

        // Path B: Fallback to system voice dialog (ACTION_RECOGNIZE_SPEECH)
        try {
          const popupResult = await SpeechRecognition.start({
            language: resolvedLang,
            maxResults: 1,
            prompt: 'Speak to Hermes...',
            partialResults: false,
            popup: true,
          });

          this.isListening = false;
          await this.cleanupNativeListeners();
          await AudioSessionManager.transitionTo('idle');

          if (popupResult && popupResult.matches && popupResult.matches.length > 0) {
            const spoken = popupResult.matches[0].trim();
            if (spoken) {
              this.currentTranscript = spoken;
              callbacks.onResult(spoken);
              callbacks.onEnd?.();
              return;
            }
          }

          callbacks.onError('No speech detected.', 'NO_MATCH');
          callbacks.onEnd?.();
          return;
        } catch (popupErr: any) {
          this.isListening = false;
          await this.cleanupNativeListeners();
          await AudioSessionManager.transitionTo('idle');
          const msg = popupErr?.message || String(popupErr);
          if (msg.includes('cancel') || msg.includes('canceled') || msg.includes('cancelled')) {
            callbacks.onEnd?.();
            return;
          }
          callbacks.onError('Speech recognition is not available or was cancelled on this device.', 'SERVICE_UNAVAILABLE');
          callbacks.onEnd?.();
          return;
        }
      }
    } else {
      // Web fallback
      const win = window as any;
      const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        await AudioSessionManager.transitionTo('idle');
        callbacks.onError('Speech recognition is not supported in this browser environment.', 'NOT_SUPPORTED');
        callbacks.onEnd?.();
        return;
      }

      try {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = resolvedLang;

        let finalCaptured = '';

        recognition.onstart = () => {
          this.isListening = true;
          callbacks.onStart?.();
          this.resetSilenceTimer();
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalCaptured += transcript;
            } else {
              interim += transcript;
            }
          }
          const current = (finalCaptured + ' ' + interim).trim();
          if (current) {
            this.currentTranscript = current;
            callbacks.onPartial?.(current);
            this.resetSilenceTimer();
          }
        };

        recognition.onerror = (event: any) => {
          this.isListening = false;
          this.clearAllTimers();
          AudioSessionManager.transitionTo('idle');
          if (event.error === 'no-speech') {
            callbacks.onError('No speech detected. Please speak closer to the mic.', 'NO_SPEECH');
          } else if (event.error === 'not-allowed') {
            callbacks.onError('Microphone access blocked. Please allow mic permission.', 'PERMISSION_DENIED');
          } else {
            callbacks.onError(`Speech recognition error: ${event.error}`, event.error);
          }
          callbacks.onEnd?.();
        };

        recognition.onend = () => {
          this.isListening = false;
          this.clearAllTimers();
          AudioSessionManager.transitionTo('idle');
          const transcript = (finalCaptured || this.currentTranscript).trim();
          if (transcript) {
            callbacks.onResult(transcript);
          }
          callbacks.onEnd?.();
        };

        recognition.start();
      } catch (err: any) {
        this.isListening = false;
        this.clearAllTimers();
        await AudioSessionManager.transitionTo('idle');
        callbacks.onError(err?.message || 'Failed to start speech recognition.', 'INTERNAL_ERROR');
        callbacks.onEnd?.();
      }
    }
  }

  private async finishSession(): Promise<void> {
    if (!this.isListening) return;
    this.isListening = false;
    const finalTranscript = this.currentTranscript.trim();
    await this.cleanupNativeListeners();
    await AudioSessionManager.transitionTo('idle');

    if (finalTranscript) {
      this.activeCallbacks?.onResult(finalTranscript);
    } else {
      this.activeCallbacks?.onError('No speech detected. Please speak closer to the mic.', 'NO_SPEECH');
    }
    this.activeCallbacks?.onEnd?.();
  }

  /**
   * Stop listening and deliver whatever speech was transcribed so far
   */
  public async stopListening(): Promise<string> {
    if (!this.isListening) return this.currentTranscript;
    this.isListening = false;

    if (Capacitor.isNativePlatform()) {
      try {
        await SpeechRecognition.stop();
      } catch (e) {
        console.warn('Error stopping native recognizer:', e);
      }
    }

    await this.cleanupNativeListeners();
    await AudioSessionManager.transitionTo('idle');

    const result = this.currentTranscript.trim();
    if (result && this.activeCallbacks) {
      this.activeCallbacks.onResult(result);
      this.activeCallbacks.onEnd?.();
    }
    return result;
  }

  /**
   * Cancel listening immediately without triggering result
   */
  public async cancelListening(): Promise<void> {
    this.isListening = false;
    this.currentTranscript = '';

    if (Capacitor.isNativePlatform()) {
      try {
        await SpeechRecognition.stop();
      } catch {}
    }

    await this.cleanupNativeListeners();
    await AudioSessionManager.transitionTo('idle');
    this.activeCallbacks?.onEnd?.();
  }
}

export const SpeechInput = new SpeechInputClass();
