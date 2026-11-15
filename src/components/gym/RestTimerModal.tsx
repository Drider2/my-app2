import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Timer, 
  Volume2, 
  VolumeX, 
  Plus, 
  Minus,
  Sparkles,
  Bell
} from 'lucide-react';
import { Haptics } from '../../services/haptics';

interface RestTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSeconds?: number;
}

export const RestTimerModal: React.FC<RestTimerModalProps> = ({
  isOpen,
  onClose,
  initialSeconds = 90,
}) => {
  if (!isOpen) return null;

  const [totalSeconds, setTotalSeconds] = useState<number>(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasFinished, setHasFinished] = useState<boolean>(false);

  const timerRef = useRef<any>(null);

  // Play synthesized audio chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      // High chime sequence: C6 -> E6 -> G6
      const freqs = [1046.50, 1318.51, 1567.98];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch (e) {
      // AudioContext policy on un-interacted tabs
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            setHasFinished(true);
            Haptics.success();
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, soundEnabled]);

  const handleStartPause = () => {
    Haptics.tick();
    if (hasFinished) {
      setRemainingSeconds(totalSeconds);
      setHasFinished(false);
    }
    setIsRunning(prev => !prev);
  };

  const handleReset = () => {
    Haptics.tick();
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    setHasFinished(false);
  };

  const handleSelectPreset = (secs: number) => {
    Haptics.tick();
    setIsRunning(false);
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    setHasFinished(false);
  };

  const handleNudge = (delta: number) => {
    Haptics.tick();
    setRemainingSeconds(prev => {
      const next = Math.max(5, prev + delta);
      if (!isRunning) {
        setTotalSeconds(next);
      }
      return next;
    });
  };

  // Format time MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Progress percentage (0 to 100)
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const strokeDashoffset = 440 - (440 * progressPercent) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80  animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm rounded-3xl bg-[var(--surface)] border border-[var(--hairline)] shadow-2xl overflow-hidden my-auto p-5 text-center space-y-4">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Timer className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[var(--text-1)]">Workout Rest Timer</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-subtle)] transition-colors"
              title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-subtle)] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Circular Countdown Progress Hero */}
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background Circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="var(--hairline)"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="var(--accent)"
              strokeWidth="8"
              strokeDasharray="440"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300 ease-linear"
            />
          </svg>

          {/* Time text centered */}
          <div className="absolute flex flex-col items-center justify-center space-y-1">
            <span className={`text-4xl font-extrabold tabular-nums tracking-tight ${
              hasFinished ? 'text-green-400 animate-pulse' : 'text-[var(--text-1)]'
            }`}>
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
              {hasFinished ? 'Set Ready! 🔥' : isRunning ? 'Resting...' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Nudge Buttons (-15s / +15s) */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleNudge(-15)}
            className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--hairline)] hover:border-cyan-500/40 text-xs font-semibold text-[var(--text-2)] hover:text-cyan-400 flex items-center gap-1 transition-colors tap-feedback"
            title="Subtract 15 seconds"
          >
            <Minus className="w-3 h-3" />
            <span>15s</span>
          </button>
          <button
            type="button"
            onClick={() => handleNudge(15)}
            className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--hairline)] hover:border-cyan-500/40 text-xs font-semibold text-[var(--text-2)] hover:text-cyan-400 flex items-center gap-1 transition-colors tap-feedback"
            title="Add 15 seconds"
          >
            <Plus className="w-3 h-3" />
            <span>15s</span>
          </button>
        </div>

        {/* Primary Controls (Play/Pause & Reset) */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleStartPause}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all tap-feedback shadow-sm ${
              isRunning 
                ? 'bg-amber-500 text-black hover:bg-amber-400' 
                : 'bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Rest</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{hasFinished ? 'Restart' : 'Start Rest'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--hairline)] hover:border-[var(--text-2)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors tap-feedback"
            title="Reset to initial duration"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Interval Presets Bar */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--hairline)]">
          <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider block">Standard Intervals</span>
          <div className="grid grid-cols-5 gap-1.5">
            {[30, 60, 90, 120, 180].map(s => {
              const isSelected = totalSeconds === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelectPreset(s)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all tap-feedback ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-3)] border border-[var(--hairline)] hover:text-[var(--text-1)]'
                  }`}
                >
                  {s >= 60 ? `${s / 60}m` : `${s}s`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
