const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'screens', 'JournalScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add icons
content = content.replace(
  'Trash2,\n  ArrowLeft\n} from \'lucide-react\';',
  'Trash2,\n  ArrowLeft,\n  Edit2,\n  Download,\n  Sparkles,\n  Filter\n} from \'lucide-react\';'
);

// 2. Add state
const targetState = `  const [selectedMood, setSelectedMood] = useState(4);
  const [tagsInput, setTagsInput] = useState('reflection, focus');
  const [isUnlocked, setIsUnlocked] = useState(!state.settings.journal_lock_enabled);`;

const replacementState = `  const [selectedMood, setSelectedMood] = useState(4);
  const [tagsInput, setTagsInput] = useState('reflection, focus');
  const [isUnlocked, setIsUnlocked] = useState(!state.settings.journal_lock_enabled);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<number | 'all'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };`;

content = content.replace(targetState, replacementState);

// 3. Update filteredEntries with moodFilter
const targetFilter = `  const filteredEntries = state.journalEntries.filter(j => {
    if (j.deleted_at) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (j.title && j.title.toLowerCase().includes(q)) ||
      j.body.toLowerCase().includes(q) ||
      j.tags.some(t => t.toLowerCase().includes(q))
    );
  });`;

const replacementFilter = `  const filteredEntries = state.journalEntries.filter(j => {
    if (j.deleted_at) return false;
    if (moodFilter !== 'all' && j.mood !== moodFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (j.title && j.title.toLowerCase().includes(q)) ||
      j.body.toLowerCase().includes(q) ||
      j.tags.some(t => t.toLowerCase().includes(q))
    );
  });`;

content = content.replace(targetFilter, replacementFilter);

// 4. Update handleSaveEntry to support edit and add export
const targetSave = `  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBody.trim()) return;

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

    // Cross-module linking: completes 'Evening reflection' habit!
    LinkingService.onJournalSaved();

    setIsWriting(false);
    setNewTitle('');
    setNewBody('');
    onRefresh();
  };`;

const replacementSave = `  const handleStartEdit = (entry: JournalEntry) => {
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
    setNewBody(prev => prev ? \`\${prev}\\n\\n\${promptText} \` : \`\${promptText} \`);
  };

  const handleExportMarkdown = () => {
    const active = state.journalEntries.filter(j => !j.deleted_at);
    if (active.length === 0) {
      triggerToast('No reflections to export');
      return;
    }

    const lines = [
      '# GreenDream Private Journal & Daily Reflections',
      \`Exported on: \${today}\`,
      \`Total Entries: \${active.length}\`,
      '---',
      ''
    ];

    for (const entry of active) {
      lines.push(\`## \${entry.title || 'Untitled Reflection'} — \${entry.local_date}\`);
      if (entry.mood) lines.push(\`**Mood Rating**: \${entry.mood}/5\`);
      if (entry.tags && entry.tags.length > 0) lines.push(\`**Tags**: #\${entry.tags.join(' #')}\`);
      lines.push('');
      lines.push(entry.body);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    const blob = new Blob([lines.join('\\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`greendream_journal_\${today}.md\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast(\`✓ Exported \${active.length} reflections to Markdown\`);
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
  };`;

content = content.replace(targetSave, replacementSave);

// 5. Add Export button in top right of header
const targetHeaderRight = `<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)] text-xs font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>{t('journal.encrypted', 'Encrypted Space')}</span>
        </div>`;

const replacementHeaderRight = `<div className="flex items-center gap-2">
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
        </div>`;

content = content.replace(targetHeaderRight, replacementHeaderRight);

// 6. Add toast rendering at top of screen
const targetRoot = '<div className="space-y-4 pb-28">';
const replacementRoot = `<div className="space-y-4 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--text-1)] text-[var(--bg)] font-bold text-xs border border-[var(--hairline)] flex items-center gap-2 shadow-xl animate-slide-down">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}`;

content = content.replace(targetRoot, replacementRoot);

// 7. Add mood filters bar under Search bar
const targetSearch = `        />
      </div>`;

const replacementSearch = `        />
      </div>

      {/* Mood Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase shrink-0 px-1">Mood:</span>
        {(['all', 5, 4, 3, 2, 1] as const).map(m => (
          <button
            key={String(m)}
            onClick={() => setMoodFilter(m)}
            className={\`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-feedback min-h-[32px] \${
              moodFilter === m
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] font-bold shadow-sm'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }\`}
          >
            {m === 'all' ? 'All' : \`\${m} ★\`}
          </button>
        ))}
      </div>`;

content = content.replace(targetSearch, replacementSearch);

// 8. Add prompt chips inside write form
const targetPromptChips = `<div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
              {t('journal.newReflection', 'New Reflection')} ({today})
            </span>
            <button
              type="button"
              onClick={() => setIsWriting(false)}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>`;

const replacementPromptChips = `<div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
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
          </div>`;

content = content.replace(targetPromptChips, replacementPromptChips);

// 9. Add Edit button on each entry card
const targetCardActions = `<div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">{entry.local_date}</span>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors tap-feedback"
                  title={t('common.delete', 'Delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>`;

const replacementCardActions = `<div className="flex items-center gap-1.5">
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
              </div>`;

content = content.replace(targetCardActions, replacementCardActions);

fs.writeFileSync(file, content, 'utf8');
console.log('JournalScreen updated with Edit, Markdown Export, Prompt Chips, and Mood Filters!');
