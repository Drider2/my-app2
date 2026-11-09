// ========================================================
// Hermes Gemini Service
// Robust client for Google Gemini API with:
// - x-goog-api-key header (never in URL or logs)
// - Native CapacitorHttp fallback for WebView CORS / Android
// - SSE Streaming + simulated progressive display fallback
// - Model discovery & live connection testing
// - 30s first response / 60s total timeouts
// - 5xx retry with backoff & structured error classification
// ========================================================

import { Capacitor, CapacitorHttp, HttpResponse } from '@capacitor/core';
import { HermesStorage } from './hermesStorage';

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const DEFAULT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

export interface ModelDetail {
  id: string;
  name: string;
  displayName: string;
  description: string;
  recommended: boolean;
}

export interface HermesContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, any>;
    id?: string;
  };
  functionResponse?: {
    name: string;
    response: Record<string, any>;
    id?: string;
  };
  thoughtSignature?: string;
  thought?: any;
  [key: string]: any;
}

export interface HermesContentMessage {
  role: 'user' | 'model';
  parts: HermesContentPart[];
}

export interface HermesStreamOptions {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  contents: HermesContentMessage[];
  tools?: any[];
  onChunk: (textChunk: string) => void;
  onFunctionCall?: (functionCall: { name: string; args: Record<string, any>; id?: string }, rawPart?: HermesContentPart) => void;
  onReasoningStep?: (step: string) => void;
  onComplete: (fullText: string, metadata?: { promptTokens?: number; completionTokens?: number; rawParts?: HermesContentPart[] }) => void;
  onError: (errorMessage: string, statusCode?: number) => void;
  abortSignal?: AbortSignal;
}

export interface TestConnectionResult {
  success: boolean;
  latencyMs?: number;
  models?: string[];
  modelUsed?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Redacts any raw Google Gemini API keys from error messages and logs
 */
export function redactApiKey(str?: string): string {
  if (!str) return '';
  return str.replace(/(AIza[0-9A-Za-z-_]{30,45}|AQ\.[0-9A-Za-z-_]{30,55})/g, (match) => {
    return '••••••••••••••••' + match.slice(-4);
  });
}

/**
 * Human-readable plain error mapping with key redaction
 */
function classifyGeminiError(status: number, rawMessage?: string): string {
  const sanitized = redactApiKey(rawMessage);
  if (status === 400) {
    if (sanitized?.includes('API_KEY_INVALID') || sanitized?.includes('API key not valid')) {
      return 'Invalid Google Gemini API key. Please check your key in settings.';
    }
    return `Invalid request payload or malformed query. (Error 400: ${sanitized || 'Bad Request'})`;
  }
  if (status === 401 || status === 403) {
    return 'Unauthorized. Your Google Gemini API key is invalid or lacks required permissions.';
  }
  if (status === 404) {
    return 'The requested Gemini model is not available for your API key. Try selecting gemini-2.5-flash or gemini-1.5-flash.';
  }
  if (status === 429) {
    return 'Google Gemini rate limit or quota exceeded. Please wait 60 seconds before trying again.';
  }
  if (status >= 500) {
    return `Google Gemini service temporarily unavailable (${status}). Please try again in a moment.`;
  }
  if (sanitized && (sanitized.toLowerCase().includes('network') || sanitized.toLowerCase().includes('failed to fetch'))) {
    return 'Network connection failed. Please ensure you are connected to the internet.';
  }
  return sanitized || `Unexpected error (${status}).`;
}

/**
 * Parse an SSE line buffer into Gemini JSON candidate text chunks
 */
function parseSSEChunk(
  line: string, 
  onChunk: (text: string) => void,
  onFunctionCall?: (fc: { name: string; args: Record<string, any>; id?: string }, rawPart?: HermesContentPart) => void
): { text: string; promptTokens?: number; completionTokens?: number; rawCandidateParts?: HermesContentPart[] } {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) {
    return { text: '' };
  }

  const jsonStr = trimmed.slice(5).trim();
  if (!jsonStr || jsonStr === '[DONE]') {
    return { text: '' };
  }

