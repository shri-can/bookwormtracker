import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSessionState } from '@/hooks/useSessionState';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, Square, Clock, BookOpen, StickyNote, Quote, Bookmark, Timer, X } from 'lucide-react';
import type { Book, ReadingSession } from '@shared/schema';

interface HeroSessionCardProps {
  book: Book;
  activeSession?: ReadingSession | null;
  onSessionUpdate?: () => void;
}

export function HeroSessionCard({ book, activeSession, onSessionUpdate }: HeroSessionCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { actions, isLoading } = useSessionState(book.id);
  const { timer, startTimer, pauseTimer, resumeTimer, stopTimer, getFormattedTime } = useSessionTimer(activeSession);
  
  // Local state for finalize session
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [endPage, setEndPage] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const endPageInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for session summary
  const [sessionSummary, setSessionSummary] = useState<{
    pagesRead: number;
    duration: string;
    startPage: number;
    endPage: number;
  } | null>(null);

  // Quick action dialog states
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [notePage, setNotePage] = useState('');
  const [quotePage, setQuotePage] = useState('');

  // Calculate progress percentage
  const progressPercentage = book.totalPages && book.currentPage ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
  
  // Determine current state
  const hasActiveSession = activeSession && activeSession.state === 'active';
  const isPaused = activeSession && activeSession.state === 'paused';
  const showSessionSummary = sessionSummary !== null;
  
  // Stable onChange handler to prevent input recreation
  const handleEndPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setEndPage(newValue);
  }, []);

  // Stable onBlur handler
  const handleEndPageBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value < (activeSession?.startPage || 0)) {
      setEndPage(activeSession?.startPage || 0);
    }
  }, [activeSession?.startPage]);

  const handleStartSession = async () => {
    try {
      const session = await actions.startSession({
        bookId: book.id,
        startPage: book.currentPage ?? 0, // Use current pages read as start page
      });
      
      startTimer();
      onSessionUpdate?.();
      
      toast({
        title: "Session started",
        description: `Started reading at page ${session.startPage}`,
      });
    } catch (err) {
      console.error('Failed to start session:', err);
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      });
    }
  };

  const handlePauseSession = async () => {
    try {
      await actions.pauseSession(activeSession!.id);
      pauseTimer();
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to pause session:', err);
    }
  };

  const handleResumeSession = async () => {
    try {
      await actions.resumeSession(activeSession!.id);
      resumeTimer();
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  const handleStopSession = () => {
    // Pause timer and show finalize session
    pauseTimer();
    setIsFinalizing(true);
    const startPage = activeSession?.startPage ?? 0;
    setEndPage(startPage); // Default to start page
    
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      if (endPageInputRef.current) {
        endPageInputRef.current.focus();
        endPageInputRef.current.select(); // Select all text for easy editing
      }
    }, 100);
  };

  const handleSaveSession = async () => {
    if (!activeSession) return;
    
    setIsSaving(true);
    try {
      // Update book progress first
      await fetch(`/api/books/${book.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: endPage }),
      });

      // Stop the session
      await actions.stopSession({
        sessionId: activeSession.id,
        endPage,
      });
      
      stopTimer();
      setIsFinalizing(false);
      
      const pagesRead = endPage - (activeSession.startPage || 0);
      const duration = getFormattedTime();
      
      // Show session summary
      setSessionSummary({
        pagesRead,
        duration,
        startPage: activeSession.startPage || 0,
        endPage
      });
      
      // Update currently reading books cache (this is the main source of book data)
      queryClient.setQueryData(['/api/books/currently-reading'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((b: any) => 
          b.id === book.id ? { ...b, currentPage: endPage } : b
        );
      });
      
      // Immediately set the active session query to null
      queryClient.setQueryData(['/api/books', book.id, 'active-session'], null);
      
      // Invalidate other queries to refresh data (but not currently-reading since we updated it optimistically)
      queryClient.invalidateQueries({ queryKey: ['/api/books', book.id, 'sessions'] });
      
      onSessionUpdate?.();
    } catch (err) {
      console.error('Failed to save session:', err);
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSession = () => {
    // Resume timer if session was active
    if (hasActiveSession) {
      resumeTimer();
    }
    setIsFinalizing(false);
  };

  const handleStartNewSession = () => {
    // Clear session summary and return to idle
    setSessionSummary(null);
  };

  // Quick action handlers
  const handleAddNote = () => {
    setNoteText('');
    setNotePage('');
    setShowNoteDialog(true);
  };

  const handleAddQuote = () => {
    setQuoteText('');
    setQuotePage('');
    setShowQuoteDialog(true);
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
      // TODO: Save to backend
      toast({
        title: "Note Added",
        description: `Note saved for ${book.title}`,
      });
      setShowNoteDialog(false);
      setNoteText('');
      setNotePage('');
    }
  };

  const handleSaveQuote = () => {
    if (quoteText.trim()) {
      // TODO: Save to backend
      toast({
        title: "Quote Added",
        description: `Quote saved for ${book.title}`,
      });
      setShowQuoteDialog(false);
      setQuoteText('');
      setQuotePage('');
    }
  };

  const handleAddBookmark = () => {
    const pageNumber = prompt("Add bookmark at page:");
    if (pageNumber && !isNaN(Number(pageNumber))) {
      // TODO: Implement bookmark saving to backend
      toast({
        title: "Bookmark Added",
        description: `Bookmark saved at page ${pageNumber}`,
      });
    } else if (pageNumber) {
      toast({
        title: "Invalid Page",
        description: "Please enter a valid page number",
        variant: "destructive",
      });
    }
  };

  const handleToggleTimer = () => {
    if (activeSession) {
      // If session is active, show timer info
      const duration = activeSession.duration || 0;
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      toast({
        title: "Current Session Timer",
        description: `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`,
      });
    } else {
      // If no session, start a quick session
      handleStartSession();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold">{book.title}</CardTitle>
            <p className="text-muted-foreground">by {book.author}</p>
          </div>
          {hasActiveSession && (
            <Badge variant="default" className="bg-green-500">
              Reading session active
            </Badge>
          )}
          {isPaused && (
            <Badge variant="secondary">
              Session paused
            </Badge>
          )}
          {isFinalizing && (
            <Badge variant="outline">
              Finalizing session
            </Badge>
          )}
          {showSessionSummary && (
            <Badge variant="default" className="bg-blue-500">
              Session completed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reading Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Reading Progress</span>
            <span>{book.currentPage} of {book.totalPages || '?'} pages ({progressPercentage}%)</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Session Time */}
        {activeSession && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Session Time</span>
              <span>Started {activeSession.startedAt.toLocaleTimeString()}</span>
            </div>
            <div className="text-3xl font-mono font-bold text-center">
              {getFormattedTime()}
            </div>
          </div>
        )}

        {/* Session Summary */}
        {showSessionSummary ? (
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <h3 className="font-medium text-lg text-blue-900 dark:text-blue-100">Session Completed!</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Great job on your reading session</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sessionSummary.pagesRead}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Pages Read</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sessionSummary.duration}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Duration</div>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>Started at page {sessionSummary.startPage} → Ended at page {sessionSummary.endPage}</p>
            </div>
            
            <Button 
              onClick={handleStartNewSession} 
              className="w-full"
              size="lg"
            >
              Done
            </Button>
          </div>
        ) : !isFinalizing ? (
          <div className="flex gap-2">
            {!activeSession ? (
              <Button 
                onClick={handleStartSession} 
                disabled={isLoading}
                className="flex-1"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Reading
              </Button>
            ) : (
              <>
                {hasActiveSession ? (
                  <Button 
                    onClick={handlePauseSession} 
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button 
                    onClick={handleResumeSession} 
                    className="flex-1"
                    size="lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button 
                  onClick={handleStopSession} 
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
          </div>
        ) : (
          /* Finalize Session */
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
            <div className="text-center">
              <h3 className="font-medium text-sm">Finalize Session</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Started reading at {activeSession?.startPage || 0} pages
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endPage">End Page (absolute page number)</Label>
              <Input
                key="endPage-input"
                ref={endPageInputRef}
                id="endPage"
                type="number"
                value={endPage}
                onChange={handleEndPageChange}
                onBlur={handleEndPageBlur}
                min={activeSession?.startPage || 0}
                max={book.totalPages || undefined}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoFocus={isFinalizing}
              />
              <p className="text-xs text-muted-foreground">
                Pages read: {endPage - (activeSession?.startPage || 0)}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleCancelSession} 
                variant="outline"
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSession} 
                className="flex-1"
                disabled={isSaving || endPage < (activeSession?.startPage || 0)}
              >
                {isSaving ? 'Saving...' : 'Save Session'}
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions - Always visible */}
        <div className="flex justify-center gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddNote}
            className="h-9 w-9 p-0"
            aria-label="Add Note"
          >
            <StickyNote className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddQuote}
            className="h-9 w-9 p-0"
            aria-label="Add Quote"
          >
            <Quote className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddBookmark}
            className="h-9 w-9 p-0"
            aria-label="Add Bookmark"
          >
            <Bookmark className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleToggleTimer}
            className="h-9 w-9 p-0"
            aria-label="Timer"
          >
            <Timer className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>

      {/* Quick Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Add Note</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNoteDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="note-text">Note</Label>
                <textarea
                  id="note-text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter your note..."
                  className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="note-page">Page (optional)</Label>
                <Input
                  id="note-page"
                  type="number"
                  value={notePage}
                  onChange={(e) => setNotePage(e.target.value)}
                  placeholder="Page number"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNoteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNote}
                  disabled={!noteText.trim()}
                >
                  Save Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Quote Dialog */}
      {showQuoteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Add Quote</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuoteDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="quote-text">Quote</Label>
                <textarea
                  id="quote-text"
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Enter the quote..."
                  className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="quote-page">Page (optional)</Label>
                <Input
                  id="quote-page"
                  type="number"
                  value={quotePage}
                  onChange={(e) => setQuotePage(e.target.value)}
                  placeholder="Page number"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQuoteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveQuote}
                  disabled={!quoteText.trim()}
                >
                  Save Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
