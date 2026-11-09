// ========================================================
// GreenDream Voice Subsystem Types
// ========================================================

export type AudioSessionState = 
  | 'idle' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'recording' 
  | 'playing';

export interface SpeechInputCallbacks {
  onStart?: () => void;
  onPartial?: (text: string) => void;
  onResult: (text: string) => void;
  onError: (error: string, code?: string) => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void;
}

export interface TTSVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
}

export interface VoiceEngineStatus {
  speechRecognizerAvailable: boolean;
  ttsAvailable: boolean;
  voiceRecorderAvailable: boolean;
  supportedLanguages: string[];
  permissionGranted: boolean;
  permanentlyDenied: boolean;
}

export interface VoiceMessagePayload {
  base64Audio: string;
  mimeType: string;
  durationMs: number;
  localUri?: string;
  transcript?: string;
}
