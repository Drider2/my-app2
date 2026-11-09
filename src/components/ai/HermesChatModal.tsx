import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Square, 
  Mic, 
  MicOff, 
  Sparkles, 
  Clock, 
  Plus, 
  RotateCcw, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  Settings, 
  Check, 
  Copy,
  ExternalLink,
  Bot,
  WifiOff,
  Volume2,
  Trash2
} from 'lucide-react';
import { db, generateUUID } from '../../services/storage';
import { HermesStorage } from '../../services/hermesStorage';
import { HermesGeminiService, redactApiKey } from '../../services/hermesGeminiService';
import { HermesBrain } from '../../services/hermesBrain';
import { SpeechService } from '../../services/speechService';
import { SpeechInput } from '../../services/voice/SpeechInput';
import { SpeechOutput } from '../../services/voice/SpeechOutput';
import { VoiceMessageService } from '../../services/voice/VoiceMessageService';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { PermissionExplainerModal } from '../voice/PermissionExplainerModal';
import { HermesMarkdown } from './HermesMarkdown';
import { HermesHistoryDrawer } from './HermesHistoryDrawer';
import { HermesActionCardView } from './HermesActionCardView';
import { 
  HermesMessage, 
  HermesChatSession, 
  HermesReasoningStep,
  HermesActionCard,
  HermesVoiceAttachment,
  AIAssistantSettings 
} from '../../types';
import { useTranslation } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

interface HermesChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSettings?: () => void;
  initialPrompt?: string;
  isFullScreen?: boolean;
}

