import React from 'react';
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Trash2, 
  Maximize2 
} from 'lucide-react';
import { ModuleWidgetConfig, WidgetSize, ResolutionMode, SIZE_RESOLUTION_OPTIONS } from '../../types';
import { MODULE_WIDGET_REGISTRY } from '../../services/moduleWidgetRegistry';

interface ModuleWidgetContainerProps {
  widget: ModuleWidgetConfig;
  isEditMode: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  onToggleVisibility?: () => void;
  onChangeSize?: (size: WidgetSize) => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragHandleProps?: any;
  children: React.ReactNode;
}

export const ModuleWidgetContainer: React.FC<ModuleWidgetContainerProps> = ({
  widget,
  isEditMode,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleVisibility,
  onChangeSize,
  isFirst,
  isLast,
  dragHandleProps,
  children,
}) => {
  const def = MODULE_WIDGET_REGISTRY[widget.widgetType];
  const isHidden = !widget.visible;

  // Responsive column spans & pixel aspects
  const getSizeClass = (size: WidgetSize) => {
    switch (size) {
      case 'small':
        return 'col-span-1 max-w-[420px]';
      case 'portrait':
        return 'col-span-1 row-span-2 min-h-[480px] flex flex-col justify-between';
      case 'medium':
        return 'col-span-1 sm:col-span-1';
      case 'large':
        return 'col-span-1 sm:col-span-2';
      case 'full':
      default:
        return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 w-full';
    }
  };

  // Cycle supported sizes: small -> medium -> large -> full -> small
  const handleCycleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onChangeSize) return;
    const supported = def?.supportedSizes || ['small', 'medium', 'full'];
    const currentIdx = supported.indexOf(widget.size);
    const nextIdx = (currentIdx + 1) % supported.length;
    onChangeSize(supported[nextIdx]);
  };

  return (
    <div
      className={`relative transition-all duration-200 ${getSizeClass(widget.size)} ${
        isEditMode
          ? 'p-1.5 rounded-3xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-surface)]/40 shadow-dark-sm'
          : ''
      } ${isHidden && isEditMode ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Edit Mode Control Toolbar */}
      {isEditMode && (
        <div className="flex items-center justify-between p-2 mb-2 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs shadow-sm select-none">
          {/* Left: Drag Handle & Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div 
              {...dragHandleProps}
              className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-grab active:cursor-grabbing hover:bg-[var(--color-elevated)] transition-all"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <span className="text-xs font-bold text-[var(--color-text-primary)] truncate max-w-[140px] sm:max-w-[200px]">
              {def?.name || widget.widgetType}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Reorder Up */}
            {!isFirst && onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)] tap-feedback"
                title="Move Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Reorder Down */}
            {!isLast && onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)] tap-feedback"
                title="Move Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Size & Resolution Selector (Full 1920x1080, Small 400x300, Portrait 1080x1920) */}
            {onChangeSize && (
              <div className="flex items-center gap-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-0.5">
                {(['full', 'small', 'portrait'] as ResolutionMode[]).map((resMode) => {
                  const opt = SIZE_RESOLUTION_OPTIONS[resMode];
                  const isActive = (widget.resolution === resMode) || (widget.size === resMode);
                  return (
                    <button
                      key={resMode}
                      type="button"
                      onClick={() => onChangeSize(resMode as WidgetSize)}
                      className={`px-1.5 py-0.5 text-[11px] font-mono rounded font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--color-accent)] text-[var(--color-bg)] font-bold shadow-xs'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                      }`}
                      title={`${opt.label} (${opt.pixelLabel})`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Toggle Visibility */}
            {onToggleVisibility && (
              <button
                type="button"
                onClick={onToggleVisibility}
                className={`p-1.5 rounded-xl border transition-all tap-feedback flex items-center justify-center ${
                  widget.visible
                    ? 'text-[var(--accent-light)] bg-[rgb(var(--accent-rgb)/0.15)] border-[rgb(var(--accent-rgb)/0.35)] shadow-[0_0_10px_rgb(var(--accent-rgb)/0.2)]'
                    : 'text-[var(--text-3)] bg-white/5 border-white/10 hover:text-[var(--text-1)]'
                }`}
                title={widget.visible ? 'Hide widget' : 'Show widget'}
              >
                {widget.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Remove Widget */}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-negative)] hover:bg-[var(--color-negative)]/10 transition-colors tap-feedback"
                title="Remove widget from page (does not delete data)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actual Widget Rendered Content */}
      <div className={isHidden && !isEditMode ? 'hidden' : 'block'}>
        {children}
      </div>
    </div>
  );
};
