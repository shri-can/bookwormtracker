import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReadingSession } from '@shared/schema';

export interface TimerState {
  elapsed: number; // seconds elapsed in current session
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pausedAt: Date | null;
}

export interface UseSessionTimerReturn {
  timer: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  getFormattedTime: () => string;
  getTotalMinutes: () => number;
}

/**
 * Hook for managing reading session timers with pause/resume functionality
 */
export function useSessionTimer(
  initialSession?: ReadingSession | null
): UseSessionTimerReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [timer, setTimer] = useState<TimerState>(() => {
    if (initialSession?.state === 'active') {
      const startTime = initialSession.startedAt;
      const pausedAt = initialSession.pausedAt;
      const resumedAt = initialSession.resumedAt;
      
      let elapsed = 0;
      const now = new Date();
      
      if (pausedAt && !resumedAt) {
        // Currently paused
        elapsed = Math.floor((pausedAt.getTime() - startTime.getTime()) / 1000);
      } else if (resumedAt) {
        // Was paused but resumed
        const pauseDuration = resumedAt.getTime() - (pausedAt?.getTime() || 0);
        elapsed = Math.floor((now.getTime() - startTime.getTime() - pauseDuration) / 1000);
      } else {
        // Running continuously
        elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      }
      
      return {
        elapsed: Math.max(0, elapsed),
        isRunning: true,
        isPaused: false,
        startTime,
        pausedAt: null,
      };
    }
    
    if (initialSession?.state === 'paused') {
      const startTime = initialSession.startedAt;
      const pausedAt = initialSession.pausedAt;
      
      let elapsed = 0;
      if (pausedAt) {
        elapsed = Math.floor((pausedAt.getTime() - startTime.getTime()) / 1000);
      }
      
      return {
        elapsed: Math.max(0, elapsed),
        isRunning: false,
        isPaused: true,
        startTime,
        pausedAt,
      };
    }
    
    return {
      elapsed: 0,
      isRunning: false,
      isPaused: false,
      startTime: null,
      pausedAt: null,
    };
  });

  // Update timer every second when running
  useEffect(() => {
    if (timer.isRunning && !timer.isPaused) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          elapsed: prev.elapsed + 1,
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.isRunning, timer.isPaused]);

  const startTimer = useCallback(() => {
    const now = new Date();
    setTimer({
      elapsed: 0,
      isRunning: true,
      isPaused: false,
      startTime: now,
      pausedAt: null,
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
      isPaused: true,
      pausedAt: new Date(),
    }));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      pausedAt: null,
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
    }));
  }, []);

  const resetTimer = useCallback(() => {
    setTimer({
      elapsed: 0,
      isRunning: false,
      isPaused: false,
      startTime: null,
      pausedAt: null,
    });
  }, []);

  const getFormattedTime = useCallback(() => {
    const hours = Math.floor(timer.elapsed / 3600);
    const minutes = Math.floor((timer.elapsed % 3600) / 60);
    const seconds = timer.elapsed % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timer.elapsed]);

  const getTotalMinutes = useCallback(() => {
    return Math.floor(timer.elapsed / 60);
  }, [timer.elapsed]);

  return {
    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    getFormattedTime,
    getTotalMinutes,
  };
}