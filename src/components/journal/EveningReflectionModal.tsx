import React, { useState } from 'react';
import { 
  Moon, 
  Sparkles, 
  X, 
  Heart, 
  Trophy, 
  Lightbulb, 
  Star, 
  Check, 
  Calendar 
} from 'lucide-react';
import { db, generateUUID, getTodayLocalDate } from '../../services/storage';
import { Haptics } from '../../services/haptics';

interface EveningReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

const MOOD_DESCRIPTIONS = [
  { val: 1, label: 'Heavy & Draining' },
  { val: 2, label: 'Challenging' },
  { val: 3, label: 'Steady & Grounded' },
  { val: 4, label: 'Great & Productive' },
  { val: 5, label: 'Unstoppable & Inspired' },
];

export const EveningReflectionModal: React.FC<EveningReflectionModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  onToast,
}) => {
  const today = getTodayLocalDate();

  const [gratitude1, setGratitude1] = useState('');
  const [gratitude2, setGratitude2] = useState('');
  const [gratitude3, setGratitude3] = useState('');
  const [bigWin, setBigWin] = useState('');
  const [improvement, setImprovement] = useState('');
  const [mood, setMood] = useState<number>(4);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gratitude1.trim() && !bigWin.trim()) return;

    Haptics.tick();

    const sections: string[] = [];

    // Gratitudes
    const grats = [gratitude1.trim(), gratitude2.trim(), gratitude3.trim()].filter(Boolean);
    if (grats.length > 0) {
      sections.push(`### 🙏 Daily Gratitudes\n` + grats.map((g, i) => `${i + 1}. ${g}`).join('\n'));
    }

    // Win
    if (bigWin.trim()) {
      sections.push(`### 🏆 Today's Greatest Win\n${bigWin.trim()}`);
    }

    // Improvement
    if (improvement.trim()) {
      sections.push(`### 💡 Growth & Improvement for Tomorrow\n${improvement.trim()}`);
    }

    sections.push(`\n#evening_reflection #gratitude #daily_win`);

    const fullBody = sections.join('\n\n');

    db.updateState(draft => {
      draft.journalEntries = draft.journalEntries || [];
      draft.journalEntries.unshift({
        id: generateUUID(),
        local_date: today,
        title: `Evening Wind-Down & Gratitude (${today})`,
        body: fullBody,
        mood,
        tags: ['evening_reflection', 'gratitude'],
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
      });
    });

    onToast('✓ Evening reflection saved to your private journal');
    onRefresh();
    onClose();
    Haptics.success();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70  animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4 shadow-2xl animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <span>Evening Wind-Down</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  {today}
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                3 daily gratitudes, top win & growth lessons
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-surface-subtle)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Gratitudes Section */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>3 Things I'm Grateful For Today</span>
            </label>
            <input
              type="text"
              required
              value={gratitude1}
              onChange={(e) => setGratitude1(e.target.value)}
              placeholder="1. First gratitude (e.g. good health, family dinner)"
              className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={gratitude2}
              onChange={(e) => setGratitude2(e.target.value)}
              placeholder="2. Second gratitude (e.g. morning walk, productive focus)"
              className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={gratitude3}
              onChange={(e) => setGratitude3(e.target.value)}
              placeholder="3. Third gratitude (e.g. quiet evening, clean desk)"
              className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Greatest Win Section */}
          <div className="space-y-1 p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Today's Greatest Win</span>
            </label>
            <input
              type="text"
              value={bigWin}
              onChange={(e) => setBigWin(e.target.value)}
              placeholder="What went exceptionally well today?"
              className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Growth / Improvement */}
          <div className="space-y-1 p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
              <span>One Thing to Handle Better Tomorrow</span>
            </label>
            <input
              type="text"
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              placeholder="A lesson learned or area of growth..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Day Rating & Mood */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--color-text-primary)]">Day Energy Rating</span>
              <span className="text-[11px] text-amber-400 font-bold">
                {MOOD_DESCRIPTIONS.find(m => m.val === mood)?.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 justify-center pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    Haptics.tick();
                    setMood(star);
                  }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    mood >= star
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  <Star className={`w-4 h-4 ${mood >= star ? 'fill-amber-400' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 tap-feedback"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Evening Reflection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
