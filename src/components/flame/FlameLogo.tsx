// ========================================================
// GreenDream FlameLogo Component (v2.0)
// Header Brand Slot: Flame Icon + Tabular Day Counter
// ========================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { db, getTodayLocalDate } from '../../services/storage';
import { useTranslation } from '../../services/i18n';
import { calculateStreakStats, formatFlameDays } from '../../services/flame/flameService';
import { FlameIcon } from './FlameIcon';

export interface FlameLogoProps {
  /** Optional custom click handler; if omitted, broadcasts 'open_flame_screen' */
  onOpenFlame?: () => void;
  className?: string;
}

export const FlameLogo: React.FC<FlameLogoProps> = ({
  onOpenFlame,
  className = '',
}) => {
  const { t, language, isRtl } = useTranslation();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const longPressTimerRef = useRef<any>(null);
  const tooltipTimeoutRef = useRef<any>(null);

  const state = db.getState();
  const flame = state.settings.flame;
  const modules = state.settings.modules || {};
  const isFlameModuleEnabled = modules.flame !== false && flame?.enabled !== false;

  const today = getTodayLocalDate();
  const stats = useMemo(() => {
    if (!flame) return { currentStreak: 0, intensity: 0.15 };
    return calculateStreakStats(flame, today);
  }, [flame, today]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    };
  }, []);

  // When flame module is OFF in settings, render plain text "GreenDream" (no image, no flame)
  if (!isFlameModuleEnabled) {
    return (
      <div 
        className={`min-h-[44px] min-w-[44px] flex items-center select-none ${className}`}
      >
        <span className="text-[17px] font-semibold text-[var(--color-text-primary)] tracking-tight">
          GreenDream
        </span>
      </div>
    );
  }

  const handleTap = () => {
    if (tooltipVisible) {
      setTooltipVisible(false);
      return;
    }
    if (onOpenFlame) {
      onOpenFlame();
    } else {
      window.dispatchEvent(new CustomEvent('open_flame_screen'));
    }
  };

  const startLongPress = () => {
    longPressTimerRef.current = setTimeout(() => {
      setTooltipVisible(true);
      // Auto-hide tooltip after 2.8s
      tooltipTimeoutRef.current = setTimeout(() => {
        setTooltipVisible(false);
      }, 2800);
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const showNumber = flame?.showNumber !== false;
  const daysText = formatFlameDays(stats.currentStreak, language as 'en' | 'fr' | 'ar');
  const accessibleLabel = t(
    'flame.ariaLabel',
    `Day ${stats.currentStreak}, sober flame`
  );

  const tooltipText = language === 'ar'
    ? `${daysText}. اليوم يُحسب عند منتصف الليل.`
    : language === 'fr'
    ? `${daysText}. Aujourd'hui comptera à minuit.`
    : `${daysText}. Today counts at midnight.`;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleTap}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 focus:outline-none tap-feedback cursor-pointer"
        aria-label={accessibleLabel}
        title={tooltipText}
      >
        {/* Live Flame SVG (28px) */}
        <FlameIcon
          intensity={stats.intensity}
          days={stats.currentStreak}
          size={28}
          animated={true}
        />

        {/* Tabular Day Count Number (14px font, weight 500) */}
        {showNumber && (
          <span 
            className="text-[14px] font-medium text-[var(--color-text-primary)] tabular-nums leading-none tracking-tight select-none"
          >
            {stats.currentStreak}
          </span>
        )}
      </button>

      {/* Long-Press Quick View Tooltip */}
      {tooltipVisible && (
        <div
          className={`absolute top-full mt-1.5 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-[rgba(10,14,20,0.95)] border border-[rgba(255,255,255,0.18)] text-[var(--color-text-primary)] shadow-2xl  text-[12px] font-medium animate-in fade-in zoom-in-95 ${
            isRtl ? 'right-0' : 'left-0'
          }`}
          role="tooltip"
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
};

export default FlameLogo;
