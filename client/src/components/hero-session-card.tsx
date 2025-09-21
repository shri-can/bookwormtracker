import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, Clock, BookOpen, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProgressInput } from '@/components/progress-input';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useSessionState } from '@/hooks/useSessionState';
import { getProgressPercentage, calculateProgressForecast } from '@/lib/progressUtils';
import { formatSessionTime, getSessionDuration } from '@/lib/sessionUtils';
import type { Book, ReadingSession } from '@shared/schema';

interface HeroSessionCardProps {
  book: Book;
  activeSession?: ReadingSession | null;
  onSessionUpdate?: () => void;
}

export function HeroSessionCard({ book, activeSession, onSessionUpdate }: HeroSessionCardProps) {
  const queryClient = useQueryClient();
  const { actions, isLoading, error } = useSessionState(book.id);
  const { timer, startTimer, pauseTimer, resumeTimer, stopTimer, getFormattedTime } = useSessionTimer(activeSession);
  const [isStarting, setIsStarting] = useState(false);
  const [showProgressInput, setShowProgressInput] = useState(false);

  // Fetch recent sessions for progress forecasting
  const { data: recentSessions = [] } = useQuery({
    queryKey: ['/api/books', book.id, 'sessions'],
    queryFn: async () => {
      const response = await fetch(`/api/books/${book.id}/sessions?limit=10`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      return data.map((session: any) => ({
        ...session,
        startedAt: new Date(session.startedAt),
        sessionDate: new Date(session.sessionDate),
        pausedAt: session.pausedAt ? new Date(session.pausedAt) : null,
        resumedAt: session.resumedAt ? new Date(session.resumedAt) : null,
        endedAt: session.endedAt ? new Date(session.endedAt) : null,
      }));
    },
  });

  const progressPercentage = getProgressPercentage(book);
  const forecast = calculateProgressForecast(book, recentSessions);

  const handleStartSession = async () => {
    if (activeSession) return;
    
    setIsStarting(true);
    try {
      await actions.startSession({
        bookId: book.id,
        startPage: book.currentPage || 0,
      });
      startTimer();
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;
    
    try {
      await actions.pauseSession(activeSession.id);
      pauseTimer();
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to pause session:', err);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession || activeSession.state !== 'paused') return;
    
    try {
      await actions.resumeSession(activeSession.id);
      resumeTimer();
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  const handleStopSession = () => {
    if (!activeSession) return;
    setShowProgressInput(true);
  };

  const handleProgressUpdate = async (endPage: number) => {
    if (!activeSession) return;
    
    try {
      // Update book progress first
      const response = await fetch(`/api/books/${book.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: endPage }),
      });

      if (!response.ok) throw new Error('Failed to update progress');

      // Stop the session with the updated end page
      await actions.stopSession({
        sessionId: activeSession.id,
        endPage,
      });
      
      stopTimer();
      setShowProgressInput(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/books/currently-reading'] });
      queryClient.invalidateQueries({ queryKey: ['/api/books', book.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/books', book.id, 'sessions'] });
      
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  };

  const handleCancelProgressInput = () => {
    setShowProgressInput(false);
  };

  const getSessionStatusInfo = () => {
    if (!activeSession) {
      return {
        status: 'Ready to start',
        color: 'gray' as const,
        action: 'start',
      };
    }

    switch (activeSession.state) {
      case 'active':
        return {
          status: 'Reading session active',
          color: 'green' as const,
          action: 'pause',
        };
      case 'paused':
        return {
          status: 'Session paused',
          color: 'orange' as const,
          action: 'resume',
        };
      default:
        return {
          status: 'Ready to start',
          color: 'gray' as const,
          action: 'start',
        };
    }
  };

  const statusInfo = getSessionStatusInfo();

  return (
    <Card className="w-full" data-testid="card-hero-session">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-serif">{book.title}</CardTitle>
            <p className="text-muted-foreground">by {book.author}</p>
          </div>
          <Badge 
            variant={statusInfo.color === 'green' ? 'default' : statusInfo.color === 'orange' ? 'secondary' : 'outline'}
            data-testid="badge-session-status"
          >
            {statusInfo.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Reading Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {book.currentPage || 0} of {book.totalPages || 0} pages
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" data-testid="progress-book" />
          <div className="text-xs text-muted-foreground text-right">
            {progressPercentage}% complete
          </div>
        </div>

        {/* Session Timer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Session Time</span>
            </div>
            {activeSession && (
              <span className="text-xs text-muted-foreground">
                Started {formatSessionTime(activeSession.startedAt)}
              </span>
            )}
          </div>
          <div className="text-center">
            <div className="text-3xl font-mono font-bold" data-testid="text-timer">
              {getFormattedTime()}
            </div>
            {activeSession && activeSession.duration && (
              <div className="text-xs text-muted-foreground mt-1">
                Total: {getSessionDuration(activeSession)}
              </div>
            )}
          </div>
        </div>

        {/* Session Controls */}
        <div className="flex justify-center space-x-3">
          {!activeSession && (
            <Button
              size="lg"
              onClick={handleStartSession}
              disabled={isStarting || isLoading}
              data-testid="button-start-session"
            >
              <Play className="h-4 w-4 mr-2" />
              {isStarting ? 'Starting...' : 'Start Reading'}
            </Button>
          )}

          {activeSession?.state === 'active' && (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={handlePauseSession}
                disabled={isLoading}
                data-testid="button-pause-session"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopSession}
                disabled={isLoading}
                data-testid="button-stop-session"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}

          {activeSession?.state === 'paused' && (
            <>
              <Button
                size="lg"
                onClick={handleResumeSession}
                disabled={isLoading}
                data-testid="button-resume-session"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopSession}
                disabled={isLoading}
                data-testid="button-stop-session"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* Progress Forecast */}
        {forecast.estimatedTimeToFinish && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Reading Forecast</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Time to finish</div>
                <div className="font-medium" data-testid="text-time-to-finish">
                  {forecast.estimatedTimeToFinish}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Reading pace</div>
                <div className="font-medium" data-testid="text-reading-pace">
                  {forecast.averagePagesPerHour > 0 ? 
                    `${forecast.averagePagesPerHour.toFixed(1)} pages/hr` : 
                    'No data yet'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Input */}
        {showProgressInput && (
          <div className="pt-4 border-t">
            <ProgressInput
              book={book}
              onPageUpdate={() => {}} // Not used in this context
              onCancel={handleCancelProgressInput}
              onConfirm={handleProgressUpdate}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-session-error">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}