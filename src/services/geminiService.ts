// Official Google Gemini Client Service: Free-Tier Focused, Streaming, Multi-Turn Context & Direct API Routing
import { db, getTodayLocalDate, USER_DIRECT_GEMINI_KEY, DEFAULT_AI_SETTINGS } from './storage';
import { GreenDreamTools } from './greenDreamTools';
import { AIAssistantSettings, AssistantProposal } from '../types';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  availability: string;
  cost: string;
  recommended: boolean;
}

export const FALLBACK_GEMINI_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    description: 'Fastest response, zero rate-limit queue, Google AI Studio Free Tier (Active).',
    availability: 'Free Tier Active (Recommended)',
    cost: '100% Free Tier (Google AI Studio)',
    recommended: true
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    description: 'High-intelligence multimodal model with sub-second response on Google AI Studio Free Tier.',
    availability: 'Free Tier Active',
    cost: '100% Free Tier (Google AI Studio)',
    recommended: false
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    description: 'Compact high-speed model optimized for ultra-fast chat and minimal latency.',
    availability: 'Free Tier Eligible',
    cost: '100% Free Tier (Google AI Studio)',
    recommended: false
  }
];

export interface ChatSendOptions {
  userText: string;
  onChunk: (chunkText: string) => void;
  onComplete: (fullText: string, proposal: AssistantProposal | null) => void;
  onError: (errorMessage: string) => void;
  abortSignal?: AbortSignal;
}

function createTimeoutSignal(timeoutMs: number, userSignal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      userSignal.addEventListener('abort', () => {
        controller.abort(userSignal.reason);
      }, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer)
  };
}

