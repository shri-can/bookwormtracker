import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Book, Calendar, User, Hash } from "lucide-react";
import { useBookSearch } from "@/hooks/useBookSearch";
import { bookSearchService, BookSuggestion } from "@/services/bookSearch";

interface BookSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onBookSelect?: (book: {
    title: string;
    author: string;
    genre: string;
    totalPages?: number;
    publishYear?: number;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function BookSearchInput({
  value,
  onChange,
  onBookSelect,
  placeholder = "Start typing to search for books...",
  disabled,
  "data-testid": testId,
}: BookSearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const { suggestions, isLoading, error, search, clearSuggestions } = useBookSearch();

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    search(newValue);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = async (suggestion: BookSuggestion) => {
    setShowSuggestions(false);
    setIsLoadingDetails(true);
    
    try {
      // Set the title immediately for better UX
      onChange(suggestion.title);
      
      // Fetch detailed book information - this now includes robust fallback
      const details = await bookSearchService.getBookDetails(suggestion);
      
      if (details && onBookSelect) {
        const bookData = {
          title: details.title,
          author: details.authors.join(", ") || "",
          genre: bookSearchService.getMainGenre(details.subjects),
          totalPages: details.pageCount,
          publishYear: details.publishYear,
        };
        
        onBookSelect(bookData);
        console.log("Auto-populated book details:", bookData);
      }
    } catch (error) {
      console.error("Failed to fetch book details:", error);
      // This shouldn't happen now since getBookDetails has internal fallback
      // But keeping as extra safety
      if (onBookSelect) {
        const fallbackData = {
          title: suggestion.title,
          author: suggestion.author_name?.[0] || "",
          genre: bookSearchService.getMainGenre(suggestion.subject),
          totalPages: suggestion.number_of_pages_median,
          publishYear: suggestion.first_publish_year,
        };
        onBookSelect(fallbackData);
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      inputRef.current &&
      !inputRef.current.contains(event.target as Node) &&
      suggestionsRef.current &&
      !suggestionsRef.current.contains(event.target as Node)
    ) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatAuthors = (authors?: string[]) => {
    if (!authors || authors.length === 0) return "Unknown Author";
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(" & ");
    return `${authors[0]} & ${authors.length - 1} others`;
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoadingDetails}
          data-testid={testId}
          className="pr-10"
        />
        {(isLoading || isLoadingDetails) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showSuggestions && (value.trim().length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg"
          data-testid={`${testId}-suggestions`}
        >
          {error ? (
            <div className="p-3 text-sm text-destructive" data-testid={`${testId}-error`}>
              {error}
            </div>
          ) : suggestions.length > 0 ? (
            <ScrollArea className="max-h-80">
              <div className="p-1">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={`${suggestion.key}-${index}`}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover-elevate"
                    onClick={() => handleSuggestionClick(suggestion)}
                    data-testid={`${testId}-suggestion-${index}`}
                  >
                    <div className="flex items-start gap-3 w-full">
                      {/* Book Cover or Icon */}
                      <div className="flex-shrink-0">
                        {suggestion.cover_i ? (
                          <img
                            src={bookSearchService.getCoverUrl(suggestion.cover_i, 'S') || ''}
                            alt={suggestion.title}
                            className="w-12 h-16 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                            <Book className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Book Details */}
                      <div className="flex-1 text-left space-y-1 min-w-0">
                        <div className="font-medium text-sm leading-tight line-clamp-2">
                          {suggestion.title}
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">
                            {formatAuthors(suggestion.author_name)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {suggestion.first_publish_year && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{suggestion.first_publish_year}</span>
                            </div>
                          )}
                          {suggestion.number_of_pages_median && (
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span>{suggestion.number_of_pages_median} pages</span>
                            </div>
                          )}
                        </div>

                        {/* Subjects/Genre Preview */}
                        {suggestion.subject && suggestion.subject.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {suggestion.subject.slice(0, 2).map((subject, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary" 
                                className="text-xs px-1 py-0"
                              >
                                {subject.length > 15 ? subject.substring(0, 15) + '...' : subject}
                              </Badge>
                            ))}
                            {suggestion.subject.length > 2 && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                +{suggestion.subject.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          ) : !isLoading && (
            <div className="p-3 text-sm text-muted-foreground text-center" data-testid={`${testId}-no-results`}>
              No books found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
}