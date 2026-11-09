// ========================================================
// VoiceSettingsView: Settings > Voice
// Manages language, voice, speech rate, read-aloud toggle,
// and diagnostics with live mic and voice testing.
// ========================================================

import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  Mic, 
  Play, 
  Square, 
  Settings2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  Trash2,
  HardDrive
} from 'lucide-react';
import { db } from '../../services/storage';
import { HermesStorage } from '../../services/hermesStorage';
import { SpeechInput } from '../../services/voice/SpeechInput';
import { SpeechOutput } from '../../services/voice/SpeechOutput';
import { TTSVoiceOption, VoiceEngineStatus } from '../../services/voice/types';
import { VoiceSettings, DEFAULT_VOICE_SETTINGS } from '../../types';
import { useTranslation } from '../../services/i18n';

interface VoiceSettingsViewProps {
  draftValue?: VoiceSettings;
  onChange?: (updated: VoiceSettings) => void;
  onSettingsChanged?: () => void;
}

export const VoiceSettingsView: React.FC<VoiceSettingsViewProps> = ({ 
  draftValue,
  onChange,
  onSettingsChanged 
}) => {
  const { t, language: appLanguage } = useTranslation();
  const [internalSettings, setInternalSettings] = useState<VoiceSettings>(() => {
    const s = db.getState().settings.voice;
    return s ? { ...DEFAULT_VOICE_SETTINGS, ...s } : { ...DEFAULT_VOICE_SETTINGS };
  });

  const voiceSettings = draftValue || internalSettings;

  const [engineStatus, setEngineStatus] = useState<VoiceEngineStatus | null>(null);
  const [availableVoices, setAvailableVoices] = useState<TTSVoiceOption[]>([]);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestText, setMicTestText] = useState('');
  const [isSpeakingSample, setIsSpeakingSample] = useState(false);
  const [voiceStorageStats, setVoiceStorageStats] = useState(() => HermesStorage.getVoiceStorageStats());
  const [storageCleanedMsg, setStorageCleanedMsg] = useState<string | null>(null);

  const handleClearVoiceAudio = () => {
    const cleared = HermesStorage.clearAllVoiceAudio();
    const updated = HermesStorage.getVoiceStorageStats();
    setVoiceStorageStats(updated);
    setStorageCleanedMsg(`Cleared ${cleared} voice recording(s).`);
    setTimeout(() => setStorageCleanedMsg(null), 3000);
  };

  useEffect(() => {
    loadEngineStatus();
    loadVoices();
  }, [voiceSettings.language, appLanguage]);

  const loadEngineStatus = async () => {
    const status = await SpeechInput.getEngineStatus();
    setEngineStatus(status);
  };

  const loadVoices = async () => {
    const targetLang = voiceSettings.language === 'auto' || !voiceSettings.language 
      ? appLanguage 
      : voiceSettings.language;
    const voices = await SpeechOutput.getAvailableVoices(targetLang);
    setAvailableVoices(voices);
  };

  const updateSetting = <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    const updated = { ...voiceSettings, [key]: value };
    if (onChange) {
      onChange(updated);
    } else {
      setInternalSettings(updated);
      db.updateState(draft => {
        draft.settings.voice = updated;
      });
      onSettingsChanged?.();
    }
  };

  // Test microphone input
  const handleTestMic = async () => {
    if (isTestingMic) {
      await SpeechInput.stopListening();
      setIsTestingMic(false);
      return;
    }

    setMicTestText('');
    setIsTestingMic(true);

    const lang = voiceSettings.language === 'auto' ? appLanguage : voiceSettings.language;
    await SpeechInput.startListening({
      onStart: () => setIsTestingMic(true),
      onPartial: (text) => setMicTestText(text),
      onResult: (finalText) => {
        setMicTestText(finalText);
        setIsTestingMic(false);
      },
      onError: (err) => {
        setMicTestText(`Error: ${err}`);
        setIsTestingMic(false);
      },
      onEnd: () => setIsTestingMic(false),
    }, { language: lang });
  };

  // Test speech output
  const handleTestVoice = async () => {
    if (isSpeakingSample) {
      await SpeechOutput.stop();
      setIsSpeakingSample(false);
      return;
    }

    setIsSpeakingSample(true);
    const lang = voiceSettings.language === 'auto' ? appLanguage : voiceSettings.language;

    const sampleText = 
      lang?.startsWith('ar') ? 'مرحباً، أنا هرمس. تم ضبط إعدادات الصوت بنجاح.' :
      lang?.startsWith('fr') ? 'Bonjour, je suis Hermes. Vos paramètres vocaux fonctionnent parfaitement.' :
      'Hello, I am Hermes. Your voice settings are configured correctly.';

    await SpeechOutput.speak(sampleText, {
      lang: SpeechInput.resolveLanguageTag(lang),
      rate: voiceSettings.speechRate || 1.0,
      pitch: voiceSettings.speechPitch || 1.0,
      onComplete: () => setIsSpeakingSample(false),
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shrink-0 mt-0.5">
          <Volume2 className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            {t('voice.settingsTitle', 'Voice & Speech Engine')}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {t('voice.settingsSubtitle', 'Configure speech recognition, text-to-speech voice, rate, and hands-free options.')}
          </p>
        </div>
      </div>

      {/* 2. Language & Voice Selection */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
        <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[var(--color-accent)]" />
          <span>{t('voice.languageSection', 'Language & Voice Profile')}</span>
        </h4>

        {/* Speech Language */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--color-text-secondary)] font-medium">
            {t('voice.speechLanguage', 'Speech Recognition Language')}
          </label>
          <select
            value={voiceSettings.language || 'auto'}
            onChange={(e) => updateSetting('language', e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] tap-feedback"
          >
            <option value="auto" className="bg-zinc-900 text-white">
              {t('voice.autoLanguage', 'Auto (Follow app language)')}
            </option>
            <option value="en-US" className="bg-zinc-900 text-white">English (United States - en-US)</option>
            <option value="fr-FR" className="bg-zinc-900 text-white">Français (France - fr-FR)</option>
            <option value="ar-SA" className="bg-zinc-900 text-white">العربية (الفصحى - ar-SA)</option>
            <option value="ar-DZ" className="bg-zinc-900 text-white">العربية (الجزائر - ar-DZ)</option>
          </select>
        </div>

        {/* Voice Selection (if available) */}
        {availableVoices.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-secondary)] font-medium">
              {t('voice.voiceProfile', 'Speech Output Voice')}
            </label>
            <select
              value={voiceSettings.voiceURI || ''}
              onChange={(e) => {
                const selected = availableVoices.find(v => v.voiceURI === e.target.value);
                updateSetting('voiceURI', e.target.value);
                if (selected) {
                  updateSetting('voiceName', selected.name);
                }
              }}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] tap-feedback"
            >
              <option value="" className="bg-zinc-900 text-white">
                {t('voice.defaultSystemVoice', 'System Default Voice')}
              </option>
              {availableVoices.map((v, idx) => (
                <option key={v.voiceURI || idx} value={v.voiceURI} className="bg-zinc-900 text-white">
                  {v.name} {v.default ? `(${t('voice.default', 'Default')})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Speech Rate Slider */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-[var(--color-text-secondary)]">
              {t('voice.speechRate', 'Speech Rate')}
            </span>
            <span className="font-mono text-[var(--color-accent)] font-bold">
              {voiceSettings.speechRate?.toFixed(1) || '1.0'}x
            </span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.1"
            value={voiceSettings.speechRate || 1.0}
            onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
            className="w-full accent-[var(--color-accent)] h-1.5 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>

        {/* Read Replies Aloud Toggle */}
        <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between min-h-[44px]">
          <div>
            <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
              {t('voice.readRepliesAloud', 'Read Replies Aloud')}
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {t('voice.readRepliesAloudDesc', 'Hermes will automatically speak text answers aloud')}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={voiceSettings.readRepliesAloud || false}
            onClick={() => updateSetting('readRepliesAloud', !voiceSettings.readRepliesAloud)}
            className={`w-12 h-7 rounded-full p-1 transition-colors tap-feedback ${
              voiceSettings.readRepliesAloud ? 'bg-[var(--color-accent)]' : 'bg-white/15'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
              voiceSettings.readRepliesAloud ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* 3. Testing Section */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
        <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
          <span>{t('voice.testingSection', 'Live Audio Diagnostics')}</span>
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Test Voice (TTS) */}
          <button
            type="button"
            onClick={handleTestVoice}
            className="min-h-[44px] p-3 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 text-xs font-semibold text-[var(--color-text-primary)] tap-feedback flex items-center justify-center gap-2 transition-all"
          >
            {isSpeakingSample ? (
              <>
                <Square className="w-4 h-4 text-rose-400 fill-current" />
                <span>{t('voice.stopVoice', 'Stop Voice')}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-[var(--color-accent)]" />
                <span>{t('voice.testVoice', 'Test Voice')}</span>
              </>
            )}
          </button>

          {/* Test Mic (Speech Recognition) */}
          <button
            type="button"
            onClick={handleTestMic}
            className={`min-h-[44px] p-3 rounded-2xl border text-xs font-semibold tap-feedback flex items-center justify-center gap-2 transition-all ${
              isTestingMic
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 animate-pulse'
                : 'bg-white/[0.04] border-[var(--color-border)] hover:border-[var(--color-accent)]/50 text-[var(--color-text-primary)]'
            }`}
          >
            <Mic className="w-4 h-4 text-purple-400" />
            <span>{isTestingMic ? t('voice.listening', 'Listening...') : t('voice.testMic', 'Test Mic')}</span>
          </button>
        </div>

        {/* Live Mic Test Display */}
        {(isTestingMic || micTestText) && (
          <div className="p-3 rounded-2xl bg-black/40 border border-purple-500/30 text-xs text-purple-200">
            <span className="text-[11px] text-zinc-400 block mb-1">
              {isTestingMic ? t('voice.speakNowNotice', 'Speak into the mic...') : t('voice.recognizedResult', 'Recognized text:')}
            </span>
            <p className="font-mono">{micTestText || '...'}</p>
          </div>
        )}
      </div>

      {/* 4. Engine Status & Help */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2 text-xs">
        <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
          <span>{t('voice.engineStatus', 'Native Recognition Engine:')}</span>
          <span className="flex items-center gap-1 font-medium">
            {engineStatus?.speechRecognizerAvailable ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Ready</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">System Dialog Fallback</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
          <span>{t('voice.permStatus', 'Microphone Permission:')}</span>
          <span className="flex items-center gap-1 font-medium">
            {engineStatus?.permissionGranted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Granted</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">Not Granted</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* 5. Voice Storage & Privacy */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-primary)]">
          <HardDrive className="w-4 h-4 text-[var(--color-accent)]" />
          <span>{t('voice.storageTitle', 'Voice Audio Storage & Privacy')}</span>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {t('voice.storageDesc', 'Recorded voice messages are stored locally on this phone. You can clear the raw audio files anytime to free up storage while keeping message transcripts intact.')}
        </p>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-[var(--color-border)] flex items-center justify-between text-xs">
          <div>
            <span className="text-[var(--color-text-secondary)] block text-[11px]">
              {t('voice.storedVoiceNotes', 'Stored Voice Notes')}
            </span>
            <span className="font-semibold text-sm font-mono text-[var(--color-text-primary)]">
              {voiceStorageStats.count} ({voiceStorageStats.formattedSize})
            </span>
          </div>

          <button
            type="button"
            onClick={handleClearVoiceAudio}
            disabled={voiceStorageStats.count === 0}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-red-400 border border-red-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('voice.clearAudioBtn', 'Clear Audio')}</span>
          </button>
        </div>

        {storageCleanedMsg && (
          <p className="text-xs text-emerald-400 font-medium animate-fade-in">
            {storageCleanedMsg}
          </p>
        )}
      </div>
    </div>
  );
};
