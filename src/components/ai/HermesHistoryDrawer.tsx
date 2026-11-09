import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Check, 
  Clock,
  Sparkles
} from 'lucide-react';
import { HermesStorage } from '../../services/hermesStorage';
import { HermesChatSession } from '../../types';
import { useTranslation } from '../../services/i18n';
import { Haptics } from '../../services/haptics';

interface HermesHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId: string | null;
  onSelectSession: (session: HermesChatSession) => void;
  onNewChat: () => void;
}

export const HermesHistoryDrawer: React.FC<HermesHistoryDrawerProps> = ({
  isOpen,
  onClose,
  activeSessionId,
  onSelectSession,
  onNewChat,
}) => {
  const { t, isRtl } = useTranslation();
  const [sessions, setSessions] = useState<HermesChatSession[]>(() => HermesStorage.getChats());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Refresh sessions when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSessions(HermesStorage.getChats());
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    Haptics.warning();
    HermesStorage.deleteChat(id);
    const updated = HermesStorage.getChats();
    setSessions(updated);
    if (activeSessionId === id) {
      onNewChat();
    }
  };

  const handleStartRename = (e: React.MouseEvent, session: HermesChatSession) => {
    e.stopPropagation();
    Haptics.tick();
    setEditingId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    Haptics.tick();
    if (editingTitle.trim()) {
      HermesStorage.renameChat(id, editingTitle.trim());
      setSessions(HermesStorage.getChats());
    }
    setEditingId(null);
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return t('common.yesterday', 'Yesterday');
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`fixed inset-0 z-50 flex ${isRtl ? 'justify-end' : 'justify-start'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Scrim Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60  transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Card */}
      <aside 
        aria-label="Chat history"
        className={`relative w-[85%] max-w-[320px] h-full bg-[rgba(10,14,23,0.96)]  flex flex-col z-10 shadow-2xl animate-in duration-200 ${
          isRtl 
            ? 'border-l border-[var(--color-border)] slide-in-from-right' 
            : 'border-r border-[var(--color-border)] slide-in-from-left'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[var(--color-border)]/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--color-text-primary)] font-bold text-sm">
            <Clock className="w-4 h-4 text-[var(--color-accent)]" />
            <span>{t('settings.hermesChatHistory', 'Chat History')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white tap-feedback"
            aria-label="Close history drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              Haptics.tick();
              onNewChat();
              onClose();
            }}
            className="w-full min-h-[44px] py-2.5 px-3.5 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-xs font-bold flex items-center justify-center gap-2 tap-feedback hover:bg-[var(--color-accent)]/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('settings.hermesNewConversation', 'New Conversation')}</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-[var(--color-text-secondary)]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--color-accent)]" />
              <p>{t('settings.hermesNoPastChats', 'No past conversations')}</p>
              <p className="text-[11px] mt-1 opacity-70">Your chats will appear here</p>
            </div>
          ) : (
            sessions.map(s => {
              const isActive = s.id === activeSessionId;
              const isEditing = s.id === editingId;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    Haptics.tick();
                    onSelectSession(s);
                    onClose();
                  }}
                  className={`group relative p-3 rounded-2xl border text-left cursor-pointer tap-feedback transition-all ${
                    isActive
                      ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/60 text-white shadow-sm'
                      : 'border-transparent hover:border-white/10 hover:bg-white/[0.04] text-[var(--color-text-primary)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRename(e as any, s.id);
                            }}
                            autoFocus
                            className="w-full text-xs px-2 py-1 rounded-lg border border-[var(--color-accent)] bg-black/60 text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={e => handleSaveRename(e, s.id)}
                            className="min-w-[36px] min-h-[36px] p-1 rounded-lg bg-[var(--color-accent)] text-white flex items-center justify-center"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-semibold truncate leading-tight">
                            {s.title || 'Conversation'}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 flex items-center gap-1">
                            <span>{formatTime(s.updated_at || s.created_at)}</span>
                            <span>•</span>
                            <span>{s.messages.length} messages</span>
                          </p>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={e => handleStartRename(e, s)}
                          className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white"
                          title="Rename"
                          aria-label="Rename conversation"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => handleDelete(e, s.id)}
                          className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-rose-400"
                          title="Delete"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-text-secondary)] text-center">
          {t('settings.hermesStoredLocally', 'Stored locally on this device')}
        </div>
      </aside>
    </div>
  );
};
