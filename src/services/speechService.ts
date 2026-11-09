// ========================================================
// Legacy SpeechService facade delegating to the unified voice subsystem
// ========================================================

import { SpeechInput } from './voice/SpeechInput';
import { SpeechInputCallbacks } from './voice/types';

export type SpeechListenCallbacks = SpeechInputCallbacks;

export const SpeechService = {
  isCurrentlyListening(): boolean {
    return SpeechInput.isCurrentlyListening();
  },

  getCurrentTranscript(): string {
    return SpeechInput.getCurrentTranscript();
  },

  async checkAvailability(): Promise<boolean> {
    const status = await SpeechInput.getEngineStatus();
    return status.speechRecognizerAvailable;
  },

  async requestPermissions(): Promise<boolean> {
    const res = await SpeechInput.requestPermissions();
    return res.granted;
  },

  async startListening(callbacks: SpeechListenCallbacks, langCode?: string): Promise<void> {
    return SpeechInput.startListening(callbacks, { language: langCode });
  },

  async stopListening(): Promise<string> {
    return SpeechInput.stopListening();
  },

  async cancelListening(): Promise<void> {
    return SpeechInput.cancelListening();
  }
};
