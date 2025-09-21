import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { HeaderSearchFilters } from '@/components/notes/header-search-filters';
import { QuickCaptureInline } from '@/components/notes/quick-capture-inline';
import { NotesListVirtualized } from '@/components/notes/notes-list-virtualized';
import { EditNoteSheet } from '@/components/notes/edit-note-sheet';
import type { BookNote, Book } from '@shared/schema';

interface FilterState {
  books: string[];
  types: string[];
  tags: string[];
  hasImage: boolean | null;
  dateRange: string | null;
}

const initialFilters: FilterState = {
  books: [],
  types: [],
  tags: [],
  hasImage: null,
  dateRange: null,
};

export default function Notes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [selectedNote, setSelectedNote] = useState<BookNote | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showQuickCaptureSheet, setShowQuickCaptureSheet] = useState(false);

  // Fetch all notes
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['/api/notes'],
    queryFn: async () => {
      const response = await fetch('/api/notes');
      if (!response.ok) throw new Error('Failed to fetch notes');
      const data = await response.json();
      return data.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
      })) as BookNote[];
    },
  });

  // Fetch all books for filtering
  const { data: allBooks = [] } = useQuery({
    queryKey: ['/api/books'],
    queryFn: async () => {
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('Failed to fetch books');
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

  // Get notes with book data enriched
  const notesWithBooks = useMemo(() => {
    return notes.map(note => ({
      ...note,
      book: allBooks.find(book => book.id === note.bookId),
    }));
  }, [notes, allBooks]);

  // Extract available tags for filtering
  const availableTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    notes.forEach(note => {
      note.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [notes]);

  // Filter and search notes
  const filteredNotes = useMemo(() => {
    let filtered = notesWithBooks;

    // Text search - searches content, book title/author, tags, page numbers
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(note => {
        const matchesContent = note.content.toLowerCase().includes(searchLower);
        const matchesBook = note.book?.title.toLowerCase().includes(searchLower) ||
                           note.book?.author.toLowerCase().includes(searchLower);
        const matchesTags = note.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        const matchesPage = note.page?.toString().includes(searchLower);
        
        return matchesContent || matchesBook || matchesTags || matchesPage;
      });
    }

    // Book filter
    if (filters.books.length > 0) {
      filtered = filtered.filter(note => filters.books.includes(note.bookId));
    }

    // Type filter
    if (filters.types.length > 0) {
      filtered = filtered.filter(note => filters.types.includes(note.noteType));
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(note => 
        note.tags?.some(tag => filters.tags.includes(tag))
      );
    }

    // Has image filter
    if (filters.hasImage !== null) {
      filtered = filtered.filter(note => 
        filters.hasImage ? !!note.sourceImage : !note.sourceImage
      );
    }

    // Date range filter
    if (filters.dateRange) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateRange) {
        case 'today':
          filtered = filtered.filter(note => note.createdAt >= startOfToday);
          break;
        case '7d':
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(note => note.createdAt >= sevenDaysAgo);
          break;
        case '30d':
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(note => note.createdAt >= thirtyDaysAgo);
          break;
        // Custom date range would need additional UI
      }
    }

    // Sort by most recent
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [notesWithBooks, searchTerm, filters]);

  const handleQuickCaptureOpen = () => {
    setShowQuickCaptureSheet(true);
  };

  const handleEditNote = (note: BookNote) => {
    setSelectedNote(note);
    setShowEditSheet(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      // Note deletion is handled by the edit sheet component
      console.log('Delete note:', noteId);
    }
  };

  const handleMakeRecall = (noteId: string) => {
    // TODO: Implement recall functionality
    console.log('Make recall for note:', noteId);
  };

  const handleNoteCapture = () => {
    setShowQuickCaptureSheet(false);
  };

  const handleNoteUpdated = () => {
    setShowEditSheet(false);
    setSelectedNote(null);
  };

  const handleNoteDeleted = () => {
    setShowEditSheet(false);
    setSelectedNote(null);
  };

  return (
    <div className="flex flex-col h-screen" data-testid="page-notes">
      {/* Sticky header with search and filters */}
      <HeaderSearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        onQuickCaptureOpen={handleQuickCaptureOpen}
        availableBooks={allBooks}
        availableTags={availableTags}
        noteCount={filteredNotes.length}
      />

      {/* Quick capture inline (collapsed) */}
      <div className="px-4">
        <QuickCaptureInline
          isCollapsed={true}
          onCapture={handleNoteCapture}
        />
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-hidden">
        {isLoadingNotes ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading notes...</div>
          </div>
        ) : (
          <NotesListVirtualized
            notes={filteredNotes}
            onEditNote={handleEditNote}
            onDeleteNote={handleDeleteNote}
            onMakeRecall={handleMakeRecall}
          />
        )}
      </div>

      {/* Quick capture bottom sheet */}
      <Sheet open={showQuickCaptureSheet} onOpenChange={setShowQuickCaptureSheet}>
        <SheetContent side="bottom" className="h-[80vh]" data-testid="sheet-quick-capture">
          <SheetHeader>
            <SheetTitle>Quick Capture</SheetTitle>
            <SheetDescription>
              Add a note in ≤3 taps with automatic book and page linking
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <QuickCaptureInline
              isCollapsed={false}
              onCapture={handleNoteCapture}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit note sheet */}
      <EditNoteSheet
        note={selectedNote}
        isOpen={showEditSheet}
        onOpenChange={setShowEditSheet}
        onUpdated={handleNoteUpdated}
        onDeleted={handleNoteDeleted}
      />

      {/* Optional: Bottom bar for recall queue */}
      {/* TODO: Implement recall system
      <div className="border-t p-4 bg-background">
        <Button variant="outline" className="w-full">
          Today's 5 to review
        </Button>
      </div>
      */}
    </div>
  );
}