  try {
    const data = JSON.parse(jsonStr);
    let extractedText = '';
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let rawCandidateParts: HermesContentPart[] | undefined;

    if (data.usageMetadata) {
      promptTokens = data.usageMetadata.promptTokenCount;
      completionTokens = data.usageMetadata.candidatesTokenCount;
    }

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Response blocked by Google Gemini safety filters.');
      }
      if (candidate.content && Array.isArray(candidate.content.parts)) {
        rawCandidateParts = candidate.content.parts;
        for (const part of candidate.content.parts) {
          if (part.text) {
            extractedText += part.text;
            onChunk(part.text);
          }
          if (part.functionCall && onFunctionCall) {
            onFunctionCall({
              name: part.functionCall.name,
              args: part.functionCall.args || {},
              id: part.functionCall.id || part.id,
            }, part);
          }
        }
      }
    }

    return { text: extractedText, promptTokens, completionTokens, rawCandidateParts };
  } catch (err: any) {
    if (err.message?.includes('safety')) {
      throw err;
    }
    return { text: '' };
  }
}

export const HermesGeminiService = {
  /**
   * Discovers available models that support generateContent using the user's API key
   */
  async fetchAvailableModels(apiKey: string): Promise<string[]> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) return [...DEFAULT_MODELS];

    const url = `${GEMINI_API_BASE}/models`;
    const headers = {
      'x-goog-api-key': cleanKey,
      'Content-Type': 'application/json',
    };

    try {
      let rawData: any = null;

      // Try browser / WebView fetch first
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          rawData = await res.json();
        }
      } catch (fetchErr) {
        // Fallback to CapacitorHttp on native device
        if (Capacitor.isNativePlatform()) {
          const nativeRes: HttpResponse = await CapacitorHttp.get({
            url,
            headers,
          });
          if (nativeRes.status === 200) {
            rawData = nativeRes.data;
          }
        }
      }

      if (rawData && Array.isArray(rawData.models)) {
        const modelNames: string[] = rawData.models
          .filter((m: any) => 
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes('generateContent')
          )
          .map((m: any) => {
            const name = m.name || '';
            return name.replace(/^models\//, '');
          })
          .filter((name: string) => 
            !name.includes('embedding') &&
            !name.includes('aqa') &&
            !name.includes('imagen')
          );

        if (modelNames.length > 0) {
          // Sort prioritized models to top
          const prioritized = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
          modelNames.sort((a, b) => {
            const idxA = prioritized.indexOf(a);
            const idxB = prioritized.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
          });
          return modelNames;
        }
      }
    } catch (e) {
      console.warn('HermesGeminiService: failed to fetch models list, using fallbacks', e);
    }

    return [...DEFAULT_MODELS];
  },

  /**
   * Tests the connection with Google Gemini.
   * Sends a lightweight 1-token ping to ensure the key is 100% active and working.
   */
  async testConnection(apiKey: string, modelToTest?: string): Promise<TestConnectionResult> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return {
        success: false,
        error: 'API key is empty. Please enter your Google Gemini API key.',
      };
    }

    const model = modelToTest || 'gemini-2.5-flash';
    const startTime = Date.now();
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;

    const headers: Record<string, string> = {
      'x-goog-api-key': cleanKey,
      'Content-Type': 'application/json',
    };

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Respond with OK.' }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 5,
        temperature: 0.1,
      },
    };

    try {
      let status = 0;
      let responseBody: any = null;

      // 1. Try fetch with 15s timeout
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        status = res.status;
        responseBody = await res.json().catch(() => null);
      } catch (fetchErr: any) {
        // If WebView blocked or failed, try native CapacitorHttp
        try {
          const nativeRes: HttpResponse = await CapacitorHttp.post({
            url,
            headers,
            data: payload,
          });
          status = nativeRes.status;
          responseBody = nativeRes.data;
        } catch (nativeErr: any) {
          const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
          return {
            success: false,
            error: isOffline 
              ? 'No internet connection detected. Please connect to Wi-Fi or mobile data.' 
              : `Connection failed: ${nativeErr?.message || fetchErr?.message || 'Network unreachable'}`,
          };
        }
      }

      const latencyMs = Date.now() - startTime;

      if (status >= 200 && status < 300 && responseBody) {
        // Fetch model list in background
        const models = await this.fetchAvailableModels(cleanKey);

        // Update settings storage
        HermesStorage.updateSettings(s => {
          s.connection_status = 'connected';
          s.connection_error = null;
          s.last_tested_at = Date.now();
          s.available_models = models;
          s.model = model;
        });

        return {
          success: true,
          latencyMs,
          models,
          modelUsed: model,
        };
      }

      // Handle specific error codes
      const errorMsg = classifyGeminiError(
        status, 
        responseBody?.error?.message || responseBody?.error?.status
      );

      HermesStorage.updateSettings(s => {
        s.connection_status = 'error';
        s.connection_error = errorMsg;
        s.last_tested_at = Date.now();
      });

      return {
        success: false,
        statusCode: status,
        error: errorMsg,
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Unexpected connection failure.';
      HermesStorage.updateSettings(s => {
        s.connection_status = 'error';
        s.connection_error = errorMsg;
        s.last_tested_at = Date.now();
      });

      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  /**
   * Main streaming request method for Hermes Chat.
   * Handles SSE streaming, native CapacitorHttp fallback, timeouts, 5xx retries,
   * and progressive simulated typing fallback.
   */
  async streamGenerateContent(options: HermesStreamOptions): Promise<void> {
    const {
      apiKey,
      model = 'gemini-2.5-flash',
      systemInstruction,
      contents,
      tools,
      onChunk,
      onFunctionCall,
      onReasoningStep,
      onComplete,
      onError,
      abortSignal,
    } = options;

    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      onError('Google Gemini API key is missing. Please configure your key in Settings.');
      return;
    }

    if (abortSignal?.aborted) {
      onError('Request cancelled.');
      return;
    }

    const payload: any = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    const headers: Record<string, string> = {
      'x-goog-api-key': cleanKey,
      'Content-Type': 'application/json',
    };

    // Execution helper with 1 retry on 5xx
    const executeAttempt = async (isRetry: boolean = false): Promise<boolean> => {
      // 1. First Attempt: SSE Streaming via fetch
      const streamUrl = `${GEMINI_API_BASE}/models/${model}:streamGenerateContent?alt=sse`;

      let streamSucceeded = false;
      let accumulatedText = '';
      const accumulatedParts: HermesContentPart[] = [];
      let promptTokens = 0;
      let completionTokens = 0;

      const mergeParts = (incoming?: HermesContentPart[]) => {
        if (!incoming) return;
        incoming.forEach((part, pIdx) => {
          if (!accumulatedParts[pIdx]) {
            accumulatedParts[pIdx] = { ...part };
          } else {
            if (part.text) {
              accumulatedParts[pIdx].text = (accumulatedParts[pIdx].text || '') + part.text;
            }
            if (part.functionCall) {
              accumulatedParts[pIdx].functionCall = part.functionCall;
            }
            if (part.thoughtSignature) {
              accumulatedParts[pIdx].thoughtSignature = part.thoughtSignature;
            }
            if (part.id) {
              accumulatedParts[pIdx].id = part.id;
            }
            Object.keys(part).forEach(k => {
              if (!['text', 'functionCall', 'thoughtSignature', 'id'].includes(k)) {
                accumulatedParts[pIdx][k] = part[k];
              }
            });
          }
        });
      };

      // 30s first token timeout, 60s total timeout
      const controller = new AbortController();
      let firstChunkReceived = false;

      const firstTokenTimer = setTimeout(() => {
        if (!firstChunkReceived) {
          controller.abort(new Error('First response token timed out after 30 seconds.'));
        }
      }, 30000);

      const totalTimer = setTimeout(() => {
        controller.abort(new Error('Total request timed out after 60 seconds.'));
      }, 60000);

      // Link external abort signal
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => controller.abort(abortSignal.reason), { once: true });
      }

      try {
        const response = await fetch(streamUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.status >= 500 && !isRetry) {
          clearTimeout(firstTokenTimer);
          clearTimeout(totalTimer);
          // Wait 1.5s before retry
          await new Promise(r => setTimeout(r, 1500));
          return await executeAttempt(true);
        }

        if (!response.ok) {
          clearTimeout(firstTokenTimer);
          clearTimeout(totalTimer);
          const errBody = await response.json().catch(() => null);
          const msg = classifyGeminiError(response.status, errBody?.error?.message);
          onError(msg, response.status);
          return true;
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported by browser.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (!firstChunkReceived) {
            firstChunkReceived = true;
            clearTimeout(firstTokenTimer);
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              const res = parseSSEChunk(line, onChunk, onFunctionCall);
              accumulatedText += res.text;
              mergeParts(res.rawCandidateParts);
              if (res.promptTokens) promptTokens = res.promptTokens;
              if (res.completionTokens) completionTokens = res.completionTokens;
            }
          }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
          const res = parseSSEChunk(buffer, onChunk, onFunctionCall);
          accumulatedText += res.text;
          mergeParts(res.rawCandidateParts);
          if (res.promptTokens) promptTokens = res.promptTokens;
          if (res.completionTokens) completionTokens = res.completionTokens;
        }

        clearTimeout(firstTokenTimer);
        clearTimeout(totalTimer);

        if (accumulatedText.trim().length > 0 || (tools && tools.length > 0) || accumulatedParts.length > 0) {
          HermesStorage.recordUsage(promptTokens, completionTokens);
          onComplete(accumulatedText, { promptTokens, completionTokens, rawParts: accumulatedParts });
          streamSucceeded = true;
          return true;
        }
      } catch (streamErr: any) {
        clearTimeout(firstTokenTimer);
        clearTimeout(totalTimer);

        if (abortSignal?.aborted) {
          onError('Request cancelled.');
          return true;
        }

        // If error was a safety filter abort, throw immediately
        if (streamErr.message?.includes('safety')) {
          onError(streamErr.message);
          return true;
        }

        console.warn('HermesGeminiService: Streaming fetch failed or blocked, falling back to CapacitorHttp', streamErr);
      }

      if (streamSucceeded) return true;

      // 2. Fallback: CapacitorHttp Non-Streaming with simulated progressive display
      const nonStreamUrl = `${GEMINI_API_BASE}/models/${model}:generateContent`;

      try {
        let status = 0;
        let data: any = null;

        if (Capacitor.isNativePlatform()) {
          const nativeRes: HttpResponse = await CapacitorHttp.post({
            url: nonStreamUrl,
            headers,
            data: payload,
          });
          status = nativeRes.status;
          data = nativeRes.data;
        } else {
          const res = await fetch(nonStreamUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          status = res.status;
          data = await res.json().catch(() => null);
        }

        if (status >= 500 && !isRetry) {
          await new Promise(r => setTimeout(r, 1500));
          return await executeAttempt(true);
        }

        if (status < 200 || status >= 300 || !data) {
          const msg = classifyGeminiError(status, data?.error?.message);
          onError(msg, status);
          return true;
        }

        // Parse result
        let fullText = '';
        let fallbackParts: HermesContentPart[] = [];
        if (data.candidates && data.candidates.length > 0) {
          const cand = data.candidates[0];
          if (cand.finishReason === 'SAFETY') {
            onError('Response blocked by Google Gemini safety filters.');
            return true;
          }
          if (cand.content && Array.isArray(cand.content.parts)) {
            fallbackParts = cand.content.parts.map((p: any) => ({ ...p }));
            for (const part of cand.content.parts) {
              if (part.text) fullText += part.text;
              if (part.functionCall && onFunctionCall) {
                onFunctionCall({
                  name: part.functionCall.name,
                  args: part.functionCall.args || {},
                  id: part.functionCall.id || part.id,
                }, part);
              }
            }
          }
        }

        if (!fullText && (!tools || tools.length === 0) && fallbackParts.length === 0) {
          onError('Google Gemini returned an empty response.');
          return true;
        }

        // Simulate progressive typing display (5-8 words per chunk at 20ms)
        const words = fullText.split(/(\s+)/);
        let currentIndex = 0;
        const chunkSize = 3;

        const typingInterval = setInterval(() => {
          if (abortSignal?.aborted) {
            clearInterval(typingInterval);
            onError('Request cancelled.');
            return;
          }

          if (currentIndex < words.length) {
            const nextWords = words.slice(currentIndex, currentIndex + chunkSize).join('');
            currentIndex += chunkSize;
            onChunk(nextWords);
          } else {
            clearInterval(typingInterval);
            const pTokens = data.usageMetadata?.promptTokenCount || 0;
            const cTokens = data.usageMetadata?.candidatesTokenCount || 0;
            HermesStorage.recordUsage(pTokens, cTokens);
            onComplete(fullText, { promptTokens: pTokens, completionTokens: cTokens, rawParts: fallbackParts });
          }
        }, 25);

        return true;
      } catch (fallbackErr: any) {
        if (abortSignal?.aborted) {
          onError('Request cancelled.');
          return true;
        }
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        onError(
          isOffline 
            ? 'Network connection lost. Please verify your internet connection.' 
            : `Network error: ${fallbackErr?.message || 'Unable to reach Google Gemini'}`
        );
        return true;
      }
    };

    await executeAttempt(false);
  },

  /**
   * Single-turn or tool-loop query (non-streaming)
   */
  async generateContent(options: {
    apiKey: string;
    model?: string;
    systemInstruction?: string;
    contents: HermesContentMessage[];
    tools?: any[];
    abortSignal?: AbortSignal;
  }): Promise<{
    text: string;
    functionCalls?: Array<{ name: string; args: Record<string, any>; id?: string; rawPart?: HermesContentPart }>;
    rawParts?: HermesContentPart[];
    promptTokens?: number;
    completionTokens?: number;
  }> {
    const { apiKey, model = 'gemini-3.6-flash', systemInstruction, contents, tools, abortSignal } = options;
    const cleanKey = apiKey.trim();
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;

    const headers: Record<string, string> = {
      'x-goog-api-key': cleanKey,
      'Content-Type': 'application/json',
    };

    const payload: any = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    let data: any = null;
    let status = 0;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => controller.abort(abortSignal.reason), { once: true });
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      status = res.status;
      data = await res.json().catch(() => null);
    } catch (fetchErr) {
      if (Capacitor.isNativePlatform()) {
        const nativeRes = await CapacitorHttp.post({
          url,
          headers,
          data: payload,
        });
        status = nativeRes.status;
        data = nativeRes.data;
      } else {
        throw fetchErr;
      }
    }

    if (status < 200 || status >= 300 || !data) {
      throw new Error(classifyGeminiError(status, data?.error?.message));
    }

    let text = '';
    let rawParts: HermesContentPart[] = [];
    const functionCalls: Array<{ name: string; args: Record<string, any>; id?: string; rawPart?: HermesContentPart }> = [];

    if (data.candidates && data.candidates.length > 0) {
      const cand = data.candidates[0];
      if (cand.content && Array.isArray(cand.content.parts)) {
        // Keep candidate.content.parts completely verbatim and opaque
        rawParts = cand.content.parts.map((p: any) => ({ ...p }));
        for (const part of cand.content.parts) {
          if (part.text) text += part.text;
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              args: part.functionCall.args || {},
              id: part.functionCall.id || part.id,
              rawPart: part,
            });
          }
        }
      }
    }

    const pTokens = data.usageMetadata?.promptTokenCount || 0;
    const cTokens = data.usageMetadata?.candidatesTokenCount || 0;
    if (pTokens || cTokens) {
      HermesStorage.recordUsage(pTokens, cTokens);
    }

    return {
      text,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      rawParts: rawParts.length > 0 ? rawParts : undefined,
      promptTokens: pTokens,
      completionTokens: cTokens,
    };
  },
};
