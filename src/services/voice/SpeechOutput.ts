// ========================================================
// SpeechOutput: Native Text-To-Speech with Sentence Streaming
// Powered by @capacitor-community/text-to-speech
// Strips markdown/emojis and queues sentences as LLM streams
// to ensure speech starts within ~1.2-1.5s.
// ========================================================

import { Capacitor } from '@capacitor/core';
import { TextToSpeech, TTSOptions, SpeechSynthesisVoice } from '@capacitor-community/text-to-speech';
import { AudioSessionManager } from './AudioSessionManager';
import { TTSVoiceOption } from './types';

export class SpeechOutputClass {
  private isSpeaking = false;
  private sentenceQueue: string[] = [];
  private isProcessingQueue = false;
  private pendingBuffer = '';
  private currentLanguage = 'en-US';
  private currentRate = 1.0;
  private currentPitch = 1.0;
  private selectedVoiceIndex?: number;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  public onSentenceStart?: (sentence: string) => void;
  public onQueueComplete?: () => void;

  constructor() {
    AudioSessionManager.registerCleanup('speaking', () => this.stop());
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Sanitizes markdown, code blocks, emojis, and tables for clean audio pronunciation
   */
  public cleanTextForSpeech(text: string): string {
    if (!text) return '';

    let clean = text;

    // 1. Detect markdown tables and replace with polite spoken notice
    clean = clean.replace(/(?:^|\n)\s*\|.+?\|(?:\s*\n\s*\|.+?\|)+/g, ' I have displayed the detailed table in the chat. ');

    // 2. Remove fenced code blocks
    clean = clean.replace(/```[\s\S]*?```/g, ' I have included the code in the chat. ');

    // 3. Remove inline code snippets
    clean = clean.replace(/`([^`]+)`/g, '$1');

    // 4. Convert markdown links [title](url) to title
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 5. Remove headers, bullet points, horizontal rules
    clean = clean.replace(/^[#*>-]+\s+/gm, '');

    // 6. Remove bold, italic, and strikethrough markdown
    clean = clean.replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1');

    // 7. Strip URLs
    clean = clean.replace(/https?:\/\/\S+/g, '');

    // 8. Strip common emojis and symbols that sound awkward in TTS
    clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    // 9. Normalize multiple spaces and line breaks
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
  }

  /**
   * Discovers voices available on the device
   */
  public async getAvailableVoices(langCode?: string): Promise<TTSVoiceOption[]> {
    if (Capacitor.isNativePlatform()) {
      try {
        if (this.cachedVoices.length === 0) {
          const res = await TextToSpeech.getSupportedVoices();
          this.cachedVoices = res.voices || [];
        }

        const filtered = langCode 
          ? this.cachedVoices.filter(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase().slice(0, 2)))
          : this.cachedVoices;

        return filtered.map(v => ({
          voiceURI: v.voiceURI,
          name: v.name,
          lang: v.lang,
          default: v.default,
        }));
      } catch (e) {
        console.warn('Failed to load native voices:', e);
        return [];
      }
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        const filtered = langCode 
          ? voices.filter(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase().slice(0, 2)))
          : voices;

        return filtered.map(v => ({
          voiceURI: v.voiceURI,
          name: v.name,
          lang: v.lang,
          default: v.default,
        }));
      }
      return [];
    }
  }

  public setRate(rate: number): void {
    if (rate >= 0.7 && rate <= 1.5) {
      this.currentRate = rate;
    }
  }

  public setPitch(pitch: number): void {
    if (pitch >= 0.8 && pitch <= 1.2) {
      this.currentPitch = pitch;
    }
  }

  public setVoiceIndex(index?: number): void {
    this.selectedVoiceIndex = index;
  }

  /**
   * Speak a complete text string directly
   */
  public async speak(
    text: string, 
    options?: { 
      lang?: string; 
      rate?: number; 
      pitch?: number; 
      voiceIndex?: number;
      onComplete?: () => void;
    }
  ): Promise<void> {
    await this.stop();

    const sanitized = this.cleanTextForSpeech(text);
    if (!sanitized) {
      options?.onComplete?.();
      return;
    }

    await this.executeSpeak(sanitized, options);
  }

  private async executeSpeak(
    sanitized: string,
    options?: {
      lang?: string;
      rate?: number;
      pitch?: number;
      voiceIndex?: number;
      onComplete?: () => void;
    }
  ): Promise<void> {
    await AudioSessionManager.transitionTo('speaking');
    this.isSpeaking = true;

    const lang = options?.lang || this.currentLanguage;
    const rate = options?.rate || this.currentRate;
    const pitch = options?.pitch || this.currentPitch;
    const voice = options?.voiceIndex ?? this.selectedVoiceIndex;

    if (Capacitor.isNativePlatform()) {
      try {
        const ttsOptions: TTSOptions = {
          text: sanitized,
          lang,
          rate,
          pitch,
          voice,
        };
        await TextToSpeech.speak(ttsOptions);
      } catch (e) {
        console.warn('Native TTS speak failed:', e);
      } finally {
        this.isSpeaking = false;
        await AudioSessionManager.transitionTo('idle');
        options?.onComplete?.();
      }
    } else {
      // Browser Web Speech Synthesis fallback
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(sanitized);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onend = () => {
          this.isSpeaking = false;
          AudioSessionManager.transitionTo('idle');
          options?.onComplete?.();
        };

        utterance.onerror = () => {
          this.isSpeaking = false;
          AudioSessionManager.transitionTo('idle');
          options?.onComplete?.();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        this.isSpeaking = false;
        await AudioSessionManager.transitionTo('idle');
        options?.onComplete?.();
      }
    }
  }

  /**
   * Queue text chunks from an active LLM stream and speak sentence-by-sentence
   */
  public queueChunk(chunk: string, lang?: string): void {
    if (lang) this.currentLanguage = lang;
    this.pendingBuffer += chunk;

    // Detect completed sentence boundaries (. ! ? or newline)
    const sentenceBoundaryRegex = /([.!?\n]+[\s]+)/;
    let match: RegExpExecArray | null;

    while ((match = sentenceBoundaryRegex.exec(this.pendingBuffer)) !== null) {
      const boundaryIndex = match.index + match[0].length;
      const sentence = this.pendingBuffer.slice(0, boundaryIndex).trim();
      this.pendingBuffer = this.pendingBuffer.slice(boundaryIndex);

      if (sentence) {
        const clean = this.cleanTextForSpeech(sentence);
        if (clean) {
          this.sentenceQueue.push(clean);
          this.processQueue();
        }
      }
    }
  }

  /**
   * Signals that LLM streaming has ended, speaking any remaining buffer
   */
  public async flushStream(lang?: string): Promise<void> {
    if (lang) this.currentLanguage = lang;
    if (this.pendingBuffer.trim()) {
      const clean = this.cleanTextForSpeech(this.pendingBuffer);
      if (clean) {
        this.sentenceQueue.push(clean);
      }
      this.pendingBuffer = '';
    }
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.sentenceQueue.length > 0) {
      const nextSentence = this.sentenceQueue.shift();
      if (nextSentence) {
        this.onSentenceStart?.(nextSentence);
        await new Promise<void>((resolve) => {
          this.executeSpeak(nextSentence, {
            lang: this.currentLanguage,
            rate: this.currentRate,
            pitch: this.currentPitch,
            voiceIndex: this.selectedVoiceIndex,
            onComplete: resolve,
          });
        });
      }
    }

    this.isProcessingQueue = false;
    this.onQueueComplete?.();
  }

  /**
   * Immediately stops any active or queued speech
   */
  public async stop(): Promise<void> {
    this.sentenceQueue = [];
    this.pendingBuffer = '';
    this.isProcessingQueue = false;

    if (this.isSpeaking) {
      this.isSpeaking = false;
      if (Capacitor.isNativePlatform()) {
        try {
          await TextToSpeech.stop();
        } catch {}
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    await AudioSessionManager.transitionTo('idle');
  }
}

export const SpeechOutput = new SpeechOutputClass();
