import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBookSessions } from '@/hooks/useBookSessions';
import { BookSwitcher } from '@/components/book-switcher-intelligent';
import { HeroSessionCard } from '@/components/hero-session-card-clean';
import { AddBookDialog } from '@/components/add-book-dialog';
import { SessionsSummary } from '@/components/sessions-summary';
import { BookNotesQuotes } from '@/components/book-notes-quotes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Plus } from 'lucide-react';
import type { Book, ReadingSession } from '@shared/schema';

export default function CurrentlyReading() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);

  // Query for currently reading books to initialize the selected book
  const { data: currentlyReadingBooks = [], isLoading: isLoadingBooks, error: booksError } = useQuery({
    queryKey: ['/api/books/currently-reading'],
    queryFn: async () => {
      const response = await fetch('/api/books/currently-reading');
      if (!response.ok) throw new Error('Failed to fetch currently reading books');
      const data = await response.json();
      return data.map((book: any) => ({
        ...book,
        addedAt: new Date(book.addedAt),
        lastReadAt: book.lastReadAt ? new Date(book.lastReadAt) : null,
        startedAt: book.startedAt ? new Date(book.startedAt) : null,
        completedAt: book.completedAt ? new Date(book.completedAt) : null,
      })) as Book[];
    },
  });

  // Get the current selected book from the latest cache data
  const currentSelectedBook = selectedBook && currentlyReadingBooks.length > 0 
    ? currentlyReadingBooks.find(book => book.id === selectedBook.id) || currentlyReadingBooks[0]
    : currentlyReadingBooks[0] || null;

  // Query for active session of selected book (moved here to fix hooks rule violation)
  const { data: activeSession, refetch: refetchActiveSession } = useQuery({
    queryKey: ['/api/books', currentSelectedBook?.id, 'active-session'],
    queryFn: async () => {
      if (!currentSelectedBook) return null;
      
      const response = await fetch(`/api/books/${currentSelectedBook.id}/active-session`);
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
    enabled: !!currentSelectedBook,
  });

  // Query for book sessions
  const { data: bookSessions = [] } = useBookSessions(currentSelectedBook?.id || '', {
    state: 'completed', // Only get completed sessions for the summary
  });

  // Auto-select the first book if none is selected
  useEffect(() => {
    if (!selectedBook && currentlyReadingBooks.length > 0) {
      setSelectedBook(currentlyReadingBooks[0]);
    }
  }, [currentlyReadingBooks, selectedBook]);


  // Show loading state
  if (isLoadingBooks) {
    return (
      <div className="space-y-6" data-testid="page-currently-reading">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Currently Reading</h1>
          <p className="text-muted-foreground mt-1">
            Track your reading sessions with advanced timer and progress forecasting
          </p>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (booksError) {
    return (
      <div className="space-y-6" data-testid="page-currently-reading">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Currently Reading</h1>
          <p className="text-muted-foreground mt-1">
            Track your reading sessions with advanced timer and progress forecasting
          </p>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-destructive mb-4">Error loading books</div>
            <p className="text-muted-foreground">
              {booksError instanceof Error ? booksError.message : 'Failed to load currently reading books'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }


  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
  };

  const handleSessionUpdate = () => {
    // Simply invalidate queries to refresh data
    refetchActiveSession();
  };

  const handleAddNewBook = () => {
    setShowAddBookDialog(true);
  };

  // Show empty state if no books are currently being read
  if (currentlyReadingBooks.length === 0) {
    return (
      <div className="space-y-6" data-testid="page-currently-reading">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Currently Reading</h1>
          <p className="text-muted-foreground mt-1">
            Advanced session tracking for your active books
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">No books currently reading</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start your first reading session with our advanced timer and progress tracking. 
              Add a book and begin tracking your reading journey.
            </p>
            <Button onClick={handleAddNewBook} size="lg" data-testid="button-add-first-book">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Book
            </Button>
          </CardContent>
        </Card>

        <AddBookDialog
          open={showAddBookDialog}
          onOpenChange={setShowAddBookDialog}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="page-currently-reading">
      {/* Compact Header */}
      <div className="pt-2">
        <h1 className="text-2xl md:text-3xl font-serif font-semibold">Currently Reading</h1>
        <p className="text-muted-foreground mt-1 hidden md:block">
          Track your reading sessions with advanced timer and progress forecasting
        </p>
      </div>

      {/* Sticky Book Switcher */}
      <div className="sticky top-4 z-10 bg-background/95 backdrop-blur-sm border-b pb-4">
        <BookSwitcher
          books={currentlyReadingBooks}
          activeId={selectedBook?.id}
          onSwitch={handleBookSelect}
          onAdd={handleAddNewBook}
        />
      </div>

      {/* Main Content with Tabs */}
      {currentSelectedBook && (
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="session" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="session">Reading Session</TabsTrigger>
              <TabsTrigger value="summary">Session History</TabsTrigger>
              <TabsTrigger value="notes">Notes & Quotes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="session" className="mt-6">
              <HeroSessionCard
                book={currentSelectedBook}
                activeSession={activeSession}
                onSessionUpdate={handleSessionUpdate}
              />
            </TabsContent>
            
            <TabsContent value="summary" className="mt-6">
              <SessionsSummary 
                book={currentSelectedBook} 
                sessions={bookSessions} 
              />
            </TabsContent>
            
            <TabsContent value="notes" className="mt-6">
              <BookNotesQuotes 
                book={currentSelectedBook} 
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {!selectedBook && currentlyReadingBooks.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a book to start reading</h3>
            <p className="text-muted-foreground">
              Choose a book from the switcher above to begin your reading session
            </p>
          </CardContent>
        </Card>
      )}

      <AddBookDialog
        open={showAddBookDialog}
        onOpenChange={setShowAddBookDialog}
      />
    </div>
  );
}