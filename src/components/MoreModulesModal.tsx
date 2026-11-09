import React from 'react';
import { ScreenId } from './Navigation';

interface MoreModulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScreen: (screen: ScreenId) => void;
}

// Deprecated in favor of the categorized Quick Add Action Sheet (+)
export const MoreModulesModal: React.FC<MoreModulesModalProps> = () => {
  return null;
};
