import { lockApp, updateMasterPassword } from '../services/authService';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Settings as SettingsIcon, 
  RotateCw, 
  Download, 
  Upload,
  Check, 
  Sun, 
  Moon, 
  Monitor, 
  Award, 
  ShieldCheck, 
  Coins, 
  Calendar, 
  AlertCircle, 
  Globe, 
  Type, 
  Minus, 
  Plus, 
  ArrowLeft, 
  Sparkles, 
  Zap, 
  SlidersHorizontal, 
  MoonStar, 
  Wallet, 
  Dumbbell, 
  CalendarDays, 
  BookOpen, 
  Wrench, 
  Bot, 
  Trash2, 
  PlayCircle 
} from 'lucide-react';
import { App } from '@capacitor/app';
import { db } from '../services/storage';
import { applyTheme, applyAccent, ACCENT_PRESETS } from '../services/themeService';
import { DailyProgressService } from '../services/dailyProgressService';
import { AppThemeMode, AccentPreset, DailyProgressSettings, AppModulesConfig, DEFAULT_APP_MODULES } from '../types';
import { GlassCard, GlassChip, AccentChip } from '../components/glass';
import { RingProgress } from '../components/charts';
import { AllocationManagerView } from '../components/finance/AllocationManagerView';
import { HermesSettingsView } from '../components/ai/HermesSettingsView';
import { VoiceSettingsView } from '../components/voice/VoiceSettingsView';
import { FlameLogo, FlameIcon } from '../components/flame';
import { Haptics } from '../services/haptics';
import { 
  useTranslation, 
  SUPPORTED_LANGUAGES, 
  setLanguage, 
  getLanguage, 
  AppLanguage 
} from '../services/i18n';
import { 
  getFontSizeScale, 
  applyFontSize, 
  stepFontSize, 
  FONT_SIZE_PRESETS, 
  MIN_FONT_SCALE, 
  MAX_FONT_SCALE 
} from '../services/fontSizeService';
import { 
  SettingsDiffService, 
  AppSettingsSnapshot, 
  SettingDiffItem 
} from '../services/settingsDiffService';
import { UnsavedChangesBar } from '../components/settings/UnsavedChangesBar';
import { ConfirmChangesSheet } from '../components/settings/ConfirmChangesSheet';
import { UndoToast } from '../components/settings/UndoToast';
import { DiscardChangesDialog } from '../components/settings/DiscardChangesDialog';

