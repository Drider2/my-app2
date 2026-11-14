const fs = require('fs');
let code = fs.readFileSync('src/services/settingsDiffService.ts', 'utf8');

// 1. Imports
code = code.replace(
  "import { \n  AppThemeMode, ",
  "import { \n  DisplayMode,\n  AppThemeMode, "
).replace(
  "import { \r\n  AppThemeMode, ",
  "import { \r\n  DisplayMode,\r\n  AppThemeMode, "
);

code = code.replace(
  "import { setLanguage, getLanguage, AppLanguage } from './i18n';",
  "import { setLanguage, getLanguage, AppLanguage } from './i18n';\nimport { LayoutService } from './layoutService';"
).replace(
  "import { setLanguage, getLanguage, AppLanguage } from './i18n';\r\n",
  "import { setLanguage, getLanguage, AppLanguage } from './i18n';\r\nimport { LayoutService } from './layoutService';\r\n"
);

// 2. AppSettingsSnapshot
code = code.replace(
  "  fontSizeScale: number;",
  "  fontSizeScale: number;\n  display_mode: DisplayMode;"
).replace(
  "  fontSizeScale: number;\r\n",
  "  fontSizeScale: number;\r\n  display_mode: DisplayMode;\r\n"
);

// 3. getSnapshot
code = code.replace(
  "      fontSizeScale: getFontSizeScale(),",
  "      fontSizeScale: getFontSizeScale(),\n      display_mode: (state.settings.display_mode as DisplayMode) || 'auto',"
).replace(
  "      fontSizeScale: getFontSizeScale(),\r\n",
  "      fontSizeScale: getFontSizeScale(),\r\n      display_mode: (state.settings.display_mode as DisplayMode) || 'auto',\r\n"
);

// 4. computeDiff
const diffTarget = `    if (Math.abs(original.fontSizeScale - draft.fontSizeScale) >= 0.01) {
      addDiff(
        'appearance',
        t('settings.appearanceTitle', 'Appearance'),
        'fontSizeScale',
        t('settings.textSize', 'Text Size'),
        \`\${Math.round(original.fontSizeScale * 100)}%\`,
        \`\${Math.round(draft.fontSizeScale * 100)}%\`
      );
    }`;

const diffTargetCRLF = diffTarget.replace(/\n/g, '\r\n');

const diffAddition = `    if (original.display_mode !== draft.display_mode) {
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
    }`;

if (code.includes(diffTargetCRLF)) {
  code = code.replace(diffTargetCRLF, diffTargetCRLF + '\r\n\r\n' + diffAddition.replace(/\n/g, '\r\n'));
} else if (code.includes(diffTarget)) {
  code = code.replace(diffTarget, diffTarget + '\n\n' + diffAddition);
}

// 5. commitSnapshot
code = code.replace(
  "      s.settings.accent = draft.accent;",
  "      s.settings.accent = draft.accent;\n      s.settings.display_mode = draft.display_mode || 'auto';"
).replace(
  "      s.settings.accent = draft.accent;\r\n",
  "      s.settings.accent = draft.accent;\r\n      s.settings.display_mode = draft.display_mode || 'auto';\r\n"
);

code = code.replace(
  "    setLanguage(draft.language, true);",
  "    setLanguage(draft.language, true);\n    LayoutService.setDisplayMode(draft.display_mode || 'auto');"
).replace(
  "    setLanguage(draft.language, true);\r\n",
  "    setLanguage(draft.language, true);\r\n    LayoutService.setDisplayMode(draft.display_mode || 'auto');\r\n"
);

fs.writeFileSync('src/services/settingsDiffService.ts', code, 'utf8');
console.log('Successfully updated settingsDiffService.ts');
