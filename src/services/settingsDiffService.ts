// ========================================================
// SettingsDiffService: Safe Settings Diff & Change Engine
// Computes human-readable before -> after diffs across all
// app settings, flags dangerous modifications, and manages
// atomic commit and 10-second undo snapshots.
// ========================================================

import { 
  DisplayMode,
  AppThemeMode, 
  AccentPreset, 
  DailyProgressSettings, 
  AppModulesConfig, 
  AIAssistantSettings, 
  HermesMode, 
  HermesShareContext, 
  VoiceSettings,
  DEFAULT_VOICE_SETTINGS
} from '../types';
import { db } from './storage';
import { HermesStorage } from './hermesStorage';
import { DailyProgressService } from './dailyProgressService';
import { applyTheme, applyAccent } from './themeService';
import { getFontSizeScale, applyFontSize } from './fontSizeService';
import { setLanguage, getLanguage, AppLanguage } from './i18n';
import { LayoutService } from './layoutService';

export interface SettingDiffItem {
  id: string;
  moduleKey: 'appearance' | 'language' | 'modules' | 'dailyProgress' | 'hermes' | 'voice' | 'preferences' | 'security' | 'data';
  moduleLabel: string;
  fieldKey: string;
  fieldLabel: string;
  oldValueDisplay: string;
  newValueDisplay: string;
  isDangerous?: boolean;
  dangerReason?: string;
}

export interface AppSettingsSnapshot {
  // General & Preferences
  currency_label: string;
  weight_unit: 'kg' | 'lb';
  budget_cycle_start_day: number;
  journal_lock_enabled: boolean;
  
  // Appearance
  theme: AppThemeMode;
  accent: AccentPreset;
  language: AppLanguage;
  fontSizeScale: number;
  display_mode: DisplayMode;
  
  // Modules
  modules: Required<AppModulesConfig>;
  
  // Daily Progress
  daily_progress: DailyProgressSettings;
  
  // Hermes AI
  hermes: {
    apiKey: string;
    model: string;
    hermesMode: HermesMode;
    shareContext: HermesShareContext;
    hermesServerUrl: string;
  };
  
  // Voice
  voice: VoiceSettings;

  // Sober Flame
  flame: {
    enabled: boolean;
    showNumber: boolean;
    showTenDayWords: boolean;
    shareWithHermes: boolean;
    goalDays: number;
  };
}

export class SettingsDiffService {
  /**
   * Captures a complete snapshot of all settings across all storage sources.
   */
  static getSnapshot(): AppSettingsSnapshot {
    const state = db.getState();
    const hermesSettings = HermesStorage.getSettings();
    const apiKey = HermesStorage.getApiKey();
    const dpSettings = DailyProgressService.getSettings();
    
    return {
      currency_label: state.settings.currency_label || 'DA',
      weight_unit: state.settings.weight_unit || 'kg',
      budget_cycle_start_day: state.settings.budget_cycle_start_day || 1,
      journal_lock_enabled: !!state.settings.journal_lock_enabled,
      
      theme: state.settings.theme || 'dark',
      accent: state.settings.accent || 'cyan',
      language: getLanguage(),
      fontSizeScale: getFontSizeScale(),
      display_mode: (state.settings.display_mode as DisplayMode) || 'auto',
      
      modules: {
        prayer: true,
        finance: true,
        gym: true,
        calendar: true,
        journal: true,
        maintenance: true,
        weekly_review: true,
        assistant: true,
        flame: true,
        ...state.settings.modules,
      },
      
      daily_progress: {
        daily_progress_enabled: dpSettings.daily_progress_enabled !== false,
        prayers_enabled: !!dpSettings.prayers_enabled,
        prayers_weight: Number(dpSettings.prayers_weight ?? 5),
        spending_enabled: !!dpSettings.spending_enabled,
        spending_weight: Number(dpSettings.spending_weight ?? 2),
        daily_spending_allowance_minor: Number(dpSettings.daily_spending_allowance_minor ?? 200000),
        discipline_enabled: !!dpSettings.discipline_enabled,
        discipline_weight: Number(dpSettings.discipline_weight ?? 3),
        excluded_category_ids: [...(dpSettings.excluded_category_ids || [])],
      },
      
      hermes: {
        apiKey: apiKey || '',
        model: hermesSettings.model || 'gemini-2.5-flash',
        hermesMode: hermesSettings.hermesMode || 'read_data',
        shareContext: hermesSettings.shareContext || {
          prayer: true,
          finance: true,
          gym: true,
          calendar: true,
          maintenance: true,
          journal: false,
        },
        hermesServerUrl: hermesSettings.hermesServerUrl || '',
      },
      
      voice: {
        ...DEFAULT_VOICE_SETTINGS,
        ...(state.settings.voice || {}),
      },

      flame: {
        enabled: state.settings.flame?.enabled !== false,
        showNumber: state.settings.flame?.showNumber !== false,
        showTenDayWords: state.settings.flame?.showTenDayWords !== false,
        shareWithHermes: !!state.settings.flame?.shareWithHermes,
        goalDays: Number(state.settings.flame?.goalDays ?? 30),
      },
    };
  }

