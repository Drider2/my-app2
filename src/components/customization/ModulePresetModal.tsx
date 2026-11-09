import React from 'react';
import { X, LayoutGrid, Check, Sparkles } from 'lucide-react';
import { ModuleId } from '../../types';
import { getPresetsForModule } from '../../services/moduleWidgetRegistry';
import { useTranslation } from '../../services/i18n';

interface ModulePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: ModuleId;
  moduleTitle: string;
  activePreset: string;
  onSelectPreset: (presetId: string) => void;
}

export const ModulePresetModal: React.FC<ModulePresetModalProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleTitle,
  activePreset,
  onSelectPreset,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const presets = getPresetsForModule(moduleId);
  const presetList = Object.values(presets);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75  p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[var(--color-card)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col  overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                {moduleTitle} Layout Presets
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Choose a preconfigured arrangement for {moduleTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] tap-feedback"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Cards List */}
        <div className="p-4 space-y-2.5 overflow-y-auto no-scrollbar">
          {presetList.map((preset) => {
            const isSelected = activePreset === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset.id);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-surface)] '
                    : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-accent)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg)]">
                        Active
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-bg)]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {preset.description}
                </p>
                <div className="mt-2.5 pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{preset.widgetTypes.length} cards included</span>
                  <span className="font-semibold text-[var(--color-accent)]">Tap to apply</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
