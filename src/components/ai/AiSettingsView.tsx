import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Cpu, 
  ShieldCheck, 
  Server,
  Sparkles,
  ExternalLink,
  Check,
  Zap,
  Clock
} from 'lucide-react';
import { db } from '../../services/storage';
import { GeminiService, ModelOption, FALLBACK_GEMINI_MODELS } from '../../services/geminiService';
import { AIAssistantSettings } from '../../types';

interface AiSettingsViewProps {
  onRefresh?: () => void;
}

export const AiSettingsView: React.FC<AiSettingsViewProps> = ({ onRefresh }) => {
  const state = db.getState();
  const [aiSettings, setAiSettings] = useState<AIAssistantSettings>(GeminiService.getSettings());
  
  // Key Input state
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  
  // Status & Loaders
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Models
  const [models, setModels] = useState<ModelOption[]>(FALLBACK_GEMINI_MODELS);
  
  // Backend Proxy URL edit (optional custom backend)
  const [backendUrl, setBackendUrl] = useState(aiSettings.backend_url || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    GeminiService.fetchModels().then(setModels);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedbackMessage(null);
    try {
      const keyToTest = inputKey.trim() || undefined;
      const res = await GeminiService.testConnection(keyToTest, aiSettings.model);
      if (res.success) {
        setFeedbackMessage({
          text: `Connected to Google Gemini (${aiSettings.model}) successfully in ${res.latencyMs || 0}ms! Free tier active.`,
          type: 'success'
        });
      } else {
        setFeedbackMessage({
          text: res.error || 'Connection test failed.',
          type: 'error'
        });
      }
    } catch (e: any) {
      setFeedbackMessage({
        text: e?.message || 'Network error during connection test.',
        type: 'error'
      });
    } finally {
      setIsTesting(false);
      setAiSettings(GeminiService.getSettings());
      onRefresh?.();
    }
  };

  const handleSaveKey = async () => {
    if (!inputKey.trim()) {
      setFeedbackMessage({ text: 'Please enter your Google Gemini API key.', type: 'error' });
      return;
    }
    setIsSaving(true);
    setFeedbackMessage(null);
    try {
      const res = await GeminiService.configureKey(inputKey.trim(), aiSettings.model);
      if (res.success) {
        setFeedbackMessage({
          text: 'Google Gemini API key verified and encrypted with AES-256 on backend.',
          type: 'success'
        });
        setInputKey('');
        setIsReplacing(false);
      } else {
        setFeedbackMessage({
          text: res.error || 'Failed to verify key with Google Gemini.',
          type: 'error'
        });
      }
    } catch (e: any) {
      setFeedbackMessage({
        text: e?.message || 'Error configuring Gemini API key.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
      setAiSettings(GeminiService.getSettings());
      onRefresh?.();
    }
  };

  const handleRemoveKey = async () => {
    if (!confirm('Are you sure you want to remove the Google Gemini API key? AI conversation features will be disabled.')) {
      return;
    }
    await GeminiService.revokeKey();
    setInputKey('');
    setIsReplacing(false);
    setFeedbackMessage({ text: 'Gemini API key removed from secure vault.', type: 'info' });
    setAiSettings(GeminiService.getSettings());
    onRefresh?.();
  };

  const handleSelectModel = (modelId: string) => {
    db.updateState(s => {
      if (!s.settings.ai) s.settings.ai = GeminiService.getSettings();
      s.settings.ai.model = modelId;
    });
    setAiSettings(GeminiService.getSettings());
    setFeedbackMessage({ text: `Default model updated to ${modelId}.`, type: 'info' });
    onRefresh?.();
  };

  const handleTogglePermission = (permKey: keyof typeof aiSettings.permissions) => {
    db.updateState(s => {
      if (!s.settings.ai) s.settings.ai = GeminiService.getSettings();
      s.settings.ai.permissions[permKey] = !s.settings.ai.permissions[permKey];
    });
    setAiSettings(GeminiService.getSettings());
    onRefresh?.();
  };

  const handleSaveBackendUrl = () => {
    const trimmed = backendUrl.trim();
    db.updateState(s => {
      if (!s.settings.ai) s.settings.ai = GeminiService.getSettings();
      s.settings.ai.backend_url = trimmed;
    });
    setAiSettings(GeminiService.getSettings());
    setFeedbackMessage({ 
      text: trimmed ? `Custom backend URL set to: ${trimmed}` : 'Custom backend URL cleared. Direct Google Gemini mode active.', 
      type: 'info' 
    });
    onRefresh?.();
  };

  const getStatusBadge = () => {
    switch (aiSettings.connection_status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Connected</span>
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D97979]/15 text-[#D97979] border border-[#D97979]/40 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Error</span>
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D6AD68]/15 text-[#D6AD68] border border-[#D6AD68]/40 text-xs font-bold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Connecting...</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#17191D] text-[#858A92] border border-[#292D33] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#858A92]" />
            <span>Not Connected</span>
          </span>
        );
    }
  };

  return (
    <section className="space-y-4">
      {/* Header Card */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#4285F4]/15 text-[#4285F4] border border-[#4285F4]/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#4285F4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Google Gemini</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#4285F4]/20 text-[#4285F4] border border-[#4285F4]/30">
                  Free Tier Focus
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">Real cloud Gemini assistant with multi-turn memory</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Free API Key Creation Prompt Link */}
        <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)] text-xs">Need a free Google Gemini key?</span>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-bold text-[var(--color-accent)] hover:underline"
          >
            <span>aistudio.google.com/apikey</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Feedback message banner */}
        {feedbackMessage && (
          <div className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
            feedbackMessage.type === 'success' 
              ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
              : feedbackMessage.type === 'error'
              ? 'bg-[#D97979]/15 text-[#D97979] border-[#D97979]/40'
              : 'bg-[var(--color-surface-subtle)] text-[var(--color-accent)] border-[var(--color-border)]'
          }`}>
            <span className="font-medium">{feedbackMessage.text}</span>
            <button 
              onClick={() => setFeedbackMessage(null)}
              className="text-current opacity-70 hover:opacity-100 p-0.5"
            >
              ×
            </button>
          </div>
        )}

        {/* API Key Configuration Section */}
        <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Gemini API Key</span>
            </label>
            {aiSettings.api_key_configured && !isReplacing && (
              <span className="text-xs text-[#858A92] font-mono">
                Masked for Security
              </span>
            )}
          </div>

          {/* Masked Display if Configured */}
          {aiSettings.api_key_configured && !isReplacing ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                <div className="font-mono text-xs text-[var(--color-text-primary)]">
                  {aiSettings.api_key_masked || 'AIzaSy••••••••••••••••••••••••'}
                </div>
                <div className="flex items-center gap-1 text-xs text-[#10B981] font-semibold bg-[#10B981]/10 px-2 py-0.5 rounded-lg border border-[#10B981]/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>AES-256 Vault</span>
                </div>
              </div>

              {/* Action Buttons: Test Connection, Replace, Remove */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#222C24] hover:bg-[#2A342C] text-[var(--color-text-primary)] text-xs font-semibold border border-[var(--color-border)] flex items-center justify-center gap-2 tap-feedback disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-accent)] ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReplacing(true)}
                  className="py-2 px-3 rounded-xl border border-[var(--color-border)] hover:bg-[#222C24] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-semibold tap-feedback"
                >
                  Replace Key
                </button>

                <button
                  type="button"
                  onClick={handleRemoveKey}
                  className="p-2 rounded-xl border border-[#D97979]/40 hover:bg-[#D97979]/15 text-[#D97979] tap-feedback"
                  title="Remove API Key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Input for Entering New Key */
            <div className="space-y-2.5">
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxx..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full text-xs font-mono px-3.5 py-3 pe-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] placeholder-[#707B71]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute end-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  title={showKey ? 'Hide Key' : 'Show Key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveKey}
                  disabled={!inputKey.trim() || isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[#b8e482] text-[var(--color-accent-contrast)] text-xs font-bold flex items-center justify-center gap-2 tap-feedback disabled:opacity-40 "
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSaving ? 'Verifying with Google...' : 'Save & Connect Gemini'}</span>
                </button>

                {isReplacing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplacing(false);
                      setInputKey('');
                    }}
                    className="py-2.5 px-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs font-semibold tap-feedback"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Selection (Free-Tier Eligible Models) */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
              Gemini Model Selection
            </h4>
          </div>
          <span className="text-xs text-[var(--color-accent)] font-semibold">
            {models.find(m => m.id === aiSettings.model)?.name || aiSettings.model}
          </span>
        </div>

        <div className="space-y-2">
          {models.map((mod) => {
            const isSelected = aiSettings.model === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleSelectModel(mod.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all tap-feedback flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-[var(--color-surface-subtle)] border-[var(--color-accent)] shadow-[0_0_12px_rgba(166,217,106,0.15)]'
                    : 'bg-[var(--color-surface-subtle)]/50 border-[var(--color-border)] hover:border-[#364438]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>
                      {mod.name}
                    </span>
                    {mod.recommended && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                        Default Free
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#10B981] font-semibold">
                    {mod.cost}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-tight">
                  {mod.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Free Tier Usage & Quota Monitor */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
              Free-Tier Usage Management
            </h4>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            aiSettings.usage.free_tier_status === 'quota_exceeded'
              ? 'text-[#D97979] bg-[#D97979]/15 border-[#D97979]/30'
              : 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30'
          }`}>
            {aiSettings.usage.free_tier_status === 'quota_exceeded' ? 'Quota Exceeded' : 'Free Tier Active'}
          </span>
        </div>

        {/* Usage Counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
            <div className="text-xs text-[#858A92] font-bold">Total Requests</div>
            <div className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
              {aiSettings.usage.total_requests}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
            <div className="text-xs text-[#858A92] font-bold">Today</div>
            <div className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
              {aiSettings.usage.today_requests} / 1500 RPD
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-center">
            <div className="text-xs text-[#858A92] font-bold">Rate Limits</div>
            <div className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
              {aiSettings.usage.rate_limit_errors}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>Google AI Studio Free Tier Quota:</span>
            <span className="font-semibold text-[var(--color-text-primary)]">15 RPM · 1,500 RPD · 1M TPM</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Requests are 100% free under Google AI Studio limits. No paid requests will ever be made automatically.
          </p>
        </div>
      </div>

      {/* Module Data Access Permissions */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
              GreenDream Module Read Access
            </h4>
          </div>
          <span className="text-xs text-[#858A92]">Read-Only</span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Authorized modules allow Gemini to answer questions with real saved numbers. The AI will never invent data.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { key: 'finance_read', label: 'Finance & Loans' },
            { key: 'gym_read', label: 'Gym & Workouts' },
            { key: 'tasks_read', label: 'Tasks & Calendar' },
            { key: 'prayers_read', label: 'Daily Prayers' },
            { key: 'maintenance_read', label: 'Maintenance Items' },
          ].map((item) => {
            const isEnabled = !!(aiSettings.permissions as any)[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTogglePermission(item.key as any)}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all tap-feedback ${
                  isEnabled
                    ? 'bg-[var(--color-surface-subtle)] border-[var(--color-accent)]/50 text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-surface-subtle)]/40 border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                <span>{item.label}</span>
                <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-[var(--color-accent)]' : 'bg-[#707B71]'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Backend Proxy Configuration (Collapsible) */}
      <div className="p-4 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]  space-y-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Backend Gemini Proxy Settings</span>
          </div>
          <span className="text-xs text-[var(--color-accent)]">{showAdvanced ? 'Hide' : 'Configure'}</span>
        </button>

        {showAdvanced && (
          <div className="space-y-2.5 pt-2 border-t border-[var(--color-border)] text-xs">
            <p className="text-xs text-[var(--color-text-secondary)]">
              The backend proxy encrypts your Gemini API key with AES-256-GCM and handles streaming requests without exposing credentials inside the client APK.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:3001 or http://10.0.2.2:3001"
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-mono focus:outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="button"
                onClick={handleSaveBackendUrl}
                className="py-2 px-3 rounded-xl bg-[#222C24] hover:bg-[#2A342C] text-[var(--color-text-primary)] font-semibold border border-[var(--color-border)] tap-feedback"
              >
                Save
              </button>
            </div>
            <div className="text-xs text-[var(--color-text-muted)] space-y-0.5">
              <div>• Web / Local: <code className="text-[var(--color-accent)]">http://localhost:3001</code></div>
              <div>• Android Emulator: <code className="text-[var(--color-accent)]">http://10.0.2.2:3001</code></div>
              <div>• Real Phone on Wi-Fi: <code className="text-[var(--color-accent)]">http://&lt;your-pc-ip&gt;:3001</code></div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