  /**
   * Clones a snapshot safely.
   */
  static cloneSnapshot(snapshot: AppSettingsSnapshot): AppSettingsSnapshot {
    return JSON.parse(JSON.stringify(snapshot));
  }

  /**
   * Compares original snapshot against draft and produces human-readable diffs.
   */
  static computeDiff(
    original: AppSettingsSnapshot, 
    draft: AppSettingsSnapshot, 
    t: (key: string, fallback?: string) => string = (_, fb) => fb || ''
  ): SettingDiffItem[] {
    const diffs: SettingDiffItem[] = [];

    // Helper for adding diff
    const addDiff = (
      moduleKey: SettingDiffItem['moduleKey'],
      moduleLabel: string,
      fieldKey: string,
      fieldLabel: string,
      oldVal: string,
      newVal: string,
      isDangerous = false,
      dangerReason?: string
    ) => {
      diffs.push({
        id: `${moduleKey}.${fieldKey}`,
        moduleKey,
        moduleLabel,
        fieldKey,
        fieldLabel,
        oldValueDisplay: oldVal,
        newValueDisplay: newVal,
        isDangerous,
        dangerReason,
      });
    };

    // 1. APPEARANCE
    if (original.theme !== draft.theme) {
      const themeName = (mode: string) => {
        switch (mode) {
          case 'dark': return t('settings.darkTheme', 'Dark');
          case 'light': return t('settings.lightTheme', 'Light');
          case 'system': return t('settings.systemDefault', 'System Auto');
          case 'carbon': return 'Carbon';
          case 'matte': return 'Matte (Lite)';
          default: return mode;
        }
      };
      addDiff(
        'appearance',
        t('settings.appearanceTitle', 'Appearance'),
        'theme',
        t('settings.themeMode', 'Theme Mode'),
        themeName(original.theme),
        themeName(draft.theme)
      );
    }

    if (original.accent !== draft.accent) {
      const formatAccent = (acc: string) => acc.charAt(0).toUpperCase() + acc.slice(1);
      addDiff(
        'appearance',
        t('settings.appearanceTitle', 'Appearance'),
        'accent',
        t('settings.accentColor', 'Accent Color'),
        formatAccent(original.accent),
        formatAccent(draft.accent)
      );
    }

    if (Math.abs(original.fontSizeScale - draft.fontSizeScale) >= 0.01) {
      addDiff(
        'appearance',
        t('settings.appearanceTitle', 'Appearance'),
        'fontSizeScale',
        t('settings.textSize', 'Text Size'),
        `${Math.round(original.fontSizeScale * 100)}%`,
        `${Math.round(draft.fontSizeScale * 100)}%`
      );
    }

    if (original.display_mode !== draft.display_mode) {
      const modeName = (m: DisplayMode) => {
        switch (m) {
          case 'auto': return t('settings.displayAuto', 'Auto');
          case 'phone': return t('settings.displayPhone', 'Phone');
          case 'wide': return t('settings.displayWide', 'Wide');
          case 'tablet': return t('settings.displayTablet', 'Tablet');
          default: return m;
        }
      };
      addDiff(
        'appearance',
        t('settings.appearanceTitle', 'Appearance'),
        'display_mode',
        t('settings.displaySize', 'Display Size'),
        modeName(original.display_mode),
        modeName(draft.display_mode)
      );
    }

    // 2. LANGUAGE
    if (original.language !== draft.language) {
      const langName = (l: string) => {
        switch (l) {
          case 'en': return 'English (EN)';
          case 'fr': return 'Français (FR)';
          case 'ar': return 'العربية (AR)';
          default: return l;
        }
      };
      addDiff(
        'language',
        t('settings.appLanguage', 'Language'),
        'language',
        t('settings.appLanguage', 'App Language'),
        langName(original.language),
        langName(draft.language)
      );
    }

    // 3. APP MODULES
    const moduleNames: Record<keyof AppModulesConfig, { name: string; desc: string }> = {
      prayer: { name: t('onboarding.modules.prayer', 'Daily Prayers'), desc: 'Daily prayers tracking' },
      finance: { name: t('onboarding.modules.finance', 'Money & Budgets'), desc: 'Spending and cashflow' },
      gym: { name: t('onboarding.modules.gym', 'Fitness & Body'), desc: 'Workouts and bodyweight' },
      calendar: { name: t('onboarding.modules.calendar', 'Calendar & Agenda'), desc: 'Tasks and events' },
      journal: { name: t('onboarding.modules.journal', 'Private Journal'), desc: 'Notes and reflections' },
      maintenance: { name: t('onboarding.modules.maintenance', 'Care & Service'), desc: 'Vehicle & home care' },
      weekly_review: { name: t('onboarding.modules.weekly_review', 'Weekly Reviews'), desc: 'Weekly reviews' },
      assistant: { name: t('onboarding.modules.assistant', 'AI Assistant (Hermes)'), desc: 'AI smart assistant' },
      flame: { name: t('onboarding.modules.flame', 'Sober Flame'), desc: 'Daily sober streak' },
    };

    (Object.keys(moduleNames) as (keyof AppModulesConfig)[]).forEach((modKey) => {
      const oldState = original.modules[modKey] !== false;
      const newState = draft.modules[modKey] !== false;
      if (oldState !== newState) {
        const isDisabling = oldState && !newState;
        addDiff(
          'modules',
          t('modulesSettings.title', 'Modules'),
          `module.${modKey}`,
          moduleNames[modKey].name,
          oldState ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
          newState ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
          isDisabling,
          isDisabling ? t('settings.dangerDisableModule', 'Hides this module from navigation tabs and dashboard widgets.') : undefined
        );
      }
    });

    // 4. DAILY PROGRESS SETTINGS
    const dpOrig = original.daily_progress;
    const dpDraft = draft.daily_progress;

    if (dpOrig.daily_progress_enabled !== dpDraft.daily_progress_enabled) {
      addDiff(
        'dailyProgress',
        t('settings.dailyProgress', 'Daily Progress'),
        'daily_progress_enabled',
        t('dailyProgress.counter', 'Progress Counter Card'),
        dpOrig.daily_progress_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        dpDraft.daily_progress_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')
      );
    }

    if (dpOrig.prayers_enabled !== dpDraft.prayers_enabled) {
      addDiff(
        'dailyProgress',
        t('settings.dailyProgress', 'Daily Progress'),
        'prayers_enabled',
        t('dailyProgress.prayersScoring', 'Prayers Scoring'),
        dpOrig.prayers_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        dpDraft.prayers_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')
      );
    }

    if (dpOrig.prayers_weight !== dpDraft.prayers_weight) {
      addDiff(
        'dailyProgress',
        t('settings.dailyProgress', 'Daily Progress'),
        'prayers_weight',
        t('dailyProgress.prayersWeight', 'Prayers Score Weight'),
        `${dpOrig.prayers_weight} pts`,
        `${dpDraft.prayers_weight} pts`
      );
    }

    if (dpOrig.spending_enabled !== dpDraft.spending_enabled) {
      addDiff(
        'dailyProgress',
        t('settings.dailyProgress', 'Daily Progress'),
        'spending_enabled',
        t('dailyProgress.spendingScoring', 'Spending Scoring'),
        dpOrig.spending_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        dpDraft.spending_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')
      );
    }

    if (dpOrig.spending_weight !== dpDraft.spending_weight) {
      addDiff(
        'dailyProgress',
        t('settings.dailyProgress', 'Daily Progress'),
        'spending_weight',
        t('dailyProgress.spendingWeight', 'Spending Score Weight'),
        `${dpOrig.spending_weight} pts`,
        `${dpDraft.spending_weight} pts`
      );
    }

    if (dpOrig.daily_spending_allowance_minor !== dpDraft.daily_spending_allowance_minor) {
      addDiff(
        'dailyProgress',
        t('settings.dailyProgress', 'Daily Progress'),
        'daily_spending_allowance',
        t('dailyProgress.allowance', 'Daily Allowance'),
        `${dpOrig.daily_spending_allowance_minor / 100} ${original.currency_label}`,
        `${dpDraft.daily_spending_allowance_minor / 100} ${draft.currency_label}`
      );
    }

    if (dpOrig.discipline_enabled !== dpDraft.discipline_enabled) {
      addDiff(
        'dailyProgress',
        t('settings.dailyProgress', 'Daily Progress'),
        'discipline_enabled',
        t('dailyProgress.disciplineScoring', 'Discipline Scoring'),
        dpOrig.discipline_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        dpDraft.discipline_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')
      );
    }

    if (dpOrig.discipline_weight !== dpDraft.discipline_weight) {
      addDiff(
        'dailyProgress',
        t('settings.dailyProgress', 'Daily Progress'),
        'discipline_weight',
        t('dailyProgress.disciplineWeight', 'Discipline Score Weight'),
        `${dpOrig.discipline_weight} pts`,
        `${dpDraft.discipline_weight} pts`
      );
    }

    // Check total weight warning
    const draftTotalWeight = 
      (dpDraft.prayers_enabled ? dpDraft.prayers_weight : 0) +
      (dpDraft.spending_enabled ? dpDraft.spending_weight : 0) +
      (dpDraft.discipline_enabled ? dpDraft.discipline_weight : 0);
    if (draftTotalWeight !== 10) {
      // Find one DP diff and attach danger warning if total is not 10
      const dpItem = diffs.find(d => d.moduleKey === 'dailyProgress');
      if (dpItem && !dpItem.isDangerous) {
        dpItem.isDangerous = true;
        dpItem.dangerReason = t('settings.dangerWeightNotTen', `Weights sum to ${draftTotalWeight} pts instead of recommended 10.`);
      }
    }

    // 5. HERMES AI SETTINGS
    const hOrig = original.hermes;
    const hDraft = draft.hermes;

    if (hOrig.apiKey !== hDraft.apiKey) {
      const isClearing = Boolean(hOrig.apiKey && !hDraft.apiKey);
      const maskKey = (k: string) => k ? `${k.slice(0, 4)}...${k.slice(-4)}` : t('common.none', 'None');
      addDiff(
        'hermes',
        'Hermes AI',
        'apiKey',
        t('settings.geminiApiKey', 'Gemini API Key'),
        maskKey(hOrig.apiKey),
        maskKey(hDraft.apiKey),
        isClearing,
        isClearing ? t('settings.dangerClearApiKey', 'Removing your key disables Hermes responses.') : undefined
      );
    }

    if (hOrig.model !== hDraft.model) {
      addDiff(
        'hermes',
        'Hermes AI',
        'model',
        t('settings.geminiModel', 'AI Model'),
        hOrig.model,
        hDraft.model
      );
    }

    if (hOrig.hermesMode !== hDraft.hermesMode) {
      const modeLabel = (m: HermesMode) => {
        switch (m) {
          case 'chat_only': return t('settings.hermesModeChatOnly', 'Chat Only');
          case 'read_data': return t('settings.hermesModeReadData', 'Personal Advisor');
          case 'read_and_act': return t('settings.hermesModeReadAndAct', 'Autonomous Agent (With Confirmation)');
          default: return m;
        }
      };
      addDiff(
        'hermes',
        'Hermes AI',
        'hermesMode',
        t('settings.hermesMode', 'Operating Mode'),
        modeLabel(hOrig.hermesMode),
        modeLabel(hDraft.hermesMode),
        hDraft.hermesMode === 'read_and_act',
        hDraft.hermesMode === 'read_and_act' ? t('settings.dangerFullAction', 'Allows Hermes to propose database changes.') : undefined
      );
    }

    // Context sharing toggles
    (Object.keys(hDraft.shareContext) as (keyof HermesShareContext)[]).forEach((ctxKey) => {
      const oldVal = !!hOrig.shareContext[ctxKey];
      const newVal = !!hDraft.shareContext[ctxKey];
      if (oldVal !== newVal) {
        addDiff(
          'hermes',
          'Hermes AI',
          `shareContext.${ctxKey}`,
          `${t('settings.shareContext', 'Share Context')}: ${ctxKey}`,
          oldVal ? t('common.shared', 'Shared') : t('common.private', 'Private'),
          newVal ? t('common.shared', 'Shared') : t('common.private', 'Private')
        );
      }
    });

    if (hOrig.hermesServerUrl !== hDraft.hermesServerUrl) {
      addDiff(
        'hermes',
        'Hermes AI',
        'hermesServerUrl',
        'Hermes Server URL',
        hOrig.hermesServerUrl || t('common.none', 'None'),
        hDraft.hermesServerUrl || t('common.none', 'None')
      );
    }

    // 6. VOICE SETTINGS
    const vOrig = original.voice;
    const vDraft = draft.voice;

    if (vOrig.language !== vDraft.language) {
      addDiff(
        'voice',
        t('voice.title', 'Voice Engine'),
        'language',
        t('voice.speechLanguage', 'Speech Language'),
        vOrig.language === 'auto' ? 'Auto (App)' : (vOrig.language || 'Auto (App)'),
        vDraft.language === 'auto' ? 'Auto (App)' : (vDraft.language || 'Auto (App)')
      );
    }

    if (vOrig.voiceName !== vDraft.voiceName) {
      addDiff(
        'voice',
        t('voice.title', 'Voice Engine'),
        'voiceName',
        t('voice.ttsVoice', 'Voice Accent'),
        vOrig.voiceName || 'Default',
        vDraft.voiceName || 'Default'
      );
    }

    if (Math.abs((vOrig.speechRate ?? 1) - (vDraft.speechRate ?? 1)) >= 0.05) {
      addDiff(
        'voice',
        t('voice.title', 'Voice Engine'),
        'speechRate',
        t('voice.speechRate', 'Speech Rate'),
        `${vOrig.speechRate ?? 1}x`,
        `${vDraft.speechRate ?? 1}x`
      );
    }

    if (vOrig.readRepliesAloud !== vDraft.readRepliesAloud) {
      addDiff(
        'voice',
        t('voice.title', 'Voice Engine'),
        'readRepliesAloud',
        t('voice.readAloud', 'Read Replies Aloud'),
        vOrig.readRepliesAloud ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        vDraft.readRepliesAloud ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')
      );
    }

    // 7. PREFERENCES
    if (original.currency_label !== draft.currency_label) {
      addDiff(
        'preferences',
        t('settings.generalSettings', 'Preferences'),
        'currency_label',
        t('settings.currency', 'Currency Label'),
        original.currency_label,
        draft.currency_label,
        true,
        t('settings.dangerCurrencyChange', 'Does not recalculate historical currency exchange rates.')
      );
    }

    if (original.weight_unit !== draft.weight_unit) {
      addDiff(
        'preferences',
        t('settings.generalSettings', 'Preferences'),
        'weight_unit',
        t('settings.weightUnit', 'Weight Unit'),
        original.weight_unit.toUpperCase(),
        draft.weight_unit.toUpperCase()
      );
    }

    if (original.budget_cycle_start_day !== draft.budget_cycle_start_day) {
      addDiff(
        'preferences',
        t('settings.generalSettings', 'Preferences'),
        'budget_cycle_start_day',
        t('settings.budgetCycleDay', 'Budget Cycle Day'),
        `Day ${original.budget_cycle_start_day}`,
        `Day ${draft.budget_cycle_start_day}`
      );
    }

    // 8. SECURITY
    if (original.journal_lock_enabled !== draft.journal_lock_enabled) {
      const isDisabling = original.journal_lock_enabled && !draft.journal_lock_enabled;
      addDiff(
        'security',
        t('settings.privacySecurity', 'Privacy & Security'),
        'journal_lock_enabled',
        t('settings.journalLock', 'Private Journal Lock'),
        original.journal_lock_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        draft.journal_lock_enabled ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        isDisabling,
        isDisabling ? t('settings.dangerDisableJournalLock', 'Allows anyone holding this phone to view personal journal entries.') : undefined
      );
    }

    // 9. SOBER FLAME
    if (original.flame.showTenDayWords !== draft.flame.showTenDayWords) {
      addDiff(
        'modules',
        t('flame.title', 'Sober Flame'),
        'showTenDayWords',
        t('flame.wordsToggle', 'Words at every 10 days'),
        original.flame.showTenDayWords ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        draft.flame.showTenDayWords ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')
      );
    }

    if (original.flame.showNumber !== draft.flame.showNumber) {
      addDiff(
        'modules',
        t('flame.title', 'Sober Flame'),
        'showNumber',
        t('flame.showNumberToggle', 'Show day count beside flame'),
        original.flame.showNumber ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        draft.flame.showNumber ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')
      );
    }

    if (original.flame.shareWithHermes !== draft.flame.shareWithHermes) {
      addDiff(
        'modules',
        t('flame.title', 'Sober Flame'),
        'shareWithHermes',
        t('flame.hermesShareToggle', 'Let Hermes see my Flame'),
        original.flame.shareWithHermes ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled'),
        draft.flame.shareWithHermes ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')
      );
    }

    if (original.flame.goalDays !== draft.flame.goalDays) {
      addDiff(
        'modules',
        t('flame.title', 'Sober Flame'),
        'goalDays',
        t('flame.goalDays', 'Streak goal (days)'),
        `${original.flame.goalDays} days`,
        `${draft.flame.goalDays} days`
      );
    }

    return diffs;
  }

