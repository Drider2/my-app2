// ========================================================
// VoiceConversationModal: Full-Screen Hands-Free Hermes AI
// Features:
// - Ambient animated glass orb with 4 dynamic states
// - Live partial captions & spoken sentence streaming
// - Tap-To-Interrupt (Barge-in) support
// - Tri-lingual spoken tool confirmation (EN, FR, AR)
// - Inactivity timers (8s pause prompt, 2m auto-close)
// - Hardware back button interception & slide-up transcript
// ========================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  PhoneOff, 
  MessageSquare, 
  FileText, 
  Sparkles, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  CheckCircle2,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { db, generateUUID } from '../../services/storage';
import { HermesStorage } from '../../services/hermesStorage';
import { HermesGeminiService } from '../../services/hermesGeminiService';
import { HermesBrain } from '../../services/hermesBrain';
import { SpeechInput } from '../../services/voice/SpeechInput';
import { SpeechOutput } from '../../services/voice/SpeechOutput';
import { AudioSessionManager } from '../../services/voice/AudioSessionManager';
import { VoiceGlowingOrb, OrbState } from './VoiceGlowingOrb';
import { 
  detectConfirmationIntent, 
  generateSpokenSummaryForTool 
} from '../../services/voice/voiceIntentService';
import { HermesMessage, HermesChatSession, HermesActionCard } from '../../types';
import { useTranslation, AppLanguage } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
  onNavigateToSettings?: () => void;
}

