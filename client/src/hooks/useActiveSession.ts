import { useState, useCallback } from 'react';
import type { ReadingSession } from '@shared/schema';

export interface ActiveSession {
  id: string;
  bookId: string;
  startAt: string;          // ISO
  startPage: number;        // Single source of truth
  state: 'active' | 'paused' | 'finalizing';
}

export interface UseActiveSessionReturn {
  activeSession: ActiveSession | null;
  setActiveSession: (session: ActiveSession | null) => void;
  updateActiveSessionState: (state: 'active' | 'paused' | 'finalizing') => void;
  clearActiveSession: () => void;
}

/**
 * Hook for managing active session state with startPage as single source of truth
 */
export function useActiveSession(): UseActiveSessionReturn {
  const [activeSession, setActiveSessionState] = useState<ActiveSession | null>(null);

  const setActiveSession = useCallback((session: ActiveSession | null) => {
    console.log('useActiveSession: setActiveSession called with:', session);
    setActiveSessionState(session);
  }, []);

  const updateActiveSessionState = useCallback((state: 'active' | 'paused' | 'finalizing') => {
    setActiveSessionState(prev => prev ? { ...prev, state } : null);
  }, []);

  const clearActiveSession = useCallback(() => {
    console.log('useActiveSession: clearActiveSession called');
    setActiveSessionState(null);
  }, []);

  return {
    activeSession,
    setActiveSession,
    updateActiveSessionState,
    clearActiveSession,
  };
}
