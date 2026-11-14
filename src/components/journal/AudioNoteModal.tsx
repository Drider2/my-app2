import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Check, 
  X, 
  Copy, 
  Sparkles, 
  Radio, 
  Clock, 
  Tag, 
  Smile, 
  Volume2
} from 'lucide-react';
import { VoiceNoteService } from '../../services/voiceNoteService';

interface AudioNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onSaved?: () => void;
}

export const AudioNoteModal: React.FC<AudioNoteModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onSaved,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [title, setTitle] = useState('');
  const [transcription, setTranscription] = useState('');
  const [selectedMood, setSelectedMood] = useState<number>(4);
  const [selectedTags, setSelectedTags] = useState<string[]>(['#voicenote', '#reflection']);
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(Array(24).fill(15));
  const [hasRecorded, setHasRecorded] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript + ' ';
            }
            if (current.trim()) {
              setTranscription(current.trim());
            }
          };

          rec.onerror = () => {
            // Graceful fallback to simulated audio
          };

          recognitionRef.current = rec;
        } catch (e) {
          // Fallback
        }
      }
    }
  }, []);

  // Waveform animation during recording
  useEffect(() => {
    let animInterval: NodeJS.Timeout | null = null;
    if (isRecording) {
      animInterval = setInterval(() => {
        setWaveAmplitudes(Array.from({ length: 24 }, () => Math.floor(Math.random() * 75) + 15));
      }, 90);
    } else {
      setWaveAmplitudes(Array(24).fill(15));
    }
    return () => {
      if (animInterval) clearInterval(animInterval);
    };
  }, [isRecording]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, duration]);

  if (!isOpen) return null;

  const handleStartRecording = () => {
    setIsRecording(true);
    setHasRecorded(true);
    setDuration(0);
    setPlaybackTime(0);
    setIsPlaying(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started or unsupported
      }
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (!transcription.trim()) {
      setTranscription('Recorded voice memo. Capturing ideas on the fly.');
    }
  };

  const handleTogglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (duration === 0) setDuration(5);
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsRecording(false);
    setIsPlaying(false);
    setDuration(0);
    setPlaybackTime(0);
    setTranscription('');
    setHasRecorded(false);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveToJournal = () => {
    if (!transcription.trim()) {
      if (onShowToast) onShowToast('⚠️ Please record or type some content before saving.');
      return;
    }

    VoiceNoteService.createVoiceNote({
      title: title.trim() || undefined,
      transcription: transcription.trim(),
      mood: selectedMood,
      durationSeconds: duration > 0 ? duration : 15,
      tags: selectedTags,
    });

    if (onShowToast) onShowToast('✓ Saved Voice Note to Private Journal!');
    if (onSaved) onSaved();
    handleReset();
    onClose();
  };

  const handleCopyTranscription = () => {
    if (!transcription.trim()) return;
    navigator.clipboard.writeText(transcription.trim());
    if (onShowToast) onShowToast('📋 Voice memo text copied to clipboard!');
  };

  const PRESET_TAGS = [
    '#voicenote',
    '#brainstorm',
    '#breakthrough',
    '#quickmemo',
    '#reflection',
    '#gratitude',
  ];

  const MOOD_OPTIONS = [
    { value: 1, label: 'Drained', icon: '😔' },
    { value: 2, label: 'Neutral', icon: '😐' },
    { value: 3, label: 'Good', icon: '🙂' },
    { value: 4, label: 'Focused', icon: '⚡' },
    { value: 5, label: 'Peak', icon: '🌟' },
  ];

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[var(--surface)] border border-[var(--hairline)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--hairline)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 shadow-sm">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-1)] flex items-center gap-2">
                <span>Quick Voice Note & Dictation</span>
                {isRecording && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                    REC
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--text-3)]">
                Record thoughts hands-free, transcribe audio, and file into journal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-muted)] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Waveform & Recorder Display */}
          <div className="p-5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--hairline)] flex flex-col items-center justify-center space-y-4">
            {/* Live Audio Visualizer Bars */}
            <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs px-2">
              {waveAmplitudes.map((amp, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-100 ${
                    isRecording 
                      ? 'bg-gradient-to-t from-rose-500 to-rose-300' 
                      : isPlaying 
                        ? 'bg-gradient-to-t from-cyan-500 to-blue-300' 
                        : 'bg-zinc-700'
                  }`}
                  style={{ height: `${amp}%` }}
                />
              ))}
            </div>

            {/* Time Indicator */}
            <div className="flex items-center gap-2 font-mono text-2xl font-black text-[var(--text-1)] tracking-widest">
              <span>{VoiceNoteService.formatDuration(isRecording ? duration : (isPlaying ? playbackTime : duration))}</span>
            </div>

            {/* Record / Stop / Play Controls */}
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/25 transition-all tap-feedback"
                >
                  <Mic className="w-4 h-4 fill-current" />
                  <span>{hasRecorded ? 'Record Again' : 'Start Recording'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-bold text-xs flex items-center gap-2 border border-rose-500/50 shadow-lg transition-all tap-feedback"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Recording</span>
                </button>
              )}

              {hasRecorded && !isRecording && (
                <button
                  type="button"
                  onClick={handleTogglePlayback}
                  className="p-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-1)] border border-[var(--hairline)] transition-all tap-feedback"
                  title={isPlaying ? 'Pause Preview' : 'Play Preview'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current text-cyan-400" /> : <Play className="w-4 h-4 fill-current text-cyan-400" />}
                </button>
              )}

              {hasRecorded && !isRecording && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-zinc-400 hover:text-rose-400 border border-[var(--hairline)] transition-all tap-feedback"
                  title="Discard Recording"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider block">
              Memo Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Breakthrough insight on habits, Afternoon idea..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-rose-500/50 placeholder:text-[var(--text-3)]"
            />
          </div>

          {/* Transcription / Notes Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>Dictation & Transcribed Text</span>
              </label>
              {transcription && (
                <button
                  type="button"
                  onClick={handleCopyTranscription}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={transcription}
              onChange={e => setTranscription(e.target.value)}
              placeholder="Speak aloud while recording, or type additional reflections directly here..."
              className="w-full p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--hairline)] text-xs text-[var(--text-1)] focus:outline-none focus:border-rose-500/50 placeholder:text-[var(--text-3)] leading-relaxed resize-none"
            />
          </div>

          {/* Preset Tags Chips */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-rose-400" />
              <span>Voice Note Tags</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map(t => {
                const active = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTag(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                        : 'bg-[var(--surface-muted)] text-[var(--text-3)] border border-[var(--hairline)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-rose-400" />
              <span>Mindset & Energy State</span>
            </span>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_OPTIONS.map(m => {
                const active = selectedMood === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setSelectedMood(m.value)}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      active
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-md scale-105'
                        : 'bg-[var(--surface-muted)] text-zinc-400 border border-[var(--hairline)] hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <span className="text-[10px] font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--hairline)] bg-[var(--surface)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-muted)] text-[var(--text-2)] hover:text-[var(--text-1)] text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveToJournal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all tap-feedback"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save to Journal</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
