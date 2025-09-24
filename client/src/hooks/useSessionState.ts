import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { 
  ReadingSession, 
  Book, 
  StartSessionRequest, 
  PauseSessionRequest, 
  StopSessionRequest, 
  QuickAddPagesRequest 
} from '@shared/schema';

export interface SessionActions {
  startSession: (request: StartSessionRequest) => Promise<ReadingSession>;
  pauseSession: (sessionId: string, reason?: string) => Promise<ReadingSession>;
  resumeSession: (sessionId: string) => Promise<ReadingSession>;
  stopSession: (request: StopSessionRequest) => Promise<ReadingSession>;
  quickAddPages: (request: QuickAddPagesRequest) => Promise<ReadingSession>;
  getLastEndPage: (bookId: string) => Promise<number | null>;
  calculateEndPage: (startPage: number, pagesRead: number) => number;
}

export interface UseSessionStateReturn {
  activeSession: ReadingSession | null;
  isLoading: boolean;
  error: string | null;
  actions: SessionActions;
  refreshActiveSession: () => void;
}

/**
 * Hook for managing reading session state and operations
 */
export function useSessionState(bookId: string): UseSessionStateReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Query for active session
  const { 
    data: activeSession, 
    isLoading, 
    refetch: refreshActiveSession 
  } = useQuery({
    queryKey: ['activeSession', bookId],
    queryFn: async () => {
      const response = await fetch(`/api/books/${bookId}/active-session`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch active session');
      }
      const data = await response.json();
      return data ? {
        ...data,
        startedAt: new Date(data.startedAt),
        sessionDate: new Date(data.sessionDate),
        pausedAt: data.pausedAt ? new Date(data.pausedAt) : null,
        resumedAt: data.resumedAt ? new Date(data.resumedAt) : null,
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
      } as ReadingSession : null;
    },
    enabled: !!bookId,
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (request: StartSessionRequest) => {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start session');
      }
      
      const data = await response.json();
      return {
        ...data,
        startedAt: new Date(data.startedAt),
        sessionDate: new Date(data.sessionDate),
        pausedAt: data.pausedAt ? new Date(data.pausedAt) : null,
        resumedAt: data.resumedAt ? new Date(data.resumedAt) : null,
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
      } as ReadingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSession', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', bookId] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to start session');
    },
  });

  // Pause session mutation
  const pauseSessionMutation = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason?: string }) => {
      const response = await fetch(`/api/sessions/${sessionId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pause session');
      }
      
      const data = await response.json();
      return {
        ...data,
        startedAt: new Date(data.startedAt),
        sessionDate: new Date(data.sessionDate),
        pausedAt: data.pausedAt ? new Date(data.pausedAt) : null,
        resumedAt: data.resumedAt ? new Date(data.resumedAt) : null,
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
      } as ReadingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSession', bookId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', bookId] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to pause session');
    },
  });

  // Resume session mutation
  const resumeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resume session');
      }
      
      const data = await response.json();
      return {
        ...data,
        startedAt: new Date(data.startedAt),
        sessionDate: new Date(data.sessionDate),
        pausedAt: data.pausedAt ? new Date(data.pausedAt) : null,
        resumedAt: data.resumedAt ? new Date(data.resumedAt) : null,
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
      } as ReadingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSession', bookId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', bookId] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to resume session');
    },
  });

  // Stop session mutation
  const stopSessionMutation = useMutation({
    mutationFn: async (request: StopSessionRequest) => {
      const response = await fetch(`/api/sessions/${request.sessionId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop session');
      }
      
      const data = await response.json();
      return {
        ...data,
        startedAt: new Date(data.startedAt),
        sessionDate: new Date(data.sessionDate),
        pausedAt: data.pausedAt ? new Date(data.pausedAt) : null,
        resumedAt: data.resumedAt ? new Date(data.resumedAt) : null,
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
      } as ReadingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSession', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', bookId] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to stop session');
    },
  });

  // Quick add pages mutation
  const quickAddMutation = useMutation({
    mutationFn: async (request: QuickAddPagesRequest) => {
      const response = await fetch('/api/sessions/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add pages');
      }
      
      const data = await response.json();
      return {
        ...data,
        startedAt: new Date(data.startedAt),
        sessionDate: new Date(data.sessionDate),
        pausedAt: data.pausedAt ? new Date(data.pausedAt) : null,
        resumedAt: data.resumedAt ? new Date(data.resumedAt) : null,
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
      } as ReadingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSession', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', bookId] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to add pages');
    },
  });

  // Get last end page for auto-fill
  const getLastEndPage = async (bookId: string): Promise<number | null> => {
    try {
      const response = await fetch(`/api/books/${bookId}/sessions?limit=1`);
      if (!response.ok) return null;
      
      const data = await response.json();
      const lastSession = data[0];
      return lastSession?.endPage || null;
    } catch {
      return null;
    }
  };

  // Calculate end page from start page and pages read
  const calculateEndPage = (startPage: number, pagesRead: number): number => {
    return startPage + pagesRead;
  };

  const actions: SessionActions = {
    startSession: startSessionMutation.mutateAsync,
    pauseSession: (sessionId: string, reason?: string) => 
      pauseSessionMutation.mutateAsync({ sessionId, reason }),
    resumeSession: resumeSessionMutation.mutateAsync,
    stopSession: stopSessionMutation.mutateAsync,
    quickAddPages: quickAddMutation.mutateAsync,
    getLastEndPage,
    calculateEndPage,
  };

  const isLoadingAny = 
    isLoading ||
    startSessionMutation.isPending ||
    pauseSessionMutation.isPending ||
    resumeSessionMutation.isPending ||
    stopSessionMutation.isPending ||
    quickAddMutation.isPending;

  return {
    activeSession: activeSession || null,
    isLoading: isLoadingAny,
    error,
    actions,
    refreshActiveSession,
  };
}