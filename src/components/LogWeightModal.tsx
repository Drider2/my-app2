import React, { useState } from 'react';
import { X, Check, Scale } from 'lucide-react';
import { db, generateUUID, getTodayLocalDate } from '../services/storage';
import { BodyweightEntry } from '../types';

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentLatestWeight?: number;
}

export const LogWeightModal: React.FC<LogWeightModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  currentLatestWeight = 78.4,
}) => {
  const today = getTodayLocalDate();
  const [weight, setWeight] = useState<string>(currentLatestWeight.toString());
  const [date, setDate] = useState<string>(today);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 0) return;

    const now = Date.now();
    const entry: BodyweightEntry = {
      id: generateUUID(),
      local_date: date,
      weight_kg: Math.round(val * 10) / 10,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(state => {
      // If entry exists for date, update it, else push
      const existingIdx = state.bodyweightEntries.findIndex(
        b => b.local_date === date && !b.deleted_at
      );
      if (existingIdx >= 0) {
        state.bodyweightEntries[existingIdx] = entry;
      } else {
        state.bodyweightEntries.push(entry);
      }
    });

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60  animate-fade-in">
      <div 
        className="w-full max-w-sm bg-[var(--color-surface)] rounded-3xl p-5  border border-[var(--color-border)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-weight-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#222C24] text-[var(--color-accent)] border border-[var(--color-border)]">
              <Scale className="w-4 h-4" />
            </div>
            <h2 id="log-weight-title" className="text-sm font-bold text-[var(--color-text-primary)]">
              Record Body Weight
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[var(--color-text-secondary)] hover:bg-[#222C24]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 py-3">
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full text-base font-bold text-[var(--color-text-primary)] px-3.5 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] focus:outline-none focus:border-[var(--color-accent)] text-center"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1">
              Measurement Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-medium text-[var(--color-text-primary)] px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[#222C24] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-bold rounded-xl hover:bg-[#b8e482] flex items-center justify-center gap-1.5 "
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Save Weigh-in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
