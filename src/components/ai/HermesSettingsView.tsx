import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Key, 
  Eye, 
  EyeOff, 
  Clipboard, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Lock,
  Sliders,
  Database
} from 'lucide-react';
import { db } from '../../services/storage';
import { HermesStorage } from '../../services/hermesStorage';
import { HermesGeminiService, DEFAULT_MODELS } from '../../services/hermesGeminiService';
import { AIAssistantSettings, HermesMode, HermesShareContext } from '../../types';
import { useTranslation } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

export interface HermesDraftSettings {
  apiKey: string;
  model: string;
  hermesMode: HermesMode;
  shareContext: HermesShareContext;
  hermesServerUrl: string;
}

interface HermesSettingsViewProps {
  onRefresh?: () => void;
  draftValue?: HermesDraftSettings;
  onChange?: (updated: HermesDraftSettings) => void;
  onRequestSave?: () => void;
}

export const HermesSettingsView: React.FC<HermesSettingsViewProps> = ({ 
  onRefresh,
  draftValue,
  onChange,
  onRequestSave,
}) => {
  const { t, isRtl } = useTranslation();
  const state = db.getState();
  const appModules = state.settings.modules || {};

  const [settings, setSettings] = useState<AIAssistantSettings>(() => HermesStorage.getSettings());
  const [internalApiKey, setInternalApiKey] = useState<string>(() => HermesStorage.getApiKey());
  const [showKey, setShowKey] = useState<boolean>(false);
  
  // Model and mode state
  const [internalModel, setInternalModel] = useState<string>(settings.model || 'gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<string[]>(
    settings.available_models && settings.available_models.length > 0 
      ? settings.available_models 
      : DEFAULT_MODELS
  );
  const [internalMode, setInternalMode] = useState<HermesMode>(settings.hermesMode || 'read_data');
  const [internalShareContext, setInternalShareContext] = useState<HermesShareContext>(
    settings.shareContext || {
      prayer: true,
      finance: true,
      gym: true,
      calendar: true,
      maintenance: true,
      journal: false,
    }
  );

  // Advanced config state
  const [internalServerUrl, setInternalServerUrl] = useState<string>(settings.hermesServerUrl || '');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Active getters considering draft
  const apiKey = draftValue ? draftValue.apiKey : internalApiKey;
  const selectedModel = draftValue ? draftValue.model : internalModel;
  const hermesMode = draftValue ? draftValue.hermesMode : internalMode;
  const shareContext = draftValue ? draftValue.shareContext : internalShareContext;
  const serverUrl = draftValue ? draftValue.hermesServerUrl : internalServerUrl;

  const notifyDraft = (patch: Partial<HermesDraftSettings>) => {
    if (draftValue && onChange) {
      onChange({ ...draftValue, ...patch });
    }
  };

  const handleUpdateApiKey = (newKey: string) => {
    if (draftValue && onChange) {
      notifyDraft({ apiKey: newKey });
    } else {
      setInternalApiKey(newKey);
    }
  };

  const handleUpdateModel = (newModel: string) => {
    if (draftValue && onChange) {
      notifyDraft({ model: newModel });
    } else {
      setInternalModel(newModel);
    }
  };

  const handleUpdateMode = (newMode: HermesMode) => {
    if (draftValue && onChange) {
      notifyDraft({ hermesMode: newMode });
    } else {
      setInternalMode(newMode);
    }
  };

  const handleUpdateServerUrl = (newUrl: string) => {
    if (draftValue && onChange) {
      notifyDraft({ hermesServerUrl: newUrl });
    } else {
      setInternalServerUrl(newUrl);
    }
  };

  // Feedback & Loading
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Sync state if external changes occur
  useEffect(() => {
    const s = HermesStorage.getSettings();
    setSettings(s);
    if (!apiKey) {
      handleUpdateApiKey(s.apiKey || s.api_key || '');
    }
  }, []);

  // Fetch available models on mount if API key is already present
  useEffect(() => {
    if (apiKey && apiKey.trim().length > 15) {
      HermesGeminiService.fetchAvailableModels(apiKey).then(models => {
        if (models && models.length > 0) {
          setAvailableModels(models);
        }
      });
    }
  }, [apiKey]);

  const handlePasteKey = async () => {
    Haptics.tick();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          handleUpdateApiKey(text.trim());
          setFeedback(null);
        }
      }
    } catch (e) {
      console.warn('Clipboard read error', e);
    }
  };

  const handleClearKey = () => {
    Haptics.tick();
    handleUpdateApiKey('');
    setFeedback(null);
  };

  const handleTestConnection = async () => {
    Haptics.tick();
    if (!apiKey.trim()) {
      setFeedback({
        type: 'error',
        message: t('settings.hermesApiKeyPlaceholder', 'Please enter your Google Gemini API key first.')
      });
      return;
    }

    setIsTesting(true);
    setFeedback(null);

    try {
      const res = await HermesGeminiService.testConnection(apiKey.trim(), selectedModel);
      if (res.success) {
        Haptics.success();
        if (res.models && res.models.length > 0) {
          setAvailableModels(res.models);
        }
        setFeedback({
          type: 'success',
          message: `${t('settings.hermesConnected', 'Connected')}! Gemini responded in ${res.latencyMs || 0}ms. Free tier verified active.`,
          latencyMs: res.latencyMs,
        });
        setSettings(HermesStorage.getSettings());
      } else {
        Haptics.warning();
        setFeedback({
          type: 'error',
          message: res.error || t('settings.hermesConnectionFailed', 'Connection test failed.')
        });
        setSettings(HermesStorage.getSettings());
      }
    } catch (err: any) {
      Haptics.warning();
      setFeedback({
        type: 'error',
        message: err?.message || 'Network error while reaching Google Gemini.'
      });
    } finally {
      setIsTesting(false);
      onRefresh?.();
    }
  };

  const handleSaveSettings = () => {
    if (onRequestSave) {
      onRequestSave();
      return;
    }

    setIsSaving(true);
    Haptics.tick();

    try {
      // 1. Save Key and Model
      HermesStorage.saveApiKey(apiKey.trim(), selectedModel);

      // 2. Save Mode, Share Context, Server URL
      HermesStorage.updateSettings(s => {
        s.hermesMode = hermesMode;
        s.shareContext = shareContext;
        s.hermesServerUrl = serverUrl.trim();
        s.model = selectedModel;
      });

      Haptics.success();
      setFeedback({
        type: 'success',
        message: t('settings.hermesSettingsSaved', 'Hermes settings saved successfully.')
      });
      setSettings(HermesStorage.getSettings());
      onRefresh?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to save settings.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleContextModule = (key: keyof HermesShareContext) => {
    Haptics.tick();
    const updated = {
      ...shareContext,
      [key]: !shareContext[key],
    };
    if (draftValue && onChange) {
      notifyDraft({ shareContext: updated });
    } else {
      setInternalShareContext(updated);
    }
  };

  // Connection badge color
  const statusColor = 
    settings.connection_status === 'connected'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : settings.connection_status === 'error'
      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';

  const statusDot = 
    settings.connection_status === 'connected'
      ? 'bg-emerald-400 animate-pulse'
      : settings.connection_status === 'error'
      ? 'bg-rose-400'
      : 'bg-zinc-400';

  const statusLabel = 
    settings.connection_status === 'connected'
      ? t('settings.hermesConnected', 'Connected')
      : settings.connection_status === 'error'
      ? t('settings.hermesConnectionFailed', 'Error')
      : t('settings.hermesModeChatOnly', 'Not configured');

  return (
    <div className="card-premium p-5 space-y-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]  shadow-lg">
      {/* 1. Header with Badge & Identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span>{t('settings.hermesTitle', 'Hermes AI Assistant')}</span>
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
              {t('settings.hermesSubtitle', 'Private on-device AI powered by Google Gemini')}
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 shrink-0 ${statusColor}`}>
          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* 2. Google Gemini API Key Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>{t('settings.hermesApiKeyLabel', 'Google Gemini API Key')}</span>
          </label>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
          >
            <span>{t('settings.hermesGetKeyLink', 'Get free key')}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="relative flex items-center">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              handleUpdateApiKey(e.target.value);
              setFeedback(null);
            }}
            placeholder={t('settings.hermesApiKeyPlaceholder', 'AIzaSy...')}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            className="w-full text-xs font-mono px-3.5 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent)] transition-colors pr-24"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {apiKey && (
              <button
                type="button"
                onClick={handleClearKey}
                aria-label="Clear API key"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-rose-400 tap-feedback"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? 'Hide key' : 'Show key'}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] tap-feedback"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handlePasteKey}
              aria-label="Paste key from clipboard"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 tap-feedback"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Local Privacy Note */}
        <div className="flex items-start gap-2 pt-1 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{t('settings.hermesApiKeyPrivacyNote', 'Your key stays on this device. Sent directly to Google Gemini API only.')}</span>
        </div>
      </div>

      {/* 3. Action Row: Test Connection & Feedback */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isTesting || !apiKey.trim()}
          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-xs font-bold tap-feedback flex items-center justify-center gap-2 hover:bg-[var(--color-accent)]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isTesting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t('settings.hermesTesting', 'Testing connection...')}</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>{t('settings.hermesTestConnection', 'Test Connection')}</span>
            </>
          )}
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          )}
          <span className="flex-1">{feedback.message}</span>
        </div>
      )}

      {/* 4. Model Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>{t('settings.hermesModelLabel', 'Gemini Model')}</span>
          </label>
          <span className="text-[11px] text-[var(--color-accent)] font-medium">
            {availableModels.length} models available
          </span>
        </div>

        <select
          value={selectedModel}
          onChange={(e) => {
            handleUpdateModel(e.target.value);
            Haptics.tick();
          }}
          className="w-full text-xs font-semibold px-3.5 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        >
          {availableModels.map(m => (
            <option key={m} value={m} className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
              {m} {m === 'gemini-2.5-flash' ? `(${t('settings.hermesRecommended', 'Recommended')})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Hermes Intelligence Mode Selection */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>{t('settings.hermesModeLabel', 'Hermes Intelligence Mode')}</span>
        </label>

        <div className="grid grid-cols-1 gap-2">
          {/* Option A: Chat Only */}
          <button
            type="button"
            onClick={() => {
              handleUpdateMode('chat_only');
              Haptics.tick();
            }}
            className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 tap-feedback transition-all ${
              hermesMode === 'chat_only'
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]/50 hover:border-[var(--color-border)]/80'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
              hermesMode === 'chat_only' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
            }`}>
              {hermesMode === 'chat_only' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)]">
                {t('settings.hermesModeChatOnly', 'Chat Only')}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                {t('settings.hermesModeChatOnlyDesc', 'General assistant without reading your app data')}
              </p>
            </div>
          </button>

          {/* Option B: Personal Advisor */}
          <button
            type="button"
            onClick={() => {
              handleUpdateMode('read_data');
              Haptics.tick();
            }}
            className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 tap-feedback transition-all ${
              hermesMode === 'read_data'
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]/50 hover:border-[var(--color-border)]/80'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
              hermesMode === 'read_data' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
            }`}>
              {hermesMode === 'read_data' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <span>{t('settings.hermesModeReadData', 'Personal Advisor')}</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-semibold">
                  {t('settings.hermesRecommended', 'Recommended')}
                </span>
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                {t('settings.hermesModeReadDataDesc', 'Reads enabled modules to provide personalized advice')}
              </p>
            </div>
          </button>

          {/* Option C: Autonomous Agent */}
          <button
            type="button"
            onClick={() => {
              handleUpdateMode('read_and_act');
              Haptics.tick();
            }}
            className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 tap-feedback transition-all ${
              hermesMode === 'read_and_act'
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]/50 hover:border-[var(--color-border)]/80'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
              hermesMode === 'read_and_act' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
            }`}>
              {hermesMode === 'read_and_act' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)]">
                {t('settings.hermesModeReadAndAct', 'Autonomous Agent')}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                {t('settings.hermesModeReadAndActDesc', 'Can read data and suggest actions with your explicit confirmation')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 6. Context Sharing Switches (if mode is not chat_only) */}
      {hermesMode !== 'chat_only' && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>{t('settings.hermesContextSharing', 'Context Sharing Permissions')}</span>
              </label>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                {t('settings.hermesContextSharingDesc', 'Select which modules Hermes can analyze')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Finance Switch */}
            {appModules.finance !== false && (
              <button
                type="button"
                onClick={() => toggleContextModule('finance')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between tap-feedback ${
                  shareContext.finance 
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/50 text-[var(--color-text-primary)]' 
                    : 'bg-[var(--color-surface)]/40 border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <span className="text-xs font-semibold">{t('settings.hermesModuleFinance', 'Finance')}</span>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  shareContext.finance ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
                }`}>
                  {shareContext.finance && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </span>
              </button>
            )}

            {/* Gym Switch */}
            {appModules.gym !== false && (
              <button
                type="button"
                onClick={() => toggleContextModule('gym')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between tap-feedback ${
                  shareContext.gym 
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/50 text-[var(--color-text-primary)]' 
                    : 'bg-[var(--color-surface)]/40 border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <span className="text-xs font-semibold">{t('settings.hermesModuleGym', 'Gym')}</span>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  shareContext.gym ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
                }`}>
                  {shareContext.gym && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </span>
              </button>
            )}

            {/* Prayer Switch */}
            {appModules.prayer !== false && (
              <button
                type="button"
                onClick={() => toggleContextModule('prayer')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between tap-feedback ${
                  shareContext.prayer 
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/50 text-[var(--color-text-primary)]' 
                    : 'bg-[var(--color-surface)]/40 border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <span className="text-xs font-semibold">{t('settings.hermesModulePrayer', 'Prayer')}</span>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  shareContext.prayer ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
                }`}>
                  {shareContext.prayer && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </span>
              </button>
            )}

            {/* Maintenance Switch */}
            {appModules.maintenance !== false && (
              <button
                type="button"
                onClick={() => toggleContextModule('maintenance')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between tap-feedback ${
                  shareContext.maintenance 
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/50 text-[var(--color-text-primary)]' 
                    : 'bg-[var(--color-surface)]/40 border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <span className="text-xs font-semibold">{t('settings.hermesModuleMaintenance', 'Maintenance')}</span>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  shareContext.maintenance ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
                }`}>
                  {shareContext.maintenance && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </span>
              </button>
            )}

            {/* Calendar Switch */}
            {appModules.calendar !== false && (
              <button
                type="button"
                onClick={() => toggleContextModule('calendar')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between tap-feedback ${
                  shareContext.calendar 
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/50 text-[var(--color-text-primary)]' 
                    : 'bg-[var(--color-surface)]/40 border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <span className="text-xs font-semibold">{t('settings.hermesModuleCalendar', 'Calendar')}</span>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  shareContext.calendar ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
                }`}>
                  {shareContext.calendar && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </span>
              </button>
            )}

            {/* Journal Switch (Off by default for strict privacy) */}
            {appModules.journal !== false && (
              <button
                type="button"
                onClick={() => toggleContextModule('journal')}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between tap-feedback ${
                  shareContext.journal 
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/50 text-[var(--color-text-primary)]' 
                    : 'bg-[var(--color-surface)]/40 border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{t('settings.hermesModuleJournal', 'Journal')}</span>
                  <Lock className="w-3 h-3 text-[var(--color-text-secondary)]" />
                </div>
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  shareContext.journal ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-zinc-500'
                }`}>
                  {shareContext.journal && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. Advanced Hermes Config (Optional Remote Server) */}
      <div className="border-t border-[var(--color-border)]/50 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-1 tap-feedback"
        >
          <span>{t('settings.hermesAdvancedConfig', 'Advanced Configuration')}</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-2">
            <label className="text-[11px] font-semibold text-[var(--color-text-primary)]">
              {t('settings.hermesServerUrlLabel', 'Custom Hermes Server URL (Optional)')}
            </label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => handleUpdateServerUrl(e.target.value)}
              placeholder="https://your-hermes-server.com"
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
            />
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              {t('settings.hermesServerUrlDesc', 'Leave empty to run Hermes via direct Google Gemini API.')}
            </p>
          </div>
        )}
      </div>

      {/* 8. Save Button */}
      <button
        type="button"
        onClick={handleSaveSettings}
        disabled={isSaving}
        className="w-full min-h-[48px] py-3 rounded-2xl bg-[var(--color-accent)] text-white text-xs font-bold tap-feedback flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all"
      >
        <Check className="w-4 h-4 stroke-[3]" />
        <span>{t('settings.hermesSaveSettings', 'Save Hermes Settings')}</span>
      </button>
    </div>
  );
};
