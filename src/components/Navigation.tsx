import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  MoonStar, 
  Dumbbell, 
  LayoutGrid,
  Plus
} from 'lucide-react';
import { useTranslation } from '../services/i18n';
import { Haptics } from '../services/haptics';
import { db } from '../services/storage';

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

interface NavigationProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  onOpenAddSheet: () => void;
  hideFab?: boolean;
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

export const BottomNavigation: React.FC<NavigationProps> = ({
  currentScreen,
  onSelectScreen,
  onOpenAddSheet,
  hideFab = false,
}) => {
  const { t } = useTranslation();
  const state = db.getState();
  const modules = state.settings.modules || {};

  // Dynamically filter navigation tabs based on user's active modules
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.id === 'dashboard' || item.id === 'more') return true;
    if (item.id === 'finance') return modules.finance !== false;
    if (item.id === 'prayers') return modules.prayer !== false;
    if (item.id === 'gym') return modules.gym !== false;
    return true;
  });

  // Screens where FAB and direct tabs are excluded or routed through More
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
      {/* Floating Single '+' Quick-Add FAB (hidden when sheets or Hermes chat modals are open) */}
      {!hideFab && !isExcludedScreen && (
        <aside 
          aria-label="Quick action trigger" 
          className="fixed z-[35] end-5 md:hidden"
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
            className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-[var(--on-accent)] transition-all duration-150 active:scale-95 focus:outline-none"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              boxShadow: '0 0 26px rgb(var(--accent-rgb) / 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.50)',
            }}
          >
            <Plus className="w-6 h-6 stroke-[2.6]" />
          </button>
        </aside>
      )}

      {/* Responsive Mobile Bottom Navigation (Hidden on Tablet & Desktop) */}
      <nav 
        role="tablist"
        aria-label="Main navigation"
        className="fixed z-[30] inset-x-[10px] max-w-lg mx-auto h-[60px] rounded-2xl flex md:hidden items-center px-2 select-none bg-[var(--color-card)] border border-[var(--color-border)] shadow-lg"
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
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                onClick={() => {
                  Haptics.tick();
                  onSelectScreen(item.id);
                }}
                className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] tap-feedback transition-all focus:outline-none group"
              >
                {/* Active Pill or Inactive Icon */}
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

                {/* Tab Label */}
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
