import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, Clock, BookOpen, Target, Timer, ChevronDown, ChevronUp, FileText, Quote, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useSessionState } from '@/hooks/useSessionState';
import { useActiveSession } from '@/hooks/useActiveSession';
import { getProgressPercentage, calculateProgressForecast } from '@/lib/progressUtils';
import { formatSessionTime, getSessionDuration } from '@/lib/sessionUtils';
import { useToast } from '@/hooks/use-toast';
import type { Book, ReadingSession } from '@shared/schema';

interface HeroSessionCardProps {
  book: Book;
  activeSession?: ReadingSession | null;
  onSessionUpdate?: () => void;
  onSessionStart?: () => void;
}

export function HeroSessionCard({ book, activeSession, onSessionUpdate, onSessionStart }: HeroSessionCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { actions, isLoading, error } = useSessionState(book.id);
  const { activeSession: activeSessionState, setActiveSession, updateActiveSessionState, clearActiveSession } = useActiveSession();
  const { timer, startTimer, pauseTimer, resumeTimer, stopTimer, getFormattedTime } = useSessionTimer(activeSession);
  const [isStarting, setIsStarting] = useState(false);
  const [endPage, setEndPage] = useState<number>(0);
  const [showMiniStats, setShowMiniStats] = useState(false);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);

  // Determine if we're in finalize mode
  const showFinalizeSession = activeSessionState?.state === 'finalizing';

  // Sync activeSessionState with activeSession prop when it changes
  useEffect(() => {
    console.log('activeSession prop changed:', activeSession);
    if (activeSession && !activeSessionState) {
      // Initialize active session state from prop
      setActiveSession({
        id: activeSession.id,
        bookId: activeSession.bookId,
        startAt: activeSession.startedAt.toISOString(),
        startPage: activeSession.startPage || 0,
        state: activeSession.state === 'paused' ? 'paused' : 'active',
      });
    } else if (!activeSession && activeSessionState) {
      // Clear active session state when prop is null
      console.log('Clearing active session state because activeSession prop is null');
      clearActiveSession();
    }
  }, [activeSession, activeSessionState, setActiveSession, clearActiveSession]);

  // Update activeSessionState when activeSession prop changes (for existing sessions)
  useEffect(() => {
    if (activeSession && activeSessionState && activeSession.id === activeSessionState.id) {
      // Update existing active session state if startPage changed
      if (activeSession.startPage !== activeSessionState.startPage) {
        setActiveSession({
          ...activeSessionState,
          startPage: activeSession.startPage || 0,
        });
      }
    }
  }, [activeSession?.startPage, activeSessionState, setActiveSession]);

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
      // Auto-fill start page from last session or current page
      let startPage = book.currentPage || 0;
      const lastEndPage = await actions.getLastEndPage(book.id);
      if (lastEndPage !== null) {
        startPage = lastEndPage;
      }
      
      const session = await actions.startSession({
        bookId: book.id,
        startPage,
      });
      
      
      // Set active session with startPage as single source of truth
      setActiveSession({
        id: session.id,
        bookId: book.id,
        startAt: session.startedAt.toISOString(),
        startPage: session.startPage || startPage, // Use returned or computed startPage
        state: 'active',
      });
      
      startTimer();
      
      // Invalidate active session query to get updated data
      queryClient.invalidateQueries({ queryKey: ['/api/books', book.id, 'active-session'] });
      
      // Enable the query in the parent component
      onSessionStart?.();
      
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
      updateActiveSessionState('paused');
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
      updateActiveSessionState('active');
      resumeTimer();
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  const handleStopSession = () => {
    if (!activeSession) return;
    // Freeze timer and show finalize session card
    pauseTimer();
    updateActiveSessionState('finalizing');
    // Use startPage from activeSessionState if available, otherwise from activeSession prop
    const startPage = activeSessionState?.startPage ?? activeSession.startPage ?? 0;
    setEndPage(startPage);
  };

  const handleSaveSession = async () => {
    if (!activeSession) return;
    
    try {
      // Calculate pages read from start page
      const startPage = activeSessionState?.startPage ?? activeSession.startPage ?? 0;
      const pagesRead = Math.max(0, endPage - startPage);
      
      // Update book progress first
      const response = await fetch(`/api/books/${book.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: endPage }),
      });

      if (!response.ok) throw new Error('Failed to update progress');

      // Stop the session with the updated end page
      const stoppedSession = await actions.stopSession({
        sessionId: activeSession.id,
        endPage,
      });
      
      console.log('Session stopped, server response:', stoppedSession);
      
      stopTimer();
      
      // Update query caches with new book progress
      queryClient.setQueryData(['/api/books', book.id], (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, currentPage: endPage };
      });
      
      queryClient.setQueryData(['/api/books/currently-reading'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((b: any) => 
          b.id === book.id ? { ...b, currentPage: endPage } : b
        );
      });
      
      // Clear active session to prevent stale startPage
      console.log('Clearing active session state');
      clearActiveSession();
      
      // Force clear the endPage state as well
      setEndPage(0);
      
      // Show session summary toast
      toast({
        title: "Session completed",
        description: `Read ${pagesRead} pages in ${getFormattedTime()}`,
      });
      
      // Directly set the active session query to null to clear it immediately
      console.log('Setting active session query to null for book:', book.id);
      queryClient.setQueryData(['/api/books', book.id, 'active-session'], null);
      
      // Invalidate relevant queries to refresh the UI (but not the active session query)
      queryClient.invalidateQueries({ queryKey: ['/api/books/currently-reading'] });
      queryClient.invalidateQueries({ queryKey: ['/api/books', book.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/books', book.id, 'sessions'] });
      
      // Force parent component to re-render by calling the update callback
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to stop session:', err);
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
    }
  };

  const handleCancelSession = () => {
    // Resume timer and hide finalize session
    if (activeSession?.state === 'paused') {
      resumeTimer();
      updateActiveSessionState('paused');
    } else {
      // If not paused, clear the active session completely
      clearActiveSession();
      setEndPage(0);
    }
  };



  // Pomodoro timer functionality
  const handleStartPomodoro = () => {
    setIsPomodoroActive(true);
    // Start a session with Pomodoro timer
    handleStartSession();
  };

  const handleStopPomodoro = () => {
    setIsPomodoroActive(false);
    if (activeSession) {
      handleStopSession();
    }
  };

  const getSessionStatusInfo = () => {
    if (showFinalizeSession) {
      return {
        status: 'Finalizing session',
        color: 'blue' as const,
        action: 'finalize',
      };
    }

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

  // Quick Actions Row Component
  const QuickActionsRow = () => (
    <TooltipProvider>
      <div className="flex justify-center space-x-2 py-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              aria-label="Add Note"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Note</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              aria-label="Add Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Quote</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              aria-label="Bookmark Page"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bookmark Page</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={isPomodoroActive ? handleStopPomodoro : handleStartPomodoro}
              aria-label={isPomodoroActive ? "Stop Pomodoro Timer" : "Start Pomodoro Timer"}
            >
              <Timer className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPomodoroActive ? "Stop Pomodoro Timer" : "Start Pomodoro Timer"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

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

      <CardContent className="space-y-3">
        {/* Progress Section - Compact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Reading Progress</span>
            <span className="text-sm text-muted-foreground">
              {book.currentPage || 0} of {book.totalPages || 0} pages ({progressPercentage}%)
            </span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" data-testid="progress-book" />
        </div>

        {/* Session Timer - Compact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Session Time</span>
            {activeSession && (
              <span className="text-xs text-muted-foreground">
                Started {formatSessionTime(activeSession.startedAt)}
              </span>
            )}
          </div>
          <div className="text-center py-1">
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

        {/* Session Controls - Compact */}
        {!showFinalizeSession && (
          <div className="space-y-2">
            <div className="flex justify-center">
              {!activeSession && (
                <Button
                  size="lg"
                  onClick={handleStartSession}
                  disabled={isStarting || isLoading}
                  data-testid="button-start-session"
                  className="min-h-[44px] px-8"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isStarting ? 'Starting...' : 'Start Reading'}
                </Button>
              )}

              {activeSession?.state === 'active' && (
                <div className="flex space-x-3">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handlePauseSession}
                    disabled={isLoading}
                    data-testid="button-pause-session"
                    className="min-h-[44px]"
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
                    className="min-h-[44px]"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </div>
              )}

              {activeSession?.state === 'paused' && (
                <div className="flex space-x-3">
                  <Button
                    size="lg"
                    onClick={handleResumeSession}
                    disabled={isLoading}
                    data-testid="button-resume-session"
                    className="min-h-[44px]"
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
                    className="min-h-[44px]"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Actions Row */}
            <QuickActionsRow />
          </div>
        )}

        {/* Finalize Session Card */}
        {showFinalizeSession && (activeSessionState || activeSession) && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
            <div className="text-center">
              <h3 className="font-medium text-sm">Finalize Session</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Started at page {activeSessionState?.startPage ?? activeSession?.startPage ?? 0}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">End Page</label>
                <span className="text-xs text-muted-foreground">
                  Pages read: {Math.max(0, endPage - (activeSessionState?.startPage ?? activeSession?.startPage ?? 0))}
                </span>
              </div>
              <Input
                type="number"
                value={endPage}
                onChange={(e) => setEndPage(Number(e.target.value))}
                className="text-center"
                min={activeSessionState?.startPage ?? activeSession?.startPage ?? 0}
                max={book.totalPages || 9999}
                inputMode="numeric"
                pattern="[0-9]*"
                data-testid="input-end-page"
              />
              {endPage < (activeSessionState?.startPage ?? activeSession?.startPage ?? 0) && (
                <p className="text-xs text-destructive text-center">
                  End page cannot be less than start page
                </p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSession}
                className="flex-1"
                data-testid="button-cancel-session"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSession}
                disabled={isLoading || endPage < (activeSessionState?.startPage ?? activeSession?.startPage ?? 0)}
                className="flex-1"
                data-testid="button-save-session"
              >
                Save Session
              </Button>
            </div>
          </div>
        )}

        {/* Mini Stats - Collapsible */}
        <Collapsible open={showMiniStats} onOpenChange={setShowMiniStats}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-2 py-1 h-8">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Reading Stats</span>
              </div>
              {showMiniStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-2 pb-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Today's target</div>
                <div className="font-medium" data-testid="text-todays-target">
                  {forecast.dailyTarget || 12} pages
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">ETA</div>
                <div className="font-medium" data-testid="text-eta">
                  {forecast.estimatedTimeToFinish || 'Sun, 29 Sep'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Pace</div>
                <div className="font-medium" data-testid="text-pace">
                  {forecast.averagePagesPerHour > 0 ? 
                    `${forecast.averagePagesPerHour.toFixed(0)} pph` : 
                    '28 pph'
                  }
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Progress</div>
                <div className="font-medium" data-testid="text-progress">
                  {progressPercentage}%
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>



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