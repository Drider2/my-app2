const fs = require('fs');
let code = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');

// 1. Icons import
code = code.replace(
  "  Minus, \n  Plus, ",
  "  Minus, \n  Plus, \n  Smartphone, \n  Tablet, \n  Maximize2, "
).replace(
  "  Minus, \r\n  Plus, ",
  "  Minus, \r\n  Plus, \r\n  Smartphone, \r\n  Tablet, \r\n  Maximize2, "
);

// 2. Types & Service imports
code = code.replace(
  "import { AppThemeMode, AccentPreset, DailyProgressSettings, AppModulesConfig, DEFAULT_APP_MODULES } from '../types';",
  "import { AppThemeMode, AccentPreset, DailyProgressSettings, AppModulesConfig, DEFAULT_APP_MODULES, DisplayMode } from '../types';\nimport { LayoutService, computeEffectiveLayout, isLayoutDowngraded, getDowngradeKey, getCurrentViewportWidth } from '../services/layoutService';"
).replace(
  "import { AppThemeMode, AccentPreset, DailyProgressSettings, AppModulesConfig, DEFAULT_APP_MODULES } from '../types';\r\n",
  "import { AppThemeMode, AccentPreset, DailyProgressSettings, AppModulesConfig, DEFAULT_APP_MODULES, DisplayMode } from '../types';\r\nimport { LayoutService, computeEffectiveLayout, isLayoutDowngraded, getDowngradeKey, getCurrentViewportWidth } from '../services/layoutService';\r\n"
);

// 3. Discard & Undo handlers
code = code.replace(
  "    applyFontSize(savedSnapshot.fontSizeScale, true);",
  "    applyFontSize(savedSnapshot.fontSizeScale, true);\n    LayoutService.previewDisplayMode(savedSnapshot.display_mode || 'auto');"
).replace(
  "    applyFontSize(savedSnapshot.fontSizeScale, true);\r\n",
  "    applyFontSize(savedSnapshot.fontSizeScale, true);\r\n    LayoutService.previewDisplayMode(savedSnapshot.display_mode || 'auto');\r\n"
);

// Also for undo
code = code.replace(
  "    setDraftSnapshot(SettingsDiffService.cloneSnapshot(previousSnapshotForUndo));",
  "    setDraftSnapshot(SettingsDiffService.cloneSnapshot(previousSnapshotForUndo));\n    LayoutService.previewDisplayMode(previousSnapshotForUndo.display_mode || 'auto');"
).replace(
  "    setDraftSnapshot(SettingsDiffService.cloneSnapshot(previousSnapshotForUndo));\r\n",
  "    setDraftSnapshot(SettingsDiffService.cloneSnapshot(previousSnapshotForUndo));\r\n    LayoutService.previewDisplayMode(previousSnapshotForUndo.display_mode || 'auto');\r\n"
);

// 4. Mutation handler
const handlerTarget = "  const handleSelectTheme = (mode: AppThemeMode) => {";
const handlerAddition = `  const handleSelectDisplayMode = (mode: DisplayMode) => {
    Haptics.tick();
    LayoutService.previewDisplayMode(mode);
    setDraftSnapshot(prev => ({ ...prev, display_mode: mode }));
  };

  const handleSelectTheme = (mode: AppThemeMode) => {`;

code = code.replace(handlerTarget, handlerAddition);

// 5. Layout calculations in render
const currentDefsTarget = "  const currentModules = draftSnapshot.modules;";
const currentDefsAddition = `  const currentModules = draftSnapshot.modules;
  const currentDisplayMode: DisplayMode = draftSnapshot.display_mode || 'auto';
  const currentViewportWidth = getCurrentViewportWidth();
  const effectiveForDraft = computeEffectiveLayout(currentDisplayMode, currentViewportWidth);
  const isDraftDowngraded = isLayoutDowngraded(currentDisplayMode, effectiveForDraft);
  const draftDowngradeKey = getDowngradeKey(currentDisplayMode, effectiveForDraft);`;

code = code.replace(currentDefsTarget, currentDefsAddition);

