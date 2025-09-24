import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import type { Book, ReadingSession } from '@shared/schema';

interface SessionsSummaryProps {
  book: Book;
  sessions: ReadingSession[];
}

export function SessionsSummary({ book, sessions }: SessionsSummaryProps) {
  // Debug: Log the sessions being passed
  console.log('SessionsSummary - Book:', book.title, 'Sessions count:', sessions.length, 'Sessions:', sessions);
  
  // Calculate session statistics
  const totalSessions = sessions.length;
  const totalPagesRead = sessions.reduce((sum, session) => sum + (session.pagesRead || 0), 0);
  const totalMinutes = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
  const averagePagesPerSession = totalSessions > 0 ? Math.round(totalPagesRead / totalSessions) : 0;
  const averageMinutesPerSession = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
  
  // Calculate reading speed (pages per hour)
  const totalHours = totalMinutes / 60;
  const pagesPerHour = totalHours > 0 ? Math.round(totalPagesRead / totalHours) : 0;
  
  // Calculate progress percentage
  const progressPercentage = book.totalPages && book.currentPage ? 
    Math.round((book.currentPage / book.totalPages) * 100) : 0;

  // Get recent sessions (last 5)
  const recentSessions = sessions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Book Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{book.title}</CardTitle>
          <p className="text-sm text-muted-foreground">by {book.author}</p>
        </CardHeader>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalSessions}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalPagesRead}</p>
                <p className="text-xs text-muted-foreground">Pages Read</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{formatDuration(totalMinutes)}</p>
                <p className="text-xs text-muted-foreground">Total Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{pagesPerHour}</p>
                <p className="text-xs text-muted-foreground">Pages/Hour</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reading Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reading Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{book.currentPage || 0} of {book.totalPages || '?'} pages</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Session Averages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{averagePagesPerSession}</p>
              <p className="text-sm text-muted-foreground">Pages per session</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatDuration(averageMinutesPerSession)}</p>
              <p className="text-sm text-muted-foreground">Time per session</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No sessions yet</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session, index) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {session.pagesRead || 0} pages
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(session.duration || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
