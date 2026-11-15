import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BottomNavigation, NavigationRail, ScreenId } from './components/Navigation';
import { useLayout } from './hooks/useLayout';
import { Page } from './components/layout/Page';
import { SaveFeedbackBadge } from './components/layout/SaveFeedbackBadge';
import { AddActionSheet } from './components/AddActionSheet';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { HermesChatModal } from './components/ai/HermesChatModal';
import { VoiceConversationModal } from './components/voice/VoiceConversationModal';
import { FlameTenDayModal } from './components/flame/FlameTenDayModal';
import { ScreenSkeleton } from './components/ui/Skeleton';
import { MasterLoginGate } from './components/auth/MasterLoginGate';
import { isAppAuthenticated } from './services/authService';
import { initTheme } from './services/themeService';
import { initLanguage } from './services/i18n';
import { initFontSize } from './services/fontSizeService';
import { AppLifecycleLoop } from './services/appLifecycleLoop';
import { db, getTodayLocalDate } from './services/storage';
import { catchUpCelebrations } from './services/flame/flameService';

// Dashboard is kept eager for instantaneous 0ms first-screen paint
import { DashboardScreen } from './screens/DashboardScreen';

// Remaining screens are code-split & lazy-loaded on demand
const CalendarScreen = lazy(() => import('./screens/CalendarScreen').then(m => ({ default: m.CalendarScreen })));
const GymScreen = lazy(() => import('./screens/GymScreen').then(m => ({ default: m.GymScreen })));
const FinanceScreen = lazy(() => import('./screens/FinanceScreen').then(m => ({ default: m.FinanceScreen })));
const JournalScreen = lazy(() => import('./screens/JournalScreen').then(m => ({ default: m.JournalScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const AssistantScreen = lazy(() => import('./screens/AssistantScreen').then(m => ({ default: m.AssistantScreen })));
const MaintenanceScreen = lazy(() => import('./screens/MaintenanceScreen').then(m => ({ default: m.MaintenanceScreen })));
const PrayersScreen = lazy(() => import('./screens/PrayersScreen').then(m => ({ default: m.PrayersScreen })));
const WeeklyReviewScreen = lazy(() => import('./screens/WeeklyReviewScreen').then(m => ({ default: m.WeeklyReviewScreen })));
const MoreScreen = lazy(() => import('./screens/MoreScreen').then(m => ({ default: m.MoreScreen })));
const FlameScreen = lazy(() => import('./screens/FlameScreen').then(m => ({ default: m.FlameScreen })));

export function App() {
  useLayout();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isHermesOpen, setIsHermesOpen] = useState(false);
  const [isHermesVoiceOpen, setIsHermesVoiceOpen] = useState(false);
  const [hermesInitialPrompt, setHermesInitialPrompt] = useState<string | undefined>(undefined);
  const [milestoneCelebration, setMilestoneCelebration] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isAppAuthenticated());

  useEffect(() => {
    initTheme();
    initLanguage();
    initFontSize();
    AppLifecycleLoop.start();

    // Check first launch clean state onboarding
    const state = db.getState();
    if (state.settings.onboarded === false) {
      setIsOnboardingOpen(true);
    }

    // Check for 10-day sober streak celebrations
    const flame = state.settings.flame;
    const modules = state.settings.modules || {};
    if (modules.flame !== false && flame && flame.enabled !== false && flame.showTenDayWords !== false) {
      const today = getTodayLocalDate();
      const { updatedFlame, celebrationMilestone } = catchUpCelebrations(flame, today);
      if (celebrationMilestone !== null) {
        db.updateState(s => {
          s.settings.flame = updatedFlame;
        });
        setMilestoneCelebration(celebrationMilestone);
      } else if (updatedFlame.celebrations.lastSeenDay !== flame.celebrations.lastSeenDay) {
        db.updateState(s => {
          s.settings.flame = updatedFlame;
        });
      }
    }

    const handleLangChange = () => setRefreshKey(prev => prev + 1);
    const handleFontChange = () => setRefreshKey(prev => prev + 1);
    const handleStateUpdated = () => setRefreshKey(prev => prev + 1);
    const handleAccentChange = () => setRefreshKey(prev => prev + 1);
    const handleThemeChange = () => setRefreshKey(prev => prev + 1);
    const handleOpenOnboarding = () => setIsOnboardingOpen(true);
    const handleOpenHermes = (e: any) => {
      setHermesInitialPrompt(e?.detail?.prompt);
      setIsHermesOpen(true);
    };
    const handleOpenHermesVoice = () => {
      setIsHermesVoiceOpen(true);
    };
    const handleAuthChange = (e: any) => {
      setIsAuthenticated(e?.detail?.authenticated ?? isAppAuthenticated());
    };
    window.addEventListener('greendream_auth_changed', handleAuthChange);

    const handleOpenFlame = () => {
      navigateScreen('flame');
    };

    window.addEventListener('app_language_changed', handleLangChange);
    window.addEventListener('app_fontsize_changed', handleFontChange);
    window.addEventListener('greendream_state_updated', handleStateUpdated);
    window.addEventListener('greendream_accent_changed', handleAccentChange);
    window.addEventListener('greendream_theme_changed', handleThemeChange);
    window.addEventListener('greendream_open_onboarding', handleOpenOnboarding);
    window.addEventListener('open_hermes_chat', handleOpenHermes);
    window.addEventListener('open_hermes_voice', handleOpenHermesVoice);
    window.addEventListener('open_flame_screen', handleOpenFlame);

    return () => {
      window.removeEventListener('greendream_auth_changed', handleAuthChange);
      AppLifecycleLoop.stop();
      window.removeEventListener('app_language_changed', handleLangChange);
      window.removeEventListener('app_fontsize_changed', handleFontChange);
      window.removeEventListener('greendream_state_updated', handleStateUpdated);
      window.removeEventListener('greendream_accent_changed', handleAccentChange);
      window.removeEventListener('greendream_theme_changed', handleThemeChange);
      window.removeEventListener('greendream_open_onboarding', handleOpenOnboarding);
      window.removeEventListener('open_hermes_chat', handleOpenHermes);
      window.removeEventListener('open_hermes_voice', handleOpenHermesVoice);
      window.removeEventListener('open_flame_screen', handleOpenFlame);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleQuickAction = (actionType: string) => {
    if (actionType === 'add_maintenance' || actionType === 'add_shopping') {
      setCurrentScreen('maintenance');
    }
    handleRefresh();
  };

  const navigateScreen = (screen: ScreenId) => {
    if (currentScreen === 'settings' && (window as any).__isSettingsDirty) {
      if ((window as any).__promptDiscardSettings) {
        (window as any).__promptDiscardSettings(() => {
          (window as any).__isSettingsDirty = false;
          setCurrentScreen(screen);
        });
        return;
      }
    }
    setCurrentScreen(screen);
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <DashboardScreen 
            onNavigate={navigateScreen}
            onRefresh={handleRefresh}
          />
        );
      case 'calendar':
        return <CalendarScreen onRefresh={handleRefresh} onBack={() => navigateScreen('more')} />;
      case 'gym':
        return <GymScreen onRefresh={handleRefresh} onBack={() => navigateScreen('dashboard')} />;
      case 'maintenance':
        return <MaintenanceScreen onRefresh={handleRefresh} onBack={() => navigateScreen('more')} />;
      case 'finance':
        return <FinanceScreen onRefresh={handleRefresh} />;
      case 'prayers':
        return <PrayersScreen onRefresh={handleRefresh} onBack={() => navigateScreen('dashboard')} />;
      case 'journal':
        return <JournalScreen onRefresh={handleRefresh} onBack={() => navigateScreen('more')} />;
      case 'settings':
        return <SettingsScreen onRefresh={handleRefresh} onBack={() => navigateScreen('more')} />;
      case 'assistant':
        return (
          <AssistantScreen 
            onRefresh={handleRefresh} 
            onNavigateToSettings={() => navigateScreen('settings')} 
            onBack={() => navigateScreen('more')}
          />
        );
      case 'weekly-review':
        return <WeeklyReviewScreen onBack={() => navigateScreen('more')} onRefresh={handleRefresh} />;
      case 'more':
        return <MoreScreen onNavigate={navigateScreen} onRefresh={handleRefresh} />;
      case 'flame':
        return <FlameScreen onBack={() => navigateScreen('dashboard')} onRefresh={handleRefresh} />;
      default:
        return (
          <DashboardScreen 
            onNavigate={navigateScreen}
            onRefresh={handleRefresh}
          />
        );
    }
  };

  if (!isAuthenticated) {
    return <MasterLoginGate onUnlock={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col relative overflow-x-hidden selection:bg-[var(--color-accent)] selection:text-[var(--color-bg)]">
      {/* Android Status Bar Safe Area Top Spacer */}
      <div className="w-full pt-[env(safe-area-inset-top)]" />

      {/* Visible Save / Cloud Sync Feedback Badge */}
      <SaveFeedbackBadge />

      {/* Tablet Left Navigation Rail (96px, with '+' button at top) */}
      <NavigationRail
        currentScreen={currentScreen}
        onSelectScreen={navigateScreen}
        onOpenAddSheet={() => setIsAddSheetOpen(true)}
        onOpenAiChat={() => setIsHermesOpen(true)}
      />

      {/* Main Responsive Screen Canvas */}
      <main className="relative z-[1] flex-1 w-full ms-[var(--nav-w)] transition-all duration-150 overflow-y-auto no-scrollbar">
        <Page key={currentScreen} className="animate-enter min-h-full">
          <Suspense fallback={<ScreenSkeleton />}>
            {renderActiveScreen()}
          </Suspense>
        </Page>
      </main>

      {/* Phone & Wide Floating Bottom Navigation */}
      <BottomNavigation
        currentScreen={currentScreen}
        onSelectScreen={navigateScreen}
        onOpenAddSheet={() => setIsAddSheetOpen(true)}
        hideFab={isHermesOpen || isHermesVoiceOpen || isAddSheetOpen || isOnboardingOpen}
      />

      {/* Quick Add Bottom Sheet (+) */}
      <AddActionSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onNavigate={navigateScreen}
        onQuickAction={handleQuickAction}
      />

      {/* Modular First-Launch & Re-configuration Onboarding Wizard */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={() => {
          setIsOnboardingOpen(false);
          handleRefresh();
        }}
      />

      {/* Global Hermes AI Dark Glass Chat Modal */}
      <HermesChatModal
        isOpen={isHermesOpen}
        onClose={() => {
          setIsHermesOpen(false);
          setHermesInitialPrompt(undefined);
          handleRefresh();
        }}
        onNavigateToSettings={() => setCurrentScreen('settings')}
        initialPrompt={hermesInitialPrompt}
      />

      {/* Global Hermes AI Hands-Free Voice Conversation Modal */}
      <VoiceConversationModal
        isOpen={isHermesVoiceOpen}
        onClose={() => {
          setIsHermesVoiceOpen(false);
          handleRefresh();
        }}
        onOpenChat={() => {
          setIsHermesVoiceOpen(false);
          setIsHermesOpen(true);
        }}
        onNavigateToSettings={() => setCurrentScreen('settings')}
      />

      {/* 10-Day Meaningful Moment Milestone Celebration Modal */}
      {milestoneCelebration !== null && (
        <FlameTenDayModal
          milestone={milestoneCelebration}
          isOpen={true}
          onClose={() => setMilestoneCelebration(null)}
        />
      )}
    </div>
  );
}

export default App;