export const HermesChatModal: React.FC<HermesChatModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSettings,
  initialPrompt,
  isFullScreen = false,
}) => {
  const { t, language, isRtl } = useTranslation();
  const state = db.getState();
  const userName = state.settings.user_name || 'Friend';

  // Network & Rate limit state
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);

  // Session & Message State
  const [session, setSession] = useState<HermesChatSession>(() => {
    const existing = HermesStorage.getChats();
    if (existing.length > 0) return existing[0];
    return {
      id: generateUUID(),
      title: 'New Conversation',
      created_at: Date.now(),
      updated_at: Date.now(),
      messages: [],
    };
  });

  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeReasoning, setActiveReasoning] = useState<HermesReasoningStep[]>([]);
  const [showReasoning, setShowReasoning] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chatError, setChatError] = useState<{
    type: 'invalid_key' | 'model_not_found' | 'tool_payload' | 'rate_limit' | 'safety' | 'offline' | 'empty' | 'generic';
    userMessage: string;
    technicalDetails?: string;
    actionType: 'settings' | 'model_picker' | 'retry';
  } | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [detailsCopied, setDetailsCopied] = useState(false);
  const [lastUserMessageText, setLastUserMessageText] = useState<string>('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isPermPermanentlyDenied, setIsPermPermanentlyDenied] = useState(false);

  // 10s Undo Toast State
  const [undoToast, setUndoToast] = useState<{
    message: string;
    cardId: string;
    undo: () => void;
    secondsLeft: number;
  } | null>(null);

  // Keyboard avoidance offset
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Settings & Status
  const [settings, setSettings] = useState<AIAssistantSettings>(() => HermesStorage.getSettings());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Quick prompt suggestions
  const QUICK_PROMPTS = [
    { id: 'spend', label: 'How much did I spend this week?' },
    { id: 'workout', label: 'Suggest a workout for today' },
    { id: 'prayer', label: 'Did I miss any prayer today?' },
    { id: 'maintenance', label: 'What needs maintenance soon?' },
  ];

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 60s Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown === null) return;
    if (rateLimitCountdown <= 0) {
      setRateLimitCountdown(null);
      setErrorMessage(null);
      return;
    }
    const timer = setTimeout(() => {
      setRateLimitCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [rateLimitCountdown]);

  // Reload settings on open
  useEffect(() => {
    if (isOpen) {
      const s = HermesStorage.getSettings();
      setSettings(s);
      setErrorMessage(null);

      // Handle initial prompt if passed
      if (initialPrompt && initialPrompt.trim()) {
        setTimeout(() => {
          handleSendMessage(initialPrompt.trim());
        }, 100);
      }
    }
  }, [isOpen]);

  // 10s Countdown Timer for Undo Toast
  useEffect(() => {
    if (!undoToast) return;
    if (undoToast.secondsLeft <= 0) {
      setUndoToast(null);
      return;
    }

    const timer = setTimeout(() => {
      setUndoToast(prev => prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [undoToast]);

  // Visual Viewport tracking for mobile keyboard
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;

    const handleViewportChange = () => {
      const offset = window.innerHeight - vv.height;
      setKeyboardOffset(Math.max(0, offset));
    };

    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);

    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Auto-scroll to bottom of messages
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    scrollToBottom(isStreaming ? 'auto' : 'smooth');
  }, [session.messages, streamingText, activeReasoning, undoToast]);

  // Adjust textarea height dynamically
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Start a new conversation
  const handleNewChat = () => {
    Haptics.tick();
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newSession: HermesChatSession = {
      id: generateUUID(),
      title: 'New Conversation',
      created_at: Date.now(),
      updated_at: Date.now(),
      messages: [],
    };
    setSession(newSession);
    setStreamingText('');
    setIsStreaming(false);
    setActiveReasoning([]);
    setErrorMessage(null);
    setUndoToast(null);
    setRateLimitCountdown(null);
  };

  // Switch chat session
  const handleSelectSession = (selected: HermesChatSession) => {
    Haptics.tick();
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSession(selected);
    setStreamingText('');
    setIsStreaming(false);
    setActiveReasoning([]);
    setErrorMessage(null);
    setUndoToast(null);
  };

  // Stop streaming
  const handleStopStreaming = () => {
    Haptics.tick();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  // Voice Speech Recognition & Audio Recording with Language Support
  const handleToggleVoice = async () => {
    Haptics.tick();
    if (isListening) {
      await handleSendVoice();
      return;
    }

    try {
      const status = await SpeechInput.getEngineStatus();
      if (!status.permissionGranted) {
        setIsPermPermanentlyDenied(status.permanentlyDenied);
        setIsPermModalOpen(true);
        return;
      }

      await startVoiceListening();
    } catch (e: any) {
      console.warn('Failed to verify speech status', e);
      setIsListening(false);
      setVoiceTranscript('');
      setRecordingDurationMs(0);
    }
  };

  const startVoiceListening = async () => {
    setVoiceTranscript('');
    setErrorMessage(null);
    setRecordingDurationMs(0);
    setIsListening(true);

    // 1. Start Audio Recorder (Native AAC / Browser WebM)
    await VoiceMessageService.startRecording((elapsedMs) => {
      setRecordingDurationMs(elapsedMs);
    });

    VoiceMessageService.onMaxDurationReached = () => {
      handleSendVoice();
    };

    // 2. Start Speech Recognition in parallel for real-time live captions
    const voiceSettings = db.getState().settings.voice;
    const targetLang = voiceSettings?.language === 'auto' || !voiceSettings?.language 
      ? language 
      : voiceSettings.language;

    await SpeechInput.startListening({
      onStart: () => setIsListening(true),
      onPartial: (text) => {
        setVoiceTranscript(text);
      },
      onResult: (finalText) => {
        if (finalText && finalText.trim()) {
          setVoiceTranscript(finalText.trim());
        }
      },
      onError: (err, code) => {
        console.warn('Speech recognition notice:', err, code);
        if (code === 'PERMISSION_PERMANENTLY_DENIED') {
          setIsPermPermanentlyDenied(true);
          setIsPermModalOpen(true);
        }
      },
      onEnd: () => {
        // Voice message service manages recording stop
      },
    }, {
      language: targetLang,
      silenceSeconds: 60, // Don't auto-stop prematurely while user is recording voice note
    });
  };

  const handleSendVoice = async () => {
    Haptics.tick();
    const voiceData = await VoiceMessageService.stopRecording();
    const spoken = await SpeechInput.stopListening();
    setIsListening(false);

    const finalTranscript = (spoken || voiceTranscript || '').trim();
    setVoiceTranscript('');
    setRecordingDurationMs(0);

    if (voiceData && voiceData.base64Audio) {
      const attachment: HermesVoiceAttachment = {
        base64Audio: voiceData.base64Audio,
        mimeType: voiceData.mimeType,
        durationSeconds: Math.max(1, Math.round(voiceData.durationMs / 1000)),
        transcription: finalTranscript || undefined,
      };
      const textLabel = finalTranscript ? `🎙️ "${finalTranscript}"` : undefined;
      handleSendMessage(textLabel, attachment);
    } else if (finalTranscript) {
      handleSendMessage(finalTranscript);
    }
  };

  const handleRequestPermissionFromModal = async () => {
    const res = await SpeechInput.requestPermissions();
    if (res.granted) {
      setIsPermModalOpen(false);
      await startVoiceListening();
    } else {
      setIsPermPermanentlyDenied(true);
    }
  };

  const handleCancelVoice = async () => {
    Haptics.tick();
    await VoiceMessageService.cancelRecording();
    await SpeechInput.cancelListening();
    setIsListening(false);
    setVoiceTranscript('');
    setRecordingDurationMs(0);
  };

  // Text-To-Speech read aloud toggle for messages
  const handleToggleSpeakMessage = async (content: string, msgId: string) => {
    Haptics.tick();
    if (speakingMsgId === msgId) {
      await SpeechOutput.stop();
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(msgId);
    const voiceSettings = db.getState().settings.voice;
    const targetLang = voiceSettings?.language === 'auto' || !voiceSettings?.language 
      ? language 
      : voiceSettings.language;

    await SpeechOutput.speak(content, {
      lang: SpeechInput.resolveLanguageTag(targetLang),
      rate: voiceSettings?.speechRate || 1.0,
      pitch: voiceSettings?.speechPitch || 1.0,
      onComplete: () => setSpeakingMsgId(null),
    });
  };

  // Copy message
  const handleCopyMessage = async (text: string, id: string) => {
    Haptics.tick();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedMsgId(id);
        setTimeout(() => setCopiedMsgId(null), 2000);
      }
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  // Confirm an Action Card
  const handleConfirmAction = (card: HermesActionCard) => {
    Haptics.success();
    const result = HermesBrain.executeConfirmedWriteTool(card.toolName, card.params);
    if (result.success) {
      // Mark card as confirmed in session
      setSession(prev => {
        const updatedMessages = prev.messages.map(m => {
          if (m.actionCard && m.actionCard.id === card.id) {
            return {
              ...m,
              actionCard: { ...m.actionCard, status: 'confirmed' as const, executedAt: Date.now() },
            };
          }
          return m;
        });
        const updated = { ...prev, messages: updatedMessages, updated_at: Date.now() };
        HermesStorage.saveChat(updated);
        return updated;
      });

      // Show 10s Undo Toast
      setUndoToast({
        message: result.message,
        cardId: card.id,
        undo: result.undo,
        secondsLeft: 10,
      });
    }
  };

  // Cancel an Action Card
  const handleCancelAction = (card: HermesActionCard) => {
    Haptics.tick();
    setSession(prev => {
      const updatedMessages = prev.messages.map(m => {
        if (m.actionCard && m.actionCard.id === card.id) {
          return {
            ...m,
            actionCard: { ...m.actionCard, status: 'cancelled' as const },
          };
        }
        return m;
      });
      const updated = { ...prev, messages: updatedMessages, updated_at: Date.now() };
      HermesStorage.saveChat(updated);
      return updated;
    });
  };

  // Execute 10s Undo Rollback
  const handleExecuteUndo = () => {
    if (!undoToast) return;
    Haptics.warning();
    undoToast.undo();

    // Revert card to cancelled
    setSession(prev => {
      const updatedMessages = prev.messages.map(m => {
        if (m.actionCard && m.actionCard.id === undoToast.cardId) {
          return {
            ...m,
            actionCard: { ...m.actionCard, status: 'cancelled' as const },
          };
        }
        return m;
      });
      const updated = { ...prev, messages: updatedMessages, updated_at: Date.now() };
      HermesStorage.saveChat(updated);
      return updated;
    });

    setUndoToast(null);
  };

  // Classify errors into friendly user-facing errors with appropriate action button
  const classifyAndSetError = (rawError: string, status?: number) => {
    const cleanRaw = redactApiKey(rawError);
    let type: 'invalid_key' | 'model_not_found' | 'tool_payload' | 'rate_limit' | 'safety' | 'offline' | 'empty' | 'generic' = 'generic';
    let actionType: 'settings' | 'model_picker' | 'retry' = 'retry';
    let userMessage = t('hermesErrors.genericError', 'Something went wrong. Please try again.');

    if (status === 401 || status === 403 || cleanRaw.includes('API_KEY_INVALID') || cleanRaw.includes('API key not valid') || cleanRaw.includes('Unauthorized')) {
      type = 'invalid_key';
      actionType = 'settings';
      userMessage = t('hermesErrors.invalidKey', 'Check your Gemini key');
    } else if (status === 404 || cleanRaw.includes('not found') || cleanRaw.includes('is not available for your API key')) {
      type = 'model_not_found';
      actionType = 'model_picker';
      userMessage = t('hermesErrors.modelNotFound', "This model isn't available for your key");
    } else if (status === 400 || cleanRaw.includes('thought_signature') || cleanRaw.includes('functionCall') || cleanRaw.includes('INVALID_ARGUMENT')) {
      type = 'tool_payload';
      actionType = 'retry';
      userMessage = t('hermesErrors.toolPayloadError', "Hermes couldn't use your app data this time. Try again.");
    } else if (status === 429 || cleanRaw.includes('429') || cleanRaw.toLowerCase().includes('quota') || cleanRaw.toLowerCase().includes('rate limit')) {
      type = 'rate_limit';
      actionType = 'retry';
      userMessage = t('hermesErrors.rateLimit', 'Google Gemini quota reached. Please wait a moment.');
      setRateLimitCountdown(60);
    } else if (cleanRaw.toLowerCase().includes('safety') || cleanRaw.toLowerCase().includes('blocked')) {
      type = 'safety';
      actionType = 'retry';
      userMessage = t('hermesErrors.safetyBlocked', 'This response was blocked by safety filters. Try rephrasing your question.');
    } else if (!isOnline || cleanRaw.toLowerCase().includes('offline') || cleanRaw.toLowerCase().includes('timeout') || cleanRaw.toLowerCase().includes('network') || cleanRaw.toLowerCase().includes('failed to fetch')) {
      type = 'offline';
      actionType = 'retry';
      userMessage = t('hermesErrors.offline', 'Network connection lost or timed out. Please check your internet connection.');
    } else if (cleanRaw.toLowerCase().includes('empty')) {
      type = 'empty';
      actionType = 'retry';
      userMessage = t('hermesErrors.emptyResponse', 'Hermes returned an empty response. Please try again.');
    }

    setChatError({
      type,
      userMessage,
      technicalDetails: cleanRaw,
      actionType,
    });
    setErrorMessage(userMessage);
  };

  const handleRetryLastTurn = () => {
    let textToRetry = lastUserMessageText;
    if (!textToRetry && session.messages.length > 0) {
      for (let i = session.messages.length - 1; i >= 0; i--) {
        if (session.messages[i].role === 'user') {
          textToRetry = session.messages[i].content;
          break;
        }
      }
    }
    if (!textToRetry) return;
    setChatError(null);
    setErrorMessage(null);
    setShowErrorDetails(false);
    handleSendMessage(textToRetry);
  };

  // Dispatch a message to Gemini / Hermes (Text or Voice Message)
  const handleSendMessage = async (overrideText?: string, voiceAttachment?: HermesVoiceAttachment) => {
    let textToSend = (overrideText || inputText).trim();
    if (!textToSend && voiceAttachment) {
      textToSend = voiceAttachment.transcription 
        ? `🎙️ "${voiceAttachment.transcription}"` 
        : `🎙️ Voice message (${VoiceMessageService.formatDuration(voiceAttachment.durationSeconds, true)})`;
    }
    if (!textToSend || isStreaming) return;

    if (!isOnline) {
      setErrorMessage(t('settings.hermesOfflineNotice', 'Offline mode. Hermes cloud intelligence requires an internet connection.'));
      return;
    }

    if (rateLimitCountdown !== null && rateLimitCountdown > 0) {
      setErrorMessage(`Please wait ${rateLimitCountdown} seconds for Google Gemini quota to refresh.`);
      return;
    }

    Haptics.tick();
    setInputText('');
    setErrorMessage(null);
    setChatError(null);
    setShowErrorDetails(false);
    setLastUserMessageText(textToSend);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 1. Check API Key
    const apiKey = HermesStorage.getApiKey();
    if (!apiKey) {
      const userMsg: HermesMessage = {
        id: generateUUID(),
        role: 'user',
        content: textToSend,
        timestamp: Date.now(),
        voiceAttachment,
      };
      const assistantMsg: HermesMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: 'Please configure your Google Gemini API key in Settings to chat with Hermes.\n\nYou can get a 100% free key with no credit card required from [Google AI Studio](https://aistudio.google.com/app/apikey).',
        timestamp: Date.now(),
      };
      const updated = {
        ...session,
        messages: [...session.messages, userMsg, assistantMsg],
        updated_at: Date.now(),
      };
      setSession(updated);
      HermesStorage.saveChat(updated);
      return;
    }

    // 2. Prepare user message
    const userMsg: HermesMessage = {
      id: generateUUID(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      voiceAttachment,
    };

    // Auto-generate title from first user message
    let sessionTitle = session.title;
    if (session.messages.length === 0 || session.title === 'New Conversation') {
      sessionTitle = textToSend.length > 30 ? textToSend.slice(0, 30) + '...' : textToSend;
    }

    const updatedSessionWithUser: HermesChatSession = {
      ...session,
      title: sessionTitle,
      messages: [...session.messages, userMsg],
      updated_at: Date.now(),
    };
    setSession(updatedSessionWithUser);
    HermesStorage.saveChat(updatedSessionWithUser);

    // 3. Initiate Unified Multi-Round Tool Calling & Streaming Loop
    setIsStreaming(true);
    setStreamingText('');
    setActiveReasoning([]);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Helper to build contents array with optional compaction for safety retry
    const buildContents = (messages: HermesMessage[], flattenOlder: boolean = false): any[] => {
      const contents: any[] = [];
      const recent = messages.slice(-10);

      recent.forEach((m, idx) => {
        if (m.role === 'user') {
          if (m.voiceAttachment?.base64Audio) {
            contents.push({
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: m.voiceAttachment.mimeType,
                    data: m.voiceAttachment.base64Audio,
                  }
                },
                {
                  text: m.voiceAttachment.transcription
                    ? `User voice note: "${m.voiceAttachment.transcription}". Please listen carefully, fulfill the request, and reply directly in their language.`
                    : 'User voice note. Please listen carefully to what the user said in their language, transcribe it, and fulfill their request directly.'
                }
              ]
            });
          } else {
            contents.push({
              role: 'user',
              parts: [{ text: m.content }],
            });
          }
        } else if (m.role === 'assistant') {
          // If flattenOlder is true, or if older than current turn and no rawParts, convert to text
          if (!flattenOlder && Array.isArray(m.rawParts) && m.rawParts.length > 0) {
            // Model turn preserved VERBATIM with thoughtSignature and functionCall parts
            contents.push({
              role: 'model',
              parts: m.rawParts,
            });
          } else {
            // Backward-compatible or flattened text
            contents.push({
              role: 'model',
              parts: [{ text: m.content || '[Tool execution completed]' }],
            });
          }
        }
      });

      return contents;
    };

    const runTurn = async (isRetry: boolean = false): Promise<void> => {
      const systemInstruction = HermesBrain.buildSystemPrompt();
      const tools = HermesBrain.getToolDeclarations(settings.hermesMode, settings.shareContext);
      const currentModel = settings.model || 'gemini-3.6-flash';

      let currentContents = buildContents(updatedSessionWithUser.messages, isRetry);
      let accumulatedReasoning: HermesReasoningStep[] = [];
      let round = 0;
      const MAX_ROUNDS = 5;

      try {
        while (round < MAX_ROUNDS) {
          round++;

          // Check for tool calling if tools are declared
          if (tools && tools.length > 0 && tools[0].functionDeclarations?.length > 0) {
            const preflight = await HermesGeminiService.generateContent({
              apiKey,
              model: currentModel,
              systemInstruction,
              contents: currentContents,
              tools,
              abortSignal: controller.signal,
            });

            if (preflight.functionCalls && preflight.functionCalls.length > 0 && preflight.rawParts) {
              // Check if ANY call is a write tool
              const writeCall = preflight.functionCalls.find(fc => [
                'add_expense', 'add_income', 'mark_prayer', 'log_weight',
                'add_task', 'add_reminder', 'create_goal', 'save_memory_note'
              ].includes(fc.name));

              if (writeCall) {
                // WRITE TOOL: Create interactive action card requiring confirmation
                const actionCard: HermesActionCard = {
                  id: generateUUID(),
                  toolName: writeCall.name,
                  params: writeCall.args || {},
                  status: 'pending',
                  rawParts: preflight.rawParts,
                };
                const assistantMsg: HermesMessage = {
                  id: generateUUID(),
                  role: 'assistant',
                  content: preflight.text || "I've prepared this action for you. Please review and tap Confirm to apply it:",
                  timestamp: Date.now(),
                  actionCard,
                  rawParts: preflight.rawParts,
                };
                const finalSession: HermesChatSession = {
                  ...updatedSessionWithUser,
                  messages: [...updatedSessionWithUser.messages, assistantMsg],
                  updated_at: Date.now(),
                };
                setSession(finalSession);
                HermesStorage.saveChat(finalSession);
                setIsStreaming(false);
                return;
              }

              // ALL READ TOOLS: Execute all of them in parallel!
              // 1. Append verbatim model turn with rawParts (contains thoughtSignature on first part)
              currentContents.push({
                role: 'model',
                parts: preflight.rawParts,
              });

              // 2. Update reasoning steps in UI
              const newSteps: HermesReasoningStep[] = preflight.functionCalls.map(fc => ({
                tool: fc.name,
                label: `Querying ${fc.name.replace(/_/g, ' ')}...`,
                status: 'running' as const,
                rawParts: fc.rawPart ? [fc.rawPart] : undefined,
              }));
              accumulatedReasoning = [...accumulatedReasoning, ...newSteps];
              setActiveReasoning([...accumulatedReasoning]);

              // 3. Parallel execution
              const toolResults = await Promise.all(
                preflight.functionCalls.map(async fc => {
                  const result = await HermesBrain.executeReadTool(fc.name, fc.args);
                  return { name: fc.name, id: fc.id, result };
                })
              );

              // 4. Update reasoning UI to done
              accumulatedReasoning = accumulatedReasoning.map(r => ({
                ...r,
                status: 'done' as const,
                label: `Analyzed ${r.tool.replace(/_/g, ' ')}`,
              }));
              setActiveReasoning([...accumulatedReasoning]);

              // 5. Append ONE user content turn with parts in the exact same order!
              const userResponseParts: any[] = toolResults.map(tr => ({
                functionResponse: {
                  name: tr.name,
                  response: tr.result,
                  ...(tr.id ? { id: tr.id } : {}),
                }
              }));
              currentContents.push({
                role: 'user',
                parts: userResponseParts,
              });

              // Continue to next round (model may call another tool or generate answer)
              continue;
            }
          }

          // If no tool was called, break out of tool loop to stream final output
          break;
        }

        // Final Streaming Synthesis
        let accumulatedText = '';

        await HermesGeminiService.streamGenerateContent({
          apiKey,
          model: currentModel,
          systemInstruction,
          contents: currentContents,
          tools: tools,
          abortSignal: controller.signal,
          onChunk: (chunk) => {
            accumulatedText += chunk;
            setStreamingText(accumulatedText);
          },
          onComplete: (fullText, metadata) => {
            setIsStreaming(false);
            setStreamingText('');
            const finalText = fullText || accumulatedText;
            const assistantMsg: HermesMessage = {
              id: generateUUID(),
              role: 'assistant',
              content: finalText,
              timestamp: Date.now(),
              reasoningSteps: accumulatedReasoning.length > 0 ? accumulatedReasoning : undefined,
              rawParts: metadata?.rawParts,
            };
            const finalSession: HermesChatSession = {
              ...updatedSessionWithUser,
              messages: [...updatedSessionWithUser.messages, assistantMsg],
              updated_at: Date.now(),
            };
            setSession(finalSession);
            HermesStorage.saveChat(finalSession);

            // Read aloud if enabled in settings
            const voiceSettings = db.getState().settings.voice;
            if (voiceSettings?.readRepliesAloud) {
              const targetLang = voiceSettings?.language === 'auto' || !voiceSettings?.language 
                ? language 
                : voiceSettings.language;
              SpeechOutput.speak(finalText, {
                lang: SpeechInput.resolveLanguageTag(targetLang),
                rate: voiceSettings?.speechRate || 1.0,
              });
            }
          },
          onError: (err, status) => {
            if (!isRetry && err.includes('thought_signature')) {
              console.warn('Hermes: Thought signature mismatch detected, retrying once with flattened history');
              runTurn(true);
              return;
            }
            setIsStreaming(false);
            setStreamingText('');
            classifyAndSetError(err, status);
          },
        });
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (!isRetry && errMsg.includes('thought_signature')) {
          console.warn('Hermes: Thought signature mismatch detected, retrying once with flattened history');
          return runTurn(true);
        }
        setIsStreaming(false);
        setStreamingText('');
        classifyAndSetError(errMsg);
      }
    };

    await runTurn(false);
  };

  if (!isOpen) return null;

  // Hermes live status badge details
  const isQueryingData = activeReasoning.some(r => r.status === 'running');
  const statusLabel = !isOnline
    ? t('hermesErrors.statusOffline', 'Offline')
    : isListening 
    ? t('hermesErrors.statusListening', 'Listening…')
    : isQueryingData 
    ? t('hermesErrors.statusUsingData', 'Using your data…')
    : isStreaming 
    ? t('hermesErrors.statusThinking', 'Thinking…')
    : t('hermesErrors.statusReady', 'Ready');

  const statusDot = !isOnline
    ? 'bg-amber-400'
    : isListening 
    ? 'bg-purple-400 animate-pulse' 
    : (isStreaming || isQueryingData)
    ? 'bg-[var(--color-accent)] animate-pulse' 
    : 'bg-emerald-400';

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-end bg-black/85  transition-all ${
        isFullScreen ? 'h-full' : ''
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Slide-Up Sheet Container */}
      <section 
        aria-label="Hermes AI Assistant Chat"
        className={`w-full bg-[#0B0F19]/98 border-t border-white/[0.1]  flex flex-col shadow-[0_-12px_48px_rgba(0,0,0,0.85)] transition-all duration-300 ${
          isFullScreen ? 'h-full rounded-none' : 'h-[92vh] max-h-[92vh] rounded-t-[32px]'
        }`}
        style={{
          paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        {/* ======================================================== */}
        {/* 1. HEADER BAR (Optimized for 360px Viewports)            */}
        {/* ======================================================== */}
        <header className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/[0.08] flex items-center justify-between shrink-0 gap-1.5">
          {/* Avatar + Status Pill */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0B0F19] ${statusDot}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-[var(--color-text-primary)] shrink-0">Hermes</span>
                <span 
                  title={settings.model || 'gemini-3.6-flash'}
                  className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-[var(--color-text-secondary)] font-mono max-w-[95px] sm:max-w-[120px] truncate shrink inline-block"
                >
                  {settings.model || 'gemini-3.6-flash'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] font-medium leading-tight truncate">
                {statusLabel}
              </p>
            </div>
          </div>

          {/* Action Icons (Streamlined spacing with >=44px touch targets) */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Hands-Free Voice Mode */}
            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('open_hermes_voice'));
              }}
              className="w-9 h-9 min-w-[36px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15 tap-feedback transition-colors relative"
              title={t('voice.title', 'Voice Conversation')}
              aria-label={t('voice.title', 'Voice Conversation')}
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-2.5 right-2 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            </button>

            {/* New Chat */}
            <button
              type="button"
              onClick={handleNewChat}
              className="w-9 h-9 min-w-[36px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.06] tap-feedback transition-colors"
              title={t('settings.hermesNewConversation', 'New conversation')}
              aria-label="New conversation"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* History Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="w-9 h-9 min-w-[36px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.06] tap-feedback transition-colors"
              title={t('settings.hermesChatHistory', 'Chat history')}
              aria-label="Chat history"
            >
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Settings link */}
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToSettings();
                }}
                className="w-9 h-9 min-w-[36px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.06] tap-feedback transition-colors"
                title="Hermes Settings"
                aria-label="Hermes Settings"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 min-w-[36px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.06] tap-feedback transition-colors"
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="mx-4 mt-2 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t('settings.hermesOfflineNotice', 'Offline mode. Hermes cloud intelligence requires an internet connection.')}</span>
          </div>
        )}

        {/* Rate limit 429 Countdown Banner */}
        {rateLimitCountdown !== null && (
          <div className="mx-4 mt-2 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
              <span>{t('settings.hermesRateLimitWait', 'Quota reached. Retry ready in')}</span>
            </div>
            <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-black/40 text-white">
              {rateLimitCountdown}s
            </span>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. MESSAGE LIST / EMPTY STATE                            */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {session.messages.length === 0 && !streamingText ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 space-y-6 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)]">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  Hello, {userName}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  I'm Hermes, your personal operating assistant. Ask me anything or explore your day:
                </p>
              </div>

              {/* 4 Quick Prompt Chips */}
              <div className="w-full space-y-2">
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSendMessage(p.label)}
                    className="w-full min-h-[44px] p-3 rounded-2xl border border-[var(--color-border)] bg-white/[0.03] hover:bg-white/[0.08] hover:border-[var(--color-accent)]/50 text-left text-xs text-[var(--color-text-primary)] font-medium tap-feedback transition-all flex items-center justify-between"
                  >
                    <span>{p.label}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)] opacity-60 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <>
              {session.messages.map((msg) => {
                const isUser = msg.role === 'user';
                const bubbleAlign = isUser
                  ? (isRtl ? 'items-start' : 'items-end')
                  : (isRtl ? 'items-end' : 'items-start');
                const bubbleRounding = isUser
                  ? (isRtl ? 'rounded-3xl rounded-tl-sm text-right' : 'rounded-3xl rounded-tr-sm text-left')
                  : (isRtl ? 'rounded-3xl rounded-tr-sm text-right' : 'rounded-3xl rounded-tl-sm text-left');

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${bubbleAlign} space-y-1`}
                  >
                    <div
                      className={`max-w-[88%] px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs leading-relaxed ${bubbleRounding} ${
                        isUser
                          ? 'bg-[var(--color-accent)] text-white font-medium shadow-md'
                          : 'bg-white/[0.04] border border-[var(--color-border)]/80  text-[var(--color-text-primary)] shadow-sm'
                      }`}
                    >
                      {/* Collapsible Reasoning Chip for Assistant */}
                      {!isUser && msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                        <div className="mb-2.5 pb-2 border-b border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => setShowReasoning(!showReasoning)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wider tap-feedback"
                          >
                            <Cpu className="w-3.5 h-3.5" />
                            <span>Hermes reasoning ({msg.reasoningSteps.length})</span>
                            {showReasoning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {showReasoning && (
                            <div className="mt-1.5 space-y-1 text-xs text-[var(--color-text-secondary)] font-mono pl-2 border-l border-[var(--color-accent)]/40">
                              {msg.reasoningSteps.map((s, idx) => (
                                <p key={idx} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>{s.label}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      {msg.voiceAttachment ? (
                        <div className="py-1">
                          <VoiceMessagePlayer
                            base64Audio={msg.voiceAttachment.base64Audio}
                            mimeType={msg.voiceAttachment.mimeType}
                            durationSeconds={msg.voiceAttachment.durationSeconds}
                            transcription={msg.voiceAttachment.transcription}
                            isUser={isUser}
                          />
                        </div>
                      ) : isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <HermesMarkdown content={msg.content} />
                      )}

                      {/* Interactive Action Card (if attached to message) */}
                      {!isUser && msg.actionCard && (
                        <HermesActionCardView
                          card={msg.actionCard}
                          onConfirm={handleConfirmAction}
                          onCancel={handleCancelAction}
                        />
                      )}
                    </div>

                    {/* Message Actions Row & Timestamp (Cleanly positioned below bubble to prevent text collisions) */}
                    <div className={`flex items-center gap-1.5 px-2 ${bubbleAlign}`}>
                      <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.content, msg.id)}
                        className="min-w-[32px] min-h-[32px] p-1 rounded-lg text-white/40 hover:text-white active:text-white tap-feedback transition-colors flex items-center justify-center"
                        title="Copy message"
                        aria-label="Copy message"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleToggleSpeakMessage(msg.content, msg.id)}
                          className={`min-w-[32px] min-h-[32px] p-1 rounded-lg tap-feedback transition-colors flex items-center justify-center ${
                            speakingMsgId === msg.id
                              ? 'text-[var(--color-accent)] animate-pulse bg-white/[0.08]'
                              : 'text-white/40 hover:text-white active:text-white'
                          }`}
                          title={speakingMsgId === msg.id ? 'Stop speech' : 'Read aloud'}
                          aria-label={speakingMsgId === msg.id ? 'Stop speech' : 'Read aloud'}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Streaming Bubble */}
              {isStreaming && (
                <div className={`flex flex-col ${isRtl ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className={`max-w-[88%] p-4 text-xs leading-relaxed bg-white/[0.04] border border-[var(--color-accent)]/40  ${
                    isRtl ? 'rounded-3xl rounded-tr-sm text-right' : 'rounded-3xl rounded-tl-sm text-left'
                  } text-[var(--color-text-primary)] shadow-sm`}>
                    {/* Active Reasoning */}
                    {activeReasoning.length > 0 && (
                      <div className="mb-2 pb-1.5 border-b border-white/[0.08] text-xs text-[var(--color-accent)] flex items-center gap-1.5 animate-pulse">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>{activeReasoning[activeReasoning.length - 1].label}</span>
                      </div>
                    )}

                    {streamingText ? (
                      <HermesMarkdown content={streamingText} isStreaming={true} />
                    ) : (
                      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                        <Sparkles className="w-4 h-4 text-[var(--color-accent)] animate-spin" />
                        <span>Hermes is thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Structured Friendly Error Card */}
              {(chatError || errorMessage) && (
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-amber-500/20 shadow-lg  text-xs space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 leading-snug">
                        {chatError ? chatError.userMessage : errorMessage}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons (Retry, Settings, Model Picker) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {chatError?.actionType === 'settings' && onNavigateToSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToSettings();
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-2 tap-feedback text-xs transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>{t('hermesErrors.invalidKeyAction', 'Open Hermes settings')}</span>
                      </button>
                    )}

                    {chatError?.actionType === 'model_picker' && onNavigateToSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToSettings();
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-2 tap-feedback text-xs transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>{t('hermesErrors.modelNotFoundAction', 'Select model')}</span>
                      </button>
                    )}

                    {(chatError?.actionType === 'retry' || (!chatError && errorMessage)) && (
                      <button
                        type="button"
                        onClick={handleRetryLastTurn}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-2 tap-feedback text-xs transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        <span>{t('hermesErrors.retry', 'Try again')}</span>
                      </button>
                    )}

                    {chatError?.technicalDetails && (
                      <button
                        type="button"
                        onClick={() => setShowErrorDetails(prev => !prev)}
                        className="min-h-[44px] px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-white flex items-center gap-1.5 tap-feedback text-xs transition-colors"
                      >
                        {showErrorDetails ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {showErrorDetails
                            ? t('hermesErrors.hideDetails', 'Hide details')
                            : t('hermesErrors.showDetails', 'Show details')}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Technical Details Accordion */}
                  {showErrorDetails && chatError?.technicalDetails && (
                    <div className="pt-2 border-t border-white/[0.08] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-sans font-semibold">
                          Diagnostics
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (navigator.clipboard && chatError.technicalDetails) {
                                await navigator.clipboard.writeText(chatError.technicalDetails);
                                setDetailsCopied(true);
                                setTimeout(() => setDetailsCopied(false), 2000);
                              }
                            } catch (e) {
                              console.warn('Copy failed', e);
                            }
                          }}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1.5 tap-feedback transition-colors font-sans"
                        >
                          {detailsCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>{t('hermesErrors.copied', 'Copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-zinc-300" />
                              <span>{t('hermesErrors.copyDetails', 'Copy details')}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 rounded-xl bg-black/60 border border-white/[0.06] text-[11px] font-mono text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed select-text">
                        {chatError.technicalDetails}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 10s Active Undo Toast */}
        {undoToast && (
          <div className="mx-4 mb-2 p-3 rounded-2xl bg-zinc-900 border border-[var(--color-accent)]/50 shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-xs text-white truncate font-medium">
                {undoToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExecuteUndo}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-bold tap-feedback flex items-center gap-1 shrink-0 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo ({undoToast.secondsLeft}s)</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. STICKY COMPOSER                                       */}
        {/* ======================================================== */}
        <div className="p-3 border-t border-[var(--color-border)]/60 bg-[rgba(10,14,23,0.98)] shrink-0">
          <div className="flex items-end gap-2 bg-white/[0.04] border border-[var(--color-border)] rounded-3xl p-1.5 focus-within:border-[var(--color-accent)]/70 transition-colors">
            {/* Mic Button (≥ 44px tap target) */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center shrink-0 tap-feedback transition-all ${
                isListening
                  ? 'bg-purple-500/30 text-purple-400 animate-pulse border border-purple-500/50'
                  : 'text-[var(--color-text-secondary)] hover:text-white'
              }`}
              title={isListening ? t('settings.hermesVoiceSend', 'Send voice message') : 'Voice input'}
              aria-label={isListening ? t('settings.hermesVoiceSend', 'Send voice message') : 'Voice input'}
            >
              {isListening ? <Mic className="w-5 h-5 text-purple-400 animate-pulse" /> : <Mic className="w-5 h-5" />}
            </button>

            {isListening ? (
              /* Active Voice Recording Bar */
              <div className="flex-1 flex items-center justify-between gap-2 px-2 py-1 min-h-[44px]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span className="text-xs font-mono font-bold text-red-400 shrink-0">
                    {VoiceMessageService.formatDuration(recordingDurationMs)}
                  </span>
                  <p className="text-xs text-[var(--color-text-secondary)] font-medium truncate">
                    {voiceTranscript ? `"${voiceTranscript}"` : t('voice.recordingVoiceNote', 'Recording voice note...')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Cancel / Discard Recording */}
                  <button
                    type="button"
                    onClick={handleCancelVoice}
                    className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 tap-feedback transition-colors"
                    title={t('settings.hermesVoiceCancel', 'Discard recording')}
                    aria-label="Discard recording"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  {/* Send Recorded Voice as Message */}
                  <button
                    type="button"
                    onClick={handleSendVoice}
                    className="min-w-[44px] min-h-[44px] px-3.5 rounded-2xl bg-[var(--color-accent)] text-black flex items-center justify-center gap-1.5 shadow-lg tap-feedback transition-all font-semibold text-xs active:scale-95"
                    title={t('settings.hermesVoiceSend', 'Send voice message')}
                    aria-label="Send voice message"
                  >
                    <Send className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            ) : (
              /* Normal Textarea & Send Button */
              <>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask Hermes anything..."
                  className="flex-1 max-h-[120px] py-2.5 px-1 bg-transparent text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 resize-none focus:outline-none leading-relaxed"
                />

                {/* Send / Stop Button (≥ 44px tap target) */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopStreaming}
                    className="min-w-[44px] min-h-[44px] rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 tap-feedback hover:bg-rose-500/30"
                    title="Stop generation"
                    aria-label="Stop generation"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim()}
                    className="min-w-[44px] min-h-[44px] rounded-2xl bg-[var(--color-accent)] text-white flex items-center justify-center shrink-0 tap-feedback disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:opacity-95 transition-all"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Permission Explainer Modal */}
      <PermissionExplainerModal
        isOpen={isPermModalOpen}
        isPermanentlyDenied={isPermPermanentlyDenied}
        onClose={() => setIsPermModalOpen(false)}
        onRequestPermission={handleRequestPermissionFromModal}
      />

      {/* History Drawer */}
      <HermesHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        activeSessionId={session.id}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />
    </div>
  );
};
