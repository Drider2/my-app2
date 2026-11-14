import { db, generateUUID, getTodayLocalDate } from './storage';
import { JournalEntry } from '../types';

export interface CreateVoiceNoteParams {
  title?: string;
  transcription: string;
  mood?: number;
  durationSeconds?: number;
  tags?: string[];
}

export class VoiceNoteService {
  static formatDuration(totalSeconds: number): string {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.floor(Math.max(0, totalSeconds) % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  static createVoiceNote(params: CreateVoiceNoteParams): JournalEntry {
    const today = getTodayLocalDate();
    const durationLabel = this.formatDuration(params.durationSeconds || 0);
    const title = params.title?.trim() || `Voice Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    
    // Default tags
    const combinedTags = Array.from(new Set([
      '#voicenote',
      ...(params.tags || []).map(t => t.startsWith('#') ? t : `#${t}`)
    ]));

    const formattedBody = `🎙️ **Voice Memo** [Duration: ${durationLabel}]\n\n${params.transcription.trim()}`;

    const newEntry: JournalEntry = {
      id: generateUUID(),
      local_date: today,
      title,
      body: formattedBody,
      mood: params.mood ?? 4,
      tags: combinedTags,
      is_encrypted: false,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    };

    db.updateState(state => {
      if (!state.journalEntries) state.journalEntries = [];
      state.journalEntries.unshift(newEntry);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('greendream_state_updated'));
    }

    return newEntry;
  }

  static parseVoiceNote(body: string): { isVoiceNote: boolean; duration: string | null; cleanContent: string } {
    const match = body.match(/^🎙️ \*\*Voice Memo\*\* \[Duration: ([\d:]+)\]\n\n([\s\S]*)$/);
    if (match) {
      return {
        isVoiceNote: true,
        duration: match[1],
        cleanContent: match[2].trim(),
      };
    }
    return {
      isVoiceNote: body.includes('🎙️') || body.includes('#voicenote'),
      duration: null,
      cleanContent: body,
    };
  }
}
