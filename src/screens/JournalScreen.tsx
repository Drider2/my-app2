import React, { useState } from 'react';
import { 
  Lock, 
  Search, 
  Plus, 
  Check,
  Trash2,
  ArrowLeft,
  Edit2,
  Download,
  Sparkles,
  Filter,
  Moon,
  Mic
} from 'lucide-react';
import { db, generateUUID, getTodayLocalDate } from '../services/storage';
import { LinkingService } from '../services/linking';
import { JournalEntry } from '../types';
import { useTranslation } from '../services/i18n';
import { EveningReflectionModal } from '../components/journal/EveningReflectionModal';
import { AudioNoteModal } from '../components/journal/AudioNoteModal';
import { FlameLogo } from '../components/flame/FlameLogo';

interface JournalScreenProps {
  onRefresh: () => void;
  onBack?: () => void;
}

export const JournalScreen: React.FC<JournalScreenProps> = ({ onRefresh, onBack }) => {
  const { t, isRtl } = useTranslation();
  const state = db.getState();
  const today = getTodayLocalDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [selectedMood, setSelectedMood] = useState(4);
  const [tagsInput, setTagsInput] = useState('reflection, focus');
  const [isUnlocked, setIsUnlocked] = useState(!state.settings.journal_lock_enabled);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<number | 'all'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEveningModalOpen, setIsEveningModalOpen] = useState(false);
  const [isAudioNoteOpen, setIsAudioNoteOpen] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const filteredEntries = state.journalEntries.filter(j => {
    if (j.deleted_at) return false;
    if (moodFilter !== 'all' && j.mood !== moodFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (j.title && j.title.toLowerCase().includes(q)) ||
      j.body.toLowerCase().includes(q) ||
      j.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const handleStartEdit = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setNewTitle(entry.title || '');
    setNewBody(entry.body);
    setSelectedMood(entry.mood || 4);
    setTagsInput(entry.tags.join(', '));
    setIsWriting(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelWriting = () => {
    setIsWriting(false);
    setEditingEntryId(null);
    setNewTitle('');
    setNewBody('');
  };

  const handleApplyPrompt = (promptText: string) => {
    setNewBody(prev => prev ? `${prev}\n\n${promptText} ` : `${promptText} `);
  };

  const handleExportMarkdown = () => {
    const active = state.journalEntries.filter(j => !j.deleted_at);
    if (active.length === 0) {
      triggerToast('No reflections to export');
      return;
    }

    const lines = [
      '# GreenDream Private Journal & Daily Reflections',
      `Exported on: ${today}`,
      `Total Entries: ${active.length}`,
      '---',
      ''
    ];

    for (const entry of active) {
      lines.push(`## ${entry.title || 'Untitled Reflection'} — ${entry.local_date}`);
      if (entry.mood) lines.push(`**Mood Rating**: ${entry.mood}/5`);
      if (entry.tags && entry.tags.length > 0) lines.push(`**Tags**: #${entry.tags.join(' #')}`);
      lines.push('');
      lines.push(entry.body);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greendream_journal_${today}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(`✓ Exported ${active.length} reflections to Markdown`);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBody.trim()) return;

    if (editingEntryId) {
      db.updateState(s => {
        const target = s.journalEntries.find(j => j.id === editingEntryId);
        if (target) {
          target.title = newTitle.trim() || undefined;
          target.body = newBody.trim();
          target.mood = selectedMood;
          target.tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
          target.updated_at = Date.now();
        }
      });
      triggerToast('✓ Updated reflection');
    } else {
      const entry: JournalEntry = {
        id: generateUUID(),
        local_date: today,
        title: newTitle.trim() || undefined,
        body: newBody.trim(),
        mood: selectedMood,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        is_encrypted: state.settings.journal_lock_enabled,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      };

      db.updateState(s => {
        s.journalEntries.unshift(entry);
      });

      LinkingService.onJournalSaved();
      triggerToast('✓ Saved new reflection');
    }

    setIsWriting(false);
    setEditingEntryId(null);
    setNewTitle('');
    setNewBody('');
    onRefresh();
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm(t('journal.deleteConfirm', 'Delete this journal entry?'))) {
      db.updateState(s => {
        const j = s.journalEntries.find(item => item.id === id);
        if (j) j.deleted_at = Date.now();
      });
      onRefresh();
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--text-1)] text-[var(--bg)] font-bold text-xs border border-[var(--hairline)] flex items-center gap-2 shadow-xl animate-slide-down">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] tap-feedback shrink-0"
              aria-label={t('common.back', 'Back')}
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
          <FlameLogo />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {t('journal.title', 'Private Journal')}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('journal.subtitle', 'Personal reflections & daily notes')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAudioNoteOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-rose-500/40 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-rose-400 flex items-center gap-1.5 transition-colors tap-feedback"
            aria-label="Quick Voice Note & Audio Dictation"
            title="Quick Voice Note & Audio Dictation"
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Voice Note</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEveningModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500/40 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-indigo-400 flex items-center gap-1.5 transition-colors tap-feedback"
            title="Evening Wind-Down & Gratitude Wizard"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Wind-Down</span>
          </button>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-cyan-500/40 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-cyan-400 flex items-center gap-1.5 transition-colors tap-feedback"
            title="Export journal to Markdown"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
            <span>.MD</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('journal.encrypted', 'Encrypted Space')}</span>
          </div>
        </div>
      </div>

      {!isUnlocked ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-fade-in my-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
            <Lock className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              {t('journal.protectedTitle', 'Private Journal Protected')}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-xs">
              {t('journal.protectedSubtitle', 'Your personal reflections are private and locked.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsUnlocked(true)}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-semibold text-xs tap-feedback"
          >
            {t('journal.unlock', 'Unlock Journal')}
          </button>
        </div>
      ) : (
        <>
          {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute start-3.5 top-3" />
        <input
          type="text"
          placeholder={t('journal.searchPlaceholder', 'Search entries or tags...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs ps-10 pe-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)]"
        />
      </div>

      {/* Mood Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase shrink-0 px-1">Mood:</span>
        {(['all', 5, 4, 3, 2, 1] as const).map(m => (
          <button
            key={String(m)}
            onClick={() => setMoodFilter(m)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-feedback min-h-[32px] ${
              moodFilter === m
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold shadow-sm'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {m === 'all' ? 'All' : `${m} ★`}
          </button>
        ))}
      </div>

      {/* Write New Button / Form */}
      {!isWriting ? (
        <button
          onClick={() => setIsWriting(true)}
          className="w-full min-h-[44px] py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 tap-feedback transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t('journal.writeNew', 'Write New Reflection')}</span>
        </button>
      ) : (
        <form onSubmit={handleSaveEntry} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-accent)]/40 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {editingEntryId ? 'Edit Reflection' : t('journal.newReflection', 'New Reflection')} ({today})
            </span>
            <button
              type="button"
              onClick={handleCancelWriting}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>

          {/* Quick Reflection Starters */}
          <div className="space-y-1">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">Quick Starters</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '🌟 Grateful for...', text: 'Today I am deeply grateful for' },
                { label: '💡 Lesson learned:', text: 'One key lesson I learned today:' },
                { label: '🎯 Victory of the day:', text: 'Main victory achieved today:' },
                { label: '🌙 Evening brain dump:', text: 'Reflecting on today, my mind is focused on' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPrompt(p.text)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder={t('journal.titleOptional', 'Title (optional)')}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-muted)]"
          />

          <textarea
            placeholder={t('journal.promptPlaceholder', 'What thoughts or insights came to mind today?...')}
            rows={4}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] resize-none leading-relaxed placeholder-[var(--color-text-muted)]"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] font-medium">
                {t('journal.mood', 'Mood (1 to 5)')}
              </label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMood(m)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedMood === m 
                        ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold' 
                        : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] font-medium">
                {t('journal.tags', 'Tags (comma separated)')}
              </label>
              <input
                type="text"
                placeholder="gratitude, focus"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] mt-1 placeholder-[var(--color-text-muted)]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] py-2.5 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 tap-feedback"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{t('journal.save', 'Save to Private Journal')}</span>
          </button>
        </form>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {filteredEntries.map(entry => (
          <div key={entry.id} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {entry.title || t('journal.untitled', 'Untitled Reflection')}
                </span>
                {entry.mood && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent)]/20">
                    {t('journal.mood', 'Mood')}: {entry.mood}/5
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--color-text-muted)]">{entry.local_date}</span>
                <button
                  onClick={() => handleStartEdit(entry)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors tap-feedback"
                  title="Edit reflection"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors tap-feedback"
                  title={t('common.delete', 'Delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {entry.body}
            </p>

            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {entry.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
        </>
      )}
      <EveningReflectionModal
        isOpen={isEveningModalOpen}
        onClose={() => setIsEveningModalOpen(false)}
        onRefresh={onRefresh}
        onToast={triggerToast}
      />
      <AudioNoteModal
        isOpen={isAudioNoteOpen}
        onClose={() => setIsAudioNoteOpen(false)}
        onShowToast={triggerToast}
        onSaved={onRefresh}
      />
    </div>
  );
};
