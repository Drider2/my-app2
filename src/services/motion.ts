// ========================================================
// GreenDream Glass Motion System
// High-performance 60fps animations & micro-interactions
// Respects prefers-reduced-motion
// ========================================================
import { useState, useEffect, useRef } from 'react';

export const MOTION = {
  durations: {
    micro: 150,     // button taps, toggles, icon pops
    tab: 220,       // screen / tab transitions
    card: 500,      // card entry animation
    chart: 700,     // bars growth
    ring: 1100,     // ring progress stroke
    countUp: 900,   // rolling numbers
  },
  easings: {
    enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

/**
 * Returns true if the user's OS prefers reduced motion
 */
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Stagger delay generator for cards & list items (80ms per item)
 */
export function getStaggerDelay(index: number, baseMs: number = 80, maxItems: number = 8): number {
  if (isReducedMotion()) return 0;
  return Math.min(index, maxItems - 1) * baseMs;
}

/**
 * React hook for numeric rolling interpolation (60fps, 900ms cubic ease-out)
 * Respects prefers-reduced-motion
 */
export function useCountUpValue(
  targetValue: number,
  options: {
    duration?: number;
  } = {}
): number {
  const { duration = MOTION.durations.countUp } = options;

  const [currentValue, setCurrentValue] = useState<number>(() => {
    return isReducedMotion() ? targetValue : 0;
  });

  const prevTargetRef = useRef<number>(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isReducedMotion()) {
      setCurrentValue(targetValue);
      return;
    }

    const startVal = prevTargetRef.current;
    prevTargetRef.current = targetValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);

      // Smooth cubic ease-out: 1 - (1 - t)^3
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const val = startVal + (targetValue - startVal) * easedProgress;

      setCurrentValue(val);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(targetValue);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetValue, duration]);

  return currentValue;
}

/**
 * React hook for rolling numbers on key figures (Balance, Safe-to-Spend, Score)
 * Smoothly animates numerical values over 900ms on first render or value change
 */
export function useCountUp(
  targetValue: number,
  options: {
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    separator?: string;
  } = {}
): string {
  const {
    duration = MOTION.durations.countUp,
    decimals = 0,
    prefix = '',
    suffix = '',
    separator = ',',
  } = options;

  const currentValue = useCountUpValue(targetValue, { duration });

  const rounded = decimals > 0 ? currentValue.toFixed(decimals) : Math.round(currentValue).toString();

  // Add commas or custom separator
  const parts = rounded.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const formatted = parts.join('.');

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Triggers tactile vibration on mobile devices (via Web Vibration API)
 * Provides pleasant tactile feedback for checkmarks, taps, and achievements.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' = 'light'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'success':
        navigator.vibrate([15, 45, 25]);
        break;
    }
  } catch {}
}
