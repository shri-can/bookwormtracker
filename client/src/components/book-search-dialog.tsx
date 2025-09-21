import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Star, Calendar, BookOpen, Users } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  googleId: string;
  title: string;
  authors: string[];
  description: string;
  publishedDate: string;
  pageCount: number;
  categories: string[];
  thumbnail: string;
  isbn: string;
  publisher: string;
  language: string;
  averageRating: number;
  ratingsCount: number;
}

interface SearchResponse {
  books: SearchResult[];
  total: number;
}

interface BookSearchDialogProps {
  children: React.ReactNode;
}

export function BookSearchDialog({ children }: BookSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { toast } = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useQuery<SearchResponse>({
    queryKey: ['/api/books/search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return { books: [], total: 0 };
      }
      
      const params = new URLSearchParams({ q: debouncedQuery.trim() });
      const response = await fetch(`/api/books/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search books');
      }
      return response.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const addBookMutation = useMutation({
    mutationFn: (bookData: SearchResult) => apiRequest('POST', `/api/books/add-from-search`, bookData),
    onSuccess: () => {
      toast({
        title: "Book added successfully",
        description: "The book has been added to your library",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      setOpen(false);
      setSearchQuery("");
      setDebouncedQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add book",
        description: error.message || "An error occurred while adding the book",
        variant: "destructive",
      });
    },
  });

  const handleAddBook = (book: SearchResult) => {
    addBookMutation.mutate(book);
  };

  const resetSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetSearch();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col" data-testid="dialog-book-search">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Books
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-book-search"
            />
          </div>

          {/* Search Results */}
          <ScrollArea className="flex-1" data-testid="scroll-search-results">
            <div className="space-y-3 pr-4">
              {isSearching && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <Skeleton className="w-16 h-20 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isSearching && debouncedQuery.trim().length >= 2 && searchResults?.books.length === 0 && (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-results">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No books found for "{debouncedQuery}"</p>
                  <p className="text-sm">Try different keywords or check the spelling</p>
                </div>
              )}

              {!isSearching && debouncedQuery.trim().length < 2 && (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-search-prompt">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start typing to search for books</p>
                  <p className="text-sm">Search by title, author, or ISBN</p>
                </div>
              )}

              {searchResults?.books.map((book) => (
                <Card key={book.googleId} className="hover:shadow-md transition-shadow" data-testid={`book-result-${book.googleId}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Book Cover */}
                      <div className="flex-shrink-0">
                        {book.thumbnail ? (
                          <img
                            src={book.thumbnail}
                            alt={book.title}
                            className="w-16 h-20 object-cover rounded border"
                            data-testid={`img-book-cover-${book.googleId}`}
                          />
                        ) : (
                          <div className="w-16 h-20 bg-muted rounded border flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Book Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold line-clamp-2 leading-5" data-testid={`text-book-title-${book.googleId}`}>
                            {book.title}
                          </h3>
                          <Button
                            size="sm"
                            onClick={() => handleAddBook(book)}
                            disabled={addBookMutation.isPending}
                            className="flex-shrink-0"
                            data-testid={`button-add-book-${book.googleId}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {/* Authors */}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span data-testid={`text-book-authors-${book.googleId}`}>
                              {book.authors.join(', ')}
                            </span>
                          </div>

                          {/* Publication info */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {book.publishedDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{book.publishedDate}</span>
                              </div>
                            )}
                            {book.pageCount > 0 && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                <span>{book.pageCount} pages</span>
                              </div>
                            )}
                            {book.averageRating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                <span>{book.averageRating}/5 ({book.ratingsCount})</span>
                              </div>
                            )}
                          </div>

                          {/* Categories */}
                          {book.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {book.categories.slice(0, 3).map((category, index) => (
                                <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-category-${book.googleId}-${index}`}>
                                  {category}
                                </Badge>
                              ))}
                              {book.categories.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{book.categories.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Description */}
                          {book.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-book-description-${book.googleId}`}>
                              {book.description}
                            </p>
                          )}

                          {/* Publisher and ISBN */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {book.publisher && <span>Publisher: {book.publisher}</span>}
                            {book.isbn && <span>ISBN: {book.isbn}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Results summary */}
          {searchResults && searchResults.total > 0 && (
            <div className="text-sm text-muted-foreground text-center" data-testid="text-results-summary">
              Showing {searchResults.books.length} of {searchResults.total.toLocaleString()} results
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}