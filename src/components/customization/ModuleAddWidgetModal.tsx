import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Check, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  LineChart, 
  PiggyBank, 
  Sliders, 
  Zap, 
  HandCoins, 
  Clock, 
  PieChart, 
  CheckSquare, 
  Calendar, 
  Wrench, 
  ShoppingBag, 
  Compass, 
  FileText, 
  Dumbbell, 
  Activity, 
  Scale, 
  Bot, 
  Sparkles,
  Target,
  BarChart3,
  HeartHandshake,
  ShieldCheck,
  CreditCard,
  Sun,
  Award,
  AlertCircle
} from 'lucide-react';
import { ModuleId, ModuleWidgetConfig, ResolutionMode, SIZE_RESOLUTION_OPTIONS } from '../../types';
import { getWidgetsForModule, ModuleWidgetDefinition } from '../../services/moduleWidgetRegistry';
import { useTranslation } from '../../services/i18n';

interface ModuleAddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: ModuleId;
  moduleTitle: string;
  currentWidgets: ModuleWidgetConfig[];
  onAddWidget: (widgetType: string, resolution?: ResolutionMode) => void;
}

export const ModuleAddWidgetModal: React.FC<ModuleAddWidgetModalProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleTitle,
  currentWidgets,
  onAddWidget,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedResolution, setSelectedResolution] = useState<ResolutionMode>('full');

  if (!isOpen) return null;

  const availableWidgets = getWidgetsForModule(moduleId);
  const addedWidgetTypes = new Set(currentWidgets.map(w => w.widgetType));

  // Extract unique categories for this module
  const categories = ['all', ...Array.from(new Set(availableWidgets.map(w => w.category)))];

  const filteredWidgets = availableWidgets.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getWidgetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wallet': return Wallet;
      case 'TrendingUp': return TrendingUp;
      case 'TrendingDown': return TrendingDown;
      case 'LineChart': return LineChart;
      case 'PiggyBank': return PiggyBank;
      case 'Sliders': return Sliders;
      case 'Zap': return Zap;
      case 'HandCoins': return HandCoins;
      case 'Clock': return Clock;
      case 'PieChart': return PieChart;
      case 'CheckSquare': return CheckSquare;
      case 'Calendar': return Calendar;
      case 'Wrench': return Wrench;
      case 'ShoppingBag': return ShoppingBag;
      case 'Compass': return Compass;
      case 'FileText': return FileText;
      case 'Dumbbell': return Dumbbell;
      case 'Activity': return Activity;
      case 'Scale': return Scale;
      case 'Bot': return Bot;
      case 'Sparkles': return Sparkles;
      case 'Target': return Target;
      case 'BarChart3': return BarChart3;
      case 'HeartHandshake': return HeartHandshake;
      case 'ShieldCheck': return ShieldCheck;
      case 'CreditCard': return CreditCard;
      case 'Sun': return Sun;
      case 'Award': return Award;
      default: return AlertCircle;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75  p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-[var(--color-card)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col  overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">
              Add {moduleTitle} Widget
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Select and insert cards into your {moduleTitle} layout
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] tap-feedback"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resolution / Size Options (Full 1920x1080, Small 400x300, Portrait 1080x1920) */}
        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              Item Size / Resolution:
            </span>
            <span className="text-xs font-mono font-bold text-[var(--color-accent)] bg-[var(--color-card)] px-2 py-0.5 rounded-lg border border-[var(--color-border)]">
              {SIZE_RESOLUTION_OPTIONS[selectedResolution].pixelLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['full', 'small', 'portrait'] as ResolutionMode[]).map((resKey) => {
              const opt = SIZE_RESOLUTION_OPTIONS[resKey];
              const isSel = selectedResolution === resKey;
              return (
                <button
                  key={resKey}
                  type="button"
                  onClick={() => setSelectedResolution(resKey)}
                  className={`p-2 rounded-xl text-start transition-all border cursor-pointer ${
                    isSel
                      ? 'bg-[var(--color-card)] border-[var(--color-accent)] shadow-sm ring-1 ring-[var(--color-accent)]'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="text-xs font-bold text-[var(--color-text-primary)]">
                    {opt.label}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--color-text-secondary)] mt-0.5">
                    {opt.pixelLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${moduleTitle} widgets...`}
              className="w-full ps-9 pe-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* Category Tabs */}
          {categories.length > 2 && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all capitalize ${
                    selectedCategory === cat
                      ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
                      : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Widget Grid List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
          {filteredWidgets.length === 0 ? (
            <div className="py-12 text-center text-[var(--color-text-muted)] text-xs">
              No widgets found matching your query.
            </div>
          ) : (
            filteredWidgets.map((def) => {
              const IconComp = getWidgetIcon(def.icon);
              const isAdded = addedWidgetTypes.has(def.type);

              return (
                <div
                  key={def.type}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isAdded
                      ? 'bg-[var(--color-surface)]/60 border-[var(--color-border)]'
                      : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-accent)] shadow-sm'
                  }`}
                >
                  {/* Left Icon + Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                          {def.name}
                        </h4>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                          {def.category}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Add / Added Button */}
                  <div className="shrink-0">
                    {isAdded ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-positive)] px-2.5 py-1 rounded-xl bg-[var(--color-positive)]/10">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onAddWidget(def.type)}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm hover:opacity-95 active:scale-95 transition-all tap-feedback"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
