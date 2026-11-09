// ========================================================
// OnboardingModal: First-Launch Modular Setup Wizard
// 5-Step Smooth Flow: Welcome -> Modules -> Quick Setup -> Look -> Done
// Respects Glass Design System, Full RTL & EN/FR/AR i18n
// ========================================================
import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Globe, 
  Wallet, 
  MoonStar, 
  Dumbbell, 
  Calendar, 
  BookOpen, 
  Wrench, 
  BarChart3, 
  Bot, 
  Zap, 
  Sun, 
  Moon, 
  Layers, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { useTranslation, AppLanguage } from '../../services/i18n';
import { db } from '../../services/storage';
import { applyTheme, applyAccent, ACCENT_PRESETS } from '../../services/themeService';
import { AppThemeMode, AccentPreset, AppModulesConfig, DEFAULT_APP_MODULES } from '../../types';
import { Haptics } from '../../services/haptics';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { t, language, setLanguage, isRtl } = useTranslation();
  const state = db.getState();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: User Profile & Language
  const [name, setName] = useState(state.settings.user_name || '');

  // Step 2: Modules Selection
  const [modules, setModules] = useState<Required<AppModulesConfig>>({
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
  });

  // Step 3: Quick Setup Inputs
  const [currency, setCurrency] = useState(state.settings.currency_label || 'DA');
  const [monthlyBudget, setMonthlyBudget] = useState('50000');
  const [startingBalance, setStartingBalance] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>(state.settings.weight_unit || 'kg');
  const [currentWeight, setCurrentWeight] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Step 4: Appearance
  const [chosenTheme, setChosenTheme] = useState<AppThemeMode>(state.settings.theme || 'dark');
  const [chosenAccent, setChosenAccent] = useState<AccentPreset>(state.settings.accent || 'cyan');

  if (!isOpen) return null;

  // Preset Handlers
  const handleApplyPreset = (preset: 'everything' | 'essentials' | 'minimal') => {
    Haptics.tick();
    if (preset === 'everything') {
      setModules({
        prayer: true,
        finance: true,
        gym: true,
        calendar: true,
        journal: true,
        maintenance: true,
        weekly_review: true,
        assistant: true,
        flame: true,
      });
    } else if (preset === 'essentials') {
      setModules({
        prayer: true,
        finance: true,
        gym: false,
        calendar: true,
        journal: false,
        maintenance: false,
        weekly_review: false,
        assistant: false,
        flame: true,
      });
    } else if (preset === 'minimal') {
      setModules({
        prayer: false,
        finance: false,
        gym: false,
        calendar: true,
        journal: false,
        maintenance: false,
        weekly_review: false,
        assistant: false,
        flame: true,
      });
    }
  };

  const toggleModule = (key: keyof AppModulesConfig) => {
    Haptics.tick();
    setModules(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLanguageChange = (lang: AppLanguage) => {
    Haptics.tick();
    setLanguage(lang);
  };

  const handleThemeChange = (themeMode: AppThemeMode) => {
    Haptics.tick();
    setChosenTheme(themeMode);
    applyTheme(themeMode, false);
  };

  const handleAccentChange = (accent: AccentPreset) => {
    Haptics.tick();
    setChosenAccent(accent);
    applyAccent(accent, false);
  };

  const handleFinishSetup = (skipped: boolean = false) => {
    Haptics.success();
    const parsedBudget = parseFloat(monthlyBudget) || 0;
    const parsedStarting = parseFloat(startingBalance) || 0;
    const parsedWeight = parseFloat(currentWeight) || 0;

    db.updateState(s => {
      s.settings.onboarded = true;
      s.settings.show_customize_banner = false;
      s.settings.user_name = name.trim() || 'Friend';
      s.settings.currency_label = currency.trim() || 'DA';
      s.settings.weight_unit = weightUnit;
      s.settings.theme = chosenTheme;
      s.settings.accent = chosenAccent;
      s.settings.modules = skipped ? { ...DEFAULT_APP_MODULES } : { ...modules };

      if (!skipped) {
        if (parsedBudget > 0) {
          s.salarySetting.monthly_salary_minor = Math.round(parsedBudget * 100);
        }
        if (parsedStarting > 0) {
          s.savingsAccount.current_balance_minor = Math.round(parsedStarting * 100);
          s.savingsAccount.starting_balance_minor = Math.round(parsedStarting * 100);
        }
        if (parsedWeight > 0) {
          s.bodyweightEntries.push({
            id: 'bw-init',
            weight_kg: weightUnit === 'lb' ? Math.round(parsedWeight * 0.453592 * 10) / 10 : parsedWeight,
            local_date: new Date().toISOString().split('T')[0],
            created_at: Date.now(),
            updated_at: Date.now(),
            deleted_at: null,
          });
        }
        if (apiKeyInput.trim()) {
          if (!s.settings.ai) {
            s.settings.ai = {
              provider: 'gemini',
              api_key_configured: true,
              api_key_masked: '••••••••••••••••' + apiKeyInput.trim().slice(-4),
              api_key: apiKeyInput.trim(),
              model: 'gemini-3.6-flash',
              backend_url: '',
              direct_mode: true,
              connection_status: 'connected',
              connection_error: null,
              last_tested_at: Date.now(),
              response_length: 'balanced',
              permissions: {
                finance_read: true,
                gym_read: true,
                tasks_read: true,
                prayers_read: true,
                maintenance_read: true,
              },
              usage: {
                total_requests: 0,
                prompt_tokens: 0,
                completion_tokens: 0,
                rate_limit_errors: 0,
                today_requests: 0,
                today_date: new Date().toISOString().split('T')[0],
                free_tier_status: 'active',
              },
            };
          } else {
            s.settings.ai.api_key = apiKeyInput.trim();
            s.settings.ai.api_key_configured = true;
            s.settings.ai.api_key_masked = '••••••••••••••••' + apiKeyInput.trim().slice(-4);
          }
        }
      }
    });

    applyTheme(chosenTheme, true);
    applyAccent(chosenAccent, true);
    onComplete();
  };

  const enabledCount = Object.values(modules).filter(Boolean).length;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-[var(--color-bg)]/98  flex flex-col justify-between overflow-y-auto no-scrollbar animate-fade-in p-4 sm:p-6 md:p-8"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Header & Progress Dots */}
      <div className="w-full max-w-lg mx-auto pt-2 space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
          <span className="font-semibold text-[var(--accent-light)]">GreenDream Setup</span>
          <button 
            type="button" 
            onClick={() => handleFinishSetup(true)}
            className="text-[var(--text-2)] hover:text-[var(--text-1)] underline underline-offset-2 tap-feedback px-1 py-0.5"
          >
            {t('common.skip', 'Skip setup')}
          </button>
        </div>

        {/* 5-Step Progress Indicators */}
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'bg-[var(--accent)] shadow-[0_0_8px_rgb(var(--accent-rgb)/0.7)]'
                  : s < step
                  ? 'bg-[var(--accent-light)]/40'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Dynamic Wizard Canvas */}
      <div className="w-full max-w-lg mx-auto my-auto py-6">
        {/* ======================================================== */}
        {/* STEP 1: WELCOME, NAME & LANGUAGE                         */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="space-y-6 animate-enter">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-3xl bg-[rgb(var(--accent-rgb)/0.15)] border border-[rgb(var(--accent-rgb)/0.35)] text-[var(--accent-light)] flex items-center justify-center mx-auto shadow-[0_0_20px_rgb(var(--accent-rgb)/0.3)]">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-1)]">
                {t('onboarding.welcomeTitle', 'Welcome to GreenDream')}
              </h1>
              <p className="text-xs text-[var(--text-2)] max-w-sm mx-auto leading-relaxed">
                {t('onboarding.welcomeDesc', 'Your private, local-first companion for balanced habits, finance, spiritual rhythm, and daily focus.')}
              </p>
            </div>

            {/* Language Selector */}
            <div className="space-y-2 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs font-semibold text-[var(--text-1)] block flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[var(--accent)]" />
                <span>{t('settings.appLanguage', 'Choose Interface Language')}</span>
              </span>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all tap-feedback min-h-[44px] ${
                    language === 'en'
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-md'
                      : 'bg-white/[0.04] border border-white/10 text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  English 🇬🇧
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('fr')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all tap-feedback min-h-[44px] ${
                    language === 'fr'
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-md'
                      : 'bg-white/[0.04] border border-white/10 text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  Français 🇫🇷
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('ar')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all tap-feedback min-h-[44px] ${
                    language === 'ar'
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-md'
                      : 'bg-white/[0.04] border border-white/10 text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  العربية 🇩🇿
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <label className="text-xs font-semibold text-[var(--text-1)] block">
                {t('onboarding.namePrompt', 'What should we call you?')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('onboarding.namePlaceholder', 'Your first name (e.g. Yacine)')}
                className="w-full text-sm px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--text-1)] focus:outline-none focus:border-[var(--color-accent)] min-h-[44px]"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: MODULE SELECTION (What do you need?)            */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="space-y-4 animate-enter">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-[var(--text-1)]">
                {t('onboarding.modulesTitle', 'What do you need?')}
              </h2>
              <p className="text-xs text-[var(--text-2)] max-w-sm mx-auto">
                {t('onboarding.modulesDesc', 'Choose which areas you want to track. Disabled areas are cleanly hidden and can be toggled in Settings at any time.')}
              </p>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('everything')}
                className="py-2 px-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[var(--text-1)] tap-feedback text-center"
              >
                ✨ Everything
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('essentials')}
                className="py-2 px-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[var(--text-1)] tap-feedback text-center"
              >
                ⚡ Essentials
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('minimal')}
                className="py-2 px-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[var(--text-1)] tap-feedback text-center"
              >
                🎯 Minimal
              </button>
            </div>

            {/* Granular Module Toggle Cards */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar pr-0.5">
              {[
                { key: 'prayer', label: 'Daily Prayers', desc: '5 daily prayers rhythm, countdowns & Qibla focus', icon: MoonStar, color: 'text-emerald-400' },
                { key: 'finance', label: 'Money & Expenses', desc: 'Transactions, budget limits, emergency vault & savings goals', icon: Wallet, color: 'text-amber-400' },
                { key: 'gym', label: 'Body & Gym', desc: 'Workout programs, logging weight & anatomical volume', icon: Dumbbell, color: 'text-cyan-400' },
                { key: 'calendar', label: 'Calendar & Tasks', desc: 'Agenda events, scheduled habits & daily to-do items', icon: Calendar, color: 'text-indigo-400' },
                { key: 'journal', label: 'Daily Journal', desc: 'Private reflections, mood, and personal check-ins', icon: BookOpen, color: 'text-rose-400' },
                { key: 'maintenance', label: 'Reminders & Care', desc: 'Recurring maintenance, oil changes & shopping lists', icon: Wrench, color: 'text-orange-400' },
                { key: 'weekly_review', label: 'Weekly Review', desc: 'Sunday reflection, consistency rating & habits retrospective', icon: BarChart3, color: 'text-purple-400' },
                { key: 'assistant', label: 'AI Assistant', desc: 'Google Gemini intelligence with Hermes personalized memory', icon: Bot, color: 'text-blue-400' },
              ].map((m) => {
                const Icon = m.icon;
                const isEnabled = modules[m.key as keyof AppModulesConfig];
                return (
                  <div
                    key={m.key}
                    onClick={() => toggleModule(m.key as keyof AppModulesConfig)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer tap-feedback flex items-center justify-between min-h-[52px] ${
                      isEnabled
                        ? 'bg-[var(--color-surface)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30'
                        : 'bg-white/[0.02] border-white/[0.06] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isEnabled ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]' : 'bg-white/5 text-[var(--text-3)]'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[var(--text-1)] block">{m.label}</span>
                        <span className="text-[11px] text-[var(--text-3)] leading-tight block">{m.desc}</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ms-2 ${isEnabled ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'border border-white/20'}`}>
                      {isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: QUICK SETUP (Enabled Modules Only)               */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="space-y-4 animate-enter">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-[var(--text-1)]">
                {t('onboarding.quickSetupTitle', 'Quick Essentials')}
              </h2>
              <p className="text-xs text-[var(--text-2)] max-w-sm mx-auto">
                {t('onboarding.quickSetupDesc', 'Set initial targets for your active modules. You can skip any field.')}
              </p>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto no-scrollbar">
              {/* Money setup card */}
              {modules.finance && (
                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-1)]">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>Money & Currency</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-[var(--text-3)] block mb-1">Currency Code</label>
                      <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        placeholder="DA / $ / €"
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--text-1)] focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-3)] block mb-1">Monthly Target/Budget</label>
                      <input
                        type="number"
                        value={monthlyBudget}
                        onChange={(e) => setMonthlyBudget(e.target.value)}
                        placeholder="50000"
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--text-1)] focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Gym / Body setup card */}
              {modules.gym && (
                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-1)]">
                    <Dumbbell className="w-4 h-4 text-cyan-400" />
                    <span>Body & Fitness</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-[var(--text-3)] block mb-1">Weight Unit</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setWeightUnit('kg')}
                          className={`py-2 text-xs font-bold rounded-lg ${weightUnit === 'kg' ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'bg-white/5 text-[var(--text-2)]'}`}
                        >
                          KG
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeightUnit('lb')}
                          className={`py-2 text-xs font-bold rounded-lg ${weightUnit === 'lb' ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'bg-white/5 text-[var(--text-2)]'}`}
                        >
                          LB
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-3)] block mb-1">Starting Weight (optional)</label>
                      <input
                        type="number"
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(e.target.value)}
                        placeholder="e.g. 75"
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--text-1)] focus:outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* AI Assistant setup card */}
              {modules.assistant && (
                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-1)]">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span>Google Gemini AI</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-3)]">
                    Connect your free Gemini API key from Google AI Studio (optional, can be done later in Settings).
                  </p>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy... (Paste Gemini key or leave blank)"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--text-1)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              )}

              {/* Empty state if user deselected specialized modules */}
              {!modules.finance && !modules.gym && !modules.assistant && (
                <div className="p-5 text-center text-xs text-[var(--text-3)] border border-dashed border-white/10 rounded-2xl">
                  <span>No specialized configuration needed. You are ready to proceed!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: LOOK & FEEL (Theme & Accent)                     */}
        {/* ======================================================== */}
        {step === 4 && (
          <div className="space-y-4 animate-enter">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-[var(--text-1)]">
                {t('onboarding.appearanceTitle', 'Personalize the Mood')}
              </h2>
              <p className="text-xs text-[var(--text-2)] max-w-sm mx-auto">
                {t('onboarding.appearanceDesc', 'Choose your visual style and glowing accent color.')}
              </p>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs font-semibold text-[var(--text-1)] block">Theme Style</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all tap-feedback ${
                    chosenTheme === 'dark'
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-md'
                      : 'bg-white/[0.04] text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark Glass</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('matte')}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all tap-feedback ${
                    chosenTheme === 'matte'
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-md'
                      : 'bg-white/[0.04] text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Matte Lite</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all tap-feedback ${
                    chosenTheme === 'light'
                      ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-md'
                      : 'bg-white/[0.04] text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                </button>
              </div>
            </div>

            {/* Accent Color Preset Selector */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-xs font-semibold text-[var(--text-1)] block">Glowing Accent</span>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(ACCENT_PRESETS) as AccentPreset[]).map((accKey) => {
                  const meta = ACCENT_PRESETS[accKey];
                  const isSelected = chosenAccent === accKey;
                  return (
                    <button
                      key={accKey}
                      type="button"
                      onClick={() => handleAccentChange(accKey)}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all tap-feedback border ${
                        isSelected
                          ? 'border-[var(--color-accent)] bg-white/10'
                          : 'border-transparent bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full shadow-md" style={{ backgroundColor: meta.hex }} />
                      <span className="text-[11px] font-medium text-[var(--text-2)] capitalize">{meta.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-1)]">Today Preview</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full text-[var(--color-accent-contrast)] bg-[var(--accent)] font-bold">
                  Active
                </span>
              </div>
              <p className="text-xs text-[var(--text-2)]">
                Hello, {name.trim() || 'Friend'}! Your personalized GreenDream dashboard is ready.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 5: READY & SUMMARY                                  */}
        {/* ======================================================== */}
        {step === 5 && (
          <div className="space-y-6 text-center animate-enter">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] flex items-center justify-center mx-auto shadow-[0_0_24px_rgb(var(--accent-rgb)/0.5)]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-[var(--text-1)]">
                {t('onboarding.readyTitle', 'You are all set!')}
              </h2>
              <p className="text-xs text-[var(--text-2)] max-w-sm mx-auto leading-relaxed">
                {t('onboarding.readyDesc', 'GreenDream is ready on a clean slate. You can customize active modules or load sample data at any time in Settings.')}
              </p>
            </div>

            {/* Summary Chips */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-start space-y-2.5">
              <span className="text-xs font-semibold text-[var(--text-1)] block">Configuration Summary</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.04]">
                  <span className="text-[11px] text-[var(--text-3)] block">Name</span>
                  <span className="font-medium text-[var(--text-1)]">{name.trim() || 'Friend'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04]">
                  <span className="text-[11px] text-[var(--text-3)] block">Active Modules</span>
                  <span className="font-medium text-[var(--accent-light)]">{enabledCount} of 8 Enabled</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04]">
                  <span className="text-[11px] text-[var(--text-3)] block">Currency</span>
                  <span className="font-medium text-[var(--text-1)]">{currency}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04]">
                  <span className="text-[11px] text-[var(--text-3)] block">Theme Style</span>
                  <span className="font-medium text-[var(--text-1)] capitalize">{chosenTheme}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Controls (Back, Next / Start) */}
      <div className="w-full max-w-lg mx-auto pt-4 flex items-center justify-between gap-3 border-t border-[var(--hairline)]">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as any)}
            className="px-4 py-3 min-h-[44px] rounded-xl border border-white/10 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-white/5 transition-all flex items-center gap-1.5 tap-feedback"
          >
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span>{t('common.back', 'Back')}</span>
          </button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) as any)}
            className="px-6 py-3 min-h-[44px] rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-xs font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 tap-feedback shadow-lg ms-auto"
          >
            <span>{t('common.next', 'Next')}</span>
            <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleFinishSetup(false)}
            className="px-8 py-3.5 min-h-[48px] rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-contrast)] text-sm font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 tap-feedback shadow-xl ms-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('onboarding.startApp', 'Start GreenDream')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
