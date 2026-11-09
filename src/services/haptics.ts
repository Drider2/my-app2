// Mobile Haptic Feedback Utility (Standard Web Vibration API supported across Android WebViews & Browsers)

export const Haptics = {
  /** Subtle 8ms tick for tab changes, toggles, and chip taps */
  tick: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignore devices where vibration permission is restricted
      }
    }
  },

  /** Double pulse for positive completions (e.g. prayer check, task done, expense logged) */
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([10, 30, 15]);
      } catch {
        // Ignore
      }
    }
  },

  /** Alert pattern for warnings or deletions */
  warning: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([20, 40, 20]);
      } catch {
        // Ignore
      }
    }
  }
};
