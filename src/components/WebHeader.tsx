import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  MoonStar, 
  Dumbbell, 
  Calendar, 
  Wrench, 
  BookOpen, 
  ClipboardCheck, 
  Bot, 
  Settings, 
  Plus, 
  Sun, 
  Moon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ScreenId } from './Navigation';
import { useTranslation } from '../services/i18n';
import { Haptics } from '../services/haptics';
import { db } from '../services/storage';
import { getTheme, toggleTheme } from '../services/themeService';

interface WebHeaderProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  onOpenAddSheet: () => void;
  onOpenAiChat: () => void;
}

export const WebHeader: React.FC<WebHeaderProps> = ({
  currentScreen,
  onSelectScreen,
  onOpenAddSheet,
  onOpenAiChat,
}) => {
  const { t } = useTranslation();
  const state = db.getState();
  const theme = getTheme();
  const modules = state.settings.modules || {};

  const navLinks = [
    { id: 'dashboard' as ScreenId, label: 'Today', icon: LayoutDashboard },
    ...(modules.finance !== false ? [{ id: 'finance' as ScreenId, label: 'Money', icon: Wallet }] : []),
    ...(modules.prayer !== false ? [{ id: 'prayers' as ScreenId, label: 'Prayer', icon: MoonStar }] : []),
    ...(modules.gym !== false ? [{ id: 'gym' as ScreenId, label: 'Body', icon: Dumbbell }] : []),
    ...(modules.calendar !== false ? [{ id: 'calendar' as ScreenId, label: 'Calendar', icon: Calendar }] : []),
    ...(modules.maintenance !== false ? [{ id: 'maintenance' as ScreenId, label: 'Upkeep', icon: Wrench }] : []),
    ...(modules.journal !== false ? [{ id: 'journal' as ScreenId, label: 'Journal', icon: BookOpen }] : []),
    ...(modules.weekly_review !== false ? [{ id: 'weekly-review' as ScreenId, label: 'Review', icon: ClipboardCheck }] : []),
    { id: 'assistant' as ScreenId, label: 'Hermes AI', icon: Bot },
    { id: 'settings' as ScreenId, label: 'Settings', icon: Settings },
  ];

  return (
    <header className="w-full bg-[var(--color-card)] border-b border-[var(--color-border)] sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            type="button"
            onClick={() => onSelectScreen('dashboard')}
            className="flex items-center gap-2.5 focus:outline-none group text-start cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] flex items-center justify-center font-black text-lg shadow-sm">
              G
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-[var(--color-text-primary)]">
                  GreenDream
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  Web
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Synced & Live</span>
              </div>
            </div>
          </button>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  Haptics.tick();
                  onSelectScreen(item.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Action & Theme Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Add Button */}
          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              onOpenAddSheet();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Create Item (+)"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Item</span>
          </button>

          {/* AI Quick Trigger */}
          <button
            type="button"
            onClick={onOpenAiChat}
            className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all cursor-pointer"
            title="Open Hermes AI"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              toggleTheme();
            }}
            className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all cursor-pointer"
            title="Toggle Dark / Light Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
