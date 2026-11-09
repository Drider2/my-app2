import React from 'react';
import { 
  Bot, 
  Sparkles, 
  Clock, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  ShieldCheck, 
  MessageSquare,
  Cpu
} from 'lucide-react';
import { db } from '../../services/storage';
import { GeminiService } from '../../services/geminiService';
import { ModuleWidgetConfig } from '../../types';

interface AssistantWidgetRendererProps {
  widget: ModuleWidgetConfig;
  onRefresh: () => void;
  onSelectPrompt?: (text: string) => void;
  triggerToast?: (msg: string) => void;
}

export const AssistantWidgetRenderer: React.FC<AssistantWidgetRendererProps> = ({
  widget,
  onRefresh,
  onSelectPrompt,
  triggerToast = () => {},
}) => {
  const state = db.getState();
  const aiSettings = GeminiService.getSettings();
  const activeNotices = (state.assistantNotices || []).filter(n => n.status === 'new' && !n.deleted_at);

  const quickPrompts = [
    'How much available cash do I have left this month?',
    'What muscle groups am I training today?',
    'When is my next haircut and car oil change due?',
    'Review my 10-point daily progress score.',
  ];

  switch (widget.widgetType) {
    // 1. AI Assistant Information & Status
    case 'ai_assistant_info':
      return (
        <div className="card-premium p-3.5  flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Google Gemini Desk
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-positive)]/10 text-[var(--color-positive)]">
                  Online
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">
                Model: {aiSettings.model}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-accent)]">{aiSettings.usage.total_requests}</span> requests
          </div>
        </div>
      );

    // 2. Quick Prompts Library
    case 'ai_quick_prompts':
      return (
        <div className="card-premium p-4  space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
              Quick Inquiries & Desk Commands
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPrompt && onSelectPrompt(p)}
                className="text-left text-xs font-medium px-2.5 py-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] tap-feedback transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      );

    // 3. Suggested Actions & System Notices
    case 'ai_suggested_actions':
      return (
        <div className="card-premium p-4  space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                Contextual Suggestions & Notices
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] font-semibold">
              {activeNotices.length} active
            </span>
          </div>

          {activeNotices.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)] py-1">
              No pending conflict alerts. Schedule and finances are balanced.
            </p>
          ) : (
            <div className="space-y-2">
              {activeNotices.map(n => (
                <div key={n.id} className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs space-y-1">
                  <span className="font-bold text-[var(--color-text-primary)]">{n.title}</span>
                  <p className="text-xs text-[var(--color-text-secondary)]">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    // 4. Conversation History Panel
    case 'ai_conversation_history': {
      const messagesCount = (state.assistantMessages || []).length;
      return (
        <div className="card-premium p-4  space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent)]">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                Conversation History
              </h3>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {messagesCount} messages logged
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Active conversation is stored on device and synchronized with your personal intelligence desk.
          </p>
        </div>
      );
    }

    default:
      return null;
  }
};
