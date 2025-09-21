import type { ReadingSession } from '@shared/schema';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';

export interface SessionGroup {
  date: string;
  sessions: ReadingSession[];
  totalMinutes: number;
  totalPages: number;
}

/**
 * Group sessions by date for display
 */
export function groupSessionsByDate(sessions: ReadingSession[]): SessionGroup[] {
  const groups = new Map<string, ReadingSession[]>();
  
  sessions.forEach(session => {
    const dateKey = format(session.sessionDate, 'yyyy-MM-dd');
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(session);
  });
  
  return Array.from(groups.entries())
    .map(([date, sessions]) => ({
      date,
      sessions: sessions.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime()),
      totalMinutes: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      totalPages: sessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Format session date for display
 */
export function formatSessionDate(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  return format(date, 'MMM d, yyyy');
}

/**
 * Format session time for display
 */
export function formatSessionTime(date: Date): string {
  return format(date, 'h:mm a');
}

/**
 * Get session duration in a readable format
 */
export function getSessionDuration(session: ReadingSession): string {
  if (!session.duration) {
    if (session.sessionType === 'quick') {
      return 'Quick add';
    }
    return 'Unknown';
  }
  
  const minutes = session.duration;
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get session type display text
 */
export function getSessionTypeText(session: ReadingSession): string {
  switch (session.sessionType) {
    case 'timed':
      return 'Timed session';
    case 'quick':
      return 'Quick add';
    default:
      return 'Reading session';
  }
}

/**
 * Get session state display text and color
 */
export function getSessionStateInfo(session: ReadingSession): { 
  text: string; 
  color: 'green' | 'blue' | 'gray' | 'orange';
} {
  switch (session.state) {
    case 'active':
      return { text: 'Active', color: 'green' };
    case 'paused':
      return { text: 'Paused', color: 'orange' };
    case 'completed':
      return { text: 'Completed', color: 'blue' };
    default:
      return { text: 'Unknown', color: 'gray' };
  }
}

/**
 * Calculate pages read per minute for a session
 */
export function getSessionPace(session: ReadingSession): number {
  if (!session.duration || !session.pagesRead || session.duration === 0) {
    return 0;
  }
  
  return session.pagesRead / session.duration;
}

/**
 * Determine if a session is currently active
 */
export function isActiveSession(session: ReadingSession): boolean {
  return session.state === 'active' || session.state === 'paused';
}

/**
 * Calculate total time from session start accounting for pauses
 */
export function calculateActiveTime(session: ReadingSession): number {
  const start = session.startedAt.getTime();
  const now = new Date().getTime();
  
  if (session.state === 'completed' && session.endedAt) {
    return differenceInMinutes(session.endedAt, session.startedAt);
  }
  
  if (session.state === 'paused' && session.pausedAt) {
    const totalTime = differenceInMinutes(session.pausedAt, session.startedAt);
    return totalTime;
  }
  
  if (session.state === 'active') {
    let totalTime = differenceInMinutes(new Date(), session.startedAt);
    
    // Subtract pause duration if session was paused and resumed
    if (session.pausedAt && session.resumedAt) {
      const pauseDuration = differenceInMinutes(session.resumedAt, session.pausedAt);
      totalTime -= pauseDuration;
    }
    
    return totalTime;
  }
  
  return 0;
}

/**
 * Validate session data before submission
 */
export function validateSessionData(
  startPage?: number,
  endPage?: number,
  totalPages?: number
): { isValid: boolean; error?: string } {
  if (startPage !== undefined && endPage !== undefined) {
    if (endPage < startPage) {
      return { isValid: false, error: 'End page cannot be less than start page' };
    }
    
    if (startPage < 0) {
      return { isValid: false, error: 'Start page cannot be negative' };
    }
  }
  
  if (totalPages && endPage && endPage > totalPages) {
    return { isValid: false, error: 'End page cannot exceed total pages' };
  }
  
  return { isValid: true };
}

/**
 * Generate session summary text
 */
export function getSessionSummary(session: ReadingSession): string {
  const parts: string[] = [];
  
  if (session.pagesRead && session.pagesRead > 0) {
    parts.push(`${session.pagesRead} page${session.pagesRead === 1 ? '' : 's'}`);
  }
  
  if (session.duration && session.duration > 0) {
    parts.push(`in ${getSessionDuration(session)}`);
  }
  
  if (parts.length === 0) {
    return getSessionTypeText(session);
  }
  
  return parts.join(' ');
}

/**
 * Check if session needs sync (for offline support)
 */
export function needsSync(session: ReadingSession): boolean {
  return session.syncStatus === 'pending' || session.syncStatus === 'failed';
}

/**
 * Get sync status display info
 */
export function getSyncStatusInfo(session: ReadingSession): {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  needsAttention: boolean;
} {
  switch (session.syncStatus) {
    case 'synced':
      return { text: 'Synced', color: 'green', needsAttention: false };
    case 'pending':
      return { text: 'Syncing...', color: 'yellow', needsAttention: false };
    case 'syncing':
      return { text: 'Syncing...', color: 'yellow', needsAttention: false };
    case 'failed':
      return { text: 'Sync failed', color: 'red', needsAttention: true };
    default:
      return { text: 'Unknown', color: 'gray', needsAttention: false };
  }
}