export const GeminiService = {
  /**
   * Retrieves or generates a persistent device/user UUID for telemetry or preferences.
   */
  getUserId(): string {
    const key = 'greendream_user_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'usr-' + Math.random().toString(36).substring(2, 12) + '-' + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  },

  /**
   * Retrieves active Google Gemini API Key from settings, localStorage or fallback default.
   */
  getApiKey(): string {
    const state = db.getState();
    const settings = state.settings.ai;
    let key = settings?.api_key || '';
    if (!key && typeof localStorage !== 'undefined') {
      key = localStorage.getItem('gd_gemini_key') || '';
    }
    if (!key && typeof sessionStorage !== 'undefined') {
      key = sessionStorage.getItem('gd_gemini_key') || '';
    }
    if (!key) {
      key = USER_DIRECT_GEMINI_KEY;
    }
    return key;
  },

  /**
   * Returns current AI settings from state.
   */
  getSettings(): AIAssistantSettings {
    const state = db.getState();
    const key = this.getApiKey();
    let model = state.settings.ai?.model || 'gemini-3.6-flash';
    if (!model || model.includes('1.5') || model.includes('2.0') || model.includes('2.5') || model.includes('3.8') || model.includes('flash-latest')) {
      model = 'gemini-3.6-flash';
    }

    const ai = state.settings.ai ? { ...state.settings.ai } : { ...DEFAULT_AI_SETTINGS };
    ai.provider = 'gemini';
    ai.api_key = key;
    ai.api_key_configured = Boolean(key && key.length > 5);
    ai.api_key_masked = '••••••••••••••••' + (key ? key.slice(-4) : '');
    ai.model = model;
    ai.direct_mode = true;
    if (!ai.connection_status || ai.connection_status === 'not_configured') {
      ai.connection_status = 'connected';
    }
    return ai;
  },

  /**
   * Fetches supported Gemini models catalog.
   */
  async fetchModels(): Promise<ModelOption[]> {
    const key = this.getApiKey();
    if (key) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            const valid = data.models
              .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
              .map((m: any) => {
                const id = m.name.replace('models/', '');
                return {
                  id,
                  name: m.displayName || id,
                  description: m.description || 'Google Gemini language model',
                  availability: 'Available',
                  cost: 'Free Tier Eligible',
                  recommended: id === 'gemini-3.5-flash'
                };
              });
            if (valid.length > 0) {
              return valid;
            }
          }
        }
      } catch {}
    }
    return FALLBACK_GEMINI_MODELS;
  },

  /**
   * Securely saves and configures Google Gemini API Key directly in local persistent state.
   */
  async configureKey(apiKey: string, model: string = 'gemini-3.5-flash'): Promise<{ success: boolean; error?: string; maskedKey?: string }> {
    const cleanKey = apiKey.trim();
    if (cleanKey.length < 15) {
      return { success: false, error: 'Invalid Google Gemini API key. Please check your key at aistudio.google.com/apikey.' };
    }

    let activeModel = model;
    if (activeModel.includes('1.5') || activeModel.includes('2.0') || activeModel.includes('2.5')) {
      activeModel = 'gemini-3.5-flash';
    }

    // 1. Direct connection check with Google Gemini
    const testResult = await this.testConnection(cleanKey, activeModel);
    if (!testResult.success) {
      return { success: false, error: testResult.error || 'Connection verification failed.' };
    }

    const masked = '••••••••••••••••' + cleanKey.slice(-4);

    // Persist in client state
    db.updateState(s => {
      if (!s.settings.ai) s.settings.ai = this.getSettings();
      s.settings.ai.provider = 'gemini';
      s.settings.ai.api_key_configured = true;
      s.settings.ai.api_key = cleanKey;
      s.settings.ai.api_key_masked = masked;
      s.settings.ai.model = activeModel;
      s.settings.ai.direct_mode = true;
      s.settings.ai.connection_status = 'connected';
      s.settings.ai.connection_error = null;
      s.settings.ai.last_tested_at = Date.now();
      s.settings.ai.usage.free_tier_status = 'active';
    });

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gd_gemini_key', cleanKey);
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('gd_gemini_key', cleanKey);
      }
    } catch {}

    return { success: true, maskedKey: masked };
  },

  /**
   * Tests API key connection directly with Google Gemini.
   */
  async testConnection(apiKey?: string, model: string = 'gemini-3.6-flash'): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'You are currently offline. Please connect to the internet to verify your API key.' };
    }
    const cleanKey = apiKey ? apiKey.trim() : this.getApiKey();
    const startTime = Date.now();

    const candidateModels = [
      model,
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite'
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let lastError: string = 'Cannot reach Google Gemini API';
    const timeout = createTimeoutSignal(12000);

    try {
      for (const modelToTest of candidateModels) {
        try {
          const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent?key=${encodeURIComponent(cleanKey)}`;
          const directRes = await fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Connection check. Respond OK.' }] }],
              generationConfig: { maxOutputTokens: 10, thinkingConfig: { thinkingBudget: 0 } }
            }),
            signal: timeout.signal
          });

          const latencyMs = Date.now() - startTime;
          const directData = await directRes.json().catch(() => ({}));

          if (directRes.ok) {
            timeout.cleanup();
            db.updateState(s => {
              if (!s.settings.ai) s.settings.ai = this.getSettings();
              s.settings.ai.model = modelToTest;
              s.settings.ai.api_key = cleanKey;
              s.settings.ai.api_key_configured = true;
              s.settings.ai.connection_status = 'connected';
              s.settings.ai.connection_error = null;
              s.settings.ai.last_tested_at = Date.now();
              s.settings.ai.usage.free_tier_status = 'active';
            });
            return { success: true, latencyMs };
          }

          const err = directData.error || {};
          let msg = err.message || `HTTP ${directRes.status}`;
          if (directRes.status === 400 && (err.message?.includes('API key') || err.status === 'INVALID_ARGUMENT')) {
            msg = 'Invalid Google Gemini API key. Please check your key at aistudio.google.com/apikey.';
            lastError = msg;
            break;
          } else if (directRes.status === 503 || directRes.status === 404 || directRes.status === 429) {
            lastError = msg;
            continue; // try next candidate model
          } else {
            lastError = msg;
          }
        } catch (innerErr: any) {
          lastError = innerErr?.message || lastError;
          if (innerErr?.name === 'AbortError') break;
        }
      }

      timeout.cleanup();
      db.updateState(s => {
        if (s.settings.ai) {
          s.settings.ai.connection_status = 'error';
          s.settings.ai.connection_error = lastError;
        }
      });
      return { success: false, error: lastError, latencyMs: Date.now() - startTime };

    } catch (directErr: any) {
      timeout.cleanup();
      const latencyMs = Date.now() - startTime;
      const msg = `Network error: ${directErr.message || 'Cannot reach Google Gemini API'}`;
      db.updateState(s => {
        if (s.settings.ai) {
          s.settings.ai.connection_status = 'error';
          s.settings.ai.connection_error = msg;
        }
      });
      return { success: false, error: msg, latencyMs };
    }
  },

  /**
   * Revokes and removes API Key from local client state.
   */
  async revokeKey(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('gd_gemini_key');
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('gd_gemini_key');
    } catch {}

    db.updateState(s => {
      if (!s.settings.ai) s.settings.ai = this.getSettings();
      s.settings.ai.provider = 'gemini';
      s.settings.ai.api_key_configured = false;
      s.settings.ai.api_key = '';
      s.settings.ai.api_key_masked = '';
      s.settings.ai.connection_status = 'not_configured';
      s.settings.ai.connection_error = null;
      s.settings.ai.last_tested_at = null;
    });
  },

  /**
   * Sends conversational message with full multi-turn context memory and progressive SSE streaming.
   */
  async sendMessage(options: ChatSendOptions): Promise<void> {
    const { userText, onChunk, onComplete, onError, abortSignal } = options;
    const settings = this.getSettings();
    const state = db.getState();
    const cleanKey = this.getApiKey();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      onError('You are currently offline. Cloud AI assistant requires an active internet connection. All local records remain safe.');
      return;
    }

    if (!cleanKey) {
      onError('Google Gemini API key is not configured. Please add your free key in Settings → AI Assistant.');
      return;
    }

    let activeModel = settings.model || 'gemini-3.6-flash';
    if (!activeModel || activeModel.includes('1.5') || activeModel.includes('2.0') || activeModel.includes('2.5') || activeModel.includes('3.8') || activeModel.includes('flash-latest')) {
      activeModel = 'gemini-3.6-flash';
    }

    // Prepare real-data system context
    const systemContext = GreenDreamTools.getContext(settings.permissions);

    // Multi-turn Conversation Context (exclude empty or currently streaming placeholders)
    const cleanHistory = state.assistantMessages
      .filter(m => !m.deleted_at && !m.isError && m.text && m.text.trim().length > 0 && !m.isStreaming)
      .slice(-8)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text.trim() }]
      }));

    // Avoid duplicating the user prompt if it was already recorded
    while (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user' && cleanHistory[cleanHistory.length - 1].parts[0].text === userText.trim()) {
      cleanHistory.pop();
    }

    const recentMessages = [
      ...cleanHistory,
      {
        role: 'user',
        parts: [{ text: userText.trim() }]
      }
    ];

    const systemPrompt = `You are GreenDream Assistant, an authentic, high-intelligence personal life management assistant powered by Google Gemini.
Fluent in English, French, and Arabic. Reply in the user's language.
Never invent financial figures or personal records.
When proposing actions, append <<<PROPOSAL:{"action_type":"...","payload":{...}}>>>.

User Records:
${systemContext}`;

    const candidateModels = [
      activeModel,
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite'
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    const timeout = createTimeoutSignal(35000, abortSignal);
    let accumulatedText = '';
    let lastError: Error | null = null;

    try {
      // 1. Try streaming SSE with failover across candidate models
      for (const currentModel of candidateModels) {
        try {
          const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cleanKey)}`;
          const directRes = await fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: recentMessages,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                thinkingConfig: { thinkingBudget: 0 }
              }
            }),
            signal: timeout.signal
          });

          if (!directRes.ok) {
            const errData = await directRes.json().catch(() => ({}));
            let errMessage = errData.error?.message || `Gemini returned HTTP ${directRes.status}`;
            if (directRes.status === 429) {
              errMessage = 'Google Gemini free-tier quota exhausted. Please wait a moment for the limit to reset.';
              db.updateState(s => {
                if (s.settings.ai) {
                  s.settings.ai.usage.free_tier_status = 'quota_exceeded';
                  s.settings.ai.usage.rate_limit_errors += 1;
                }
              });
            }
            // If 503 or 404 or 429 and other models exist, try the next model
            if ((directRes.status === 503 || directRes.status === 404 || directRes.status === 429) && currentModel !== candidateModels[candidateModels.length - 1]) {
              console.warn(`Model ${currentModel} returned ${directRes.status}. Retrying with next model...`);
              continue;
            }
            throw new Error(errMessage);
          }

          const reader = directRes.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) throw new Error('Streaming response body is undefined.');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const rawChunk = decoder.decode(value, { stream: true });
            const lines = rawChunk.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const parts = json.candidates?.[0]?.content?.parts || [];
                  for (const part of parts) {
                    if (part.text) {
                      accumulatedText += part.text;
                      onChunk(accumulatedText);
                    }
                  }
                } catch {
                  // Ignore partial JSON lines
                }
              }
            }
          }

          if (accumulatedText.trim()) {
            lastError = null;
            // Persist the working model for speed
            if (currentModel !== activeModel) {
              db.updateState(s => {
                if (s.settings.ai) s.settings.ai.model = currentModel;
              });
            }
            break;
          }
        } catch (streamErr: any) {
          lastError = streamErr;
          if (streamErr.name === 'AbortError') throw streamErr;
        }
      }

      // 2. If no text was accumulated from streaming, fallback to non-streaming
      if (!accumulatedText.trim()) {
        for (const currentModel of candidateModels) {
          try {
            const nonStreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(cleanKey)}`;
            const nonStreamRes = await fetch(nonStreamUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: recentMessages,
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 2048,
                  thinkingConfig: { thinkingBudget: 0 }
                }
              }),
              signal: timeout.signal
            });

            if (nonStreamRes.ok) {
              const nonStreamData = await nonStreamRes.json();
              const parts = nonStreamData.candidates?.[0]?.content?.parts || [];
              for (const p of parts) {
                if (p.text) accumulatedText += p.text;
              }
              if (accumulatedText.trim()) {
                onChunk(accumulatedText);
                lastError = null;
                break;
              }
            }
          } catch (nonStreamErr: any) {
            lastError = nonStreamErr;
            if (nonStreamErr.name === 'AbortError') throw nonStreamErr;
          }
        }
      }

      if (!accumulatedText.trim() && lastError) {
        throw lastError;
      }

      this.handleSuccessCompletion(accumulatedText, userText, onComplete);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        onError('Generation stopped.');
        return;
      }
      onError(`AI Error: ${err.message || 'Cannot communicate with Google Gemini API'}`);
    } finally {
      timeout.cleanup();
    }
  },

  /**
   * Parses proposals and updates usage records.
   */
  handleSuccessCompletion(
    rawText: string,
    userText: string,
    onComplete: (fullText: string, proposal: AssistantProposal | null) => void
  ): void {
    const { cleanText, proposal } = GreenDreamTools.parseProposalFromText(rawText, userText);

    const promptTokens = Math.max(10, Math.round(userText.length / 4) + 120);
    const completionTokens = Math.max(10, Math.round(rawText.length / 4));

    db.updateState(s => {
      if (!s.settings.ai) s.settings.ai = this.getSettings();
      const u = s.settings.ai.usage;
      u.total_requests += 1;
      u.today_requests += 1;
      u.prompt_tokens += promptTokens;
      u.completion_tokens += completionTokens;
      u.free_tier_status = 'active';
    });

    onComplete(cleanText, proposal);
  }
};