  /**
   * Commits the draft snapshot to all persistent storage models and activates live styles.
   */
  static commitSnapshot(draft: AppSettingsSnapshot): void {
    // 1. General & Preferences
    db.updateState(s => {
      s.settings.currency_label = draft.currency_label;
      s.settings.weight_unit = draft.weight_unit;
      s.settings.budget_cycle_start_day = draft.budget_cycle_start_day;
      s.settings.journal_lock_enabled = draft.journal_lock_enabled;
      s.settings.theme = draft.theme;
      s.settings.accent = draft.accent;
      s.settings.display_mode = draft.display_mode || 'auto';
      s.settings.modules = { ...draft.modules };
      s.settings.voice = { ...draft.voice };

      if (!s.settings.flame) {
        const today = new Date().toISOString().slice(0, 10);
        s.settings.flame = {
          enabled: draft.modules.flame !== false,
          startDate: today,
          relapses: [],
          goalDays: draft.flame.goalDays,
          showNumber: draft.flame.showNumber,
          celebrations: { streakKey: today, done: [], lastSeenDay: today },
          phraseHistory: [],
          savedPhrases: [],
          shareWithHermes: draft.flame.shareWithHermes,
          showTenDayWords: draft.flame.showTenDayWords,
        };
      } else {
        s.settings.flame.enabled = draft.modules.flame !== false;
        s.settings.flame.showNumber = draft.flame.showNumber;
        s.settings.flame.showTenDayWords = draft.flame.showTenDayWords;
        s.settings.flame.shareWithHermes = draft.flame.shareWithHermes;
        s.settings.flame.goalDays = draft.flame.goalDays;
      }
    });

    // 2. Daily Progress Service
    DailyProgressService.updateSettings({
      ...draft.daily_progress,
      daily_spending_allowance_minor: draft.daily_progress.daily_spending_allowance_minor,
    });

    // 3. Hermes Storage
    HermesStorage.saveApiKey(draft.hermes.apiKey, draft.hermes.model);
    HermesStorage.updateSettings(s => {
      s.model = draft.hermes.model;
      s.hermesMode = draft.hermes.hermesMode;
      s.shareContext = { ...draft.hermes.shareContext };
      s.hermesServerUrl = draft.hermes.hermesServerUrl;
    });

    // 4. Live Runtime services
    applyTheme(draft.theme, true);
    applyAccent(draft.accent, true);
    applyFontSize(draft.fontSizeScale, true);
    setLanguage(draft.language, true);
    LayoutService.setDisplayMode(draft.display_mode || 'auto');
  }
}
