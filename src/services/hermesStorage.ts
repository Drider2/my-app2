// ========================================================
// Hermes Storage Layer (Local-First, Privacy-Focused)
// Manages: settings.ai, gd_hermes_chats, and gd_hermes_notes
// NEVER logs or exports raw API keys.
// ========================================================
import { db, generateUUID } from './storage';
import { 
  AIAssistantSettings, 
  HermesChatSession, 
  HermesMessage, 
  HermesMemoryNote, 
  HermesMode, 
  HermesShareContext,
  DEFAULT_APP_MODULES
} from '../types';

const CHATS_STORAGE_KEY = 'gd_hermes_chats';
const NOTES_STORAGE_KEY = 'gd_hermes_notes';
const MAX_STORED_CHATS = 50;
const MAX_STORED_NOTES = 30;

export const DEFAULT_HERMES_SETTINGS: AIAssistantSettings = {
  provider: 'gemini',
  api_key_configured: false,
  api_key_masked: '',
  api_key: '',
  apiKey: '',
  model: 'gemini-3.6-flash',
  hermesMode: 'read_data',
  hermesServerUrl: '',
  shareContext: {
    prayer: true,
    finance: true,
    gym: true,
    calendar: true,
    maintenance: true,
    journal: false, // Default journal OFF for privacy
  },
  available_models: [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ],
  backend_url: '',
  direct_mode: true,
  connection_status: 'not_configured',
  connection_error: null,
  last_tested_at: null,
  response_length: 'balanced',
  permissions: {
    finance_read: true,
    gym_read: true,
    tasks_read: true,
    prayers_read: true,
    maintenance_read: true,
  },
  usage: {
    total_requests: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    rate_limit_errors: 0,
    today_requests: 0,
    today_date: new Date().toISOString().split('T')[0],
    free_tier_status: 'active',
  },
};

