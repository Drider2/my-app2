import React from 'react';
import { HermesChatModal } from '../components/ai/HermesChatModal';

interface AssistantScreenProps {
  onRefresh: () => void;
  onNavigateToSettings?: () => void;
  onBack?: () => void;
}

export const AssistantScreen: React.FC<AssistantScreenProps> = ({ 
  onRefresh, 
  onNavigateToSettings, 
  onBack 
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-[var(--color-bg)] flex flex-col">
      <HermesChatModal
        isOpen={true}
        isFullScreen={true}
        onClose={() => {
          onRefresh();
          onBack?.();
        }}
        onNavigateToSettings={onNavigateToSettings}
      />
    </div>
  );
};