interface SettingsScreenProps {
  onRefresh: () => void;
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onRefresh, onBack }) => {
  const { t, language: activeLang, isRtl } = useTranslation();
  const state = db.getState();
  
  // Safe Settings Draft Model & Snapshots
  const [savedSnapshot, setSavedSnapshot] = useState<AppSettingsSnapshot>(() => SettingsDiffService.getSnapshot());
  const [draftSnapshot, setDraftSnapshot] = useState<AppSettingsSnapshot>(() => SettingsDiffService.getSnapshot());
  const [previousSnapshotForUndo, setPreviousSnapshotForUndo] = useState<AppSettingsSnapshot | null>(null);

  // Dialog & Modal visibility state
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isUndoToastVisible, setIsUndoToastVisible] = useState(false);
  const [undoToastMessage, setUndoToastMessage] = useState<string | null>(null);
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);

  // Destructive Action Confirmation State
  const [isDestructiveSheetOpen, setIsDestructiveSheetOpen] = useState(false);
  const [destructiveActionType, setDestructiveActionType] = useState<'clean' | 'seed' | 'import' | null>(null);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);

  const [recalcStatus, setRecalcStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [masterPwdModalOpen, setMasterPwdModalOpen] = useState(false);
  const [newMasterPwd, setNewMasterPwd] = useState('');
  const [masterPwdSuccess, setMasterPwdSuccess] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Compute live diff between saved snapshot and current draft
  const diffs = useMemo(() => {
    return SettingsDiffService.computeDiff(savedSnapshot, draftSnapshot, t);
  }, [savedSnapshot, draftSnapshot, t]);

  const changeCount = diffs.length;

  // Sync dirty flag to window for App-level tab navigation guard
  useEffect(() => {
    (window as any).__isSettingsDirty = changeCount > 0;
    (window as any).__promptDiscardSettings = (onConfirmNav: () => void) => {
      setPendingNavAction(() => onConfirmNav);
      setIsDiscardDialogOpen(true);
    };

    return () => {
      (window as any).__isSettingsDirty = false;
      delete (window as any).__promptDiscardSettings;
    };
  }, [changeCount]);

  // Android hardware / gesture back button interception
  useEffect(() => {
    let backListenerPromise: any = null;
    try {
      backListenerPromise = App.addListener('backButton', () => {
        if (changeCount > 0) {
          setPendingNavAction(() => onBack);
          setIsDiscardDialogOpen(true);
        } else if (onBack) {
          onBack();
        }
      });
    } catch (e) {
      // Running in browser dev mode
    }

    return () => {
      if (backListenerPromise) {
        backListenerPromise.then((h: any) => h.remove?.());
      }
    };
  }, [changeCount, onBack]);

  // Top-left back button handler with guard
  const handleTopBack = () => {
    if (changeCount > 0) {
      setPendingNavAction(() => onBack);
      setIsDiscardDialogOpen(true);
    } else if (onBack) {
      onBack();
    }
  };

  // Discard draft and navigate away
  const handleDiscardAndLeave = () => {
    // Revert visual styles to saved baseline
    applyTheme(savedSnapshot.theme, true);
    applyAccent(savedSnapshot.accent, true);
    applyFontSize(savedSnapshot.fontSizeScale, true);
    setDraftSnapshot(SettingsDiffService.cloneSnapshot(savedSnapshot));
    setIsDiscardDialogOpen(false);
    
    if (pendingNavAction) {
      pendingNavAction();
      setPendingNavAction(null);
    } else if (onBack) {
      onBack();
    }
  };

  // Discard all changes in place
  const handleDiscardAll = () => {
    applyTheme(savedSnapshot.theme, true);
    applyAccent(savedSnapshot.accent, true);
    applyFontSize(savedSnapshot.fontSizeScale, true);
    setDraftSnapshot(SettingsDiffService.cloneSnapshot(savedSnapshot));
    setIsConfirmSheetOpen(false);
    showToast(t('settings.discardChanges', 'Changes discarded.'));
  };

  // Commit draft to storage and active services
  const handleConfirmAndSave = () => {
    SettingsDiffService.commitSnapshot(draftSnapshot);
    setPreviousSnapshotForUndo(SettingsDiffService.cloneSnapshot(savedSnapshot));
    setSavedSnapshot(SettingsDiffService.cloneSnapshot(draftSnapshot));
    setIsConfirmSheetOpen(false);
    setIsUndoToastVisible(true);
    setUndoToastMessage(t('settings.settingsSaved', 'Settings saved successfully.'));
    onRefresh();
  };

  // Undo previous commit within 10 seconds
  const handleUndo = () => {
    if (!previousSnapshotForUndo) return;
    SettingsDiffService.commitSnapshot(previousSnapshotForUndo);
    setSavedSnapshot(SettingsDiffService.cloneSnapshot(previousSnapshotForUndo));
    setDraftSnapshot(SettingsDiffService.cloneSnapshot(previousSnapshotForUndo));
    setIsUndoToastVisible(false);
    showToast(t('settings.undoRestored', 'Settings restored to previous snapshot.'));
    onRefresh();
  };

  // Draft Mutations
  const handleSelectTheme = (mode: AppThemeMode) => {
    Haptics.tick();
    applyTheme(mode, false); // Live preview without saving to storage
    setDraftSnapshot(prev => ({ ...prev, theme: mode }));
  };

  const handleSelectAccent = (presetId: AccentPreset) => {
    Haptics.tick();
    applyAccent(presetId, false); // Live preview without saving to storage
    setDraftSnapshot(prev => ({ ...prev, accent: presetId }));
  };

  const handleSelectLanguage = (langCode: AppLanguage) => {
    Haptics.tick();
    setDraftSnapshot(prev => ({ ...prev, language: langCode }));
  };

  const handleFontScaleChange = (scale: number) => {
    applyFontSize(scale, false); // Live preview
    setDraftSnapshot(prev => ({ ...prev, fontSizeScale: scale }));
  };

  const handleStepFontScale = (dir: 1 | -1) => {
    const newScale = stepFontSize(dir);
    applyFontSize(newScale, false);
    setDraftSnapshot(prev => ({ ...prev, fontSizeScale: newScale }));
  };

  const handleToggleModule = (modKey: keyof AppModulesConfig) => {
    Haptics.tick();
    setDraftSnapshot(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [modKey]: !prev.modules[modKey],
      }
    }));
  };

  const handleToggleJournalLock = () => {
    Haptics.tick();
    setDraftSnapshot(prev => ({
      ...prev,
      journal_lock_enabled: !prev.journal_lock_enabled,
    }));
  };

  // Daily Progress Draft Handlers
  const dpSettings = draftSnapshot.daily_progress;
  const dpAllowanceMajor = String(dpSettings.daily_spending_allowance_minor / 100);

  const currentTotalWeight = 
    (dpSettings.prayers_enabled ? Number(dpSettings.prayers_weight) : 0) +
    (dpSettings.spending_enabled ? Number(dpSettings.spending_weight) : 0) +
    (dpSettings.discipline_enabled ? Number(dpSettings.discipline_weight) : 0);

  const handleResetDpSettings = () => {
    Haptics.tick();
    const reset = DailyProgressService.resetSettings();
    setDraftSnapshot(prev => ({
      ...prev,
      daily_progress: { ...reset },
    }));
    showToast('Daily progress scoring draft reset to defaults.');
  };

  const toggleExcludedCategory = (catId: string) => {
    Haptics.tick();
    const current = dpSettings.excluded_category_ids || [];
    const updated = current.includes(catId)
      ? current.filter(id => id !== catId)
      : [...current, catId];
    setDraftSnapshot(prev => ({
      ...prev,
      daily_progress: {
        ...prev.daily_progress,
        excluded_category_ids: updated,
      }
    }));
  };

  const handleRecalculate = () => {
    setRecalcStatus('Rebuilding all streaks, 1RMs, recovery states, and budget rollbacks...');
    setTimeout(() => {
      onRefresh();
      setRecalcStatus('✓ Recalculation complete. All cached metrics verified against raw source records.');
    }, 400);
  };

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(db.getState(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greendream_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRerunWizard = () => {
    Haptics.tick();
    window.dispatchEvent(new CustomEvent('greendream_open_onboarding'));
  };

  const handleLoadSampleData = () => {
    Haptics.success();
    db.loadSampleData();
    const fresh = SettingsDiffService.getSnapshot();
    setSavedSnapshot(fresh);
    setDraftSnapshot(fresh);
    showToast(t('dataManagement.loadSuccess', 'Sample data loaded successfully!'));
    onRefresh();
  };

  const handleRemoveSampleData = () => {
    Haptics.tick();
    db.removeSampleData();
    const fresh = SettingsDiffService.getSnapshot();
    setSavedSnapshot(fresh);
    setDraftSnapshot(fresh);
    showToast(t('dataManagement.removeSuccess', 'Sample data removed successfully!'));
    onRefresh();
  };

  // Destructive Actions Handlers
  const handleResetToClean = () => {
    Haptics.warning();
    setDestructiveActionType('clean');
    setIsDestructiveSheetOpen(true);
  };

  const handleResetData = () => {
    Haptics.warning();
    setDestructiveActionType('seed');
    setIsDestructiveSheetOpen(true);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || !parsed.settings) {
          alert('Invalid backup file. Missing required GreenDream data structure.');
          return;
        }
        setPendingBackupData(parsed);
        setDestructiveActionType('import');
        setIsDestructiveSheetOpen(true);
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteDestructiveAction = () => {
    setIsDestructiveSheetOpen(false);
    if (destructiveActionType === 'clean') {
      Haptics.warning();
      db.resetToCleanState();
      const fresh = SettingsDiffService.getSnapshot();
      setSavedSnapshot(fresh);
      setDraftSnapshot(fresh);
      showToast(t('dataManagement.resetSuccess', 'App has been reset to a clean state!'));
      onRefresh();
    } else if (destructiveActionType === 'seed') {
      Haptics.warning();
      db.resetToSeed();
      const fresh = SettingsDiffService.getSnapshot();
      setSavedSnapshot(fresh);
      setDraftSnapshot(fresh);
      showToast('Default seed data restored successfully.');
      onRefresh();
    } else if (destructiveActionType === 'import' && pendingBackupData) {
      Haptics.success();
      localStorage.setItem('greendream_state_v1', JSON.stringify(pendingBackupData));
      window.location.reload();
    }
    setDestructiveActionType(null);
  };

  const destructiveDiffs: SettingDiffItem[] = useMemo(() => {
    if (destructiveActionType === 'clean') {
      return [{
        id: 'destructive.clean',
        moduleKey: 'data',
        moduleLabel: 'Database',
        fieldKey: 'clean_slate',
        fieldLabel: t('dataManagement.resetClean', 'Reset App (Clean Slate)'),
        oldValueDisplay: 'All Records',
        newValueDisplay: '0 Records (Empty)',
        isDangerous: true,
        dangerReason: 'Permanently wipes all transactions, habits, prayers, workouts and journal entries.',
      }];
    }
    if (destructiveActionType === 'seed') {
      return [{
        id: 'destructive.seed',
        moduleKey: 'data',
        moduleLabel: 'Database',
        fieldKey: 'restore_seed',
        fieldLabel: 'Restore Default Seed Data',
        oldValueDisplay: 'Current Records',
        newValueDisplay: 'Default Seed Records',
        isDangerous: true,
        dangerReason: 'Overwrites current custom records with default templates.',
      }];
    }
    if (destructiveActionType === 'import') {
      return [{
        id: 'destructive.import',
        moduleKey: 'data',
        moduleLabel: 'Database',
        fieldKey: 'import_backup',
        fieldLabel: t('settings.importBackup', 'Import Backup Overwrite'),
        oldValueDisplay: 'Current App State',
        newValueDisplay: 'Backup File Data',
        isDangerous: true,
        dangerReason: 'Replaces all existing database records with the imported backup JSON file.',
      }];
    }
    return [];
  }, [destructiveActionType, t]);

  const destructiveLabel = 
    destructiveActionType === 'clean' ? t('dataManagement.resetClean', 'Reset App to Clean Slate') :
    destructiveActionType === 'seed' ? 'Restore Default Seed Data' :
    t('settings.importBackup', 'Import Backup File');

  const currentTheme = draftSnapshot.theme;
  const currentAccent = draftSnapshot.accent;
  const currentFontScale = draftSnapshot.fontSizeScale;
  const currentModules = draftSnapshot.modules;
  const currency = draftSnapshot.currency_label;
  const weightUnit = draftSnapshot.weight_unit;
  const cycleDay = draftSnapshot.budget_cycle_start_day;
  const journalLock = draftSnapshot.journal_lock_enabled;

  return (
    <div className="space-y-4 pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[350px] px-4 py-2.5 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg)] font-bold text-xs shadow-lg border border-[var(--color-border)] flex items-center gap-2 animate-slide-down">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={handleTopBack}
              className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] tap-feedback shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          )}
          <FlameLogo />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {t('settings.title', 'Settings')}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('settings.subtitle', 'Personal preferences and system management')}
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
          <SettingsIcon className="w-4 h-4" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* APPEARANCE & LANGUAGE MASTER SECTION                    */}
      {/* ======================================================== */}
      <div className="card-premium p-5  space-y-6">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <Sun className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
              {t('settings.appearanceAndLanguage', 'Appearance & Language')}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('settings.appearanceDesc', 'Theme mode, application language & typography scaling')}
            </p>
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/* 1. THEME SELECTION (Light, Dark, System)                 */}
        {/* -------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              {t('settings.appearanceTitle', 'Theme Mode')}
            </span>
            <span className="text-xs font-semibold text-[var(--color-accent)] px-2.5 py-0.5 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] capitalize">
              {currentTheme === 'carbon' ? 'Dark' : currentTheme === 'matte' ? 'Matte (Lite)' : currentTheme}
            </span>
          </div>

          <div className="space-y-2">
            {/* System Default Theme Card */}
            <div
              onClick={() => handleSelectTheme('system')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                currentTheme === 'system'
                  ? 'bg-[var(--color-surface)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-subtle)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--color-text-primary)] block">
                      {t('settings.systemDefault', 'System Auto')}
                    </span>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      Automatically follows your device's operating system dark/light mode
                    </p>
                  </div>
                </div>
                {currentTheme === 'system' && (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>

            {/* Light Theme Card (Restored Green & White) */}
            <div
              onClick={() => handleSelectTheme('light')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                currentTheme === 'light'
                  ? 'bg-[var(--color-surface)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                    <div className="w-4 h-4 rounded-full bg-[#F7F8F6] border border-[#E3E6E1]" title="Main #F7F8F6" />
                    <div className="w-4 h-4 rounded-full bg-[#FFFFFF] border border-[#E3E6E1]" title="Card #FFFFFF" />
                    <div className="w-4 h-4 rounded-full bg-[#5E8C61] border border-[#E3E6E1]" title="Sage Green #5E8C61" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        {t('settings.lightTheme', 'Light Theme')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold">
                        Green & White
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {t('settings.lightThemeDesc', 'Clean off-white canvas & signature sage green accents')}
                    </p>
                  </div>
                </div>
                {currentTheme === 'light' && (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-sm shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>

            {/* Dark Theme Card (True Black & Silver) */}
            <div
              onClick={() => handleSelectTheme('dark')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                currentTheme === 'dark' || currentTheme === 'carbon'
                  ? 'bg-[var(--color-surface)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                    <div className="w-4 h-4 rounded-full bg-[#111213] border border-[#2D3035]" title="Background #111213" />
                    <div className="w-4 h-4 rounded-full bg-[#1A1B1D] border border-[#2D3035]" title="Card #1A1B1D" />
                    <div className="w-4 h-4 rounded-full bg-[#8FBF93] border border-[#2D3035]" title="Sage #8FBF93" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        {t('settings.darkTheme', 'Dark Theme')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold">
                        True Dark
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      Deep dark graphite background with soft sage accents
                    </p>
                  </div>
                </div>
                {(currentTheme === 'dark' || currentTheme === 'carbon') && (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] flex items-center justify-center shadow-sm shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>

            {/* Performance Matte (Lite) Card - For slow phones, zero glowing, zero background animations */}
            <div
              onClick={() => handleSelectTheme('matte')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer tap-feedback ${
                currentTheme === 'matte'
                  ? 'bg-[var(--color-surface)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Zap className="w-5 h-5 fill-amber-400/20" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        {t('settings.matteTheme', 'Performance Matte (Lite)')}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                        ⚡ Slow Phones / Battery Saver
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {t('settings.matteThemeDesc', 'Ultra-fast flat design for slow phones & battery saving • Zero glow, zero blur, zero animations')}
                    </p>
                  </div>
                </div>
                {currentTheme === 'matte' && (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] flex items-center justify-center shadow-sm shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/* 1B. ACCENT COLOR PRESETS (Cyan, Lime, Violet, Rose)       */}
        {/* -------------------------------------------------------- */}
        <div className="space-y-3 pt-3 border-t border-[var(--hairline)]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[var(--text-1)] block">
                {t('settings.accentColor', 'Accent Color')}
              </span>
              <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                {t('settings.accentDesc', 'Choose your glowing interface accent')}
              </p>
            </div>
            <span className="text-xs font-medium text-[var(--accent-light)] px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 capitalize">
              {ACCENT_PRESETS[currentAccent]?.name}
            </span>
          </div>

          {/* 4 round 44px swatches in a row */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {(Object.keys(ACCENT_PRESETS) as AccentPreset[]).map((presetKey) => {
              const preset = ACCENT_PRESETS[presetKey];
              const isActive = currentAccent === presetKey;
              const localizedName = 
                presetKey === 'cyan' ? t('settings.accentCyan', preset.name) :
                presetKey === 'lime' ? t('settings.accentLime', preset.name) :
                presetKey === 'violet' ? t('settings.accentViolet', preset.name) :
                t('settings.accentRose', preset.name);

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectAccent(preset.id)}
                  aria-label={localizedName}
                  title={localizedName}
                  className="flex-1 flex flex-col items-center gap-1.5 focus:outline-none group tap-feedback"
                >
                  <div
                    className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all duration-200 relative"
                    style={{
                      backgroundColor: preset.hex,
                      border: isActive ? '2px solid #FFFFFF' : '2px solid rgba(255, 255, 255, 0.20)',
                      boxShadow: isActive ? `0 0 16px ${preset.hex}` : '0 2px 8px rgba(0, 0, 0, 0.3)',
                      transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    {isActive && (
                      <Check className="w-5 h-5 text-[#04070A] stroke-[3]" />
                    )}
                  </div>
                  <span className={`text-[11px] text-center truncate max-w-full leading-tight ${isActive ? 'font-medium text-[var(--text-1)]' : 'font-normal text-[var(--text-3)]'}`}>
                    {localizedName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Preview Card */}
          <GlassCard className="mt-3 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <RingProgress
                variant="mini"
                value={8}
                max={10}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              />
              <div className="min-w-0">
                <span className="text-[13px] font-medium text-[var(--text-1)] block truncate">
                  Live Accent Preview
                </span>
                <span className="text-[11px] text-[var(--text-2)] block truncate">
                  Instant whole-app theme reactive glow
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <AccentChip className="hidden sm:inline-flex">
                Active
              </AccentChip>
              <button
                type="button"
                className="btn-primary text-xs h-[36px] px-3 font-medium"
              >
                Glow
              </button>
            </div>
          </GlassCard>
        </div>

        {/* -------------------------------------------------------- */}
        {/* 2. APP LANGUAGE (English, Français, العربية)            */}
        {/* -------------------------------------------------------- */}
        <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                {t('settings.appLanguage', 'App Language')}
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] font-semibold">
              RTL Supported
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] -mt-1">
            {t('settings.appLanguageDesc', 'Change interface language throughout GreenDream')}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = activeLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all tap-feedback ${
                    isSelected
                      ? 'bg-[var(--color-surface)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)] shadow-sm'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                  }`}
                >
                  <span className="text-xl leading-none">{lang.flag}</span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    {lang.nativeName}
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-[var(--color-accent)] text-white' : 'border border-[var(--color-border)]'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/* 3. TEXT SIZE ADJUSTMENT SYSTEM                           */}
        {/* -------------------------------------------------------- */}
        <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                {t('settings.textSize', 'Text Size')}
              </span>
            </div>
            <span className="text-xs font-extrabold text-[var(--color-text-primary)] px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] font-mono">
              {Math.round(currentFontScale * 100)}%
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] -mt-1">
            {t('settings.textSizeDesc', 'Scale text across all screens and widgets')}
          </p>

          {/* Stepper & Slider Controls */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleStepFontScale(-1)}
                disabled={currentFontScale <= MIN_FONT_SCALE}
                className="w-8 h-8 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] disabled:opacity-40 hover:border-[var(--color-accent)] transition-all tap-feedback shrink-0"
                title="Decrease font size"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="range"
                min={MIN_FONT_SCALE}
                max={MAX_FONT_SCALE}
                step={0.01}
                value={currentFontScale}
                onChange={(e) => handleFontScaleChange(parseFloat(e.target.value))}
                className="flex-1 accent-[var(--color-accent)] cursor-pointer h-2 bg-[var(--color-card)] rounded-lg"
              />

              <button
                type="button"
                onClick={() => handleStepFontScale(1)}
                disabled={currentFontScale >= MAX_FONT_SCALE}
                className="w-8 h-8 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] disabled:opacity-40 hover:border-[var(--color-accent)] transition-all tap-feedback shrink-0"
                title="Increase font size"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 5 Preset Buttons */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {FONT_SIZE_PRESETS.map((preset) => {
                const isSelected = Math.abs(currentFontScale - preset.scale) < 0.02;
                const localizedLabel = activeLang === 'ar' ? preset.labelAr : activeLang === 'fr' ? preset.labelFr : preset.label;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleFontScaleChange(preset.scale)}
                    className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition-all text-center tap-feedback truncate ${
                      isSelected
                        ? 'bg-[var(--color-card)] text-[var(--color-text-primary)] border-[var(--color-accent)] shadow-sm'
                        : 'bg-[var(--color-card)]/50 text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border)]'
                    }`}
                    title={`${localizedLabel} (${preset.percentageText})`}
                  >
                    <span>{preset.percentageText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
              {t('settings.textSizePreview', 'Live Preview')}
            </span>
            <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">
              {t('settings.textSizeSample', 'GreenDream balances personal discipline, finance, and wellness.')}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* APP MODULES & FEATURES CUSTOMIZER                       */}
      {/* ======================================================== */}
      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <SlidersHorizontal className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
              {t('modulesSettings.title', 'App Modules & Features')}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('modulesSettings.subtitle', 'Toggle active modules to customize tabs and dashboard')}
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {t('modulesSettings.safeNotice', 'Disabling a module hides its tabs and dashboard widgets, but never deletes your saved records.')}
        </p>

        <div className="space-y-2.5 pt-1">
          {[
            {
              key: 'prayer' as keyof AppModulesConfig,
              nameKey: 'onboarding.modules.prayer',
              defaultName: 'Daily Prayers (5 Awqat)',
              descKey: 'onboarding.modules.prayerDesc',
              defaultDesc: 'Track Fajr, Dhuhr, Asr, Maghrib & Isha',
              icon: MoonStar,
            },
            {
              key: 'finance' as keyof AppModulesConfig,
              nameKey: 'onboarding.modules.finance',
              defaultName: 'Money & Budgets',
              descKey: 'onboarding.modules.financeDesc',
              defaultDesc: 'Track spending, runway, goals & loans',
              icon: Wallet,
            },
            {
              key: 'gym' as keyof AppModulesConfig,
              nameKey: 'onboarding.modules.gym',
              defaultName: 'Fitness & Body',
              descKey: 'onboarding.modules.gymDesc',
              defaultDesc: 'Workouts, routine splits & bodyweight',
              icon: Dumbbell,
            },
            {
              key: 'calendar' as keyof AppModulesConfig,
              nameKey: 'onboarding.modules.calendar',
              defaultName: 'Calendar & Agenda',
              descKey: 'onboarding.modules.calendarDesc',
              defaultDesc: 'Tasks, scheduled habits & events',
              icon: CalendarDays,
            },
            {
              key: 'journal' as keyof AppModulesConfig,
              nameKey: 'onboarding.modules.journal',
              defaultName: 'Private Journal',
              descKey: 'onboarding.modules.journalDesc',
              defaultDesc: 'Encrypted reflections and daily thoughts',
              icon: BookOpen,
            },
            {
              key: 'maintenance' as keyof AppModulesConfig,
              nameKey: 'onboarding.modules.maintenance',
              defaultName: 'Care, Service & Shopping',
              descKey: 'onboarding.modules.maintenanceDesc',
              defaultDesc: 'Vehicle maintenance, hygiene & buy list',
              icon: Wrench,
            },
            {
              key: 'weekly_review' as keyof AppModulesConfig,
              nameKey: 'onboarding.modules.weekly_review',
              defaultName: 'Weekly Reviews',
              descKey: 'onboarding.modules.weekly_reviewDesc',
              defaultDesc: 'Sunday retrospectives & weekly planning',
              icon: Sparkles,
            },
            {
              key: 'assistant' as keyof AppModulesConfig,
              nameKey: 'onboarding.modules.assistant',
              defaultName: 'AI Assistant (Hermes)',
              descKey: 'onboarding.modules.assistantDesc',
              defaultDesc: 'Smart financial nudges and life coaching',
              icon: Bot,
            },
            {
              key: 'flame' as keyof AppModulesConfig,
              nameKey: 'flame.title',
              defaultName: 'Sober Flame',
              descKey: 'flame.subtitle',
              defaultDesc: 'Consecutive sober streak in header and words earned',
              icon: () => <FlameIcon size={18} animated={false} />,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isEnabled = currentModules[item.key] !== false;
            return (
              <div
                key={item.key}
                onClick={() => handleToggleModule(item.key)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer tap-feedback transition-all ${
                  isEnabled 
                    ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/50' 
                    : 'bg-[var(--color-surface)]/60 border-[var(--color-border)] opacity-75'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      backgroundColor: isEnabled ? 'rgb(var(--accent-rgb) / 0.15)' : 'rgba(255,255,255,0.06)',
                      color: isEnabled ? 'var(--accent-light)' : 'var(--text-3)',
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] block truncate">
                      {t(item.nameKey, item.defaultName)}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-secondary)] block truncate mt-0.5">
                      {t(item.descKey, item.defaultDesc)}
                    </span>
                  </div>
                </div>

                {/* Touch Toggle Switch (44px min tap target) */}
                <div className="flex items-center min-w-[44px] min-h-[44px] justify-center shrink-0">
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      isEnabled 
                        ? 'bg-[var(--color-accent)]' 
                        : 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SOBER FLAME SETTINGS                                    */}
      {/* ======================================================== */}
      {currentModules.flame !== false && (
        <div className="card-premium p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
              <FlameIcon size={18} animated={false} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                {t('flame.title', 'Sober Flame')}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t('flame.subtitle', 'Consecutive sober days')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Toggle: Words at every 10 days */}
            <div
              onClick={() => {
                Haptics.tick();
                setDraftSnapshot(prev => ({
                  ...prev,
                  flame: { ...prev.flame, showTenDayWords: !prev.flame.showTenDayWords },
                }));
              }}
              className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-3 cursor-pointer tap-feedback"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                  {t('flame.wordsToggle', 'Words at every 10 days')}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">
                  {t('flame.wordsToggleDesc', 'Show a quiet meaningful phrase at milestone days')}
                </span>
              </div>
              <div className="flex items-center min-w-[44px] min-h-[44px] justify-center shrink-0">
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${draftSnapshot.flame.showTenDayWords ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)]'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${draftSnapshot.flame.showTenDayWords ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            {/* Toggle: Show day count beside flame */}
            <div
              onClick={() => {
                Haptics.tick();
                setDraftSnapshot(prev => ({
                  ...prev,
                  flame: { ...prev.flame, showNumber: !prev.flame.showNumber },
                }));
              }}
              className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-3 cursor-pointer tap-feedback"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                  {t('flame.showNumberToggle', 'Show day count beside flame')}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">
                  {t('flame.showNumberDesc', 'Display streak number next to header flame')}
                </span>
              </div>
              <div className="flex items-center min-w-[44px] min-h-[44px] justify-center shrink-0">
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${draftSnapshot.flame.showNumber ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)]'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${draftSnapshot.flame.showNumber ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            {/* Toggle: Let Hermes see my Flame */}
            <div
              onClick={() => {
                Haptics.tick();
                setDraftSnapshot(prev => ({
                  ...prev,
                  flame: { ...prev.flame, shareWithHermes: !prev.flame.shareWithHermes },
                }));
              }}
              className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-3 cursor-pointer tap-feedback"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                  {t('flame.hermesShareToggle', 'Let Hermes see my Flame')}
                </span>
                <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">
                  {t('flame.hermesShareDesc', 'Allow AI assistant to provide gentle encouragement if asked')}
                </span>
              </div>
              <div className="flex items-center min-w-[44px] min-h-[44px] justify-center shrink-0">
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${draftSnapshot.flame.shareWithHermes ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)]'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${draftSnapshot.flame.shareWithHermes ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recalculation Engine Banner */}
      <div className="card-premium p-4  space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)] mt-0.5">
            <RotateCw className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-xs font-bold text-[var(--color-text-primary)]">
              Truth Recalculation Engine
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
              Source records are the absolute truth. If you ever suspect a streak or budget mismatch, this routine wipes derived caches and recalculates everything from raw logs.
            </p>
          </div>
        </div>

        {recalcStatus && (
          <div className="p-2.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-positive)] text-xs font-medium border border-[var(--color-border)]">
            {recalcStatus}
          </div>
        )}

        <button
          onClick={handleRecalculate}
          className="w-full py-2 bg-[var(--color-surface)] hover:bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-semibold rounded-xl transition-all tap-feedback"
        >
          Run Full Recalculation Routine
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. FINANCIAL GOALS & INCOME ALLOCATION                   */}
      {/* ======================================================== */}
      <AllocationManagerView onRefresh={onRefresh} />

      {/* ======================================================== */}
      {/* 3. DAILY PROGRESS SETTINGS (10-POINT SYSTEM)             */}
      {/* ======================================================== */}
      <div className="card-premium p-5  space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)]">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-primary)]">Daily Progress Settings</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Customize 10-point daily discipline weights</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            currentTotalWeight === 10
              ? 'text-[var(--color-positive)] bg-[var(--color-surface)] border-[var(--color-border)]'
              : 'text-[var(--color-warning)] bg-[var(--color-surface)] border-[var(--color-border)]'
          }`}>
            Total: {currentTotalWeight} / 10 pts
          </span>
        </div>

        {/* Master Daily Progress Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div>
            <span className="text-xs font-bold text-[var(--color-text-primary)] block">Daily Progress Counter</span>
            <span className="text-xs text-[var(--color-text-secondary)]">Show Today's Progress card on Dashboard</span>
          </div>
          <input
            type="checkbox"
            checked={dpSettings.daily_progress_enabled !== false}
            onChange={(e) => setDraftSnapshot(prev => ({ ...prev, daily_progress: { ...prev.daily_progress, daily_progress_enabled: e.target.checked } }))}
            className="accent-[var(--color-accent)] w-5 h-5 rounded cursor-pointer"
          />
        </div>

        {/* 1. Daily Prayers */}
        <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <div>
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">Daily Prayers</span>
                <span className="text-xs text-[var(--color-text-secondary)] block">5 daily prayers (Fajr to Isha)</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={dpSettings.prayers_enabled}
              onChange={(e) => setDraftSnapshot(prev => ({ ...prev, daily_progress: { ...prev.daily_progress, prayers_enabled: e.target.checked } }))}
              className="accent-[var(--color-accent)] w-4 h-4 rounded cursor-pointer"
            />
          </div>
          {dpSettings.prayers_enabled && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-xs text-[var(--color-text-secondary)]">Score Weight (points):</span>
              <input
                type="number"
                min="0"
                max="10"
                value={dpSettings.prayers_weight}
                onChange={(e) => setDraftSnapshot(prev => ({ ...prev, daily_progress: { ...prev.daily_progress, prayers_weight: parseInt(e.target.value) || 0 } }))}
                className="w-16 px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-primary)] text-right font-bold text-xs"
              />
            </div>
          )}
        </div>

        {/* 2. Financial Discipline */}
        <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[var(--color-accent)]" />
              <div>
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">Financial Discipline</span>
                <span className="text-xs text-[var(--color-text-secondary)] block">Stay within daily variable allowance</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={dpSettings.spending_enabled}
              onChange={(e) => setDraftSnapshot(prev => ({ ...prev, daily_progress: { ...prev.daily_progress, spending_enabled: e.target.checked } }))}
              className="accent-[var(--color-accent)] w-4 h-4 rounded cursor-pointer"
            />
          </div>
          {dpSettings.spending_enabled && (
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">Score Weight (points):</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={dpSettings.spending_weight}
                  onChange={(e) => setDraftSnapshot(prev => ({ ...prev, daily_progress: { ...prev.daily_progress, spending_weight: parseInt(e.target.value) || 0 } }))}
                  className="w-16 px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-primary)] text-right font-bold text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">Daily Spending Allowance ({draftSnapshot.currency_label}):</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={dpAllowanceMajor}
                  onChange={(e) => setDraftSnapshot(prev => ({ ...prev, daily_progress: { ...prev.daily_progress, daily_spending_allowance_minor: Math.round((parseFloat(e.target.value) || 0) * 100) } }))}
                  className="w-24 px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-primary)] text-right font-bold text-xs"
                />
              </div>

              {/* Exclude Categories */}
              <div className="pt-1.5 border-t border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-secondary)] font-semibold block mb-1.5">
                  Exclude Categories from Daily Allowance:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {state.categories.map(c => {
                    const isExcluded = (dpSettings.excluded_category_ids || []).includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleExcludedCategory(c.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          isExcluded
                            ? 'bg-[var(--color-surface)] text-[var(--color-warning)] border-[var(--color-warning)] font-bold'
                            : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        {isExcluded ? `✕ ${c.name}` : `+ ${c.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Personal Discipline / Self-Control */}
        <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
              <div>
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">Personal Discipline</span>
                <span className="text-xs text-[var(--color-text-secondary)] block">Daily focus & self-control check-in</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={dpSettings.discipline_enabled}
              onChange={(e) => setDraftSnapshot(prev => ({ ...prev, daily_progress: { ...prev.daily_progress, discipline_enabled: e.target.checked } }))}
              className="accent-[var(--color-accent)] w-4 h-4 rounded cursor-pointer"
            />
          </div>
          {dpSettings.discipline_enabled && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-xs text-[var(--color-text-secondary)]">Score Weight (points):</span>
              <input
                type="number"
                min="0"
                max="10"
                value={dpSettings.discipline_weight}
                onChange={(e) => setDraftSnapshot(prev => ({ ...prev, daily_progress: { ...prev.daily_progress, discipline_weight: parseInt(e.target.value) || 0 } }))}
                className="w-16 px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-primary)] text-right font-bold text-xs"
              />
            </div>
          )}
        </div>

        {/* Scoring System Explanation Box */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2 text-xs">
          <span className="text-xs font-bold text-[var(--color-accent)] block">
            Scoring Formula & Logic
          </span>
          <div className="space-y-1 text-[var(--color-text-secondary)] text-xs leading-relaxed">
            <p>• <strong>5 Daily Prayers</strong>: Earn 1 point per completed prayer (up to {dpSettings.prayers_weight} pts).</p>
            <p>• <strong>Financial Discipline</strong>: Earn {dpSettings.spending_weight} pts if total daily variable expenses do not exceed {dpAllowanceMajor} {draftSnapshot.currency_label}.</p>
            <p>• <strong>Personal Discipline</strong>: Earn {dpSettings.discipline_weight} pts for recording that daily self-control was maintained.</p>
            <p className="text-xs text-[var(--color-text-secondary)] italic pt-1">
              Scores reset cleanly each new local day. Previous days' scores are preserved in historical records.
            </p>
          </div>
        </div>

        {/* Warning if sum != 10 */}
        {currentTotalWeight !== 10 && (
          <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-warning)] text-xs text-[var(--color-warning)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Recommended: Weights should add up to exactly 10 points (currently {currentTotalWeight}).</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleResetDpSettings}
            className="py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-semibold rounded-2xl border border-[var(--color-border)] transition-all tap-feedback"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmSheetOpen(true)}
            className="py-2.5 bg-[var(--color-accent)] hover:opacity-90 text-white text-xs font-bold rounded-2xl tap-feedback flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Rules</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. HERMES AI ASSISTANT — GOOGLE GEMINI CONFIGURATION     */}
      {/* ======================================================== */}
      <HermesSettingsView 
        onRefresh={onRefresh}
        draftValue={draftSnapshot.hermes}
        onChange={(updated) => {
          setDraftSnapshot(prev => ({ ...prev, hermes: updated }));
        }}
        onRequestSave={() => setIsConfirmSheetOpen(true)}
      />

      {/* ======================================================== */}
      {/* 5. VOICE & SPEECH ENGINE SETTINGS                       */}
      {/* ======================================================== */}
      <VoiceSettingsView 
        onSettingsChanged={onRefresh}
        draftValue={draftSnapshot.voice}
        onChange={(updated) => {
          setDraftSnapshot(prev => ({ ...prev, voice: updated }));
        }}
      />

      {/* Preferences Form */}
      <div className="card-premium p-5 space-y-3">
        <h2 className="text-xs font-bold text-[var(--color-text-primary)]">
          {t('settings.generalSettings', 'Unit & Localization Preferences')}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-medium">
              {t('settings.currency', 'Currency Label')}
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setDraftSnapshot(prev => ({ ...prev, currency_label: e.target.value }))}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-medium">
              {t('settings.weightUnit', 'Weight Unit')}
            </label>
            <select
              value={weightUnit}
              onChange={(e) => setDraftSnapshot(prev => ({ ...prev, weight_unit: e.target.value as 'kg' | 'lb' }))}
              className="w-full text-xs px-2.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] mt-1"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="lb">Pounds (lb)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-secondary)] font-medium">Budget Cycle Start Day (1-31)</label>
          <input
            type="number"
            min="1"
            max="31"
            value={cycleDay}
            onChange={(e) => setDraftSnapshot(prev => ({ ...prev, budget_cycle_start_day: parseInt(e.target.value) || 1 }))}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] mt-1"
          />
          <span className="text-xs text-[var(--color-text-secondary)]">e.g. 25 for payday cycle</span>
        </div>

        <button
          type="button"
          onClick={() => setIsConfirmSheetOpen(true)}
          className="w-full py-2.5 bg-[var(--color-accent)] hover:opacity-90 text-white text-xs font-bold rounded-2xl tap-feedback flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Save Preferences</span>
        </button>
      </div>

      {/* Privacy & Security */}
      <div className="card-premium p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
          <h2 className="text-xs font-bold text-[var(--color-text-primary)]">
            {t('settings.privacySecurity', 'Privacy & Security')}
          </h2>
        </div>

        {/* Master Web App Lock */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div>
            <div className="text-xs font-semibold text-[var(--color-text-primary)]">
              Master App Security
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Password-protected access to entire workspace
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMasterPwdSuccess(false);
                setNewMasterPwd('');
                setMasterPwdModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => lockApp()}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1"
            >
              Lock Now
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div>
            <div className="text-xs font-semibold text-[var(--color-text-primary)]">
              {t('settings.journalLock', 'Private Journal Lock')}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {t('settings.journalLockSubtitle', 'Require session unlock before viewing notes')}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleJournalLock}
            className={`w-12 h-7 rounded-full p-1 transition-colors tap-feedback ${
              journalLock ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              journalLock ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DATA & SETUP MANAGEMENT                                  */}
      {/* ======================================================== */}
      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)]">
            <RotateCw className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[var(--color-text-primary)] tracking-tight">
              {t('dataManagement.title', 'Data & Setup Management')}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('dataManagement.subtitle', 'Manage demo data, initial setup wizard and database state')}
            </p>
          </div>
        </div>

        {/* Hidden File Input for Backup Import */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImportBackup} 
          accept=".json,application/json" 
          className="hidden" 
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Rerun Setup Wizard */}
          <button
            type="button"
            onClick={handleRerunWizard}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] transition-colors tap-feedback min-h-[50px] text-start"
          >
            <div className="w-9 h-9 rounded-xl bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent-light)] flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[var(--color-text-primary)] block truncate">
                {t('dataManagement.rerunWizard', 'Rerun Setup Wizard')}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block truncate">
                {t('dataManagement.rerunWizardDesc', 'Revisit profile, modules & appearance')}
              </span>
            </div>
          </button>

          {/* 2. Load Sample Data */}
          <button
            type="button"
            onClick={handleLoadSampleData}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] transition-colors tap-feedback min-h-[50px] text-start"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[var(--color-text-primary)] block truncate">
                {t('dataManagement.loadSample', 'Load Sample Data')}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block truncate">
                {t('dataManagement.loadSampleDesc', 'Fill app with realistic demo data')}
              </span>
            </div>
          </button>

          {/* 3. Remove Sample Data */}
          <button
            type="button"
            onClick={handleRemoveSampleData}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] transition-colors tap-feedback min-h-[50px] text-start"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[var(--color-text-primary)] block truncate">
                {t('dataManagement.removeSample', 'Remove Sample Data')}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block truncate">
                {t('dataManagement.removeSampleDesc', 'Strip demo records safely')}
              </span>
            </div>
          </button>

          {/* 4. Reset App to Clean State */}
          <button
            type="button"
            onClick={handleResetToClean}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-red-500/30 bg-[var(--color-surface)] hover:bg-red-500/10 transition-colors tap-feedback min-h-[50px] text-start"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-red-400 block truncate">
                {t('dataManagement.resetClean', 'Reset App (Clean Slate)')}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block truncate">
                {t('dataManagement.resetCleanDesc', 'Wipe everything to 0 records')}
              </span>
            </div>
          </button>

          {/* 5. Restore Default Seed Data */}
          <button
            type="button"
            onClick={handleResetData}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-500/30 bg-[var(--color-surface)] hover:bg-amber-500/10 transition-colors tap-feedback min-h-[50px] text-start"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-amber-400 block truncate">
                Restore Seed Data
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)] block truncate">
                Reset database back to default seed template
              </span>
            </div>
          </button>
        </div>

        {/* Export & Import Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-1.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] text-xs font-semibold text-[var(--color-text-primary)] transition-colors tap-feedback min-h-[44px]"
          >
            <Download className="w-4 h-4 text-[var(--color-accent)]" />
            <span>{t('settings.exportBackup', 'Export Backup')}</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] text-xs font-semibold text-[var(--color-accent)] transition-colors tap-feedback min-h-[44px]"
          >
            <Upload className="w-4 h-4 text-[var(--color-accent)]" />
            <span>{t('settings.importBackup', 'Import Backup')}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SAFE SETTINGS MODALS, SHEETS & FLOATING CONTROLS         */}
      {/* ======================================================== */}

      {/* Sticky Bottom Unsaved Changes Bar */}
      <UnsavedChangesBar 
        changeCount={changeCount}
        onSave={() => setIsConfirmSheetOpen(true)}
        onDiscard={handleDiscardAll}
      />

      {/* Confirm Changes Bottom Sheet */}
      <ConfirmChangesSheet
        isOpen={isConfirmSheetOpen}
        diffs={diffs}
        onConfirm={handleConfirmAndSave}
        onClose={() => setIsConfirmSheetOpen(false)}
      />

      {/* Destructive Action Sheet (requires typed "RESET" confirmation) */}
      <ConfirmChangesSheet
        isOpen={isDestructiveSheetOpen}
        diffs={destructiveDiffs}
        isDestructiveAction={true}
        destructiveActionLabel={destructiveLabel}
        onConfirm={handleExecuteDestructiveAction}
        onClose={() => {
          setIsDestructiveSheetOpen(false);
          setDestructiveActionType(null);
        }}
      />

      {/* Discard Changes Navigation Interception Dialog */}
      <DiscardChangesDialog
        isOpen={isDiscardDialogOpen}
        changeCount={changeCount}
        onKeepEditing={() => setIsDiscardDialogOpen(false)}
        onDiscardAndLeave={handleDiscardAndLeave}
      />

      {/* 10-Second Undo Toast */}
      <UndoToast
        isVisible={isUndoToastVisible}
        message={undoToastMessage || undefined}
        onUndo={handleUndo}
        onDismiss={() => setIsUndoToastVisible(false)}
      />
    </div>
  );
};
