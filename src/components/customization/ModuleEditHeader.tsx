import React from 'react';
import { 
  SlidersHorizontal, 
  Plus, 
  LayoutGrid, 
  RotateCcw, 
  Save, 
  X,
  ArrowLeft
} from 'lucide-react';
import { useTranslation } from '../../services/i18n';
import { FlameLogo } from '../flame/FlameLogo';

interface ModuleEditHeaderProps {
  title: string;
  subtitle?: string;
  isEditMode: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveLayout: () => void;
  onOpenAddWidget: () => void;
  onOpenPresets: () => void;
  onResetDefault: () => void;
  actionsRight?: React.ReactNode;
  onBack?: () => void;
}

export const ModuleEditHeader: React.FC<ModuleEditHeaderProps> = ({
  title,
  subtitle,
  isEditMode,
  onStartEdit,
  onCancelEdit,
  onSaveLayout,
  onOpenAddWidget,
  onOpenPresets,
  onResetDefault,
  actionsRight,
  onBack,
}) => {
  const { t, isRtl } = useTranslation();

  if (isEditMode) {
    return (
      <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]  space-y-2.5 animate-slide-down">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--color-accent)]" />
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-primary)]">
                {t('dashboard.editDashboard', 'Edit Layout')} • {title}
              </h2>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {t('dashboard.reorderCards', 'Reorder, resize, and toggle cards')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCancelEdit}
              className="px-2.5 py-1 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all tap-feedback"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={onSaveLayout}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-bold shadow-sm transition-all tap-feedback"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('common.save', 'Save')}</span>
            </button>
          </div>
        </div>

        {/* Secondary Action Toolbar */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--color-border)] text-xs">
          <button
            onClick={onOpenAddWidget}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-semibold text-xs transition-all tap-feedback"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>{t('dashboard.addWidget', 'Add Widget')}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenPresets}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] text-xs transition-all tap-feedback"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t('common.presets', 'Presets')}</span>
            </button>

            <button
              onClick={onResetDefault}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-negative)] border border-[var(--color-border)] text-xs transition-all tap-feedback"
              title="Restore Default Layout"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('common.reset', 'Reset')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <header className="flex items-center justify-between pt-2 pb-1">
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] tap-feedback shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        )}
        <FlameLogo />
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-[var(--color-text-primary)] tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actionsRight}
        <button
          onClick={onStartEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] text-xs font-semibold transition-all tap-feedback shadow-sm"
          title={`Edit ${title} Layout`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{t('common.edit', 'Edit Layout')}</span>
        </button>
      </div>
    </header>
  );
};
