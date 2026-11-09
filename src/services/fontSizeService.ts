import { db } from './storage';
import { FontSizeScalePreset } from '../types';

export interface FontSizePresetOption {
  id: FontSizeScalePreset;
  label: string;
  labelFr: string;
  labelAr: string;
  scale: number;
  percentageText: string;
}

export const FONT_SIZE_PRESETS: FontSizePresetOption[] = [
  { id: 'xs', label: 'Extra Small', labelFr: 'Très petit', labelAr: 'صغير جداً', scale: 0.85, percentageText: '85%' },
  { id: 'sm', label: 'Small', labelFr: 'Petit', labelAr: 'صغير', scale: 0.92, percentageText: '92%' },
  { id: 'md', label: 'Default', labelFr: 'Par défaut', labelAr: 'افتراضي', scale: 1.00, percentageText: '100%' },
  { id: 'lg', label: 'Large', labelFr: 'Grand', labelAr: 'كبير', scale: 1.10, percentageText: '110%' },
  { id: 'xl', label: 'Extra Large', labelFr: 'Très grand', labelAr: 'كبير جداً', scale: 1.20, percentageText: '120%' },
];

export const MIN_FONT_SCALE = 0.85;
export const MAX_FONT_SCALE = 1.20;

export function getFontSizeScale(): number {
  if (typeof window === 'undefined') return 1.0;
  const stored = db.getState().settings.font_size_scale;
  return typeof stored === 'number' && stored >= MIN_FONT_SCALE && stored <= MAX_FONT_SCALE
    ? stored
    : 1.0;
}

export function applyFontSize(scale: number, persist: boolean = true): void {
  if (typeof document === 'undefined') return;

  const clampedScale = Math.max(MIN_FONT_SCALE, Math.min(MAX_FONT_SCALE, Math.round(scale * 100) / 100));
  
  // Set root font size percentage so all rem-based sizes scale proportionally
  document.documentElement.style.fontSize = `${clampedScale * 100}%`;
  document.documentElement.style.setProperty('--app-font-scale', `${clampedScale}`);

  if (persist) {
    db.updateState(s => {
      s.settings.font_size_scale = clampedScale;
    });
  }

  // Notify active components
  window.dispatchEvent(new CustomEvent('app_fontsize_changed', { detail: { scale: clampedScale } }));
}

export function stepFontSize(direction: 1 | -1): number {
  const current = getFontSizeScale();
  // Find current or nearest preset
  const currentIndex = FONT_SIZE_PRESETS.findIndex(p => Math.abs(p.scale - current) < 0.03);
  let nextIndex = 2; // default
  if (currentIndex !== -1) {
    nextIndex = Math.max(0, Math.min(FONT_SIZE_PRESETS.length - 1, currentIndex + direction));
  } else {
    nextIndex = direction > 0 ? 3 : 1;
  }
  const nextScale = FONT_SIZE_PRESETS[nextIndex].scale;
  applyFontSize(nextScale, true);
  return nextScale;
}

export function initFontSize(): void {
  const scale = getFontSizeScale();
  applyFontSize(scale, false);
}
