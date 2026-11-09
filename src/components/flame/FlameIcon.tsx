// ========================================================
// GreenDream FlameIcon Component (v2.0)
// High-Fidelity 3-Layer SVG Sober Flame with Continuous Intensity
// ========================================================

import React, { useId, useMemo } from 'react';
import { calculateFlameIntensity } from '../../services/flame/flameService';

export interface FlameIconProps {
  /** Number of completed sober days (d) */
  days?: number;
  /** Direct continuous intensity override i in [0.15, 1.00] */
  intensity?: number;
  /** Dimensions in px or CSS size string (default: 28 for header logo) */
  size?: number | string;
  /** Whether idle flicker and spark micro-animations are enabled */
  animated?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** If true, triggers a gentle 0.6s particle smoke-fade to ember */
  isRelapseDrop?: boolean;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

export const FlameIcon: React.FC<FlameIconProps> = ({
  days = 0,
  intensity: explicitIntensity,
  size = 28,
  animated = true,
  className = '',
  isRelapseDrop = false,
  ariaLabel,
}) => {
  const rawId = useId();
  const idPrefix = useMemo(() => rawId.replace(/[^a-zA-Z0-9_-]/g, '_'), [rawId]);

  // Derive continuous intensity i in [0.15, 1.00]
  const i = useMemo(() => {
    if (explicitIntensity !== undefined) {
      return Math.min(1.0, Math.max(0.15, Number(explicitIntensity.toFixed(4))));
    }
    return calculateFlameIntensity(days);
  }, [explicitIntensity, days]);

  const isEmber = i <= 0.16;
  const showHalo = i >= 0.60;
  const numSparks = days >= 90 ? 4 : days >= 30 ? 2 : 0;

  // 1. Overall Flame Scale: 0.88 + 0.20 * i
  const overallScale = (0.88 + 0.20 * i).toFixed(4);

  // 2. Outer Fill Opacity: 0.45 + 0.55 * i
  const outerOpacity = (0.45 + 0.55 * i).toFixed(4);

  // 3. Dynamic Glow: drop-shadow(0 0 R rgb(var(--accent-rgb) / A))
  const glowR = (2 + 20 * i).toFixed(2);
  const glowA = (0.25 + 0.65 * i).toFixed(4);

  // 4. Soft Halo Circle: radius 38 + 18 * i, opacity 0.05 + 0.2 * i
  const haloR = (38 + 18 * i).toFixed(2);
  const haloOpacity = (0.05 + 0.20 * i).toFixed(4);

  // 5. Inner Core: scale 0.55 + 0.45 * i, white at opacity 0.15 + 0.80 * i
  const innerScale = (0.55 + 0.45 * i).toFixed(4);
  const innerOpacity = (0.15 + 0.80 * i).toFixed(4);

  // 6. Flicker: period 3.2s down to 1.8s; amplitude scaleY 1 -> 1 + 0.02 + 0.03 * i
  const flickerPeriod = (3.2 - 1.647 * (i - 0.15)).toFixed(2);
  const flickerAmplitudeY = (1 + 0.02 + 0.03 * i).toFixed(4);

  // Computed size style
  const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : { width: size, height: size };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={sizeStyle}
      role="img"
      aria-label={ariaLabel || `Flame intensity ${(i * 100).toFixed(0)} percent, day ${days}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        style={{
          filter: `drop-shadow(0 0 ${glowR}px rgb(var(--accent-rgb) / ${glowA}))`,
          transition: isRelapseDrop
            ? 'filter 0.6s ease-in-out, transform 0.6s ease-in-out'
            : 'filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <defs>
          {/* Linear Brand Gradient */}
          <linearGradient id={`${idPrefix}-flameGrad`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="60%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-light)" />
          </linearGradient>

          {/* Ember Gradient: desaturated accent */}
          <linearGradient id={`${idPrefix}-emberGrad`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-light)" stopOpacity="0.55" />
          </linearGradient>

          {/* Mid Flame Core Gradient */}
          <linearGradient id={`${idPrefix}-midGrad`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.80" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.90" />
          </linearGradient>

          {/* Soft Halo Blur Filter */}
          <filter id={`${idPrefix}-haloBlur`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
          </filter>

          {/* Keyframe Styles */}
          <style>{`
            @keyframes ${idPrefix}-flicker {
              0%, 100% {
                transform: scale(${overallScale}) scaleY(1);
                opacity: ${outerOpacity};
              }
              50% {
                transform: scale(${overallScale}) scaleY(${flickerAmplitudeY});
                opacity: ${Math.min(1.0, Number(outerOpacity) + 0.05).toFixed(4)};
              }
            }

            @keyframes ${idPrefix}-emberPulse {
              0%, 100% {
                transform: scale(${overallScale});
                opacity: 0.50;
              }
              50% {
                transform: scale(${(Number(overallScale) * 1.03).toFixed(4)});
                opacity: 0.70;
              }
            }

            @keyframes ${idPrefix}-spark1 {
              0% {
                transform: translate(0px, 0px) scale(0.6);
                opacity: 0;
              }
              25% {
                opacity: 0.85;
              }
              75% {
                opacity: 0.65;
              }
              100% {
                transform: translate(-10px, -36px) scale(0.2);
                opacity: 0;
              }
            }

            @keyframes ${idPrefix}-spark2 {
              0% {
                transform: translate(0px, 0px) scale(0.5);
                opacity: 0;
              }
              30% {
                opacity: 0.9;
              }
              80% {
                opacity: 0.5;
              }
              100% {
                transform: translate(12px, -42px) scale(0.15);
                opacity: 0;
              }
            }

            @keyframes ${idPrefix}-smokeFade {
              0% {
                opacity: 1;
                filter: blur(0px);
              }
              50% {
                opacity: 0.4;
                filter: blur(4px);
              }
              100% {
                opacity: ${outerOpacity};
                filter: blur(0px);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .${idPrefix}-animated-flame {
                animation: none !important;
              }
              .${idPrefix}-spark {
                display: none !important;
              }
            }
          `}</style>
        </defs>

        {/* Layer 0: Extra Soft Halo Circle (Behind flame, only when i >= 0.6) */}
        {showHalo && (
          <circle
            cx="50"
            cy="56"
            r={haloR}
            fill="rgb(var(--accent-rgb))"
            fillOpacity={haloOpacity}
            filter={`url(#${idPrefix}-haloBlur)`}
            className="transition-all duration-1000 ease-out pointer-events-none"
          />
        )}

        {/* Main Animated Flame Container */}
        <g
          className={`${idPrefix}-animated-flame`}
          style={{
            transformOrigin: '50px 88px',
            animation: animated
              ? isRelapseDrop
                ? `${idPrefix}-smokeFade 0.6s ease-in-out`
                : isEmber
                ? `${idPrefix}-emberPulse 3.2s infinite ease-in-out`
                : `${idPrefix}-flicker ${flickerPeriod}s infinite ease-in-out`
              : 'none',
            transform: `scale(${overallScale})`,
            transition: isRelapseDrop
              ? 'transform 0.6s ease-in-out'
              : 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Layer 1: Outer Flame */}
          <path
            d="M 50 88 C 34 88 22 76 22 60 C 22 45 31 34 39 25 C 43 20 46 14 47 8 C 50 16 57 23 62 30 C 67 36 71 42 71 48 C 72 44 72 39 71 34 C 77 42 81 51 81 60 C 81 76 66 88 50 88 Z"
            fill={isEmber ? `url(#${idPrefix}-emberGrad)` : `url(#${idPrefix}-flameGrad)`}
            fillOpacity={outerOpacity}
            stroke={isEmber ? 'rgb(var(--accent-rgb) / 0.65)' : 'none'}
            strokeWidth={isEmber ? '1.5' : '0'}
            strokeLinejoin="round"
            className="transition-all duration-1000 ease-out"
          />

          {/* Layer 2: Mid Flame Blend (Only visible when rekindled i > 0.18) */}
          {i > 0.18 && (
            <path
              d="M 50 84 C 37 84 28 74 28 62 C 28 50 35 41 42 33 C 45 29 47 24 48 18 C 51 25 57 31 61 37 C 67 46 70 54 70 62 C 70 74 61 84 50 84 Z"
              fill={`url(#${idPrefix}-midGrad)`}
              fillOpacity={(0.30 + 0.60 * i).toFixed(4)}
              style={{
                transformOrigin: '50px 84px',
                transform: `scale(${(0.75 + 0.25 * i).toFixed(4)})`,
              }}
              className="transition-all duration-1000 ease-out"
            />
          )}

          {/* Layer 3: Inner Core (White incandescent heart) */}
          <path
            d="M 50 80 C 42 80 36 73 36 64 C 36 56 41 49 46 43 C 48 40 49 36 50 32 C 52 37 56 42 59 47 C 63 53 64 59 64 64 C 64 73 58 80 50 80 Z"
            fill="#FFFFFF"
            fillOpacity={innerOpacity}
            style={{
              transformOrigin: '50px 80px',
              transform: `scale(${innerScale})`,
            }}
            className="transition-all duration-1000 ease-out"
          />
        </g>

        {/* Floating Sparks (d >= 30: 2 sparks; d >= 90: 4 sparks) */}
        {animated && numSparks >= 2 && (
          <g className={`${idPrefix}-spark pointer-events-none`}>
            {/* Spark 1 */}
            <circle
              cx="45"
              cy="34"
              r="2.2"
              fill="var(--accent-light)"
              style={{
                animation: `${idPrefix}-spark1 3.4s infinite ease-out`,
                transformOrigin: '45px 34px',
              }}
            />
            {/* Spark 2 */}
            <circle
              cx="56"
              cy="40"
              r="2.0"
              fill="#FFFFFF"
              style={{
                animation: `${idPrefix}-spark2 3.8s infinite ease-out 1.2s`,
                transformOrigin: '56px 40px',
              }}
            />
            {/* Spark 3 & 4 at d >= 90 */}
            {numSparks >= 4 && (
              <>
                <circle
                  cx="42"
                  cy="46"
                  r="1.8"
                  fill="var(--accent)"
                  style={{
                    animation: `${idPrefix}-spark1 4.2s infinite ease-out 0.6s`,
                    transformOrigin: '42px 46px',
                  }}
                />
                <circle
                  cx="58"
                  cy="28"
                  r="1.6"
                  fill="#FFFFFF"
                  style={{
                    animation: `${idPrefix}-spark2 3.6s infinite ease-out 2.0s`,
                    transformOrigin: '58px 28px',
                  }}
                />
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  );
};

export default FlameIcon;
