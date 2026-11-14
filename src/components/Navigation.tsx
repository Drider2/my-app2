import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  MoonStar, 
  Dumbbell, 
  LayoutGrid,
  Plus,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '../services/i18n';
import { Haptics } from '../services/haptics';
import { db } from '../services/storage';
import { getTheme, toggleTheme } from '../services/themeService';

export type ScreenId = 
  | 'dashboard' 
  | 'finance' 
  | 'prayers' 
  | 'gym' 
  | 'more' 
  | 'assistant' 
  | 'calendar' 
  | 'journal' 
  | 'maintenance' 
  | 'settings' 
  | 'weekly-review'
  | 'flame';

export interface NavigationProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  onOpenAddSheet: () => void;
  hideFab?: boolean;
  onOpenAiChat?: () => void;
}

interface NavDestination {
  id: ScreenId;
  labelKey: string;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavDestination[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', defaultLabel: 'Today', icon: LayoutDashboard },
  { id: 'finance', labelKey: 'nav.money', defaultLabel: 'Money', icon: Wallet },
  { id: 'prayers', labelKey: 'nav.prayer', defaultLabel: 'Prayer', icon: MoonStar },
  { id: 'gym', labelKey: 'nav.body', defaultLabel: 'Body', icon: Dumbbell },
  { id: 'more', labelKey: 'nav.more', defaultLabel: 'More', icon: LayoutGrid },
];

/**
 * BottomNavigation is used in Phone and Wide display modes.
 * Hidden on Tablet mode (where NavigationRail takes over).
 */
export const BottomNavigation: React.FC<NavigationProps> = ({
  currentScreen,
  onSelectScreen,
  onOpenAddSheet,
  hideFab = false,
}) => {
  const { t } = useTranslation();
  const state = db.getState();
  const modules = state.settings.modules || {};

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.id === 'dashboard' || item.id === 'more') return true;
    if (item.id === 'finance') return modules.finance !== false;
    if (item.id === 'prayers') return modules.prayer !== false;
    if (item.id === 'gym') return modules.gym !== false;
    return true;
  });

  const isExcludedScreen = [
    'more',
    'assistant',
    'calendar',
    'journal',
    'maintenance',
    'settings',
    'weekly-review',
    'history',
    'badges',
    'analytics'
  ].includes(currentScreen);

  const isMoreActive = isExcludedScreen;

  return (
    <>
      {/* Floating Single '+' Quick-Add FAB (hidden on tablet mode or when excluded screens/modals are active) */}
      {!hideFab && !isExcludedScreen && (
        <aside 
          aria-label="Quick action trigger" 
          className="fixed z-[35] end-5 tablet:hidden"
          style={{
            zIndex: 'var(--z-fab)',
            bottom: 'calc(max(10px, env(safe-area-inset-bottom)) + 74px)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              onOpenAddSheet();
            }}
            aria-label={t('nav.quickAction', 'Quick action menu')}
            title={t('nav.quickAction', 'Quick action menu')}
            className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-[var(--on-accent)] transition-all duration-150 active:scale-95 focus:outline-none cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              boxShadow: '0 0 26px rgb(var(--accent-rgb) / 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.50)',
            }}
          >
            <Plus className="w-6 h-6 stroke-[2.6]" />
          </button>
        </aside>
      )}

      {/* Responsive Bottom Navigation Bar:
          - phone: max-w-lg
          - wide: centered max-w-[520px]
          - tablet: hidden (navigation rail is active)
      */}
      <nav 
        role="tablist"
        aria-label="Main navigation"
        className="fixed z-[30] inset-x-[10px] phone:max-w-lg wide:max-w-[520px] mx-auto h-[60px] rounded-2xl flex tablet:hidden items-center px-2 select-none bg-[var(--color-card)] border border-[var(--color-border)] shadow-lg"
        style={{
          zIndex: 'var(--z-nav)',
          bottom: 'max(10px, env(safe-area-inset-bottom))',
        }}
      >
        <div 
          className="w-full grid items-center justify-items-center"
          style={{
            gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))`
          }}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'more' 
              ? isMoreActive 
              : currentScreen === item.id;
            const label = t(item.labelKey, item.defaultLabel);

            return (
              <button
                key={item.id}
                data-tab-id={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                onClick={() => {
                  Haptics.tick();
                  onSelectScreen(item.id);
                }}
                className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] tap-feedback transition-all focus:outline-none group cursor-pointer"
              >
                <div 
                  className={`flex items-center justify-center transition-all duration-200 ${
                    isActive 
                      ? 'w-[44px] h-[26px] rounded-[13px]' 
                      : 'w-[44px] h-[26px]'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: 'rgb(var(--accent-rgb) / 0.20)',
                          border: '1px solid rgb(var(--accent-rgb) / 0.45)',
                          color: 'var(--accent-light)',
                        }
                      : {
                          color: 'var(--text-3)',
                        }
                  }
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                </div>

                <span 
                  className={`text-[12px] leading-tight transition-colors truncate max-w-full px-0.5 mt-0.5 ${
                    isActive ? 'font-medium' : 'font-normal'
                  }`}
                  style={{
                    color: isActive ? 'var(--accent-light)' : 'var(--text-3)',
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

/**
 * NavigationRail is used exclusively in Tablet display mode.
 * Placed on the start edge (left in LTR, right in RTL) at 96px width.
 * Features a top '+' Quick-Add button, vertical destinations, and utility controls.
 */
export const NavigationRail: React.FC<NavigationProps> = ({
  currentScreen,
  onSelectScreen,
  onOpenAddSheet,
  onOpenAiChat,
}) => {
  const { t } = useTranslation();
  const theme = getTheme();
  const state = db.getState();
  const modules = state.settings.modules || {};

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.id === 'dashboard' || item.id === 'more') return true;
    if (item.id === 'finance') return modules.finance !== false;
    if (item.id === 'prayers') return modules.prayer !== false;
    if (item.id === 'gym') return modules.gym !== false;
    return true;
  });

  const isExcludedScreen = [
    'more',
    'assistant',
    'calendar',
    'journal',
    'maintenance',
    'settings',
    'weekly-review',
    'history',
    'badges',
    'analytics'
  ].includes(currentScreen);

  const isMoreActive = isExcludedScreen;

  return (
    <aside
      aria-label="Tablet navigation rail"
      className="hidden tablet:flex fixed inset-y-0 start-0 w-[96px] z-[30] flex-col items-center py-5 select-none bg-[var(--color-card)] border-e border-[var(--color-border)] shadow-lg"
      style={{ zIndex: 'var(--z-nav)' }}
    >
      {/* Brand Mini Monogram */}
      <button
        type="button"
        onClick={() => onSelectScreen('dashboard')}
        className="w-10 h-10 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] flex items-center justify-center font-black text-lg shadow-sm hover:scale-105 active:scale-95 transition-all mb-4 cursor-pointer"
        title="GreenDream Dashboard"
      >
        G
      </button>

      {/* Top '+' Quick-Add Button (Replaces mobile floating FAB on tablet) */}
      <button
        type="button"
        onClick={() => {
          Haptics.tick();
          onOpenAddSheet();
        }}
        aria-label={t('nav.quickAction', 'Quick action menu')}
        title={t('nav.quickAction', 'Quick action menu')}
        className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-[var(--on-accent)] transition-all duration-150 active:scale-95 focus:outline-none mb-6 shadow-md cursor-pointer hover:brightness-105"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
          boxShadow: '0 0 20px rgb(var(--accent-rgb) / 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.40)',
        }}
      >
        <Plus className="w-6 h-6 stroke-[2.6]" />
      </button>

      {/* Vertical Navigation Items */}
      <nav 
        role="tablist"
        aria-label="Navigation rail destinations"
        className="w-full flex-1 flex flex-col items-center gap-2 overflow-y-auto no-scrollbar px-2"
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'more' 
            ? isMoreActive 
            : currentScreen === item.id;
          const label = t(item.labelKey, item.defaultLabel);

          return (
            <button
              key={item.id}
              data-tab-id={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              onClick={() => {
                Haptics.tick();
                onSelectScreen(item.id);
              }}
              className={`w-[78px] min-h-[54px] rounded-xl flex flex-col items-center justify-center gap-1 p-2 transition-all cursor-pointer tap-feedback ${
                isActive
                  ? 'bg-[rgb(var(--accent-rgb)/0.18)] border border-[rgb(var(--accent-rgb)/0.4)] text-[var(--accent-light)] shadow-sm'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--color-surface)] border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              <span className={`text-[12px] leading-tight truncate max-w-full ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Utilities: Theme & AI Quick Trigger */}
      <div className="w-full flex flex-col items-center gap-2 pt-3 border-t border-[var(--color-border)] px-2">
        {onOpenAiChat && (
          <button
            type="button"
            onClick={onOpenAiChat}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] flex items-center justify-center transition-all cursor-pointer"
            title="Hermes AI"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            Haptics.tick();
            toggleTheme();
          }}
          className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center justify-center transition-all cursor-pointer"
          title="Toggle Dark / Light Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
