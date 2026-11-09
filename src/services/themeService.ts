// Theme & Accent Management Service (Dark Glass + 4 Accent Presets)
import { db } from './storage';
import { AppThemeMode, AccentPreset } from '../types';

let systemMediaListener: ((e: MediaQueryListEvent) => void) | null = null;

export interface AccentPresetMeta {
  id: AccentPreset;
  name: string;
  hex: string;
  lightHex: string;
  rgb: string;
}

export const ACCENT_PRESETS: Record<AccentPreset, AccentPresetMeta> = {
  cyan: {
    id: 'cyan',
    name: 'Cyan glow',
    hex: '#22C7F2',
    lightHex: '#A5EEFF',
    rgb: '34 199 242',
  },
  lime: {
    id: 'lime',
    name: 'Lime pulse',
    hex: '#A6E34B',
    lightHex: '#DDF9A8',
    rgb: '166 227 75',
  },
  violet: {
    id: 'violet',
    name: 'Violet haze',
    hex: '#A78BFA',
    lightHex: '#DDD1FF',
    rgb: '167 139 250',
  },
  rose: {
    id: 'rose',
    name: 'Rose ember',
    hex: '#FF7A9C',
    lightHex: '#FFC2D2',
    rgb: '255 122 156',
  },
};

export function getEffectiveTheme(mode: AppThemeMode): 'light' | 'dark' | 'matte' {
  if (mode === 'matte' || (mode as any) === 'pure-matte') {
    return 'matte';
  }
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return mode === 'light' ? 'light' : 'dark';
}

export function applyTheme(mode: AppThemeMode, persist: boolean = true): void {
  // Automatic migration: legacy 'carbon' or 'matte-carbon' becomes 'dark'
  const normalizedMode: AppThemeMode = 
    (mode as any) === 'carbon' || (mode as any) === 'matte-carbon' ? 'dark' : mode;

  const effective = getEffectiveTheme(normalizedMode);
  const root = document.documentElement;

  // Clean all legacy classes
  root.classList.remove('light', 'dark', 'matte', 'matte-carbon');
  root.classList.add(effective);
  root.style.colorScheme = effective === 'light' ? 'light' : 'dark';

  // Update meta theme-color for system chrome
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    const metaColor = effective === 'light' ? '#EEF4F6' : effective === 'matte' ? '#090C0E' : '#04070A';
    themeColorMeta.setAttribute('content', metaColor);
  }

  // Manage system media listener
  const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (systemMediaListener && mql) {
    mql.removeEventListener('change', systemMediaListener);
    systemMediaListener = null;
  }

  if (normalizedMode === 'system' && mql) {
    systemMediaListener = (e: MediaQueryListEvent) => {
      const isDark = e.matches;
      root.classList.remove('light', 'dark', 'matte', 'matte-carbon');
      root.classList.add(isDark ? 'dark' : 'light');
      root.style.colorScheme = isDark ? 'dark' : 'light';
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', isDark ? '#04070A' : '#EEF4F6');
      }
    };
    mql.addEventListener('change', systemMediaListener);
  }

  // Dispatch theme change event for app-level reactive renders
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('greendream_theme_changed', { detail: { theme: normalizedMode, effective } }));
  }

  if (persist) {
    db.updateState(s => {
      s.settings.theme = normalizedMode;
    });
  }
}

export function applyAccent(accent: AccentPreset, persist: boolean = true): void {
  const normalizedAccent: AccentPreset = ACCENT_PRESETS[accent] ? accent : 'cyan';
  const root = document.documentElement;
  root.setAttribute('data-accent', normalizedAccent);

  // Dispatch global event for live chart or component re-renders
  window.dispatchEvent(new CustomEvent('greendream_accent_changed', { detail: { accent: normalizedAccent } }));

  if (persist) {
    db.updateState(s => {
      s.settings.accent = normalizedAccent;
    });
  }
}

export function initAccent(): void {
  const currentAccent = db.getState().settings.accent || 'cyan';
  applyAccent(currentAccent, false);
}

export function getTheme(): AppThemeMode {
  return db.getState().settings?.theme || 'system';
}

export function toggleTheme(): void {
  const current = getTheme();
  const effective = getEffectiveTheme(current);
  const next: AppThemeMode = effective === 'dark' ? 'light' : 'dark';
  applyTheme(next, true);
}

export function initTheme(): void {
  initAccent();
  const currentSetting = db.getState().settings.theme || 'system';
  // If stored theme was carbon, normalize and save
  if ((currentSetting as any) === 'carbon' || (currentSetting as any) === 'matte-carbon') {
    applyTheme('dark', true);
  } else {
    applyTheme(currentSetting, false);
  }
}