// 6. Section 4 JSX insertion
const previewBoxTarget = `          {/* Live Preview Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
              {t('settings.textSizePreview', 'Live Preview')}
            </span>
            <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">
              {t('settings.textSizeSample', 'GreenDream balances personal discipline, finance, and wellness.')}
            </p>
          </div>
        </div>
      </div>`;

const previewBoxTargetCRLF = previewBoxTarget.replace(/\n/g, '\r\n');

const section4JSX = `          {/* Live Preview Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] block">
              {t('settings.textSizePreview', 'Live Preview')}
            </span>
            <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">
              {t('settings.textSizeSample', 'GreenDream balances personal discipline, finance, and wellness.')}
            </p>
          </div>
        </div>

        {/* -------------------------------------------------------- */}
        {/* 4. DISPLAY SIZE (Auto, Phone, Wide, Tablet)             */}
        {/* -------------------------------------------------------- */}
        <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                {t('settings.displaySize', 'Display size')}
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--color-accent)] px-2.5 py-0.5 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] capitalize">
              {currentDisplayMode === 'auto' ? t('settings.displayAuto', 'Auto') :
               currentDisplayMode === 'phone' ? t('settings.displayPhone', 'Phone') :
               currentDisplayMode === 'wide' ? t('settings.displayWide', 'Wide') :
               t('settings.displayTablet', 'Tablet')}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] -mt-1">
            {t('settings.displaySizeDesc', 'Choose layout size or adapt automatically to screen width')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'auto', label: t('settings.displayAuto', 'Auto'), icon: SlidersHorizontal, desc: t('settings.displayAutoDesc', 'Adaptive') },
              { id: 'phone', label: t('settings.displayPhone', 'Phone'), icon: Smartphone, desc: '≤ 430px' },
              { id: 'wide', label: t('settings.displayWide', 'Wide'), icon: Monitor, desc: '600–760px' },
              { id: 'tablet', label: t('settings.displayTablet', 'Tablet'), icon: Tablet, desc: '≥ 1000px' },
            ].map(opt => {
              const isSelected = currentDisplayMode === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectDisplayMode(opt.id as DisplayMode)}
                  className={\`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all tap-feedback cursor-pointer \${
                    isSelected
                      ? 'bg-[var(--color-surface)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)] shadow-sm'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                  }\`}
                >
                  <div className={\`w-8 h-8 rounded-xl flex items-center justify-center \${
                    isSelected
                      ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                      : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
                  }\`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={\`text-xs font-bold \${
                    isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                  }\`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Downgrade Notice Note */}
          {isDraftDowngraded && draftDowngradeKey && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mt-2.5 animate-enter">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="flex-1">
                <p className="font-bold text-amber-200">
                  {t(draftDowngradeKey, 'Tablet layout needs a wider screen, using Phone')}
                </p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  {currentDisplayMode === 'tablet'
                    ? (activeLang === 'ar' ? 'يتطلب عرض شاشة 1000px أو أكثر. العرض الحالي ' + currentViewportWidth + 'px.' : activeLang === 'fr' ? 'Nécessite une largeur ≥ 1000px. Largeur actuelle ' + currentViewportWidth + 'px.' : 'Tablet layout requires viewport width ≥ 1000px. Current viewport is ' + currentViewportWidth + 'px.')
                    : (activeLang === 'ar' ? 'يتطلب عرض شاشة 600px أو أكثر. العرض الحالي ' + currentViewportWidth + 'px.' : activeLang === 'fr' ? 'Nécessite une largeur ≥ 600px. Largeur actuelle ' + currentViewportWidth + 'px.' : 'Wide layout requires viewport width ≥ 600px. Current viewport is ' + currentViewportWidth + 'px.')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>`;

if (code.includes(previewBoxTargetCRLF)) {
  code = code.replace(previewBoxTargetCRLF, section4JSX.replace(/\n/g, '\r\n'));
  console.log('Section 4 inserted (CRLF)');
} else if (code.includes(previewBoxTarget)) {
  code = code.replace(previewBoxTarget, section4JSX);
  console.log('Section 4 inserted (LF)');
} else {
  console.error('previewBoxTarget not found');
}

fs.writeFileSync('src/screens/SettingsScreen.tsx', code, 'utf8');
console.log('Successfully updated src/screens/SettingsScreen.tsx');
