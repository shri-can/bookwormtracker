import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { History, Calendar, BookOpen, Plus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface ReadingSession {
  id: string;
  startPage: number;
  endPage: number;
  sessionDate: string;
  notes?: string;
}

interface ReadingSessionHistoryProps {
  bookId: string;
  sessions: ReadingSession[];
  onAddSession?: (session: { startPage: number; endPage: number; notes?: string }) => void;
}

export function ReadingSessionHistory({ bookId, sessions, onAddSession }: ReadingSessionHistoryProps) {
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newSession, setNewSession] = useState({
    startPage: "",
    endPage: "", 
    notes: "",
  });

  const totalPagesRead = sessions.reduce((sum, session) => 
    sum + (session.endPage - session.startPage), 0
  );

  const averageSessionLength = sessions.length > 0 
    ? Math.round(totalPagesRead / sessions.length) 
    : 0;

  const handleAddSession = () => {
    const startPage = parseInt(newSession.startPage);
    const endPage = parseInt(newSession.endPage);
    
    if (startPage >= 0 && endPage > startPage) {
      onAddSession?.({
        startPage,
        endPage,
        notes: newSession.notes.trim() || undefined,
      });
      setNewSession({ startPage: "", endPage: "", notes: "" });
      setIsAddingSession(false);
      console.log(`Added reading session: pages ${startPage}-${endPage}`);
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
  );

  return (
    <Card data-testid={`card-session-history-${bookId}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Reading Sessions
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsAddingSession(true)}
            data-testid={`button-add-session-${bookId}`}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Session
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold" data-testid={`text-total-sessions-${bookId}`}>
              {sessions.length}
            </div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold" data-testid={`text-total-pages-read-${bookId}`}>
              {totalPagesRead}
            </div>
            <div className="text-xs text-muted-foreground">Pages Read</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold" data-testid={`text-avg-session-${bookId}`}>
              {averageSessionLength}
            </div>
            <div className="text-xs text-muted-foreground">Avg/Session</div>
          </div>
        </div>

        {/* Add Session Form */}
        {isAddingSession && (
          <Card className="border-dashed" data-testid={`form-add-session-${bookId}`}>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Start Page</label>
                  <input
                    type="number"
                    value={newSession.startPage}
                    onChange={(e) => setNewSession(prev => ({ ...prev, startPage: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="0"
                    data-testid={`input-start-page-${bookId}`}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Page</label>
                  <input
                    type="number"
                    value={newSession.endPage}
                    onChange={(e) => setNewSession(prev => ({ ...prev, endPage: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="0"
                    data-testid={`input-end-page-${bookId}`}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Session Notes (Optional)</label>
                <Textarea
                  value={newSession.notes}
                  onChange={(e) => setNewSession(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="What did you learn or find interesting?"
                  className="mt-1"
                  data-testid={`textarea-session-notes-${bookId}`}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleAddSession}
                  data-testid={`button-save-session-${bookId}`}
                >
                  Save Session
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsAddingSession(false)}
                  data-testid={`button-cancel-session-${bookId}`}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session History */}
        {sortedSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid={`empty-sessions-${bookId}`}>
            <BookOpen className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">No reading sessions recorded yet</p>
            <p className="text-xs">Add your first session to start tracking your progress</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid={`list-sessions-${bookId}`}>
            <h4 className="text-sm font-medium text-muted-foreground">Recent Sessions</h4>
            {sortedSessions.slice(0, 5).map((session, index) => (
              <div 
                key={session.id} 
                className="flex items-start gap-3 p-3 border rounded-lg hover-elevate"
                data-testid={`session-${session.id}-${bookId}`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" data-testid={`badge-pages-${session.id}`}>
                      Pages {session.startPage}-{session.endPage}
                    </Badge>
                    <Badge variant="secondary" data-testid={`badge-read-${session.id}`}>
                      +{session.endPage - session.startPage} pages
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span data-testid={`text-session-date-${session.id}`}>
                      {format(new Date(session.sessionDate), "MMM dd, yyyy 'at' h:mm a")}
                    </span>
                    <span>•</span>
                    <span data-testid={`text-session-ago-${session.id}`}>
                      {formatDistanceToNow(new Date(session.sessionDate), { addSuffix: true })}
                    </span>
                  </div>
                  {session.notes && (
                    <p className="text-sm text-muted-foreground mt-2" data-testid={`text-session-notes-${session.id}`}>
                      {session.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {sortedSessions.length > 5 && (
              <p className="text-xs text-center text-muted-foreground">
                ...and {sortedSessions.length - 5} more sessions
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}