export const VoiceConversationModal: React.FC<VoiceConversationModalProps> = ({
  isOpen,
  onClose,
  onOpenChat,
  onNavigateToSettings,
}) => {
  const { t, language, setLanguage, isRtl } = useTranslation();
  const state = db.getState();
  const currency = state.settings.currency_label || 'DA';

  // Modal & Engine State
  const [orbState, setOrbState] = useState<OrbState>('paused');
  const [liveCaption, setLiveCaption] = useState<string>('');
  const [activeSentence, setActiveSentence] = useState<string>('');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pending Action Card for Write Confirmation
  const [pendingAction, setPendingAction] = useState<{
    card: HermesActionCard;
    spokenPrompt: string;
  } | null>(null);

  // Undo Toast State
  const [undoToast, setUndoToast] = useState<{
    message: string;
    undo: () => void;
    secondsLeft: number;
  } | null>(null);

  // Session & Transcript Messages
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inactivityTimerRef = useRef<any>(null);
  const totalInactivityTimerRef = useRef<any>(null);
  const isComponentMountedRef = useRef(true);

  // Read voice settings
  const voiceSettings = state.settings.voice || {};
  const currentModel = HermesStorage.getSettings().model || 'gemini-2.5-flash';

  // ----------------------------------------------------
  // Inactivity Timers
  // ----------------------------------------------------
  const clearInactivityTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (totalInactivityTimerRef.current) {
      clearTimeout(totalInactivityTimerRef.current);
      totalInactivityTimerRef.current = null;
    }
  }, []);

  const resetInactivityTimers = useCallback(() => {
    clearInactivityTimers();

    // 8 seconds of silence in listening state -> pause prompt
    inactivityTimerRef.current = setTimeout(async () => {
      if (orbState === 'listening' && !pendingAction) {
        await SpeechInput.stopListening();
        setOrbState('paused');
        const promptMsg = t('voice.inactivityPrompt', "Still there? Tap the mic when you're ready.");
        setLiveCaption(promptMsg);
        await SpeechOutput.speak(promptMsg, {
          lang: SpeechInput.resolveLanguageTag(language),
          rate: voiceSettings.speechRate || 1.0,
        });
      }
    }, 8000);

    // 2 minutes total inactivity -> auto close
    totalInactivityTimerRef.current = setTimeout(() => {
      handleClose();
    }, 120000);
  }, [clearInactivityTimers, orbState, pendingAction, language, voiceSettings.speechRate, t]);

  // ----------------------------------------------------
  // Speech Output Sentence Callbacks
  // ----------------------------------------------------
  useEffect(() => {
    SpeechOutput.onSentenceStart = (sentence: string) => {
      if (isComponentMountedRef.current) {
        setActiveSentence(sentence);
        setLiveCaption(sentence);
      }
    };

    SpeechOutput.onQueueComplete = () => {
      if (isComponentMountedRef.current && orbState === 'speaking') {
        setActiveSentence('');
        // Smooth pause before transitioning back to listening
        setTimeout(() => {
          if (isComponentMountedRef.current && orbState === 'speaking') {
            startListeningTurn();
          }
        }, 350);
      }
    };

    return () => {
      SpeechOutput.onSentenceStart = undefined;
      SpeechOutput.onQueueComplete = undefined;
    };
  }, [orbState]);

  // ----------------------------------------------------
  // 10s Undo Countdown Timer
  // ----------------------------------------------------
  useEffect(() => {
    if (!undoToast) return;
    const interval = setInterval(() => {
      setUndoToast(prev => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          clearInterval(interval);
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [undoToast]);

  // ----------------------------------------------------
  // Native Android Hardware Back Button Handling
  // ----------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    let backListener: any = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => {
        if (isTranscriptOpen) {
          setIsTranscriptOpen(false);
        } else {
          handleClose();
        }
      }).then(handle => {
        backListener = handle;
      });
    }

    return () => {
      if (backListener) backListener.remove();
    };
  }, [isOpen, isTranscriptOpen]);

  // ----------------------------------------------------
  // Turn Execution: Listen -> Transcribe
  // ----------------------------------------------------
  const startListeningTurn = useCallback(async () => {
    if (!isOpen) return;

    // Check API Key
    const apiKey = HermesStorage.getApiKey();
    if (!apiKey) {
      setErrorMessage(t('settings.hermesApiKeyPlaceholder', 'Please configure your Gemini API key in Settings.'));
      setOrbState('paused');
      return;
    }

    setErrorMessage(null);
    setOrbState('listening');
    setLiveCaption(t('voice.listening', 'Listening... Speak now'));
    resetInactivityTimers();

    const targetLang = voiceSettings.language === 'auto' || !voiceSettings.language
      ? language
      : voiceSettings.language;

    await SpeechInput.startListening(
      {
        onStart: () => {
          setOrbState('listening');
          resetInactivityTimers();
        },
        onPartial: (partial) => {
          setLiveCaption(partial);
          resetInactivityTimers();
        },
        onResult: (finalText) => {
          handleUserSpeechResult(finalText);
        },
        onError: (err, code) => {
          if (code === 'PERMISSION_DENIED' || code === 'PERMISSION_PERMANENTLY_DENIED') {
            setErrorMessage(t('voice.micPermissionDenied', 'Microphone permission denied.'));
          } else {
            setErrorMessage(err);
          }
          setOrbState('paused');
          clearInactivityTimers();
        },
        onEnd: () => {
          // Handled in onResult or transitions
        },
      },
      {
        language: targetLang,
        silenceSeconds: voiceSettings.handsFreeSilenceSeconds || 1.3,
      }
    );
  }, [isOpen, language, voiceSettings.language, voiceSettings.handsFreeSilenceSeconds, resetInactivityTimers, clearInactivityTimers, t]);

  // ----------------------------------------------------
  // Process User Speech: Check for Yes/No or Process Turn
  // ----------------------------------------------------
  const handleUserSpeechResult = async (transcript: string) => {
    const text = transcript.trim();
    if (!text) {
      startListeningTurn();
      return;
    }

    clearInactivityTimers();
    Haptics.tick();

    // 1. If an Action Proposal is pending -> check spoken YES/NO intent
    if (pendingAction) {
      const intent = detectConfirmationIntent(text);
      if (intent === 'yes') {
        await handleConfirmAction();
        return;
      } else if (intent === 'no') {
        await handleCancelAction();
        return;
      } else {
        // Did not understand spoken intent -> ask again
        const reAsk = t('voice.sayYesOrNo', 'Please say "Yes" to confirm or "No" to cancel.');
        setLiveCaption(reAsk);
        await SpeechOutput.speak(reAsk, {
          lang: SpeechInput.resolveLanguageTag(language),
          rate: voiceSettings.speechRate || 1.0,
          onComplete: () => {
            startListeningTurn();
          },
        });
        return;
      }
    }

    // 2. Regular Turn: Append user message to transcript
    const userMsg: HermesMessage = {
      id: generateUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Transition to thinking
    setOrbState('thinking');
    setLiveCaption(t('voice.thinking', 'Hermes is thinking...'));

    await executeHermesResponse(text, [...messages, userMsg]);
  };

  // ----------------------------------------------------
  // Execute Hermes LLM Generation with Tool Check
  // ----------------------------------------------------
  const executeHermesResponse = async (userPrompt: string, history: HermesMessage[]) => {
    const apiKey = HermesStorage.getApiKey();
    if (!apiKey) return;

    abortControllerRef.current = new AbortController();
    const systemInstruction = HermesBrain.buildSystemPrompt();
    const hermesSettings = HermesStorage.getSettings();
    const tools = HermesBrain.getToolDeclarations(hermesSettings.hermesMode, hermesSettings.shareContext);

    // Prepare contents
    const contents = history.slice(-6).map(m => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));

    try {
      // Step A: Tool Preflight
      if (tools && tools.length > 0 && tools[0].functionDeclarations?.length > 0) {
        try {
          const preflight = await HermesGeminiService.generateContent({
            apiKey,
            model: currentModel,
            systemInstruction,
            contents,
            tools,
            abortSignal: abortControllerRef.current.signal,
          });

          if (preflight.functionCalls && preflight.functionCalls.length > 0) {
            const firstCall = preflight.functionCalls[0];
            const isWriteTool = [
              'add_expense', 
              'add_income', 
              'mark_prayer', 
              'log_weight', 
              'add_task', 
              'add_reminder', 
              'create_goal', 
              'save_memory_note'
            ].includes(firstCall.name);

            if (isWriteTool) {
              // WRITE TOOL: Create Action Card requiring user confirmation
              const actionCard: HermesActionCard = {
                id: generateUUID(),
                toolName: firstCall.name,
                params: firstCall.args || {},
                status: 'pending',
              };

              const spokenSummary = generateSpokenSummaryForTool(
                firstCall.name,
                firstCall.args || {},
                language as 'en' | 'fr' | 'ar',
                currency
              );

              setPendingAction({
                card: actionCard,
                spokenPrompt: spokenSummary,
              });

              // Add to transcript
              const assistantMsg: HermesMessage = {
                id: generateUUID(),
                role: 'assistant',
                content: spokenSummary,
                timestamp: Date.now(),
                actionCard,
              };
              setMessages(prev => [...prev, assistantMsg]);

              // Speak the confirmation question
              setOrbState('speaking');
              setLiveCaption(spokenSummary);
              await SpeechOutput.speak(spokenSummary, {
                lang: SpeechInput.resolveLanguageTag(language),
                rate: voiceSettings.speechRate || 1.0,
                onComplete: () => {
                  startListeningTurn();
                },
              });
              return;
            } else {
              // READ TOOL: Execute and feed back to contents
              const readResult = await HermesBrain.executeReadTool(firstCall.name, firstCall.args);
              contents.push({
                role: 'model',
                parts: [{ functionCall: firstCall }],
              } as any);
              contents.push({
                role: 'user',
                parts: [{ functionResponse: { name: firstCall.name, response: readResult } }],
              } as any);
            }
          }
        } catch (toolErr) {
          console.warn('Hermes voice tool preflight error:', toolErr);
        }
      }

      // Step B: Stream Final Response & Queue Audio Chunks
      setOrbState('speaking');
      let fullAssistantText = '';

      await HermesGeminiService.streamGenerateContent({
        apiKey,
        model: currentModel,
        systemInstruction,
        contents,
        tools,
        abortSignal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          fullAssistantText += chunk;
          SpeechOutput.queueChunk(chunk, SpeechInput.resolveLanguageTag(language));
        },
        onComplete: async (completedText) => {
          const finalReply = completedText || fullAssistantText;
          const assistantMsg: HermesMessage = {
            id: generateUUID(),
            role: 'assistant',
            content: finalReply,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMsg]);
          await SpeechOutput.flushStream(SpeechInput.resolveLanguageTag(language));
        },
        onError: (err) => {
          setErrorMessage(err);
          setOrbState('paused');
        },
      });
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setErrorMessage(e?.message || 'Error communicating with Hermes');
      }
      setOrbState('paused');
    }
  };

  // ----------------------------------------------------
  // Spoken or Tap Confirmation Execution
  // ----------------------------------------------------
  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const { card } = pendingAction;
    setPendingAction(null);
    Haptics.success();

    const result = HermesBrain.executeConfirmedWriteTool(card.toolName, card.params);
    if (result.success) {
      // 10s Undo Toast
      setUndoToast({
        message: result.message,
        undo: result.undo,
        secondsLeft: 10,
      });

      const confirmedMsg = t('voice.actionConfirmed', 'Action confirmed and executed.');
      setLiveCaption(confirmedMsg);
      setOrbState('speaking');
      await SpeechOutput.speak(confirmedMsg, {
        lang: SpeechInput.resolveLanguageTag(language),
        rate: voiceSettings.speechRate || 1.0,
        onComplete: () => {
          startListeningTurn();
        },
      });
    }
  };

  const handleCancelAction = async () => {
    if (!pendingAction) return;
    setPendingAction(null);
    Haptics.tick();

    const cancelMsg = t('voice.actionCancelled', 'Action cancelled.');
    setLiveCaption(cancelMsg);
    setOrbState('speaking');
    await SpeechOutput.speak(cancelMsg, {
      lang: SpeechInput.resolveLanguageTag(language),
      rate: voiceSettings.speechRate || 1.0,
      onComplete: () => {
        startListeningTurn();
      },
    });
  };

  // ----------------------------------------------------
  // Tap-To-Interrupt (Barge-In) & Orb Tap Handler
  // ----------------------------------------------------
  const handleOrbTap = async () => {
    Haptics.tick();

    if (orbState === 'speaking') {
      // BARGE-IN: Immediately halt speech, cancel stream, and start listening!
      await SpeechOutput.stop();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      startListeningTurn();
    } else if (orbState === 'listening') {
      // Pause listening
      await SpeechInput.stopListening();
      clearInactivityTimers();
      setOrbState('paused');
      setLiveCaption(t('voice.paused', 'Paused • Tap orb to resume'));
    } else if (orbState === 'paused') {
      // Resume listening
      startListeningTurn();
    } else if (orbState === 'thinking') {
      // Cancel generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInactivityTimers();
      setOrbState('paused');
      setLiveCaption(t('voice.paused', 'Paused • Tap orb to resume'));
    }
  };

  // ----------------------------------------------------
  // Lifecycle: Open & Cleanup
  // ----------------------------------------------------
  useEffect(() => {
    isComponentMountedRef.current = true;

    if (isOpen) {
      // Start listening when modal opens
      startListeningTurn();
    } else {
      // Cleanup on modal close
      clearInactivityTimers();
      SpeechInput.stopListening();
      SpeechOutput.stop();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      AudioSessionManager.transitionTo('idle');
      setOrbState('paused');
      setLiveCaption('');
      setActiveSentence('');
      setPendingAction(null);
    }

    return () => {
      isComponentMountedRef.current = false;
      clearInactivityTimers();
      SpeechInput.stopListening();
      SpeechOutput.stop();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      AudioSessionManager.transitionTo('idle');
    };
  }, [isOpen]);

  const handleClose = async () => {
    Haptics.tick();
    clearInactivityTimers();
    await SpeechInput.stopListening();
    await SpeechOutput.stop();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    await AudioSessionManager.transitionTo('idle');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/85  flex flex-col justify-between text-[var(--color-text-primary)] animate-fade-in"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 16px) + 8px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 12px)',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* 1. TOP BAR */}
      <header className="w-full max-w-xl mx-auto px-4 flex items-center justify-between z-10 shrink-0">
        {/* Left: Close Button */}
        <button
          onClick={handleClose}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface)] active:scale-95 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all flex items-center justify-center shadow-lg"
          aria-label={t('common.close', 'Close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Center: Title + Mini Glowing Indicator */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse shadow-[0_0_8px_var(--color-accent)]" />
            <span className="font-semibold text-base tracking-wide">Hermes</span>
          </div>
          <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
            {currentModel}
          </span>
        </div>

        {/* Right: Language Pill & Transcript Button */}
        <div className="flex items-center gap-2">
          {/* Language Toggle Chip */}
          <button
            onClick={() => {
              Haptics.tick();
              const nextLang: AppLanguage = language === 'en' ? 'fr' : language === 'fr' ? 'ar' : 'en';
              setLanguage(nextLang);
            }}
            className="min-h-[44px] px-3 rounded-full bg-[var(--color-surface)]/80 border border-[var(--color-border)] text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] hover:border-[var(--color-accent)]/50 active:scale-95 transition-all flex items-center gap-1 shadow-lg"
          >
            {language}
          </button>

          {/* Transcript Drawer Toggle */}
          <button
            onClick={() => {
              Haptics.tick();
              setIsTranscriptOpen(true);
            }}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface)] active:scale-95 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all flex items-center justify-center relative shadow-lg"
            aria-label={t('voice.transcript', 'Transcript')}
          >
            <FileText className="w-5 h-5" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-black flex items-center justify-center">
                {messages.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. CENTER CONTENT: Glowing Orb & Live Captions */}
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center px-4 my-auto">
        {/* Animated Ambient Orb */}
        <div className="relative mb-6">
          <VoiceGlowingOrb
            state={orbState}
            onTap={handleOrbTap}
          />
        </div>

        {/* Tap to Interrupt Pill Notice (Visible when speaking) */}
        {orbState === 'speaking' && (
          <button
            onClick={handleOrbTap}
            className="mb-4 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)]/90 border border-[var(--color-accent)]/40 text-[var(--color-accent)] text-xs font-medium flex items-center gap-1.5 animate-pulse active:scale-95 transition-all shadow-lg"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t('voice.tapToInterrupt', 'Tap orb to interrupt')}</span>
          </button>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 max-w-sm text-center">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Spoken Action Proposal Card */}
        {pendingAction && (
          <div className="w-full mb-4 p-4 rounded-3xl bg-[var(--color-surface)]/95 border border-[var(--color-accent)]/50 shadow-2xl  animate-scale-in">
            <div className="flex items-center gap-2 text-[var(--color-accent)] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>{t('voice.confirmActionTitle', 'Confirmation Required')}</span>
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3 leading-relaxed">
              {pendingAction.spokenPrompt}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              {t('voice.confirmActionPrompt', 'Say "Yes" to confirm or "No" to cancel')}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirmAction}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl bg-[var(--color-accent)] text-black font-semibold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>{t('common.save', 'Confirm')}</span>
              </button>
              <button
                onClick={handleCancelAction}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <X className="w-4 h-4" />
                <span>{t('common.cancel', 'Cancel')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Subtitle / Caption Display */}
        <div className="w-full text-center px-4 min-h-[48px] flex items-center justify-center">
          <p className="text-base sm:text-lg font-medium text-[var(--color-text-primary)] leading-relaxed max-w-sm line-clamp-3">
            {liveCaption || t('voice.startPrompt', 'Say something, or tap the mic when you are ready.')}
          </p>
        </div>
      </div>

      {/* 3. 10-Second Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-20 p-3.5 rounded-2xl bg-[var(--color-surface)]/95 border border-[var(--color-border)] shadow-2xl  flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-[var(--color-text-primary)] truncate font-medium">
              {undoToast.message}
            </span>
          </div>
          <button
            onClick={() => {
              Haptics.warning();
              undoToast.undo();
              setUndoToast(null);
            }}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({undoToast.secondsLeft}s)</span>
          </button>
        </div>
      )}

      {/* 4. BOTTOM ACTION BAR */}
      <footer className="w-full max-w-md mx-auto px-6 flex items-center justify-around z-10 shrink-0">
        {/* Toggle Mute / Mic */}
        <button
          onClick={handleOrbTap}
          className={`min-h-[48px] min-w-[48px] p-3 rounded-full border transition-all flex items-center justify-center shadow-lg active:scale-95 ${
            orbState === 'listening'
              ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]'
              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          aria-label={orbState === 'listening' ? t('voice.muteMic', 'Mute') : t('voice.unmuteMic', 'Unmute')}
        >
          {orbState === 'listening' ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* End Conversation Button */}
        <button
          onClick={handleClose}
          className="min-h-[48px] px-6 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-semibold text-sm flex items-center gap-2 hover:bg-red-500/20 active:scale-95 transition-all shadow-lg"
        >
          <PhoneOff className="w-5 h-5" />
          <span>{t('voice.endConversation', 'End')}</span>
        </button>

        {/* Switch to Text Chat Button */}
        <button
          onClick={() => {
            handleClose();
            onOpenChat?.();
          }}
          className="min-h-[48px] min-w-[48px] p-3 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-surface)] active:scale-95 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all flex items-center justify-center shadow-lg"
          aria-label={t('voice.switchToText', 'Switch to text chat')}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </footer>

      {/* 5. SLIDE-UP TRANSCRIPT SHEET */}
      {isTranscriptOpen && (
        <div 
          className="fixed inset-0 z-[130] bg-black/60  flex flex-col justify-end animate-fade-in"
          onClick={() => setIsTranscriptOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-auto max-h-[75vh] bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-3xl p-5 flex flex-col shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 12px)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-accent)]" />
                <h3 className="font-semibold text-sm">{t('voice.transcript', 'Transcript')}</h3>
                <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                  ({messages.length})
                </span>
              </div>
              <button
                onClick={() => setIsTranscriptOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center justify-center"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--color-text-secondary)]">
                  {t('voice.emptyTranscript', 'No messages spoken yet in this session.')}
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-text-primary)]'
                          : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
                      }`}
                    >
                      <span className="font-semibold text-[10px] block opacity-70 mb-1">
                        {m.role === 'user' ? 'You' : 'Hermes'}
                      </span>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
