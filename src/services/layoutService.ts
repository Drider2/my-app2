import { DisplayMode, LayoutSize } from '../types';
import { db } from './storage';

export const LAYOUT_THRESHOLDS = {
  PHONE_MAX: 599,
  WIDE_MIN: 600,
  WIDE_MAX: 999,
  TABLET_MIN: 1000,
} as const;

export const LAYOUT_EVENT = 'greendream_layout_change';

/**
 * Determines layout in Auto mode based purely on viewport width.
 */
export function getAutoLayout(width: number): LayoutSize {
  if (width >= LAYOUT_THRESHOLDS.TABLET_MIN) return 'tablet';
  if (width >= LAYOUT_THRESHOLDS.WIDE_MIN) return 'wide';
  return 'phone';
}

/**
 * Computes effective layout taking requested mode and viewport width into account.
 * Follows the strict downgrade rule:
 * - Tablet requested on < 600px => Phone
 * - Tablet requested on 600-999px => Wide
 * - Tablet requested on >= 1000px => Tablet
 * - Wide requested on < 600px => Phone
 * - Wide requested on >= 600px => Wide
 * - Phone requested => Phone (always)
 * - Auto requested => getAutoLayout(width)
 */
export function computeEffectiveLayout(requested: DisplayMode, width: number): LayoutSize {
  if (requested === 'tablet') {
    if (width >= LAYOUT_THRESHOLDS.TABLET_MIN) return 'tablet';
    if (width >= LAYOUT_THRESHOLDS.WIDE_MIN) return 'wide';
    return 'phone';
  }
  if (requested === 'wide') {
    if (width >= LAYOUT_THRESHOLDS.WIDE_MIN) return 'wide';
    return 'phone';
  }
  if (requested === 'phone') {
    return 'phone';
  }
  return getAutoLayout(width);
}

/**
 * Returns true if the requested layout size was downgraded due to insufficient viewport width.
 */
export function isLayoutDowngraded(requested: DisplayMode, effective: LayoutSize): boolean {
  if (requested === 'auto') return false;
  return requested !== effective;
}

/**
 * Returns the localized translation key for downgrade explanations.
 */
export function getDowngradeKey(requested: DisplayMode, effective: LayoutSize): string | null {
  if (requested === 'auto' || requested === effective) return null;
  if (requested === 'tablet' && effective === 'phone') return 'settings.displayDowngradedTabletToPhone';
  if (requested === 'tablet' && effective === 'wide') return 'settings.displayDowngradedTabletToWide';
  if (requested === 'wide' && effective === 'phone') return 'settings.displayDowngradedWideToPhone';
  return null;
}

/**
 * Sets data-layout attribute on the document element.
 */
export function applyLayoutToDOM(effective: LayoutSize): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-layout', effective);
  }
}

/**
 * Current viewport width reader.
 */
export function getCurrentViewportWidth(): number {
  if (typeof window === 'undefined') return 390;
  return window.innerWidth || (typeof document !== 'undefined' ? document.documentElement.clientWidth : 390);
}

/**
 * LayoutService manages requested mode, effective layout, DOM attribute sync,
 * and reactive events.
 */
export class LayoutService {
  /**
   * Retrieves currently requested display mode from persistent settings.
   */
  static getRequestedMode(): DisplayMode {
    try {
      const mode = db.getState().settings.display_mode;
      if (mode && ['auto', 'phone', 'wide', 'tablet'].includes(mode)) {
        return mode;
      }
    } catch {}
    return 'auto';
  }

  /**
   * Retrieves effective layout based on stored setting and current viewport.
   */
  static getEffectiveLayout(): LayoutSize {
    const requested = this.getRequestedMode();
    const width = getCurrentViewportWidth();
    return computeEffectiveLayout(requested, width);
  }

  /**
   * Previews a display mode live without writing to persistent storage.
   */
  static previewDisplayMode(mode: DisplayMode): LayoutSize {
    const width = getCurrentViewportWidth();
    const effective = computeEffectiveLayout(mode, width);
    applyLayoutToDOM(effective);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LAYOUT_EVENT, { detail: { requested: mode, effective } }));
    }
    return effective;
  }

  /**
   * Sets and persists a new display mode, updating DOM and dispatching change event.
   */
  static setDisplayMode(mode: DisplayMode): LayoutSize {
    db.updateState(s => {
      s.settings.display_mode = mode;
    });
    return this.previewDisplayMode(mode);
  }
}

if (typeof window !== 'undefined') {
  (window as any).__gd_layoutService = LayoutService;
}
