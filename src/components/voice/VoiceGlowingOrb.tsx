// ========================================================
// VoiceGlowingOrb: Animated Ambient AI Orb
// Prominent central focal point for hands-free voice mode.
// Features 4 dynamic states: listening, thinking, speaking, paused.
// Supports Tap-To-Interrupt (Barge-in) and accessible labels.
// ========================================================

import React from 'react';
import { Mic, Sparkles, Volume2, Pause, Play } from 'lucide-react';
import { useTranslation } from '../../services/i18n';

export type OrbState = 'listening' | 'thinking' | 'speaking' | 'paused';

interface VoiceGlowingOrbProps {
  state: OrbState;
  onTap: () => void;
  audioLevel?: number; // 0 to 1 normalized
}

export const VoiceGlowingOrb: React.FC<VoiceGlowingOrbProps> = ({
  state,
  onTap,
  audioLevel = 0.5,
}) => {
  const { t } = useTranslation();

  // Accessible state labels
  const getStatusLabel = () => {
    switch (state) {
      case 'listening':
        return t('voice.listening', 'Listening... Speak now');
      case 'thinking':
        return t('voice.thinking', 'Hermes is thinking...');
      case 'speaking':
        return t('voice.speaking', 'Hermes is speaking... Tap orb to interrupt');
      case 'paused':
        return t('voice.paused', 'Paused • Tap orb to resume');
    }
  };

  const getAriaLabel = () => {
    switch (state) {
      case 'listening':
        return 'Microphone active, listening. Tap to pause.';
      case 'thinking':
        return 'Generating answer. Tap to cancel.';
      case 'speaking':
        return 'Speaking answer. Tap orb to interrupt and speak.';
      case 'paused':
        return 'Session paused. Tap to resume listening.';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Interactive Orb Center */}
      <div 
        className="relative flex items-center justify-center w-52 h-52 sm:w-60 sm:h-60 cursor-pointer tap-feedback select-none"
        onClick={onTap}
        role="button"
        tabIndex={0}
        aria-label={getAriaLabel()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTap();
          }
        }}
      >
        {/* Layer 1: Ambient Outer Glow */}
        <div 
          className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
            state === 'listening'
              ? 'bg-[var(--color-accent)]/35 scale-125 animate-pulse'
              : state === 'thinking'
              ? 'bg-gradient-to-tr from-cyan-500/30 via-indigo-500/30 to-purple-500/30 scale-110 animate-spin-slow'
              : state === 'speaking'
              ? 'bg-[var(--color-accent)]/45 scale-130'
              : 'bg-zinc-600/10 scale-95 opacity-40'
          }`}
        />

        {/* Layer 2: Animated Outer Concentric Wave Rings (Listening/Speaking) */}
        {(state === 'listening' || state === 'speaking') && (
          <>
            <div 
              className="absolute inset-[-14px] rounded-full border border-[var(--color-accent)]/30 animate-ping pointer-events-none"
              style={{ animationDuration: state === 'listening' ? '2.5s' : '1.8s' }}
            />
            <div 
              className="absolute inset-[-28px] rounded-full border border-[var(--color-accent)]/15 animate-ping pointer-events-none"
              style={{ animationDuration: state === 'listening' ? '3.5s' : '2.4s', animationDelay: '0.6s' }}
            />
          </>
        )}

        {/* Layer 3: Rotating Nebula Ring (Thinking) */}
        {state === 'thinking' && (
          <div 
            className="absolute inset-[-8px] rounded-full border-2 border-transparent border-t-[var(--color-accent)] border-r-purple-400 animate-spin pointer-events-none"
            style={{ animationDuration: '2s' }}
          />
        )}

        {/* Layer 4: Glass Core Sphere */}
        <div 
          className={`relative z-10 w-44 h-44 sm:w-48 sm:h-48 rounded-full border shadow-2xl  flex flex-col items-center justify-center transition-all duration-500 overflow-hidden ${
            state === 'listening'
              ? 'border-[var(--color-accent)]/60 bg-[var(--color-accent)]/15 shadow-[0_0_50px_rgba(var(--accent-rgb),0.35)] scale-105'
              : state === 'thinking'
              ? 'border-indigo-400/50 bg-indigo-500/10 shadow-[0_0_40px_rgba(99,102,241,0.25)]'
              : state === 'speaking'
              ? 'border-[var(--color-accent)]/80 bg-[var(--color-accent)]/20 shadow-[0_0_60px_rgba(var(--accent-rgb),0.45)] scale-110'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]/60 opacity-60 scale-95'
          }`}
        >
          {/* Inner Fluid Gradients */}
          <div 
            className={`absolute inset-0 opacity-40 transition-opacity duration-500 ${
              state === 'listening'
                ? 'bg-radial-gradient from-[var(--color-accent)]/40 to-transparent animate-pulse'
                : state === 'thinking'
                ? 'bg-gradient-to-tr from-cyan-400/30 via-indigo-500/20 to-purple-600/30 animate-spin-slow'
                : state === 'speaking'
                ? 'bg-radial-gradient from-[var(--color-accent)]/60 via-purple-500/20 to-transparent'
                : 'bg-zinc-700/10'
            }`}
          />

          {/* Central State Icon */}
          <div className="relative z-20 flex flex-col items-center justify-center space-y-1.5">
            {state === 'listening' && (
              <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center animate-bounce">
                <Mic className="w-6 h-6 stroke-[2.5]" />
              </div>
            )}

            {state === 'thinking' && (
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                <Sparkles className="w-6 h-6 animate-spin-slow" />
              </div>
            )}

            {state === 'speaking' && (
              <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/25 text-[var(--color-accent)] flex items-center justify-center animate-pulse">
                <Volume2 className="w-6 h-6 stroke-[2.5]" />
              </div>
            )}

            {state === 'paused' && (
              <div className="w-12 h-12 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] flex items-center justify-center">
                <Play className="w-6 h-6 translate-x-0.5" />
              </div>
            )}

            {/* Micro Interaction Hint */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]/80">
              {state === 'speaking' ? t('voice.tapToInterrupt', 'Interrupt') : 
               state === 'listening' ? t('voice.tapToPause', 'Pause') : 
               state === 'paused' ? t('voice.tapToResume', 'Resume') : 'Hermes'}
            </span>
          </div>

          {/* Equalizer Waveform Bars when Speaking */}
          {state === 'speaking' && (
            <div className="absolute bottom-5 flex items-center gap-1.5 z-20" aria-hidden="true">
              {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-[var(--color-accent)] rounded-full animate-pulse"
                  style={{
                    height: `${h * 16}px`,
                    animationDelay: `${i * 0.12}s`,
                    animationDuration: '0.8s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accessible Status Pill */}
      <div 
        className="px-4 py-1.5 rounded-full bg-[var(--color-surface)]/90 border border-[var(--color-border)] shadow-sm  flex items-center gap-2"
        role="status"
        aria-live="polite"
      >
        <span 
          className={`w-2 h-2 rounded-full ${
            state === 'listening' ? 'bg-emerald-400 animate-pulse' :
            state === 'thinking' ? 'bg-indigo-400 animate-spin' :
            state === 'speaking' ? 'bg-[var(--color-accent)] animate-pulse' :
            'bg-zinc-400'
          }`}
        />
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          {getStatusLabel()}
        </span>
      </div>
    </div>
  );
};
