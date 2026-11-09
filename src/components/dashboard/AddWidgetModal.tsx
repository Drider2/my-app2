import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Plus, 
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
  HeartHandshake
} from 'lucide-react';
import { WIDGET_REGISTRY, WidgetDefinition } from '../../services/widgetRegistry';
import { WidgetCategory, DashboardWidgetConfig, ResolutionMode, SIZE_RESOLUTION_OPTIONS } from '../../types';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidgets: DashboardWidgetConfig[];
  onAddWidget: (widgetType: string, resolution?: ResolutionMode) => void;
}

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  isOpen,
  onClose,
  currentWidgets,
  onAddWidget,
}) => {
  const [activeCategory, setActiveCategory] = useState<WidgetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResolution, setSelectedResolution] = useState<ResolutionMode>('full');

  if (!isOpen) return null;

  const categories: { id: WidgetCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'finance', label: 'Finance' },
    { id: 'personal', label: 'Personal Org' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'assistant', label: 'AI Assistant' },
  ];

  const addedWidgetTypes = new Set(currentWidgets.map(w => w.widgetType));
  const allDefinitions = Object.values(WIDGET_REGISTRY);

  const filtered = allDefinitions.filter(item => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
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
      default: return Activity;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--color-card)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-card)]">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">Add Widget</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">Choose component and resolution in pixels</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] transition-all tap-feedback cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resolution / Size Options in Pixels (Full, Small, Portrait) */}
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

        {/* Search & Category Tabs */}
        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute start-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search widgets (e.g. balance, workout, tasks)..."
              className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all tap-feedback cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Widgets List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
              No widgets found matching "{searchQuery}"
            </div>
          ) : (
            filtered.map(item => {
              const IconComp = getWidgetIcon(item.icon);
              const isAdded = addedWidgetTypes.has(item.type);

              return (
                <div
                  key={item.type}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-all"
                >
                  <div className="flex items-start gap-3 min-w-0 pe-2">
                    <div className="p-2.5 rounded-xl bg-[var(--color-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] shrink-0 mt-0.5">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{item.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-card)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                          {SIZE_RESOLUTION_OPTIONS[selectedResolution].pixelLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onAddWidget(item.type, selectedResolution)}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all tap-feedback cursor-pointer ${
                      isAdded
                        ? 'bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
                        : 'bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 shadow-sm'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
