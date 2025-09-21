import type { Book, ReadingSession, BookReadingState } from '@shared/schema';
import { formatDistanceToNow, addDays, differenceInMinutes } from 'date-fns';

export interface ProgressForecast {
  averagePagesPerHour: number;
  estimatedTimeToFinish: string | null;
  estimatedFinishDate: Date | null;
  dailyPageTarget: number;
  readingPace: 'fast' | 'medium' | 'slow';
  daysToFinish: number | null;
}

export interface ReadingStats {
  totalMinutesRead: number;
  totalPagesRead: number;
  averageSessionLength: number;
  longestSession: number;
  streakDays: number;
  booksFinishedThisMonth: number;
}

/**
 * Calculate reading progress forecast based on recent sessions
 */
export function calculateProgressForecast(
  book: Book,
  sessions: ReadingSession[],
  readingState?: BookReadingState
): ProgressForecast {
  // Filter to completed sessions with valid data
  const validSessions = sessions
    .filter(session => 
      session.state === 'completed' && 
      session.duration && 
      session.pagesRead && 
      session.duration > 0 &&
      session.pagesRead > 0
    )
    .slice(0, 10); // Use last 10 sessions for accuracy

  let averagePagesPerHour = readingState?.averagePagesPerHour || 0;
  
  // Calculate average pages per hour if we have session data
  if (validSessions.length > 0) {
    const totalPages = validSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const totalHours = validSessions.reduce((sum, s) => sum + ((s.duration || 0) / 60), 0);
    averagePagesPerHour = totalHours > 0 ? totalPages / totalHours : 0;
  }

  // Calculate remaining pages and time
  const currentPage = book.currentPage || 0;
  const totalPages = book.totalPages || 0;
  const remainingPages = Math.max(0, totalPages - currentPage);
  
  let estimatedTimeToFinish: string | null = null;
  let estimatedFinishDate: Date | null = null;
  let daysToFinish: number | null = null;
  
  if (averagePagesPerHour > 0 && totalPages > 0 && remainingPages > 0) {
    const hoursNeeded = remainingPages / averagePagesPerHour;
    const minutesNeeded = hoursNeeded * 60;
    
    // Format time to finish
    if (hoursNeeded < 1) {
      estimatedTimeToFinish = `${Math.round(minutesNeeded)} minutes`;
    } else if (hoursNeeded < 24) {
      const hours = Math.floor(hoursNeeded);
      const minutes = Math.round((hoursNeeded - hours) * 60);
      estimatedTimeToFinish = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const days = Math.round(hoursNeeded / 24);
      estimatedTimeToFinish = `${days} day${days > 1 ? 's' : ''}`;
    }
    
    // Calculate finish date (assuming 1 hour of reading per day)
    const dailyReadingHours = 1;
    daysToFinish = Math.ceil(hoursNeeded / dailyReadingHours);
    estimatedFinishDate = addDays(new Date(), daysToFinish);
  }

  // Determine reading pace
  let readingPace: 'fast' | 'medium' | 'slow' = 'medium';
  if (averagePagesPerHour > 40) {
    readingPace = 'fast';
  } else if (averagePagesPerHour < 20) {
    readingPace = 'slow';
  }

  // Calculate daily page target (to finish in reasonable time)
  let dailyPageTarget = readingState?.dailyPageTarget || 10;
  if (daysToFinish && daysToFinish > 30) {
    // If it would take more than 30 days, suggest a higher daily target
    dailyPageTarget = Math.ceil(remainingPages / 30);
  }

  return {
    averagePagesPerHour: Math.round(averagePagesPerHour * 10) / 10,
    estimatedTimeToFinish,
    estimatedFinishDate,
    dailyPageTarget,
    readingPace,
    daysToFinish,
  };
}

/**
 * Calculate comprehensive reading statistics
 */
export function calculateReadingStats(sessions: ReadingSession[]): ReadingStats {
  const completedSessions = sessions.filter(s => s.state === 'completed');
  
  const totalMinutesRead = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalPagesRead = completedSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
  
  const averageSessionLength = completedSessions.length > 0 
    ? Math.round(totalMinutesRead / completedSessions.length) 
    : 0;
  
  const longestSession = Math.max(0, ...completedSessions.map(s => s.duration || 0));
  
  // Calculate reading streak (simplified)
  const streakDays = calculateReadingStreak(completedSessions);
  
  // Count books finished this month (simplified - would need book completion data)
  const booksFinishedThisMonth = 0; // Would need additional data
  
  return {
    totalMinutesRead,
    totalPagesRead,
    averageSessionLength,
    longestSession,
    streakDays,
    booksFinishedThisMonth,
  };
}

/**
 * Calculate current reading streak in days
 */
function calculateReadingStreak(sessions: ReadingSession[]): number {
  if (sessions.length === 0) return 0;
  
  // Sort sessions by date (newest first)
  const sortedSessions = sessions
    .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  // Check if there's a session today or yesterday
  for (const session of sortedSessions) {
    const sessionDate = new Date(session.sessionDate);
    sessionDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === streak) {
      streak++;
      currentDate = new Date(sessionDate);
    } else if (diffDays > streak) {
      break;
    }
  }
  
  return streak;
}

/**
 * Format reading time duration
 */
export function formatReadingTime(minutes: number): string {
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
 * Format pages per hour reading pace
 */
export function formatReadingPace(pagesPerHour: number): string {
  if (pagesPerHour === 0) return 'No data yet';
  
  if (pagesPerHour < 15) return `${pagesPerHour.toFixed(1)} pages/hr (Slow)`;
  if (pagesPerHour < 30) return `${pagesPerHour.toFixed(1)} pages/hr (Average)`;
  if (pagesPerHour < 50) return `${pagesPerHour.toFixed(1)} pages/hr (Fast)`;
  return `${pagesPerHour.toFixed(1)} pages/hr (Very Fast)`;
}

/**
 * Get progress percentage with safe calculation
 */
export function getProgressPercentage(book: Book): number {
  if (book.totalPages && book.totalPages > 0 && book.currentPage) {
    return Math.round((book.currentPage / book.totalPages) * 100);
  }
  
  if (book.progress) {
    return Math.round(book.progress * 100);
  }
  
  return 0;
}

/**
 * Calculate session efficiency (pages per minute)
 */
export function calculateSessionEfficiency(session: ReadingSession): number {
  if (!session.duration || !session.pagesRead || session.duration === 0) {
    return 0;
  }
  
  return session.pagesRead / session.duration;
}

/**
 * Determine if a book needs attention (hasn't been read recently)
 */
export function needsAttention(book: Book, sessions: ReadingSession[]): boolean {
  if (book.status !== 'reading') return false;
  
  const lastSession = sessions
    .filter(s => s.bookId === book.id)
    .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime())[0];
  
  if (!lastSession) return true;
  
  const daysSinceLastRead = differenceInMinutes(new Date(), lastSession.sessionDate) / (60 * 24);
  return daysSinceLastRead > 3; // Hasn't been read in 3+ days
}