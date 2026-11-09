// ========================================================
// AudioSessionManager: Centralized Audio Focus & Mutual Exclusion
// Guarantees only ONE audio state active at any time:
// { idle, listening, thinking, speaking, recording, playing }
// Automatically pauses and releases resources on background/screen-off.
// ========================================================

import { AudioSessionState } from './types';

type StateListener = (state: AudioSessionState) => void;
type CleanupFn = () => Promise<void> | void;

class AudioSessionManagerClass {
  private currentState: AudioSessionState = 'idle';
  private listeners = new Set<StateListener>();
  private cleanups = new Map<AudioSessionState, CleanupFn>();

  constructor() {
    this.initLifecycleGuards();
  }

  private initLifecycleGuards(): void {
    if (typeof window === 'undefined') return;

    // Release audio focus on app background / screen off
    const handleBackground = () => {
      if (document.hidden) {
        this.releaseAllToIdle();
      }
    };

    document.addEventListener('visibilitychange', handleBackground);
    window.addEventListener('blur', handleBackground);
    window.addEventListener('pagehide', () => this.releaseAllToIdle());
  }

  public getCurrentState(): AudioSessionState {
    return this.currentState;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public registerCleanup(state: AudioSessionState, cleanup: CleanupFn): void {
    this.cleanups.set(state, cleanup);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try {
        fn(this.currentState);
      } catch (e) {
        console.error('Error in audio state listener:', e);
      }
    });
  }

  /**
   * Transition to a new audio state, executing cleanup on the old state
   */
  public async transitionTo(target: AudioSessionState): Promise<boolean> {
    if (this.currentState === target) return true;

    // Execute cleanup of previous state if registered
    const cleanup = this.cleanups.get(this.currentState);
    if (cleanup) {
      try {
        await cleanup();
      } catch (e) {
        console.warn(`Cleanup failed for state ${this.currentState}:`, e);
      }
    }

    this.currentState = target;
    this.notify();
    return true;
  }

  /**
   * Safely release all active audio resources back to idle
   */
  public async releaseAllToIdle(): Promise<void> {
    if (this.currentState === 'idle') return;
    const old = this.currentState;
    this.currentState = 'idle';

    const cleanup = this.cleanups.get(old);
    if (cleanup) {
      try {
        await cleanup();
      } catch (e) {
        console.warn(`Cleanup failed during release to idle:`, e);
      }
    }
    this.notify();
  }
}

export const AudioSessionManager = new AudioSessionManagerClass();
