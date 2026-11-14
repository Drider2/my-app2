import { useState, useEffect, useCallback } from 'react';
import { DisplayMode, LayoutSize } from '../types';
import {
  LayoutService,
  computeEffectiveLayout,
  isLayoutDowngraded,
  getDowngradeKey,
  applyLayoutToDOM,
  getCurrentViewportWidth,
  LAYOUT_EVENT,
} from '../services/layoutService';

export interface UseLayoutResult {
  requested: DisplayMode;
  effective: LayoutSize;
  isPhone: boolean;
  isWide: boolean;
  isTablet: boolean;
  isDowngraded: boolean;
  downgradeKey: string | null;
  setDisplayMode: (mode: DisplayMode) => void;
  previewDisplayMode: (mode: DisplayMode) => void;
}

export function useLayout(): UseLayoutResult {
  const [requested, setRequested] = useState<DisplayMode>(() => LayoutService.getRequestedMode());
  const [effective, setEffective] = useState<LayoutSize>(() => {
    const req = LayoutService.getRequestedMode();
    const w = getCurrentViewportWidth();
    const eff = computeEffectiveLayout(req, w);
    applyLayoutToDOM(eff);
    return eff;
  });

  // Debounced recalculation on resize / orientation change
  useEffect(() => {
    let timeoutId: any = null;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const req = LayoutService.getRequestedMode();
        const w = getCurrentViewportWidth();
        const nextEff = computeEffectiveLayout(req, w);
        applyLayoutToDOM(nextEff);
        setRequested(req);
        setEffective(prev => (prev === nextEff ? prev : nextEff));
      }, 100);
    };

    const handleLayoutEvent = (e: Event) => {
      const custom = e as CustomEvent<{ requested?: DisplayMode; effective?: LayoutSize }>;
      const req = custom.detail?.requested || LayoutService.getRequestedMode();
      const w = getCurrentViewportWidth();
      const nextEff = custom.detail?.effective || computeEffectiveLayout(req, w);
      setRequested(req);
      setEffective(nextEff);
      applyLayoutToDOM(nextEff);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    window.addEventListener(LAYOUT_EVENT, handleLayoutEvent);
    window.addEventListener('greendream_state_updated', handleResize);
    window.addEventListener('storage', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener(LAYOUT_EVENT, handleLayoutEvent);
      window.removeEventListener('greendream_state_updated', handleResize);
      window.removeEventListener('storage', handleResize);
    };
  }, [requested]);

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    const nextEff = LayoutService.setDisplayMode(mode);
    setRequested(mode);
    setEffective(nextEff);
  }, []);

  const previewDisplayMode = useCallback((mode: DisplayMode) => {
    const nextEff = LayoutService.previewDisplayMode(mode);
    setRequested(mode);
    setEffective(nextEff);
  }, []);

  const isDowngraded = isLayoutDowngraded(requested, effective);
  const downgradeKey = getDowngradeKey(requested, effective);

  return {
    requested,
    effective,
    isPhone: effective === 'phone',
    isWide: effective === 'wide',
    isTablet: effective === 'tablet',
    isDowngraded,
    downgradeKey,
    setDisplayMode,
    previewDisplayMode,
  };
}
