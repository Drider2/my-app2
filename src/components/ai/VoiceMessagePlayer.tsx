// ========================================================
// VoiceMessagePlayer: Interactive Chat Voice Bubble Player
// Features:
// - Play / Pause with audio focus via AudioSessionManager
// - Interactive scrubbable waveform with progress fill
// - Speed multiplier toggle (1x / 1.5x / 2x)
// - Elapsed vs Total duration counter
// - Collapsible transcript accordion
// ========================================================

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronDown, ChevronUp, FileText, Sparkles } from 'lucide-react';
import { AudioSessionManager } from '../../services/voice/AudioSessionManager';
import { VoiceMessageService } from '../../services/voice/VoiceMessageService';
import { Haptics } from '../../services/haptics';

interface VoiceMessagePlayerProps {
  base64Audio?: string;
  mimeType?: string;
  durationSeconds: number;
  transcription?: string;
  isUser?: boolean;
}

// 24 pseudo-randomized natural waveform bar heights (percentage 15% to 100%)
const WAVEFORM_BARS = [
  30, 45, 75, 60, 90, 40, 80, 100, 70, 50, 85, 95, 
  65, 40, 75, 85, 60, 95, 80, 45, 65, 90, 55, 35
];

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  base64Audio,
  mimeType = 'audio/aac',
  durationSeconds,
  transcription,
  isUser = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and tear down Audio object
  useEffect(() => {
    if (!base64Audio) return;

    const dataUri = `data:${mimeType};base64,${base64Audio}`;
    const audio = new Audio(dataUri);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      AudioSessionManager.transitionTo('idle');
    };

    const handleError = (e: any) => {
      console.warn('Audio playback error:', e);
      setIsPlaying(false);
      AudioSessionManager.transitionTo('idle');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [base64Audio, mimeType]);

  // Update playback speed dynamically
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Toggle play/pause with mutual exclusion
  const handleTogglePlay = async () => {
    Haptics.tick();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      await AudioSessionManager.transitionTo('idle');
    } else {
      await AudioSessionManager.transitionTo('playing');
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio play failed:', err);
        setIsPlaying(false);
        await AudioSessionManager.transitionTo('idle');
      }
    }
  };

  // Seek on waveform bar click/tap
  const handleSeek = (index: number) => {
    Haptics.tick();
    if (!audioRef.current) return;
    const progress = (index + 1) / WAVEFORM_BARS.length;
    const targetTime = progress * durationSeconds;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // Cycle playback speed 1x -> 1.5x -> 2x
  const handleCycleSpeed = () => {
    Haptics.tick();
    setPlaybackRate(prev => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  const currentProgress = durationSeconds > 0 ? currentTime / durationSeconds : 0;
  const activeBarCount = Math.floor(currentProgress * WAVEFORM_BARS.length);

  return (
    <div className="w-full max-w-[280px] sm:max-w-[320px] select-none">
      {/* Player Core Bar */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className="w-11 h-11 rounded-full bg-[var(--color-accent)] text-black flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-transform"
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ms-0.5" />}
        </button>

        {/* Waveform Visualization & Timers */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {/* Interactive Scrubbable Waveform Bars */}
          <div className="flex items-center gap-[3px] h-7 cursor-pointer" role="slider" aria-label="Audio scrubber">
            {WAVEFORM_BARS.map((height, i) => {
              const isActive = i <= activeBarCount;
              return (
                <div
                  key={i}
                  onClick={() => handleSeek(i)}
                  className="flex-1 rounded-full transition-all duration-150 py-1"
                >
                  <div
                    className={`w-full rounded-full transition-colors ${
                      isActive
                        ? 'bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent)]'
                        : 'bg-white/20 hover:bg-white/40'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Timers & Speed Toggle */}
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)] font-mono">
            <span>
              {VoiceMessageService.formatDuration(currentTime, true)} / {VoiceMessageService.formatDuration(durationSeconds, true)}
            </span>

            <button
              type="button"
              onClick={handleCycleSpeed}
              className="px-1.5 py-0.5 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-[10px] font-bold text-[var(--color-accent)] active:scale-95 transition-all"
              title="Change playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Transcript Section */}
      {transcription && (
        <div className="mt-2.5 pt-2 border-t border-[var(--color-border)]/40">
          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              setIsTranscriptExpanded(prev => !prev);
            }}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-accent)] opacity-85 hover:opacity-100 transition-opacity"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Transcript</span>
            {isTranscriptExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {isTranscriptExpanded && (
            <div className="mt-1.5 p-2 rounded-xl bg-white/[0.04] border border-[var(--color-border)]/50 text-xs text-[var(--color-text-primary)] leading-relaxed italic animate-fade-in">
              "{transcription}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
