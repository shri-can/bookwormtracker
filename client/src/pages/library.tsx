import { useState, useEffect, useCallback, useMemo } from "react";
import { BookCard } from "@/components/book-card";
import { AddBookDialog } from "@/components/add-book-dialog";
import { BulkUploadDialog } from "@/components/bulk-upload-dialog";
import { BookSearchDialog } from "@/components/book-search-dialog";
import { ExportDialog } from "@/components/export-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Loader2,
  Grid3X3,
  List,
  CheckSquare,
  Square,
  ChevronDown,
  X,
  Plus,
  Trash2,
  Tag,
  RotateCcw,
  Download,
  Upload
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BOOK_GENRES, BOOK_STATUSES } from "@shared/schema";
import type { Book, InsertBook } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// URL state management types
interface LibraryFilters {
  search: string;
  statuses: string[];
  genres: string[];
  tags: string[];
  sort: string;
  sortOrder: "asc" | "desc";
  view: "grid" | "list";
}

// Status display configuration
const STATUS_CONFIG = {
  toRead: { label: "To-Read", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  reading: { label: "Reading", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  onHold: { label: "On-Hold", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  dnf: { label: "DNF", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  finished: { label: "Finished", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

const SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "addedAt", label: "Recently Added" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "lastReadAt", label: "Last Read" },
  { value: "progress", label: "Progress" },
];

export default function Library() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);
  
  // Debounced search state
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Parse URL state
  const urlParams = useMemo(() => new URLSearchParams(location.split('?')[1] || ''), [location]);
  
  const filters: LibraryFilters = useMemo(() => ({
    search: debouncedSearch || "",
    statuses: urlParams.get('statuses')?.split(',').filter(Boolean) || [],
    genres: urlParams.get('genres')?.split(',').filter(Boolean) || [],
    tags: urlParams.get('tags')?.split(',').filter(Boolean) || [],
    sort: urlParams.get('sort') || "priority",
    sortOrder: (urlParams.get('sortOrder') as "asc" | "desc") || "desc",
    view: (urlParams.get('view') as "grid" | "list") || (localStorage.getItem('library-view') as "grid" | "list") || "grid",
  }), [urlParams, debouncedSearch]);

  // Update URL when filters change
  const updateURL = useCallback((newFilters: Partial<LibraryFilters>) => {
    const params = new URLSearchParams(urlParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        } else {
          params.delete(key);
        }
      } else if (value === "" || (key === 'search' && !value)) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    // Update view in localStorage
    if (newFilters.view) {
      localStorage.setItem('library-view', newFilters.view);
    }
    
    setLocation('?' + params.toString());
  }, [urlParams, setLocation]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Update URL when search changes
  useEffect(() => {
    if (searchValue !== (urlParams.get('search') || '')) {
      updateURL({ search: debouncedSearch });
    }
  }, [debouncedSearch, updateURL, urlParams]);

  // Fetch books with filters
  const { data: books = [], isLoading, error } = useQuery<Book[]>({
    queryKey: ["/api/books", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.statuses.length) params.set('statuses', filters.statuses.join(','));
      if (filters.genres.length) params.set('genres', filters.genres.join(','));
      if (filters.tags.length) params.set('tags', filters.tags.join(','));
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
      
      const response = await apiRequest("GET", `/api/books?${params.toString()}`);
      return response.json();
    },
  });

  // Get unique values for filter options
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    books.forEach(book => {
      (book.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [books]);

  // Mutations
  const addBookMutation = useMutation({
    mutationFn: async (bookData: InsertBook) => {
      const response = await apiRequest("POST", "/api/books", bookData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ title: "Book added to library" });
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Book> }) => {
      const response = await apiRequest("PATCH", `/api/books/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/books/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ title: "Book deleted" });
    },
  });

  // Bulk mutations
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const response = await apiRequest("POST", "/api/books/bulk/status", { ids, status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ 
        title: `${variables.ids.length} books moved to ${STATUS_CONFIG[variables.status as keyof typeof STATUS_CONFIG]?.label}`,
        action: <Button variant="outline" size="sm" onClick={() => window.history.back()}>Undo</Button>
      });
    },
  });

  const bulkAddTagsMutation = useMutation({
    mutationFn: async ({ ids, tags }: { ids: string[]; tags: string[] }) => {
      const response = await apiRequest("POST", "/api/books/bulk/tags", { ids, tags });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ title: `Tags added to ${variables.ids.length} books` });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest("DELETE", "/api/books/bulk", { ids });
      return response.ok;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setSelectedBooks(new Set());
      setBulkMode(false);
      toast({ 
        title: `${ids.length} books deleted`,
        action: <Button variant="outline" size="sm" onClick={() => window.history.back()}>Undo</Button>
      });
    },
  });

  // Event handlers
  const handleAddBook = async (bookData: InsertBook) => {
    try {
      await addBookMutation.mutateAsync(bookData);
    } catch (error) {
      console.error("Failed to add book:", error);
      toast({ title: "Failed to add book", variant: "destructive" });
    }
  };

  const handleBulkUpload = async (newBooks: InsertBook[]) => {
    try {
      for (const book of newBooks) {
        await addBookMutation.mutateAsync(book);
      }
    } catch (error) {
      console.error("Failed to bulk upload books:", error);
      toast({ title: "Failed to upload books", variant: "destructive" });
    }
  };

  const handleStartReading = async (id: string) => {
    try {
      await updateBookMutation.mutateAsync({
        id,
        updates: { 
          status: "reading",
          lastReadAt: new Date(),
        }
      });
      toast({ title: "Started reading" });
    } catch (error) {
      console.error("Failed to start reading:", error);
    }
  };

  const handleContinueReading = async (id: string) => {
    try {
      await updateBookMutation.mutateAsync({
        id,
        updates: { 
          lastReadAt: new Date(),
        }
      });
      toast({ title: "Reading session updated" });
    } catch (error) {
      console.error("Failed to update reading:", error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteBookMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete book:", error);
    }
  };

  const handleViewDetails = (id: string) => {
    console.log("View details for book:", id);
  };

  // Filter functions
  const toggleStatusFilter = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    updateURL({ statuses: newStatuses });
  };

  const clearAllFilters = () => {
    setSearchValue("");
    updateURL({ 
      search: "", 
      statuses: [], 
      genres: [], 
      tags: [],
      sort: "priority",
      sortOrder: "desc"
    });
  };

  // Bulk selection functions
  const toggleBookSelection = (bookId: string) => {
    const newSelected = new Set(selectedBooks);
    if (newSelected.has(bookId)) {
      newSelected.delete(bookId);
    } else {
      newSelected.add(bookId);
    }
    setSelectedBooks(newSelected);
  };

  const selectAllBooks = () => {
    setSelectedBooks(new Set(books.map(book => book.id)));
  };

  const clearSelection = () => {
    setSelectedBooks(new Set());
    setBulkMode(false);
  };

  // Bulk operations
  const handleBulkStatusChange = async (status: string) => {
    const ids = Array.from(selectedBooks);
    try {
      await bulkUpdateStatusMutation.mutateAsync({ ids, status });
      clearSelection();
    } catch (error) {
      console.error("Failed to update book statuses:", error);
      toast({ title: "Failed to update books", variant: "destructive" });
    }
  };

  const handleBulkAddTags = async (tags: string[]) => {
    const ids = Array.from(selectedBooks);
    try {
      await bulkAddTagsMutation.mutateAsync({ ids, tags });
      clearSelection();
    } catch (error) {
      console.error("Failed to add tags:", error);
      toast({ title: "Failed to add tags", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedBooks);
    try {
      await bulkDeleteMutation.mutateAsync(ids);
    } catch (error) {
      console.error("Failed to delete books:", error);
      toast({ title: "Failed to delete books", variant: "destructive" });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      
      switch (e.key) {
        case '/':
          e.preventDefault();
          searchInputRef?.focus();
          break;
        case 'f':
          e.preventDefault();
          // Could open filter panel in mobile
          break;
        case 'v':
          e.preventDefault();
          updateURL({ view: filters.view === 'grid' ? 'list' : 'grid' });
          break;
        case 'Escape':
          e.preventDefault();
          if (bulkMode) {
            clearSelection();
          } else if (searchValue) {
            setSearchValue("");
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchInputRef, filters.view, updateURL, bulkMode, searchValue, clearSelection]);

  // Initialize search value from URL
  useEffect(() => {
    const urlSearch = urlParams.get('search') || '';
    if (urlSearch !== searchValue) {
      setSearchValue(urlSearch);
    }
  }, [urlParams]);

  return (
    <div className="space-y-6" data-testid="page-library">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold">My Library</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "Loading..." : `${books.length} books in your collection`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BookSearchDialog>
            <Button data-testid="button-search-books">
              <Search className="h-4 w-4 mr-2" />
              Search Books
            </Button>
          </BookSearchDialog>
          <ImportDialog>
            <Button variant="outline" data-testid="button-import-books">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </ImportDialog>
          <ExportDialog>
            <Button variant="outline" data-testid="button-export-books">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </ExportDialog>
          <BulkUploadDialog onBulkUpload={handleBulkUpload} />
          <AddBookDialog onAddBook={handleAddBook} />
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-4">
        {/* Primary controls */}
        <div className="flex gap-4 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={setSearchInputRef}
              placeholder="Search books, authors, or tags... (Press / to focus)"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10"
              data-testid="input-search-books"
            />
          </div>

          {/* Sort */}
          <Select value={filters.sort} onValueChange={(sort) => updateURL({ sort })}>
            <SelectTrigger className="w-48" data-testid="select-sort">
              <ChevronDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                  {filters.sortOrder === "asc" && filters.sort === option.value && " ↑"}
                  {filters.sortOrder === "desc" && filters.sort === option.value && " ↓"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={filters.view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => updateURL({ view: 'grid' })}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={filters.view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => updateURL({ view: 'list' })}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Bulk Select */}
          <Button
            variant={bulkMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBulkMode(!bulkMode)}
            data-testid="button-bulk-select"
          >
            {bulkMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            Bulk Select
          </Button>
        </div>

        {/* Status Chips */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm text-muted-foreground font-medium">Status:</span>
          {BOOK_STATUSES.map((status) => {
            const isActive = filters.statuses.includes(status);
            const statusCount = books.filter(b => b.status === status).length;
            
            return (
              <Badge
                key={status}
                variant={isActive ? "default" : "outline"}
                className={`cursor-pointer hover-elevate ${isActive ? STATUS_CONFIG[status].color : ''}`}
                onClick={() => toggleStatusFilter(status)}
                data-testid={`chip-status-${status}`}
              >
                {STATUS_CONFIG[status].label}
                {statusCount > 0 && <span className="ml-1">({statusCount})</span>}
              </Badge>
            );
          })}
          
          {(filters.statuses.length > 0 || filters.search || filters.genres.length > 0 || filters.tags.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground"
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Toolbar */}
      {bulkMode && selectedBooks.size > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="font-medium">{selectedBooks.size} books selected</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={selectAllBooks}>Select All</Button>
                <Button size="sm" variant="outline" onClick={clearSelection}>Clear</Button>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {/* Status change buttons */}
              {BOOK_STATUSES.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange(status)}
                  data-testid={`button-bulk-status-${status}`}
                >
                  Move to {STATUS_CONFIG[status].label}
                </Button>
              ))}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAddTags(['urgent'])}
                data-testid="button-bulk-add-tag"
              >
                <Tag className="h-4 w-4 mr-1" />
                Add Tag
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading your library...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Failed to load books. Please try refreshing the page.
          </div>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="text-muted-foreground text-lg">
            Welcome to your personal library!
          </div>
          <div className="space-y-4 max-w-md mx-auto">
            <div className="flex gap-2 justify-center">
              <AddBookDialog 
                onAddBook={handleAddBook}
                trigger={
                  <Button size="lg" data-testid="button-add-first-book">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Book
                  </Button>
                }
              />
              <BulkUploadDialog onBulkUpload={handleBulkUpload} />
            </div>
            <p className="text-sm text-muted-foreground">
              Start building your reading collection. Scan ISBN codes, search by title/author, or bulk import your existing books.
            </p>
          </div>
        </div>
      ) : (
        <div className={
          filters.view === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-4"
        } data-testid={`${filters.view}-books`}>
          {books.map((book: Book) => (
            <BookCard
              key={book.id}
              {...book}
              // Handle null arrays for compatibility with BookCard component
              topics={book.topics || []}
              tags={book.tags || []}
              isSelected={selectedBooks.has(book.id)}
              showSelection={bulkMode}
              viewMode={filters.view}
              onSelect={() => toggleBookSelection(book.id)}
              onStartReading={handleStartReading}
              onContinueReading={handleContinueReading}
              onViewDetails={handleViewDetails}
              onDelete={handleDeleteBook}
            />
          ))}
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="text-xs text-muted-foreground text-center space-x-4">
        <span>Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘/</kbd> to search</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">V</kbd> to toggle view</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to clear</span>
      </div>
    </div>
  );
}