export const HermesStorage = {
  // ========================================================
  // 1. Settings Accessors
  // ========================================================
  getSettings(): AIAssistantSettings {
    const state = db.getState();
    const stored = state.settings.ai;
    if (!stored) {
      return { ...DEFAULT_HERMES_SETTINGS };
    }

    const key = stored.apiKey || stored.api_key || (typeof localStorage !== 'undefined' ? localStorage.getItem('gd_gemini_key') || '' : '');
    const masked = key ? '••••••••••••••••' + key.slice(-4) : '';

    return {
      ...DEFAULT_HERMES_SETTINGS,
      ...stored,
      api_key: key,
      apiKey: key,
      api_key_configured: Boolean(key && key.trim().length > 10),
      api_key_masked: masked,
      model: stored.model || 'gemini-2.5-flash',
      hermesMode: stored.hermesMode || 'read_data',
      shareContext: {
        ...DEFAULT_HERMES_SETTINGS.shareContext,
        ...stored.shareContext,
      },
    };
  },

  getApiKey(): string {
    const s = this.getSettings();
    return s.apiKey || s.api_key || '';
  },

  saveApiKey(apiKey: string, model?: string): void {
    const cleanKey = apiKey.trim();
    const masked = cleanKey ? '••••••••••••••••' + cleanKey.slice(-4) : '';

    db.updateState(draft => {
      if (!draft.settings.ai) {
        draft.settings.ai = { ...DEFAULT_HERMES_SETTINGS };
      }
      draft.settings.ai.api_key = cleanKey;
      draft.settings.ai.apiKey = cleanKey;
      draft.settings.ai.api_key_configured = cleanKey.length > 10;
      draft.settings.ai.api_key_masked = masked;
      if (model) {
        draft.settings.ai.model = model;
      }
      draft.settings.ai.direct_mode = true;
    });

    if (typeof localStorage !== 'undefined') {
      if (cleanKey) {
        localStorage.setItem('gd_gemini_key', cleanKey);
      } else {
        localStorage.removeItem('gd_gemini_key');
      }
    }
  },

  updateSettings(updater: (draft: AIAssistantSettings) => void): AIAssistantSettings {
    let updated: AIAssistantSettings = { ...DEFAULT_HERMES_SETTINGS };
    db.updateState(state => {
      if (!state.settings.ai) {
        state.settings.ai = { ...DEFAULT_HERMES_SETTINGS };
      }
      updater(state.settings.ai);
      updated = { ...state.settings.ai };
    });
    return updated;
  },

  setHermesMode(mode: HermesMode): void {
    this.updateSettings(s => {
      s.hermesMode = mode;
    });
  },

  setServerUrl(url: string): void {
    this.updateSettings(s => {
      s.hermesServerUrl = url.trim();
    });
  },

  setContextSharing(moduleKey: keyof HermesShareContext, enabled: boolean): void {
    this.updateSettings(s => {
      if (!s.shareContext) s.shareContext = { ...DEFAULT_HERMES_SETTINGS.shareContext };
      s.shareContext[moduleKey] = enabled;
    });
  },

  recordUsage(promptTokens: number = 0, completionTokens: number = 0): void {
    const today = new Date().toISOString().split('T')[0];
    this.updateSettings(s => {
      if (!s.usage) {
        s.usage = { ...DEFAULT_HERMES_SETTINGS.usage };
      }
      if (s.usage.today_date !== today) {
        s.usage.today_date = today;
        s.usage.today_requests = 0;
      }
      s.usage.total_requests += 1;
      s.usage.today_requests += 1;
      s.usage.prompt_tokens += promptTokens;
      s.usage.completion_tokens += completionTokens;
    });
  },

  // ========================================================
  // 2. Chat Sessions Manager (gd_hermes_chats)
  // ========================================================
  getChats(): HermesChatSession[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CHATS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => b.updated_at - a.updated_at);
      }
    } catch (e) {
      console.warn('Failed to parse Hermes chats from localStorage', e);
    }
    return [];
  },

  getChat(id: string): HermesChatSession | null {
    const chats = this.getChats();
    return chats.find(c => c.id === id) || null;
  },

  saveChat(session: HermesChatSession): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const chats = this.getChats();
      const existingIdx = chats.findIndex(c => c.id === session.id);
      
      // Compact old messages (>15 turns old) to save storage:
      // Keep recent 12 messages with rawParts intact. For older turns, flatten rawParts into content summary.
      const compactedMessages = session.messages.map((m, idx) => {
        const isOld = idx < session.messages.length - 12;
        if (isOld && m.rawParts) {
          const { rawParts, ...rest } = m;
          return {
            ...rest,
            content: rest.content || '[Tool execution completed]',
          };
        }
        return m;
      });

      const updatedSession: HermesChatSession = {
        ...session,
        messages: compactedMessages,
        updated_at: Date.now(),
      };

      if (existingIdx >= 0) {
        chats[existingIdx] = updatedSession;
      } else {
        chats.unshift(updatedSession);
      }

      // Cap at MAX_STORED_CHATS
      const capped = chats.slice(0, MAX_STORED_CHATS);
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(capped));
    } catch (e) {
      console.error('Failed to save Hermes chat session', e);
    }
  },

  deleteChat(id: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const chats = this.getChats().filter(c => c.id !== id);
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    } catch (e) {
      console.error('Failed to delete Hermes chat', e);
    }
  },

  renameChat(id: string, newTitle: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const chats = this.getChats();
      const chat = chats.find(c => c.id === id);
      if (chat) {
        chat.title = newTitle.trim() || 'Conversation';
        chat.updated_at = Date.now();
        localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
      }
    } catch (e) {
      console.error('Failed to rename Hermes chat', e);
    }
  },

  clearAllChats(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(CHATS_STORAGE_KEY);
  },

  getVoiceStorageStats(): { count: number; totalBytes: number; formattedSize: string } {
    const chats = this.getChats();
    let count = 0;
    let totalBytes = 0;

    chats.forEach(chat => {
      (chat.messages || []).forEach(m => {
        if (m.voiceAttachment?.base64Audio) {
          count++;
          totalBytes += Math.round(m.voiceAttachment.base64Audio.length * 0.75);
        }
      });
    });

    let formattedSize = '0 KB';
    if (totalBytes > 1024 * 1024) {
      formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalBytes > 0) {
      formattedSize = `${Math.max(1, Math.round(totalBytes / 1024))} KB`;
    }

    return { count, totalBytes, formattedSize };
  },

  clearAllVoiceAudio(): number {
    if (typeof localStorage === 'undefined') return 0;
    try {
      const chats = this.getChats();
      let clearedCount = 0;

      chats.forEach(chat => {
        (chat.messages || []).forEach(m => {
          if (m.voiceAttachment?.base64Audio) {
            clearedCount++;
            m.voiceAttachment.base64Audio = undefined;
          }
        });
      });

      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
      return clearedCount;
    } catch (e) {
      console.error('Failed to clear voice audio from chats', e);
      return 0;
    }
  },

  createNewChatSession(initialMessage?: string): HermesChatSession {
    const id = 'chat-' + generateUUID().slice(0, 8);
    const title = initialMessage 
      ? initialMessage.trim().slice(0, 32) + (initialMessage.length > 32 ? '...' : '')
      : 'New Chat';
    
    const newSession: HermesChatSession = {
      id,
      title,
      created_at: Date.now(),
      updated_at: Date.now(),
      messages: [],
    };

    this.saveChat(newSession);
    return newSession;
  },

  // ========================================================
  // 3. Hermes Memory Notes (gd_hermes_notes)
  // ========================================================
  getMemoryNotes(): HermesMemoryNote[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => b.updated_at - a.updated_at);
      }
    } catch (e) {
      console.warn('Failed to parse Hermes memory notes', e);
    }
    return [];
  },

  addMemoryNote(content: string): HermesMemoryNote {
    const clean = content.trim();
    const note: HermesMemoryNote = {
      id: 'note-' + generateUUID().slice(0, 8),
      content: clean,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    if (typeof localStorage !== 'undefined') {
      const notes = this.getMemoryNotes();
      notes.unshift(note);
      const capped = notes.slice(0, MAX_STORED_NOTES);
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(capped));
    }
    return note;
  },

  updateMemoryNote(id: string, content: string): void {
    if (typeof localStorage === 'undefined') return;
    const notes = this.getMemoryNotes();
    const target = notes.find(n => n.id === id);
    if (target) {
      target.content = content.trim();
      target.updated_at = Date.now();
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    }
  },

  deleteMemoryNote(id: string): void {
    if (typeof localStorage === 'undefined') return;
    const notes = this.getMemoryNotes().filter(n => n.id !== id);
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  },

  clearAllMemoryNotes(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(NOTES_STORAGE_KEY);
  },
};
